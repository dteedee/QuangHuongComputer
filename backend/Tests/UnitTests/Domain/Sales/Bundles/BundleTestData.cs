using Catalog.Domain;
using Sales.Application.Pricing.Bundles;

namespace UnitTests.Domain.Sales.Bundles;

/// <summary>Dữ liệu mẫu cho test combo: laptop 20tr + chuột 500k, combo giá cố định 19.9tr.</summary>
internal static class BundleTestData
{
    public static readonly Guid Laptop = Guid.NewGuid();
    public static readonly Guid Mouse = Guid.NewGuid();
    public const decimal LaptopPrice = 20_000_000m;
    public const decimal MousePrice = 500_000m;

    public static ProductBundle FixedCombo(decimal price = 19_900_000m, DateTime? from = null, DateTime? to = null)
    {
        var bundle = new ProductBundle("Laptop + chuột", "", price, LaptopPrice + MousePrice, null, from, to);
        bundle.AddItem(Laptop, true, 1, LaptopPrice);
        bundle.AddItem(Mouse, false, 1, MousePrice);
        return bundle;
    }

    public static ProductBundle PercentCombo(decimal percent)
    {
        var bundle = new ProductBundle("Combo %", "", 0m, LaptopPrice + MousePrice, null, discountPercent: percent);
        bundle.AddItem(Laptop, true, 1, LaptopPrice);
        bundle.AddItem(Mouse, false, 1, MousePrice);
        return bundle;
    }

    public static List<BundleCartLine> ComboLines(Guid bundleId, int sets = 1) => new()
    {
        new BundleCartLine(0, Laptop, null, LaptopPrice, sets, bundleId),
        new BundleCartLine(1, Mouse, null, MousePrice, sets, bundleId),
    };

    public static Dictionary<Guid, ProductBundle> Map(params ProductBundle[] bundles) => bundles.ToDictionary(b => b.Id);
}
