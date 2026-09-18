using System.Text.Json;
using BuildingBlocks.Endpoints;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using Xunit;

namespace UnitTests.Kernel;

/// <summary>
/// The frozen error contract (<c>docs/api-conventions.md</c>). Wave 2 endpoints and the frontend's
/// <c>normalizeApiError</c> both parse this body, so these tests are the place a change to the shape
/// gets caught before 40 tracks have built on it.
/// </summary>
public class ErrorContractTests
{
    private sealed class FakeEnvironment : IHostEnvironment
    {
        public FakeEnvironment(string name) => EnvironmentName = name;
        public string EnvironmentName { get; set; }
        public string ApplicationName { get; set; } = "UnitTests";
        public string ContentRootPath { get; set; } = ".";
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
    }

    /// <summary>Runs the middleware over a throwing pipeline and returns the parsed body.</summary>
    private static async Task<(int Status, JsonElement Body)> Invoke(Exception thrown, string environment = "Production")
    {
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/test";
        context.Request.Method = "POST";
        var body = new MemoryStream();
        context.Response.Body = body;

        var middleware = new GlobalExceptionHandlingMiddleware(
            _ => throw thrown,
            NullLogger<GlobalExceptionHandlingMiddleware>.Instance,
            new FakeEnvironment(environment));

        await middleware.InvokeAsync(context);

        body.Position = 0;
        using var document = await JsonDocument.ParseAsync(body);
        return (context.Response.StatusCode, document.RootElement.Clone());
    }

    [Fact]
    public async Task ThanBaiLuonCoDuTruongBatBuoc()
    {
        var (status, body) = await Invoke(new NotFoundException());

        status.Should().Be(404);
        body.GetProperty("type").GetString().Should().Be("https://httpstatuses.io/404");
        body.GetProperty("title").GetString().Should().Be("Not Found");
        body.GetProperty("status").GetInt32().Should().Be(404);
        body.GetProperty("code").GetString().Should().Be(ApiErrorCodes.NotFound);
        body.GetProperty("instance").GetString().Should().Be("/api/test");
        body.GetProperty("traceId").GetString().Should().NotBeNullOrWhiteSpace();
        // Hai khoá cũ SPA đang đọc - giữ nguyên để không phải sửa 99 chỗ gọi.
        body.GetProperty("error").GetString().Should().Be(body.GetProperty("message").GetString());
    }

    public static TheoryData<Exception, int, string> DomainExceptions() => new()
    {
        { NotFoundException.For("đơn hàng", 42), 404, ApiErrorCodes.NotFound },
        { new ForbiddenException(), 403, ApiErrorCodes.Forbidden },
        { new DomainException("Không thể huỷ đơn đã giao."), 400, ApiErrorCodes.DomainRule },
        { new RequestValidationException("sku", "Mã SKU đã tồn tại."), 400, ApiErrorCodes.ValidationFailed }
    };

    [Theory]
    [MemberData(nameof(DomainExceptions))]
    public async Task NgoaiLeNghiepVu_AnhXaDungMa(Exception exception, int expectedStatus, string expectedCode)
    {
        var (status, body) = await Invoke(exception);

        status.Should().Be(expectedStatus);
        body.GetProperty("code").GetString().Should().Be(expectedCode);
        // Thông điệp của DomainException LÀ nội dung hiển thị cho người dùng ở MỌI môi trường.
        body.GetProperty("message").GetString().Should().Be(exception.Message);
    }

    /// <summary>NotFoundException.For không được để lộ tên bảng/cột.</summary>
    [Fact]
    public async Task NotFound_ChiNoiTenNghiepVu_KhongNoiTenBang()
    {
        var (_, body) = await Invoke(NotFoundException.For("đơn hàng", 42));

        body.GetProperty("message").GetString().Should().Be("Không tìm thấy đơn hàng (mã: 42).");
    }

    [Fact]
    public async Task ConflictException_Tra409_KemErrors()
    {
        var (status, body) = await Invoke(new ConflictException(
            "Mã SKU đã tồn tại.",
            new[] { new ApiFieldError("sku", "DUPLICATE_SKU", "Mã SKU đã tồn tại.") }));

        status.Should().Be(409);
        body.GetProperty("code").GetString().Should().Be(ApiErrorCodes.Conflict);
        var errors = body.GetProperty("errors");
        errors.GetArrayLength().Should().Be(1);
        errors[0].GetProperty("field").GetString().Should().Be("sku");
        errors[0].GetProperty("code").GetString().Should().Be("DUPLICATE_SKU");
        errors[0].GetProperty("message").GetString().Should().Be("Mã SKU đã tồn tại.");
    }

    /// <summary>Khoá trùng là 409, không bao giờ 500 - xem Success Criteria của W1-3.</summary>
    [Fact]
    public async Task TrungKhoaDuyNhat_Tra409_KhongPhai500()
    {
        var pg = new PostgresException("duplicate key value violates unique constraint \"IX_Products_Slug\"",
            "ERROR", "ERROR", PostgresErrorCodes.UniqueViolation);

        var (status, body) = await Invoke(new DbUpdateException("save failed", pg));

        status.Should().Be(409);
        body.GetProperty("code").GetString().Should().Be(ApiErrorCodes.DuplicateValue);
        body.GetProperty("message").GetString().Should().NotContain("IX_Products_Slug");
    }

    /// <summary>Ngoài Development, thân bài không được chứa văn bản ngoại lệ, SQL hay tên bảng.</summary>
    [Fact]
    public async Task NgoaiDevelopment_KhongLoDetail()
    {
        var (status, body) = await Invoke(new Exception("SELECT * FROM AspNetUsers -- bí mật"));

        status.Should().Be(500);
        body.TryGetProperty("detail", out _).Should().BeFalse();
        body.GetProperty("message").GetString().Should().NotContain("AspNetUsers");
    }

    [Fact]
    public async Task TrongDevelopment_CoDetailDeGoLoi()
    {
        var (_, body) = await Invoke(new Exception("boom"), environment: "Development");

        body.GetProperty("detail").GetString().Should().Contain("boom");
    }

    [Theory]
    [InlineData("Address.Street", "address.street")]
    [InlineData("Items[0].Sku", "items[0].sku")]
    [InlineData("Email", "email")]
    [InlineData("", "")]
    [InlineData(null, "")]
    public void DuongDanTruong_DuocCamelCaseTungDoan(string? input, string expected)
    {
        ProblemDetailsFactory.ToCamelCasePath(input).Should().Be(expected);
    }
}
