using FluentAssertions;
using Identity.Services;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace UnitTests.Identity;

/// <summary>
/// CSRF lớp 2 cho refresh-token/logout: thiếu header <c>X-Requested-With</c> thì dừng ngay,
/// handler (nơi xoay/thu hồi token) không bao giờ chạy.
/// </summary>
public class RequireAjaxHeaderFilterTests
{
    private static async Task<(object? Result, bool NextCalled)> RunAsync(string? headerValue)
    {
        var context = new DefaultHttpContext();
        if (headerValue != null) context.Request.Headers[RequireAjaxHeaderFilter.HeaderName] = headerValue;

        var nextCalled = false;
        var result = await new RequireAjaxHeaderFilter().InvokeAsync(
            new DefaultEndpointFilterInvocationContext(context),
            _ =>
            {
                nextCalled = true;
                return ValueTask.FromResult<object?>(Results.Ok());
            });
        return (result, nextCalled);
    }

    [Theory(DisplayName = "Thiếu hoặc sai header -> 400, handler không chạy")]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("fetch")]
    public async Task ThieuHeader_Chan(string? value)
    {
        var (result, nextCalled) = await RunAsync(value);

        nextCalled.Should().BeFalse();
        result.Should().BeAssignableTo<IStatusCodeHttpResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Theory(DisplayName = "Có header XMLHttpRequest (không phân biệt hoa thường) -> cho qua")]
    [InlineData("XMLHttpRequest")]
    [InlineData("xmlhttprequest")]
    public async Task CoHeader_ChoQua(string value)
    {
        var (_, nextCalled) = await RunAsync(value);

        nextCalled.Should().BeTrue();
    }
}
