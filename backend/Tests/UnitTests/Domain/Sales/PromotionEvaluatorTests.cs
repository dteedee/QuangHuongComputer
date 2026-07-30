using Content.Domain;
using FluentAssertions;
using Sales.Application.Pricing;
using Sales.Application.Pricing.Rules;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// Test PromotionEvaluator + 9 rule + các DiscountType.
/// Không cần DbContext — mọi thứ đóng gói trong bộ nhớ.
/// </summary>
public class PromotionEvaluatorTests
{
    private static PromotionEvaluator MakeEvaluator() => new(new IPromotionRule[]
    {
        new MinOrderValueRule(),
        new CategoryRule(),
        new BrandRule(),
        new ProductRule(),
        new CustomerGroupRule(),
        new TimeOfDayRule(),
        new DayOfWeekRule(),
        new FirstOrderRule(),
        new QuantityRule(),
    });

    private static CustomerContext BasicCustomer() =>
        new(Guid.NewGuid(), CustomerGroup: null, PreviousOrderCount: 5, IsFirstOrder: false);

    private static PricingContext CtxWith(params (decimal price, int qty)[] items) =>
        new(items.Select(i => new CartLineSnapshot(
                ProductId: Guid.NewGuid(),
                VariantId: null,
                ProductName: "P",
                UnitPrice: i.price,
                Quantity: i.qty)).ToList(),
            BasicCustomer(),
            evaluatedAt: DateTime.UtcNow);

    private static Promotion ActivePromo(
        PromotionDiscountType type,
        decimal value,
        decimal? maxDiscount = null,
        Action<Promotion>? configure = null)
    {
        var p = Promotion.Create(
            code: $"C{Guid.NewGuid():N}"[..8],
            name: "x", description: null,
            type: PromotionType.Code,
            startAt: DateTime.UtcNow.AddMinutes(-5),
            endAt: DateTime.UtcNow.AddDays(1),
            discountType: type,
            discountValue: value,
            maxDiscountAmount: maxDiscount);
        p.Activate();
        configure?.Invoke(p);
        return p;
    }

    [Fact]
    public void Percent_TranhBanLo_Clamp_VeMaxDiscountAmount()
    {
        // Đơn 1tr, giảm 10% = 100k, max 50k → giảm 50k.
        var p = ActivePromo(PromotionDiscountType.Percent, 10, maxDiscount: 50_000m);
        var ctx = CtxWith((1_000_000m, 1));

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeTrue();
        result.OrderDiscountAmount.Should().Be(50_000m);
    }

    [Fact]
    public void Percent_TrongNguongMaxDiscount_GiuNguyenSoTinh()
    {
        var p = ActivePromo(PromotionDiscountType.Percent, 10, maxDiscount: 200_000m);
        var ctx = CtxWith((1_000_000m, 1)); // 10% = 100k

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.OrderDiscountAmount.Should().Be(100_000m);
    }

    [Fact]
    public void Fixed_LonHonSubtotal_ClampVeSubtotal()
    {
        var p = ActivePromo(PromotionDiscountType.Fixed, 500_000m);
        var ctx = CtxWith((200_000m, 1));

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.OrderDiscountAmount.Should().Be(200_000m);
    }

    [Fact]
    public void FreeShip_ShippingDiscountBangTranHoacMax()
    {
        var p = ActivePromo(PromotionDiscountType.FreeShip, 30_000m);
        var ctx = CtxWith((500_000m, 1));

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeTrue();
        result.ShippingDiscountAmount.Should().Be(30_000m);
    }

    [Fact]
    public void BuyXGetY_SinhFreeGift()
    {
        var giftProductId = Guid.NewGuid();
        var p = ActivePromo(PromotionDiscountType.BuyXGetY, 0, configure: pr =>
        {
            pr.AddReward(giftProductId, null, quantity: 1);
        });
        var ctx = CtxWith((1_000_000m, 2));

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeTrue();
        result.FreeGifts.Should().ContainSingle();
        result.FreeGifts[0].ProductId.Should().Be(giftProductId);
        result.FreeGifts[0].Quantity.Should().Be(1);
    }

    [Fact]
    public void BuyXGetY_KhongCoRewards_NotApplicable()
    {
        var p = ActivePromo(PromotionDiscountType.BuyXGetY, 0);
        var ctx = CtxWith((1_000_000m, 2));

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeFalse();
    }

    [Fact]
    public void Tiered_MuaDuBacApTronBacCaoNhat()
    {
        // Bậc: 1→0%, 3→5%, 5→10%. Mua 4 → chọn bậc 3, giảm 5%.
        var p = Promotion.Create(
            code: "TIER",
            name: "tier",
            description: "[{\"minQty\":1,\"percent\":0},{\"minQty\":3,\"percent\":5},{\"minQty\":5,\"percent\":10}]",
            type: PromotionType.Code,
            startAt: DateTime.UtcNow.AddMinutes(-1),
            endAt: DateTime.UtcNow.AddDays(1),
            discountType: PromotionDiscountType.Tiered,
            discountValue: 0,
            maxDiscountAmount: null);
        p.Activate();
        var ctx = CtxWith((100_000m, 4));

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeTrue();
        // Subtotal 400k, 5% = 20k.
        result.OrderDiscountAmount.Should().Be(20_000m);
    }

    [Fact]
    public void Tiered_MuaDuBacCaoNhat_ApBacCuoi()
    {
        var p = Promotion.Create(
            code: "TIERMAX",
            name: "tm",
            description: "[{\"minQty\":1,\"percent\":0},{\"minQty\":5,\"percent\":10}]",
            type: PromotionType.Code,
            startAt: DateTime.UtcNow.AddMinutes(-1),
            endAt: DateTime.UtcNow.AddDays(1),
            discountType: PromotionDiscountType.Tiered,
            discountValue: 0,
            maxDiscountAmount: null);
        p.Activate();
        var ctx = CtxWith((100_000m, 10)); // Subtotal 1M, 10% = 100k

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.OrderDiscountAmount.Should().Be(100_000m);
    }

    [Fact]
    public void Tiered_ChuaDatBacToiThieu_NotApplicable()
    {
        var p = Promotion.Create(
            code: "TIERNONE",
            name: "tn",
            description: "[{\"minQty\":3,\"percent\":5},{\"minQty\":5,\"percent\":10}]",
            type: PromotionType.Code,
            startAt: DateTime.UtcNow.AddMinutes(-1),
            endAt: DateTime.UtcNow.AddDays(1),
            discountType: PromotionDiscountType.Tiered,
            discountValue: 0,
            maxDiscountAmount: null);
        p.Activate();
        var ctx = CtxWith((100_000m, 2));

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeFalse();
    }

    [Fact]
    public void Rule_MinOrderValue_KhongDatNguong_NotApplicable()
    {
        var p = ActivePromo(PromotionDiscountType.Fixed, 100_000m);
        p.AddCondition(ConditionType.MinOrderValue, ConditionOperator.Gte, "5000000");
        var ctx = CtxWith((1_000_000m, 1));

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeFalse();
        result.Reason.Should().Contain("MinOrderValue");
    }

    [Fact]
    public void Rule_MinOrderValue_DatNguong_Applicable()
    {
        var p = ActivePromo(PromotionDiscountType.Fixed, 100_000m);
        p.AddCondition(ConditionType.MinOrderValue, ConditionOperator.Gte, "500000");
        var ctx = CtxWith((1_000_000m, 1));

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeTrue();
    }

    [Fact]
    public void Rule_Category_KhongCoLineThuocCategory_NotApplicable()
    {
        var p = ActivePromo(PromotionDiscountType.Fixed, 100_000m);
        var catId = Guid.NewGuid();
        p.AddCondition(ConditionType.Category, ConditionOperator.In, $"[\"{catId}\"]");
        // Line không set CategoryId
        var ctx = CtxWith((1_000_000m, 1));

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeFalse();
    }

    [Fact]
    public void Rule_Category_CoLineTrungCategory_Applicable()
    {
        var p = ActivePromo(PromotionDiscountType.Fixed, 100_000m);
        var catId = Guid.NewGuid();
        p.AddCondition(ConditionType.Category, ConditionOperator.In, $"[\"{catId}\"]");
        var lines = new List<CartLineSnapshot>
        {
            new(Guid.NewGuid(), null, "P", 1_000_000m, 1, CategoryId: catId),
        };
        var ctx = new PricingContext(lines, BasicCustomer());

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeTrue();
    }

    [Fact]
    public void Rule_FirstOrder_KhachCu_NotApplicable()
    {
        var p = ActivePromo(PromotionDiscountType.Fixed, 100_000m);
        p.AddCondition(ConditionType.FirstOrder, ConditionOperator.Eq, "true");
        var ctx = CtxWith((1_000_000m, 1)); // IsFirstOrder=false

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeFalse();
    }

    [Fact]
    public void Rule_FirstOrder_KhachMoi_Applicable()
    {
        var p = ActivePromo(PromotionDiscountType.Fixed, 100_000m);
        p.AddCondition(ConditionType.FirstOrder, ConditionOperator.Eq, "true");
        var customer = new CustomerContext(Guid.NewGuid(), null, 0, true);
        var lines = new List<CartLineSnapshot>
        {
            new(Guid.NewGuid(), null, "P", 1_000_000m, 1),
        };
        var ctx = new PricingContext(lines, customer);

        var result = MakeEvaluator().Evaluate(p, ctx);

        result.IsApplicable.Should().BeTrue();
    }

    [Fact]
    public void Rule_Quantity_TongQty_Applicable()
    {
        var p = ActivePromo(PromotionDiscountType.Fixed, 100_000m);
        p.AddCondition(ConditionType.Quantity, ConditionOperator.Gte, "3");
        var ctx = CtxWith((500_000m, 3));

        MakeEvaluator().Evaluate(p, ctx).IsApplicable.Should().BeTrue();
    }

    [Fact]
    public void Rule_CustomerGroup_KhongKhop_NotApplicable()
    {
        var p = ActivePromo(PromotionDiscountType.Fixed, 100_000m);
        p.AddCondition(ConditionType.CustomerGroup, ConditionOperator.In, "\"Student\"");
        var lines = new List<CartLineSnapshot>
        {
            new(Guid.NewGuid(), null, "P", 1_000_000m, 1),
        };
        var customer = new CustomerContext(Guid.NewGuid(), CustomerGroup: "Business",
            PreviousOrderCount: 1, IsFirstOrder: false);
        var ctx = new PricingContext(lines, customer);

        MakeEvaluator().Evaluate(p, ctx).IsApplicable.Should().BeFalse();
    }

    [Fact]
    public void Rule_DayOfWeek_KhongKhop_NotApplicable()
    {
        var p = ActivePromo(PromotionDiscountType.Fixed, 100_000m);
        // Cấu hình chỉ áp ngày nào không phải hôm nay.
        var today = (int)DateTime.UtcNow.DayOfWeek;
        var otherDays = string.Join(",",
            Enumerable.Range(0, 7).Where(d => d != today));
        p.AddCondition(ConditionType.DayOfWeek, ConditionOperator.In, $"[{otherDays}]");
        var ctx = CtxWith((500_000m, 1));

        MakeEvaluator().Evaluate(p, ctx).IsApplicable.Should().BeFalse();
    }

    [Fact]
    public void Promotion_ChuaActive_NotApplicable()
    {
        // Không gọi Activate → Status = Draft.
        var p = Promotion.Create(
            code: "DRAFT", name: "d", description: null,
            type: PromotionType.Code,
            startAt: DateTime.UtcNow.AddMinutes(-1),
            endAt: DateTime.UtcNow.AddDays(1),
            discountType: PromotionDiscountType.Fixed,
            discountValue: 100_000m,
            maxDiscountAmount: null);
        var ctx = CtxWith((500_000m, 1));

        MakeEvaluator().Evaluate(p, ctx).IsApplicable.Should().BeFalse();
    }

    [Fact]
    public void Promotion_AudienceTagKhacNhomKhach_NotApplicable()
    {
        var p = Promotion.Create(
            code: "STUDENT", name: "s", description: null,
            type: PromotionType.Code,
            startAt: DateTime.UtcNow.AddMinutes(-1),
            endAt: DateTime.UtcNow.AddDays(1),
            discountType: PromotionDiscountType.Fixed,
            discountValue: 100_000m,
            maxDiscountAmount: null,
            audienceTag: "Student");
        p.Activate();
        var customer = new CustomerContext(Guid.NewGuid(), CustomerGroup: "Business",
            PreviousOrderCount: 1, IsFirstOrder: false);
        var ctx = new PricingContext(
            new List<CartLineSnapshot> { new(Guid.NewGuid(), null, "P", 1_000_000m, 1) },
            customer);

        MakeEvaluator().Evaluate(p, ctx).IsApplicable.Should().BeFalse();
    }

    [Fact]
    public void PricingContext_KhongTinhGiftVaoSubtotal()
    {
        var lines = new List<CartLineSnapshot>
        {
            new(Guid.NewGuid(), null, "P1", 1_000_000m, 1),
            new(Guid.NewGuid(), null, "Gift", 500_000m, 1, IsGift: true), // Không tính
        };
        var ctx = new PricingContext(lines, BasicCustomer());

        ctx.Subtotal.Should().Be(1_000_000m);
    }
}
