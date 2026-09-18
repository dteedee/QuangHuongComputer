using Content.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Domain.Content;

/// <summary>
/// Test entity Promotion — factory validation, incrementUsage atomic,
/// bảo vệ bán lỗ với DiscountType=Percent.
/// </summary>
public class PromotionTests
{
    private static Promotion MakeBasicCode(
        string code = "TEST10",
        PromotionDiscountType type = PromotionDiscountType.Percent,
        decimal value = 10,
        decimal? maxDiscount = 100_000m) =>
        Promotion.Create(
            code: code,
            name: "Test",
            description: null,
            type: PromotionType.Code,
            startAt: DateTime.UtcNow.AddMinutes(-1),
            endAt: DateTime.UtcNow.AddDays(7),
            discountType: type,
            discountValue: value,
            maxDiscountAmount: maxDiscount);

    [Fact]
    public void Create_Percent_ThieuMaxDiscountAmount_NemLoi()
    {
        var act = () => Promotion.Create(
            code: "SALE10", name: "sale", description: null,
            type: PromotionType.Code,
            startAt: DateTime.UtcNow, endAt: null,
            discountType: PromotionDiscountType.Percent,
            discountValue: 10,
            maxDiscountAmount: null); // thiếu max → bán lỗ khi đơn cực lớn

        act.Should().Throw<ArgumentException>()
           .Which.Message.Should().Contain("MaxDiscountAmount");
    }

    [Fact]
    public void Create_Percent_TrenNguong50_CanhBaoBanLo()
    {
        var act = () => Promotion.Create(
            code: "MEGA", name: "mega", description: null,
            type: PromotionType.Code,
            startAt: DateTime.UtcNow, endAt: null,
            discountType: PromotionDiscountType.Percent,
            discountValue: 60,
            maxDiscountAmount: 1_000_000m);

        act.Should().Throw<InvalidOperationException>()
           .Which.Message.Should().Contain("50");
    }

    [Fact]
    public void Create_TypeCode_ThieuCode_NemLoi()
    {
        var act = () => Promotion.Create(
            code: null, name: "no code", description: null,
            type: PromotionType.Code,
            startAt: DateTime.UtcNow, endAt: null,
            discountType: PromotionDiscountType.Fixed,
            discountValue: 50_000m,
            maxDiscountAmount: null);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_TypeAutomatic_CoCode_NemLoi()
    {
        var act = () => Promotion.Create(
            code: "AUTO", name: "auto", description: null,
            type: PromotionType.Automatic,
            startAt: DateTime.UtcNow, endAt: null,
            discountType: PromotionDiscountType.Fixed,
            discountValue: 50_000m,
            maxDiscountAmount: null);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_EndAtTruocStartAt_NemLoi()
    {
        var start = DateTime.UtcNow;
        var act = () => Promotion.Create(
            code: "SALE", name: "s", description: null,
            type: PromotionType.Code,
            startAt: start, endAt: start.AddMinutes(-1),
            discountType: PromotionDiscountType.Fixed,
            discountValue: 50_000m,
            maxDiscountAmount: null);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_CodeDuocChuanHoaThuaHoaVaTrim()
    {
        var p = MakeBasicCode(code: "  test10  ");
        p.Code.Should().Be("TEST10");
    }

    [Fact]
    public void Create_TypeAutomatic_IsAutomaticTuTrue()
    {
        var p = Promotion.Create(
            code: null, name: "auto", description: null,
            type: PromotionType.Automatic,
            startAt: DateTime.UtcNow, endAt: null,
            discountType: PromotionDiscountType.Fixed,
            discountValue: 100_000m,
            maxDiscountAmount: null);

        p.IsAutomatic.Should().BeTrue();
    }

    [Fact]
    public void IncrementUsage_VuotMaxTotalUsage_NemLoi()
    {
        var p = Promotion.Create(
            code: "LIMIT", name: "l", description: null,
            type: PromotionType.Code,
            startAt: DateTime.UtcNow.AddMinutes(-1), endAt: DateTime.UtcNow.AddDays(1),
            discountType: PromotionDiscountType.Fixed,
            discountValue: 50_000m,
            maxDiscountAmount: null,
            maxTotalUsage: 2);

        p.IncrementUsage();
        p.IncrementUsage();
        var act = () => p.IncrementUsage();

        act.Should().Throw<InvalidOperationException>();
        p.CurrentUsage.Should().Be(2);
    }

    [Fact]
    public void IncrementUsage_CountAmVaBang0_NemLoi()
    {
        var p = MakeBasicCode();

        var act1 = () => p.IncrementUsage(0);
        var act2 = () => p.IncrementUsage(-1);

        act1.Should().Throw<ArgumentException>();
        act2.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Activate_KhiExpired_NemLoi()
    {
        var p = MakeBasicCode();
        p.Expire();

        var act = () => p.Activate();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void IsRedeemable_KhiDraft_FalseDuTrongLich()
    {
        var p = MakeBasicCode();
        // Mặc định Status=Draft sau Create.
        p.IsRedeemable(DateTime.UtcNow).Should().BeFalse();
    }

    [Fact]
    public void IsRedeemable_ActiveVaTrongLich_True()
    {
        var p = MakeBasicCode();
        p.Activate();
        p.IsRedeemable(DateTime.UtcNow).Should().BeTrue();
    }

    [Fact]
    public void IsRedeemable_HetLuot_False()
    {
        var p = Promotion.Create(
            code: "ONE", name: "one", description: null,
            type: PromotionType.Code,
            startAt: DateTime.UtcNow.AddMinutes(-1), endAt: DateTime.UtcNow.AddDays(1),
            discountType: PromotionDiscountType.Fixed,
            discountValue: 10_000m,
            maxDiscountAmount: null,
            maxTotalUsage: 1);
        p.Activate();
        p.IncrementUsage();

        p.IsRedeemable(DateTime.UtcNow).Should().BeFalse();
    }

    [Fact]
    public void AddReward_QuantityAm_NemLoi()
    {
        var p = MakeBasicCode();

        var act = () => p.AddReward(Guid.NewGuid(), null, quantity: 0);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void AddCondition_LuuTruJsonNguyenVen()
    {
        var p = MakeBasicCode();

        p.AddCondition(ConditionType.MinOrderValue, ConditionOperator.Gte, "5000000");

        p.Conditions.Should().HaveCount(1);
        p.Conditions.First().ValueJson.Should().Be("5000000");
    }

    // ===== W2-2: FlashSale-as-Promotion contract (phase-20 step 5) =====

    private static Promotion MakeFlashSale() =>
        Promotion.Create(
            code: null,
            name: "Flash Sale Cuoi Tuan",
            description: null,
            type: PromotionType.FlashSale,
            startAt: DateTime.UtcNow.AddMinutes(-1),
            endAt: DateTime.UtcNow.AddHours(2),
            discountType: PromotionDiscountType.FixedPrice,
            discountValue: 0,
            maxDiscountAmount: null,
            isAutomatic: true);

    [Fact]
    public void AddReward_FlashSale_ThieuFlashPrice_NemLoi()
    {
        var p = MakeFlashSale();

        var act = () => p.AddReward(Guid.NewGuid(), null, quantity: 1, flashPrice: null);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void AddReward_FlashSale_CoFlashPriceVaQuantityLimit_LuuDung()
    {
        var p = MakeFlashSale();

        p.AddReward(Guid.NewGuid(), null, quantity: 1, flashPrice: 12_345_000m, quantityLimit: 10);

        var reward = p.Rewards.Single();
        reward.FlashPrice.Should().Be(12_345_000m);
        reward.QuantityLimit.Should().Be(10);
        reward.SoldCount.Should().Be(0);
    }

    [Fact]
    public void PromotionReward_IncrementSold_VuotQuantityLimit_NemLoi()
    {
        var p = MakeFlashSale();
        p.AddReward(Guid.NewGuid(), null, quantity: 1, flashPrice: 1_000_000m, quantityLimit: 2);
        var reward = p.Rewards.Single();

        reward.IncrementSold(2);
        var act = () => reward.IncrementSold(1);

        act.Should().Throw<InvalidOperationException>();
        reward.IsSoldOut().Should().BeTrue();
    }

    [Fact]
    public void UpdateBasicFields_SuaNameVaPriority_ApDungDung()
    {
        var p = MakeBasicCode();

        p.UpdateBasicFields(name: "Ten Moi", description: null, priority: 50, endAt: null);

        p.Name.Should().Be("Ten Moi");
        p.Priority.Should().Be(50);
    }

    [Fact]
    public void Archive_ChuaTungDung_ThanhCong()
    {
        var p = MakeBasicCode();

        p.Archive();

        p.Status.Should().Be(PromotionStatus.Expired);
        p.IsActive.Should().BeFalse();
        p.CanDelete().Should().BeTrue();
    }

    [Fact]
    public void Archive_DaTungDung_NemLoi()
    {
        var p = MakeBasicCode(maxDiscount: 100_000m);
        p.Activate();
        p.IncrementUsage();

        var act = () => p.Archive();

        act.Should().Throw<InvalidOperationException>();
        p.CanDelete().Should().BeFalse();
    }
}
