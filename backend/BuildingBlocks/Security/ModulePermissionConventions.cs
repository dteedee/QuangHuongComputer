using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace BuildingBlocks.Security;

/// <summary>
/// Helper để gắn policy permission cho cả một nhóm endpoint theo HTTP verb (W1-1).
/// Nhờ nó, W1-10 chỉ phải sửa một dòng cho mỗi <c>MapGroup</c> thay vì từng endpoint.
/// </summary>
public static class ModulePermissionConventions
{
    /// <summary>
    /// GET -> <c>X.View</c>, POST -> <c>X.Create</c>, PUT/PATCH -> <c>X.Edit</c>,
    /// DELETE -> <c>X.Delete</c>. Endpoint đã tự khai báo <c>[Authorize]</c>/
    /// <c>RequireAuthorization(policy)</c> hoặc <c>AllowAnonymous</c> thì được giữ nguyên —
    /// khai báo tường minh tại endpoint luôn thắng convention của group.
    /// </summary>
    public static TBuilder RequireModulePermissions<TBuilder>(this TBuilder builder, ModulePermissionSet module)
        where TBuilder : IEndpointConventionBuilder
    {
        // PHẢI dùng Finally, KHÔNG dùng Add: convention của MapGroup chạy TRƯỚC convention
        // của từng endpoint, nên với Add thì lúc kiểm tra, metadata .RequireAuthorization(...)
        // / .AllowAnonymous() của endpoint chưa tồn tại — hai lệnh return bên dưới thành code
        // chết và policy của group bị AND thêm vào policy tường minh (đo được 2026-09-18).
        // Finally chạy sau MỌI convention nên nhìn thấy metadata đầy đủ.
        builder.Finally(endpointBuilder =>
        {
            if (endpointBuilder.Metadata.OfType<IAllowAnonymous>().Any()) return;
            if (endpointBuilder.Metadata.OfType<IAuthorizeData>().Any(a => !string.IsNullOrEmpty(a.Policy))) return;

            var methods = endpointBuilder.Metadata.OfType<HttpMethodMetadata>()
                .SelectMany(m => m.HttpMethods)
                .ToList();

            var permission = methods.Count > 0 ? module.ForMethods(methods) : module.Edit;
            endpointBuilder.Metadata.Add(new AuthorizeAttribute(permission));
        });

        return builder;
    }

    /// <summary>
    /// Bắt buộc một permission duy nhất cho mọi endpoint của nhóm — dùng cho nhóm
    /// hành động đặc biệt (duyệt, xuất file, POS...) nơi ánh xạ theo verb không đúng.
    /// </summary>
    public static TBuilder RequirePermission<TBuilder>(this TBuilder builder, string permission)
        where TBuilder : IEndpointConventionBuilder
    {
        builder.Finally(endpointBuilder =>
        {
            if (endpointBuilder.Metadata.OfType<IAllowAnonymous>().Any()) return;
            endpointBuilder.Metadata.Add(new AuthorizeAttribute(permission));
        });

        return builder;
    }
}
