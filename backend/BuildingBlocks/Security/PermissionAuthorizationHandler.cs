using Microsoft.AspNetCore.Authorization;

namespace BuildingBlocks.Security;

public class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }

    public PermissionRequirement(string permission)
    {
        Permission = permission;
    }
}

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, 
        PermissionRequirement requirement)
    {
        // Permissions are stored as claims of type Permissions.PermissionType ("Permission").
        var permissions = context.User.FindAll(Permissions.PermissionType).Select(x => x.Value);

        if (permissions.Contains(requirement.Permission))
        {
            context.Succeed(requirement);
        }

        // Also check if the user is an Admin (Admin has all permissions)
        if (context.User.IsInRole(Roles.Admin))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

public class HasPermissionAttribute : AuthorizeAttribute
{
    public HasPermissionAttribute(string permission) : base(policy: permission)
    {
    }
}
