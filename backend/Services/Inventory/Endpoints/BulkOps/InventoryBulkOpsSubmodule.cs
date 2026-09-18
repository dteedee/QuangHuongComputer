using InventoryModule.Endpoints;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace InventoryModule.Endpoints.BulkOps;

/// <summary>
/// phase-67 (W2-18) entry point: opening balances, supplier import, label data. One
/// <see cref="IInventorySubmodule"/>, auto-discovered by <c>InventorySubmodules.Discover()</c> —
/// nothing else in the Inventory assembly (not <c>InventoryEndpoints.cs</c>, not
/// <c>DependencyInjection.cs</c>) had to change to add this group.
///
/// <para>
/// Unlike Catalog's <c>ICatalogSubmodule</c>, <c>IInventorySubmodule</c> has no <c>Register
/// (IServiceCollection)</c> hook, so this track's application services are never DI-registered —
/// every endpoint below constructs its own service by hand from already-registered building
/// blocks (<c>InventoryDbContext</c>, <c>CatalogDbContext</c>, <c>IStockLedger</c>,
/// <c>ICacheService</c>), the same way <c>QuickReceiveEndpoints</c> builds
/// <c>GoodsReceiptService</c> via <c>GrnInspectionEndpoints.BuildService(...)</c>. Filed as an
/// integration request so a future track can add the hook once, in <c>InventorySubmodule.cs</c>.
/// </para>
/// </summary>
public sealed class InventoryBulkOpsSubmodule : IInventorySubmodule
{
    public int Order => 60;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/bulk");
        group.MapOpeningBalanceEndpoints();
        group.MapSupplierImportEndpoints();
        group.MapLabelDataEndpoints();
    }
}
