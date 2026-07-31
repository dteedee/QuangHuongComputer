using System.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using SystemConfig.Domain;
using SystemConfig.Infrastructure;

namespace SystemConfig;

/// <summary>
/// Store endpoints — chi nhánh cửa hàng.
/// GET /api/stores là public (khách tra), CRUD/quản lý còn lại yêu cầu Admin/Manager.
/// Public không lộ:
///  - Số tồn chính xác (chỉ trả Còn / Sắp hết / Hết)
///  - Danh sách nhân viên
///  - Warehouse chi tiết
/// </summary>
public static class StoreEndpoints
{
    public static void MapStoreEndpoints(this IEndpointRouteBuilder app)
    {
        var publicGroup = app.MapGroup("/api/stores");
        var adminGroup = app.MapGroup("/api/admin/stores")
            .RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));

        // === PUBLIC ===

        // GET /api/stores — danh sách chi nhánh cho khách
        publicGroup.MapGet("", async (SystemConfigDbContext db) =>
        {
            var stores = await db.Stores
                .Where(s => s.IsActive)
                .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
                .Select(s => new StorePublicDto(
                    s.Id, s.Code, s.Name, s.Address, s.Ward, s.District, s.Province,
                    s.Phone, s.OpeningHoursJson, s.Latitude, s.Longitude, s.IsPickupPoint))
                .ToListAsync();
            return Results.Ok(stores);
        });

        // GET /api/stores/{id} — chi tiết 1 chi nhánh (public)
        publicGroup.MapGet("{id:guid}", async (Guid id, SystemConfigDbContext db) =>
        {
            var s = await db.Stores.FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
            if (s == null) return Results.NotFound();
            return Results.Ok(new StorePublicDto(
                s.Id, s.Code, s.Name, s.Address, s.Ward, s.District, s.Province,
                s.Phone, s.OpeningHoursJson, s.Latitude, s.Longitude, s.IsPickupPoint));
        });

        // GET /api/stores/{id}/stock/{productId} — tồn theo chi nhánh (public)
        // Không trả số chính xác — chỉ Còn / Sắp hết / Hết. Query qua raw SQL để không import Inventory entity.
        publicGroup.MapGet("{id:guid}/stock/{productId:guid}", async (Guid id, Guid productId, SystemConfigDbContext db) =>
        {
            var warehouseIds = await db.StoreWarehouses
                .Where(w => w.StoreId == id)
                .Select(w => w.WarehouseId)
                .ToListAsync();
            if (!warehouseIds.Any())
                return Results.Ok(new { productId, storeId = id, status = "OutOfStock" });

            var totalOnHand = await QueryStockAtWarehousesAsync(db, productId, warehouseIds);
            var status = totalOnHand switch
            {
                <= 0 => "OutOfStock",
                <= 3 => "LowStock",
                _ => "InStock"
            };
            return Results.Ok(new { productId, storeId = id, status });
        });

        // === ADMIN CRUD ===

        adminGroup.MapGet("", async (SystemConfigDbContext db) =>
        {
            var stores = await db.Stores
                .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
                .Include(s => s.Warehouses)
                .Include(s => s.Employees)
                .ToListAsync();
            return Results.Ok(stores.Select(ToAdminDto));
        });

        adminGroup.MapGet("{id:guid}", async (Guid id, SystemConfigDbContext db) =>
        {
            var s = await db.Stores
                .Include(x => x.Warehouses)
                .Include(x => x.Employees)
                .FirstOrDefaultAsync(x => x.Id == id);
            return s == null ? Results.NotFound() : Results.Ok(ToAdminDto(s));
        });

        adminGroup.MapPost("", async (CreateStoreDto dto, SystemConfigDbContext db) =>
        {
            if (await db.Stores.AnyAsync(s => s.Code == dto.Code))
                return Results.BadRequest(new { error = "Mã chi nhánh đã tồn tại" });

            var store = new Store(
                dto.Code, dto.Name, dto.Address, dto.Phone,
                dto.Province, dto.District, dto.Ward, dto.Email,
                dto.Latitude, dto.Longitude, dto.IsPickupPoint, dto.SortOrder);

            if (!string.IsNullOrWhiteSpace(dto.OpeningHoursJson))
                store.SetOpeningHours(dto.OpeningHoursJson);

            if (dto.WarehouseIds != null)
                foreach (var wid in dto.WarehouseIds.Distinct())
                    store.AssignWarehouse(wid);

            if (dto.EmployeeIds != null)
                foreach (var eid in dto.EmployeeIds.Distinct())
                    store.AssignEmployee(eid);

            db.Stores.Add(store);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/stores/{store.Id}", ToAdminDto(store));
        });

        adminGroup.MapPut("{id:guid}", async (Guid id, UpdateStoreDto dto, SystemConfigDbContext db) =>
        {
            var store = await db.Stores
                .Include(s => s.Warehouses)
                .Include(s => s.Employees)
                .FirstOrDefaultAsync(s => s.Id == id);
            if (store == null) return Results.NotFound();

            store.UpdateBasicInfo(
                dto.Name, dto.Address, dto.Phone,
                dto.Ward, dto.District, dto.Province,
                dto.Email, dto.Latitude, dto.Longitude,
                dto.IsPickupPoint, dto.SortOrder);

            if (dto.OpeningHoursJson != null)
                store.SetOpeningHours(dto.OpeningHoursJson);

            if (dto.WarehouseIds != null)
            {
                // reset assignments
                var current = store.Warehouses.Select(w => w.WarehouseId).ToList();
                foreach (var wid in current.Except(dto.WarehouseIds))
                    store.UnassignWarehouse(wid);
                foreach (var wid in dto.WarehouseIds.Except(current))
                    store.AssignWarehouse(wid);
            }

            if (dto.EmployeeIds != null)
            {
                var current = store.Employees.Select(e => e.EmployeeId).ToList();
                foreach (var eid in current.Except(dto.EmployeeIds))
                    store.UnassignEmployee(eid);
                foreach (var eid in dto.EmployeeIds.Except(current))
                    store.AssignEmployee(eid);
            }

            await db.SaveChangesAsync();
            return Results.Ok(ToAdminDto(store));
        });

        adminGroup.MapPost("{id:guid}/toggle-active", async (Guid id, SystemConfigDbContext db) =>
        {
            var s = await db.Stores.FirstOrDefaultAsync(x => x.Id == id);
            if (s == null) return Results.NotFound();
            if (s.IsActive) s.Deactivate(); else s.Activate();
            await db.SaveChangesAsync();
            return Results.Ok(new { s.Id, s.IsActive });
        });

        adminGroup.MapDelete("{id:guid}", async (Guid id, SystemConfigDbContext db) =>
        {
            var s = await db.Stores.FirstOrDefaultAsync(x => x.Id == id);
            if (s == null) return Results.NotFound();
            db.Stores.Remove(s);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    /// <summary>Query tổng tồn (QuantityOnHand - ReservedQuantity) của product tại nhiều warehouse — raw SQL.</summary>
    private static async Task<int> QueryStockAtWarehousesAsync(SystemConfigDbContext db, Guid productId, List<Guid> warehouseIds)
    {
        try
        {
            var conn = db.Database.GetDbConnection();
            var opened = conn.State != ConnectionState.Open;
            if (opened) await conn.OpenAsync();
            try
            {
                using var cmd = conn.CreateCommand();
                var placeholders = string.Join(",", warehouseIds.Select((_, i) => $"@w{i}"));
                cmd.CommandText =
                    $@"SELECT COALESCE(SUM(""QuantityOnHand"" - ""ReservedQuantity""), 0)
                       FROM ""InventoryItems""
                       WHERE ""ProductId"" = @productId
                         AND ""WarehouseId"" IN ({placeholders})
                         AND ""IsActive"" = TRUE";
                var pProduct = cmd.CreateParameter();
                pProduct.ParameterName = "@productId";
                pProduct.Value = productId;
                cmd.Parameters.Add(pProduct);
                for (int i = 0; i < warehouseIds.Count; i++)
                {
                    var p = cmd.CreateParameter();
                    p.ParameterName = $"@w{i}";
                    p.Value = warehouseIds[i];
                    cmd.Parameters.Add(p);
                }
                var result = await cmd.ExecuteScalarAsync();
                return result == null || result == DBNull.Value ? 0 : Convert.ToInt32(result);
            }
            finally
            {
                if (opened) await conn.CloseAsync();
            }
        }
        catch
        {
            // Bảng chưa tồn tại (test InMemory) → coi như hết hàng, không lộ lỗi cho public.
            return 0;
        }
    }

    private static StoreAdminDto ToAdminDto(Store s) => new(
        s.Id, s.Code, s.Name, s.Address, s.Ward, s.District, s.Province,
        s.Phone, s.Email, s.OpeningHoursJson, s.Latitude, s.Longitude,
        s.IsActive, s.IsPickupPoint, s.SortOrder,
        s.Warehouses.Select(w => w.WarehouseId).ToList(),
        s.Employees.Select(e => e.EmployeeId).ToList());
}

public record StorePublicDto(
    Guid Id, string Code, string Name, string Address,
    string? Ward, string? District, string? Province,
    string Phone, string OpeningHoursJson,
    decimal? Latitude, decimal? Longitude, bool IsPickupPoint);

public record StoreAdminDto(
    Guid Id, string Code, string Name, string Address,
    string? Ward, string? District, string? Province,
    string Phone, string? Email, string OpeningHoursJson,
    decimal? Latitude, decimal? Longitude,
    bool IsActive, bool IsPickupPoint, int SortOrder,
    List<Guid> WarehouseIds, List<Guid> EmployeeIds);

public record CreateStoreDto(
    string Code, string Name, string Address, string Phone,
    string? Ward, string? District, string? Province,
    string? Email, decimal? Latitude, decimal? Longitude,
    bool IsPickupPoint = true, int SortOrder = 0,
    string? OpeningHoursJson = null,
    List<Guid>? WarehouseIds = null,
    List<Guid>? EmployeeIds = null);

public record UpdateStoreDto(
    string Name, string Address, string Phone,
    string? Ward, string? District, string? Province,
    string? Email, decimal? Latitude, decimal? Longitude,
    bool IsPickupPoint = true, int SortOrder = 0,
    string? OpeningHoursJson = null,
    List<Guid>? WarehouseIds = null,
    List<Guid>? EmployeeIds = null);
