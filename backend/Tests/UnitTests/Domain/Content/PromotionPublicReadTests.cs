using Content;
using Content.Domain;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Xunit;
using static UnitTests.Seo.SeoContentTestData;

namespace UnitTests.Domain.Content;

/// <summary>
/// `GET /api/promotions/{id}` (khách) chỉ trả khuyến mãi đang chạy — cùng `Promotion.RunningPredicate`;
/// `GET /api/promotions/admin/{id}` (nhân viên) trả mọi trạng thái.
/// </summary>
public class PromotionPublicReadTests
{
    private static Promotion Draft() => Promotion.Create(
        "NHAP", "Mã nháp", null, PromotionType.Code,
        DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(7),
        PromotionDiscountType.Fixed, 50_000m, null);

    private static int StatusOf(IResult result) => ((IStatusCodeHttpResult)result).StatusCode ?? 200;

    [Fact]
    public async Task Khach_DangChay_200()
    {
        var db = NewDb();
        var running = RunningCode("QH100");
        db.Promotions.Add(running);
        await db.SaveChangesAsync();

        StatusOf(await PromotionEndpoints.GetByIdAsync(db, running.Id, runningOnly: true)).Should().Be(200);
    }

    [Fact]
    public async Task Khach_NhapTamDungChuaToiHetHan_404()
    {
        var db = NewDb();
        var draft = Draft();
        var paused = RunningCode("PAUSE");
        paused.Pause();
        var future = FlashSale("Sắp tới", DateTime.UtcNow.AddDays(2), DateTime.UtcNow.AddDays(3));
        var expired = FlashSale("Đã qua", DateTime.UtcNow.AddDays(-5), DateTime.UtcNow.AddDays(-1));
        db.Promotions.AddRange(draft, paused, future, expired);
        await db.SaveChangesAsync();

        foreach (var promo in new[] { draft, paused, future, expired })
        {
            StatusOf(await PromotionEndpoints.GetByIdAsync(db, promo.Id, runningOnly: true))
                .Should().Be(404, $"{promo.Name} không được lộ cho khách");
        }
    }

    [Fact]
    public async Task NhanVien_ThayCaBanNhap()
    {
        var db = NewDb();
        var draft = Draft();
        db.Promotions.Add(draft);
        await db.SaveChangesAsync();

        StatusOf(await PromotionEndpoints.GetByIdAsync(db, draft.Id, runningOnly: false)).Should().Be(200);
        StatusOf(await PromotionEndpoints.GetByIdAsync(db, Guid.NewGuid(), runningOnly: false)).Should().Be(404);
    }
}
