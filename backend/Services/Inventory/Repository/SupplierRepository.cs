using BuildingBlocks.Repository;
using InventoryModule.Domain;
using InventoryModule.DTOs;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Repository;

public class SupplierRepository : Repository<Supplier, Guid, InventoryDbContext>
{
    public SupplierRepository(InventoryDbContext context) : base(context)
    {
    }

    protected override IQueryable<Supplier> ApplySearch(IQueryable<Supplier> query, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return query;
        }

        var searchLower = search.ToLower();
        return query.Where(s =>
            s.Code.ToLower().Contains(searchLower) ||
            s.Name.ToLower().Contains(searchLower) ||
            (s.ShortName != null && s.ShortName.ToLower().Contains(searchLower)) ||
            s.ContactPerson.ToLower().Contains(searchLower) ||
            s.Email.ToLower().Contains(searchLower) ||
            s.Phone.Contains(search) ||
            (s.TaxCode != null && s.TaxCode.Contains(search)) ||
            s.Address.ToLower().Contains(searchLower) ||
            (s.City != null && s.City.ToLower().Contains(searchLower))
        );
    }

    public async Task<bool> HasActivePurchaseOrders(Guid supplierId, CancellationToken cancellationToken = default)
    {
        return await _context.PurchaseOrders
            .AnyAsync(po => po.SupplierId == supplierId && po.IsActive, cancellationToken);
    }

    /// <summary>
    /// Tự động sinh mã nhà cung cấp theo format NCC-XXXX
    /// </summary>
    public async Task<string> GenerateSupplierCodeAsync()
    {
        var lastSupplier = await _context.Set<Supplier>()
            .OrderByDescending(s => s.Code)
            .FirstOrDefaultAsync();

        if (lastSupplier == null || string.IsNullOrEmpty(lastSupplier.Code))
        {
            return "NCC-0001";
        }

        // Parse the last code
        var lastCode = lastSupplier.Code;
        if (lastCode.StartsWith("NCC-") && int.TryParse(lastCode.Substring(4), out int lastNumber))
        {
            return $"NCC-{(lastNumber + 1):D4}";
        }

        // Fallback: count existing + 1
        var count = await _context.Set<Supplier>().CountAsync();
        return $"NCC-{(count + 1):D4}";
    }

    /// <summary>
    /// Kiểm tra mã số thuế đã tồn tại chưa
    /// </summary>
    public async Task<bool> TaxCodeExistsAsync(string taxCode, Guid? excludeId = null)
    {
        if (string.IsNullOrEmpty(taxCode)) return false;

        var query = _context.Set<Supplier>().Where(s => s.TaxCode == taxCode);
        if (excludeId.HasValue)
        {
            query = query.Where(s => s.Id != excludeId.Value);
        }
        return await query.AnyAsync();
    }

    /// <summary>
    /// Kiểm tra email đã tồn tại chưa
    /// </summary>
    public async Task<bool> EmailExistsAsync(string email, Guid? excludeId = null)
    {
        var query = _context.Set<Supplier>().Where(s => s.Email == email);
        if (excludeId.HasValue)
        {
            query = query.Where(s => s.Id != excludeId.Value);
        }
        return await query.AnyAsync();
    }

    /// <summary>
    /// Lấy thống kê nhà cung cấp
    /// </summary>
    public async Task<SupplierStatistics> GetStatisticsAsync()
    {
        var suppliers = await _context.Set<Supplier>().ToListAsync();

        var byType = suppliers
            .GroupBy(s => s.SupplierType)
            .ToDictionary(
                g => SupplierEnumHelper.GetSupplierTypeDisplay(g.Key),
                g => g.Count()
            );

        var byPaymentTerms = suppliers
            .GroupBy(s => s.PaymentTerms)
            .ToDictionary(
                g => SupplierEnumHelper.GetPaymentTermsDisplay(g.Key),
                g => g.Count()
            );

        return new SupplierStatistics(
            TotalSuppliers: suppliers.Count,
            ActiveSuppliers: suppliers.Count(s => s.IsActive),
            InactiveSuppliers: suppliers.Count(s => !s.IsActive),
            TotalDebt: suppliers.Sum(s => s.CurrentDebt),
            TotalCreditLimit: suppliers.Sum(s => s.CreditLimit),
            SuppliersWithDebt: suppliers.Count(s => s.CurrentDebt > 0),
            SuppliersOverCreditLimit: suppliers.Count(s => s.CreditLimit > 0 && s.CurrentDebt > s.CreditLimit),
            ByType: byType,
            ByPaymentTerms: byPaymentTerms
        );
    }

    /// <summary>
    /// Lấy danh sách nhà cung cấp theo loại
    /// </summary>
    public async Task<List<Supplier>> GetByTypeAsync(SupplierType type)
    {
        return await _context.Set<Supplier>()
            .Where(s => s.SupplierType == type && s.IsActive)
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy danh sách nhà cung cấp đang có công nợ
    /// </summary>
    public async Task<List<Supplier>> GetSuppliersWithDebtAsync()
    {
        return await _context.Set<Supplier>()
            .Where(s => s.CurrentDebt > 0 && s.IsActive)
            .OrderByDescending(s => s.CurrentDebt)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy danh sách nhà cung cấp vượt hạn mức công nợ
    /// </summary>
    public async Task<List<Supplier>> GetOverCreditLimitSuppliersAsync()
    {
        return await _context.Set<Supplier>()
            .Where(s => s.CreditLimit > 0 && s.CurrentDebt > s.CreditLimit && s.IsActive)
            .OrderByDescending(s => s.CurrentDebt - s.CreditLimit)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy danh sách dropdown cho select
    /// </summary>
    public async Task<List<object>> GetDropdownListAsync(bool activeOnly = true)
    {
        var query = _context.Set<Supplier>().AsQueryable();
        if (activeOnly)
        {
            query = query.Where(s => s.IsActive);
        }

        return await query
            .OrderBy(s => s.Name)
            .Select(s => new { id = s.Id, code = s.Code, name = s.Name, shortName = s.ShortName } as object)
            .ToListAsync();
    }
}
