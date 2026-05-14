using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;

namespace Sales.Infrastructure.Shipping;

public static class ShippingEndpoints
{
    public static void MapShippingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shipping");

        group.MapPost("/calculate-fee", async (ShippingFeeRequest request, IConfiguration config) =>
        {
            var ghnConfig = new GHNConfig
            {
                Token = config["Shipping:GHN:Token"] ?? "",
                ShopId = config["Shipping:GHN:ShopId"] ?? "",
                Endpoint = config["Shipping:GHN:Endpoint"] ?? "https://dev-online-gateway.ghn.vn/shiip/public-api"
            };
            var ghn = new GHNService(ghnConfig, new HttpClient());
            var result = await ghn.CalculateShippingFee(request.ToDistrictId, request.ToWardCode, request.Weight);
            return Results.Ok(result);
        });

        // GHN webhook for delivery status updates
        app.MapPost("/api/shipping/webhook", async (HttpContext ctx) =>
        {
            // GHN sends status updates here
            // In production: verify token header, update order tracking status
            return Results.Ok(new { success = true });
        }).AllowAnonymous();
    }
}

public record ShippingFeeRequest(int ToDistrictId, string ToWardCode, int Weight = 500);
