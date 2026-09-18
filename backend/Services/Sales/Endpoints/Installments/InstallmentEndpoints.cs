using BuildingBlocks.Configuration;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using Sales.Application.Inventory;
using Sales.Application.Installments;
using Sales.Application.Orders;
using Sales.Infrastructure;

namespace Sales;

/// <summary>
/// W2-20 — Trả góp chế độ lead (D04 mục 5, D10 quy tắc 6). Điểm mục lục duy nhất; handler thật ở
/// <see cref="Sales.Endpoints.Installments.InstallmentCustomerEndpoints"/> (khách) và
/// <see cref="Sales.Endpoints.Installments.InstallmentAdminEndpoints"/> (nhân viên).
///
/// Gọi trực tiếp từ <c>ApiGateway/Program.cs:104</c> (`app.MapInstallmentEndpoints()`) - KHÔNG qua
/// <c>SalesEndpoints.cs</c>, giữ nguyên chữ ký cũ để không phải sửa file ApiGateway đang đóng băng.
/// </summary>
public static class InstallmentEndpoints
{
    public static void MapInstallmentEndpoints(this IEndpointRouteBuilder app)
    {
        // Khách tự nộp/tra hồ sơ của chính mình -> chỉ cần đăng nhập (handler lọc theo userId).
        var user = app.MapGroup("/api/installment").RequireAuthorization(SecurityPolicies.Authenticated);

        // Duyệt/từ chối hồ sơ trả góp là quyết định nghiệp vụ -> Sales.ManageInstallments
        // (Admin + Manager theo ma trận W1-1; Sale KHÔNG được cấp quyền này).
        var admin = app.MapGroup("/api/admin/installment")
            .RequirePermission(Permissions.Sales.ManageInstallments);

        Sales.Endpoints.Installments.InstallmentCustomerEndpoints.Map(user);
        Sales.Endpoints.Installments.InstallmentAdminEndpoints.Map(admin);
    }

    /// <summary>
    /// <see cref="InstallmentApplicationService"/> (và <see cref="OrderLifecycleService"/> mà nó cần)
    /// KHÔNG đăng ký trong DI - `Sales/DependencyInjection.cs` thuộc sở hữu W2-3 (`plan.md` §6).
    /// Dựng tay từ các dependency ĐÃ đăng ký, giống hệt cách `PosSaleEndpoints.cs` và
    /// `AdminOrderLifecycleRoutes.cs` đang dựng <see cref="OrderLifecycleService"/> (IR #26 của
    /// W2-10 vẫn đang chờ áp — khi được áp thì đổi hai handler dưới thành tham số DI trực tiếp).
    /// </summary>
    internal static InstallmentApplicationService BuildService(
        SalesDbContext db, InventoryDbContext inventoryDb, CatalogDbContext catalogDb,
        InventoryReservationService reservations, IPublishEndpoint publish,
        ILogger<OrderLifecycleService> logger, IAppSettings settings, IBusinessClock clock)
    {
        var lifecycle = new OrderLifecycleService(db, inventoryDb, catalogDb, reservations, publish, logger);
        return new InstallmentApplicationService(db, settings, clock, lifecycle);
    }
}
