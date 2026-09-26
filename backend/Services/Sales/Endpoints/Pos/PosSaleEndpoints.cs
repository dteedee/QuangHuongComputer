using System.Security.Claims;
using BuildingBlocks.Configuration;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Sales.Application.Checkout;
using Sales.Application.Inventory;
using Sales.Application.Orders;
using Sales.Application.Pos;
using Sales.Application.Pricing;
using Sales.Infrastructure;

namespace Sales.Endpoints.Pos;

/// <summary>
/// `POST /pos/quote` (tạm tính) và `POST /pos/orders` (chốt đơn) — phase-48 bước 1-2.
///
/// Hai service của track này được DỰNG TAY trong handler thay vì tiêm qua DI, vì
/// <c>Sales/DependencyInjection.cs</c> thuộc W2-3 và quy tắc sở hữu độc quyền cấm sửa file của
/// track khác. Mọi tham số của chúng đều là dịch vụ đã đăng ký sẵn, nên việc dựng tay hoàn toàn
/// tương đương một lần <c>AddScoped</c>. Xem integration request W2-10 để dọn về DI sau.
/// </summary>
internal static class PosSaleEndpoints
{
    public static void Map(RouteGroupBuilder group)
    {
        var pos = group.MapGroup("/pos");

        pos.MapPost("/quote", async (
            PosQuoteRequest req,
            CatalogDbContext catalogDb,
            IOrderPriceSource priceSource,
            IPricingEngine pricing,
            LineVatProfileResolver vatResolver,
            IBusinessClock clock,
            IConfiguration config,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var quotes = new PosQuoteService(catalogDb, priceSource, pricing, vatResolver, clock, config);
            var (cart, error, products) = await quotes.BuildCartAsync(req.Lines, ct);
            if (cart == null) throw new DomainException(error!);

            var cashierId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            try
            {
                var quote = await quotes.QuoteAsync(
                    cart, products, req.ManualDiscount, null, cashierId,
                    req.PromotionCodes, req.CustomerId, ct);
                return Results.Ok(quote);
            }
            catch (PosDiscountRejectedException ex)
            {
                throw new DomainException(ClientSafeError.Message(ex));
            }
        }).RequireAuthorization(Permissions.Sales.Pos);

        pos.MapPost("/orders", async (
            PosSaleRequest req,
            SalesDbContext db,
            InventoryDbContext inventoryDb,
            CatalogDbContext catalogDb,
            CheckoutOrchestrator checkout,
            InventoryReservationService reservations,
            IOrderPriceSource priceSource,
            IPricingEngine pricing,
            LineVatProfileResolver vatResolver,
            IBusinessClock clock,
            IConfiguration config,
            IAppSettings settings,
            IPublishEndpoint publish,
            ILogger<OrderLifecycleService> logger,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var cashierId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            var mayTakeDeposit = user.FindAll(Permissions.PermissionType)
                .Any(c => c.Value == Permissions.Sales.TakeDeposit);

            var quotes = new PosQuoteService(catalogDb, priceSource, pricing, vatResolver, clock, config);
            var lifecycle = Sales.Endpoints.Orders.OrderLifecycleEndpoints.Build(
                db, inventoryDb, catalogDb, reservations, publish, logger);
            var sales = new PosSaleService(db, inventoryDb, checkout, quotes, lifecycle, settings);

            var outcome = await sales.SellAsync(req, cashierId, mayTakeDeposit, ct);
            if (outcome.Result == null)
            {
                throw outcome.StatusCode switch
                {
                    409 => new ConflictException(outcome.Error!),
                    403 => new ForbiddenException(outcome.Error!),
                    _ => new DomainException(outcome.Error!),
                };
            }

            return Results.Created($"/api/sales/orders/{outcome.Result.OrderId}", outcome.Result);
        }).RequireAuthorization(Permissions.Sales.Pos);
    }
}
