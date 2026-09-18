using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Security;
using BuildingBlocks.SharedKernel;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sales.Domain;
using Sales.Infrastructure;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Content.Infrastructure;
using Content.Domain;
using Sales.Application.Pricing;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Sales.Endpoints.Carts;

/// <summary>
/// Giỏ hàng. Tách làm hai theo hướng đọc/ghi để mỗi file dưới 200 dòng:
/// <see cref="CartQueryEndpoints"/> (đọc), <see cref="CartItemEndpoints"/> (dòng hàng),
/// <see cref="CartOptionsEndpoints"/> (mã giảm giá, phí ship, xoá giỏ).
/// </summary>
internal static class CartEndpoints
{
    public static void MapCartEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
        CartQueryEndpoints.MapCartQueryEndpoints(group);
        CartItemAddEndpoint.MapCartItemAddEndpoint(group);
        CartItemChangeEndpoints.MapCartItemChangeEndpoints(group);
        CartOptionsEndpoints.MapCartOptionsEndpoints(group);
    }
}
