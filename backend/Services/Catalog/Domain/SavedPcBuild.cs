namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// Cấu hình PC đã lưu. Hai loại dùng chung bảng:
///  · build của KHÁCH (<see cref="CustomerId"/> có giá trị) — riêng tư, xem theo mã chia sẻ;
///  · "Cấu hình mẫu" của CỬA HÀNG (<see cref="CustomerId"/> = null, có <see cref="UseCaseTag"/>) —
///    bản SAO do nhân viên tạo từ một build đã lưu (<see cref="CreateGalleryCopy"/>). Build của khách
///    không bao giờ bị sửa hay công khai; các cờ gallery chỉ đổi được qua API quản trị.
/// Quy tắc hiển thị công khai: <see cref="SavedPcBuildGallery.IsPubliclyVisible"/>.
/// </summary>
public partial class SavedPcBuild : Entity<Guid>
{
    public Guid? CustomerId { get; private set; }
    public string BuildCode { get; private set; }
    public string Name { get; private set; }
    public decimal TotalPrice { get; private set; }
    public int TotalWattage { get; private set; }
    public bool IsCompatible { get; private set; }
    public string? CompatibilityIssues { get; private set; } // JSON array of issue strings

    private readonly List<SavedPcBuildItem> _items = new();
    public IReadOnlyCollection<SavedPcBuildItem> Items => _items.AsReadOnly();

    protected SavedPcBuild() { }

    public SavedPcBuild(Guid? customerId, string name)
    {
        Id = Guid.NewGuid();
        CustomerId = customerId;
        BuildCode = GenerateBuildCode();
        Name = string.IsNullOrWhiteSpace(name) ? $"PC Build {DateTime.UtcNow:MMddyyyy}" : name;
        TotalPrice = 0;
        TotalWattage = 0;
        IsCompatible = true;
        IsActive = true;
    }

    public void AddItem(Guid productId, string componentType, int quantity, decimal unitPrice)
    {
        var existing = _items.FirstOrDefault(i => i.ProductId == productId);
        if (existing != null)
        {
            existing.UpdateQuantity(existing.Quantity + quantity);
        }
        else
        {
            var item = new SavedPcBuildItem(Id, productId, componentType, quantity, unitPrice);
            _items.Add(item);
        }
        RecalculateTotal();
    }

    public void RemoveItem(Guid productId)
    {
        var item = _items.FirstOrDefault(i => i.ProductId == productId);
        if (item != null)
        {
            _items.Remove(item);
            RecalculateTotal();
        }
    }
    
    public void ClearItems()
    {
        _items.Clear();
        RecalculateTotal();
    }

    public void UpdateCompatibility(bool isCompatible, string? issuesJson, int totalWattage)
    {
        IsCompatible = isCompatible;
        CompatibilityIssues = issuesJson;
        TotalWattage = totalWattage;
    }

    private void RecalculateTotal()
    {
        TotalPrice = _items.Sum(i => i.UnitPrice * i.Quantity);
    }

    private static string GenerateBuildCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 8).Select(s => s[random.Next(s.Length)]).ToArray());
    }
}

public class SavedPcBuildItem : Entity<Guid>
{
    public Guid BuildId { get; private set; }
    public Guid ProductId { get; private set; }
    public string ComponentType { get; private set; } // CPU, Motherboard, RAM, GPU, PSU, Storage, Cooler, Case, etc.
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }

    protected SavedPcBuildItem() { }

    internal SavedPcBuildItem(Guid buildId, Guid productId, string componentType, int quantity, decimal unitPrice)
    {
        Id = Guid.NewGuid();
        BuildId = buildId;
        ProductId = productId;
        ComponentType = componentType;
        Quantity = quantity;
        UnitPrice = unitPrice;
        IsActive = true;
    }

    internal void UpdateQuantity(int quantity)
    {
        Quantity = quantity;
    }
}
