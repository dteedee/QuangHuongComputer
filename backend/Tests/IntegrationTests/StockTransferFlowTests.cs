using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BuildingBlocks.Security;
using FluentAssertions;
using IntegrationTests.Infrastructure;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Chuyển kho trên Postgres thật: tồn + serial đi đúng ở từng bước, nhận thiếu, huỷ sau khi xuất
/// bị chặn, và hai lần "Xuất kho" đồng thời chỉ trừ tồn MỘT lần (token xmin của phiếu).
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class StockTransferFlowTests
{
    private readonly IntegrationTestFixture _fixture;

    public StockTransferFlowTests(IntegrationTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = "Chuyển kho: serial đang chuyển không bán được, nhận thiếu ghi đúng tồn + serial + giá vốn")]
    public async Task XuatNhanCoChenhLech_TonVaSerialDiDung()
    {
        var scene = await TestTransferData.CreateAsync(_fixture, quantity: 3);
        using var client = await AdminClientAsync();
        var picked = scene.Serials.Take(2).ToList();

        var id = await CreateAsync(client, scene, 2, picked);
        (await client.PutAsync($"/api/inventory/transfers/{id}/approve", null)).StatusCode.Should().Be(HttpStatusCode.OK);
        var ship = await client.PutAsync($"/api/inventory/transfers/{id}/ship", null);
        ship.StatusCode.Should().Be(HttpStatusCode.OK, await ship.Content.ReadAsStringAsync());

        await using (var db = Inventory())
        {
            (await QtyAsync(db, scene.ProductId, scene.FromWarehouseId)).Should().Be(1);
            (await QtyAsync(db, scene.ProductId, scene.ToWarehouseId)).Should().BeNull("chưa nhận thì kho đích chưa có gì");
            (await SerialsAsync(db, picked)).Should().OnlyContain(s => s.Status == SerialStatus.InTransit);
        }

        var itemId = await FirstItemIdAsync(client, id);
        var receive = await client.PutAsJsonAsync($"/api/inventory/transfers/{id}/receive", new
        {
            lines = new[] { new { itemId, receivedQuantity = 1, receivedSerials = new[] { picked[0] } } },
            note = "Thiếu 1 máy khi mở thùng",
        });
        receive.StatusCode.Should().Be(HttpStatusCode.OK, await receive.Content.ReadAsStringAsync());

        await using (var db = Inventory())
        {
            (await QtyAsync(db, scene.ProductId, scene.ToWarehouseId)).Should().Be(1);
            var serials = await SerialsAsync(db, picked);
            serials.Single(s => s.Serial == picked[0]).Should().Match<SerialNumber>(s =>
                s.Status == SerialStatus.InStock && s.WarehouseId == scene.ToWarehouseId);
            serials.Single(s => s.Serial == picked[1]).Status.Should().Be(SerialStatus.InTransit, "máy thiếu vẫn phải truy được");
            var transferIn = await db.StockMovements.SingleAsync(m =>
                m.ReferenceId == id.ToString() && m.ReasonCode == StockMovementReason.TransferIn);
            transferIn.Quantity.Should().Be(1);
            transferIn.UnitCost.Should().Be(scene.UnitCost, "giá vốn đi theo bút toán xuất");
        }

        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/inventory/transfers/{id}");
        detail.GetProperty("hasDiscrepancy").GetBoolean().Should().BeTrue();
        detail.GetProperty("items")[0].GetProperty("shortage").GetInt32().Should().Be(1);
    }

    [Fact(DisplayName = "Chuyển kho: hàng theo dõi serial mà không chọn serial thì không lập được phiếu")]
    public async Task HangSerial_ThieuSerial_BiTuChoi()
    {
        var scene = await TestTransferData.CreateAsync(_fixture, quantity: 2);
        using var client = await AdminClientAsync();

        var response = await client.PostAsJsonAsync("/api/inventory/transfers", Body(scene, 1, null));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest, await response.Content.ReadAsStringAsync());
    }

    [Fact(DisplayName = "Chuyển kho: đã xuất thì không huỷ được (bản cũ huỷ được và làm mất hàng)")]
    public async Task HuySauKhiXuat_409()
    {
        var scene = await TestTransferData.CreateAsync(_fixture, quantity: 2, serialTracked: false);
        using var client = await AdminClientAsync();
        var id = await CreateAsync(client, scene, 1, null);
        await client.PutAsync($"/api/inventory/transfers/{id}/approve", null);
        await client.PutAsync($"/api/inventory/transfers/{id}/ship", null);

        var cancel = await client.PutAsync($"/api/inventory/transfers/{id}/cancel", null);

        cancel.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "Chuyển kho: hai lần Xuất kho đồng thời chỉ trừ tồn một lần")]
    public async Task XuatDongThoi_ChiTruTonMotLan()
    {
        var scene = await TestTransferData.CreateAsync(_fixture, quantity: 10, serialTracked: false);
        using var client = await AdminClientAsync();
        var id = await CreateAsync(client, scene, 4, null);
        await client.PutAsync($"/api/inventory/transfers/{id}/approve", null);

        using var second = await AdminClientAsync();
        var results = await Task.WhenAll(
            client.PutAsync($"/api/inventory/transfers/{id}/ship", null),
            second.PutAsync($"/api/inventory/transfers/{id}/ship", null));

        results.Count(r => r.StatusCode == HttpStatusCode.OK).Should().Be(1);
        results.Should().ContainSingle(r => r.StatusCode == HttpStatusCode.Conflict);
        await using var db = Inventory();
        (await QtyAsync(db, scene.ProductId, scene.FromWarehouseId)).Should().Be(6);
        (await db.StockMovements.CountAsync(m => m.ReferenceId == id.ToString()
            && m.ReasonCode == StockMovementReason.TransferOut)).Should().Be(1);
    }

    private async Task<HttpClient> AdminClientAsync() =>
        TestAuthentication.ClientFor(_fixture, await TestAuthentication.SharedAccountAsync(_fixture, Roles.Admin));

    private static object Body(TransferScene scene, int quantity, List<string>? serials) => new
    {
        fromWarehouseId = scene.FromWarehouseId,
        toWarehouseId = scene.ToWarehouseId,
        items = new[] { new { inventoryItemId = scene.SourceItemId, quantity, serialNumbers = serials } },
        notes = "Test tích hợp",
    };

    private static async Task<Guid> CreateAsync(HttpClient client, TransferScene scene, int quantity, List<string>? serials)
    {
        var response = await client.PostAsJsonAsync("/api/inventory/transfers", Body(scene, quantity, serials));
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.Created, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }

    private static async Task<Guid> FirstItemIdAsync(HttpClient client, Guid id) =>
        (await client.GetFromJsonAsync<JsonElement>($"/api/inventory/transfers/{id}"))
            .GetProperty("items")[0].GetProperty("id").GetGuid();

    private InventoryDbContext Inventory() =>
        _fixture.CreateScope().ServiceProvider.GetRequiredService<InventoryDbContext>();

    private static Task<int?> QtyAsync(InventoryDbContext db, Guid productId, Guid warehouseId) =>
        db.InventoryItems.AsNoTracking()
            .Where(i => i.ProductId == productId && i.WarehouseId == warehouseId && i.VariantId == null)
            .Select(i => (int?)i.QuantityOnHand).FirstOrDefaultAsync();

    private static Task<List<SerialNumber>> SerialsAsync(InventoryDbContext db, IReadOnlyCollection<string> serials) =>
        db.SerialNumbers.AsNoTracking().Where(s => serials.Contains(s.Serial)).ToListAsync();
}
