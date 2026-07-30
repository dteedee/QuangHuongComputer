using MediatR;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;
using InventoryModule.Infrastructure;

namespace Sales.Application.Carts.Commands.AddToCart;

public class AddToCartCommandHandler : IRequestHandler<AddToCartCommand, Guid>
{
    private readonly SalesDbContext _context;
    private readonly InventoryDbContext _inventoryContext;

    public AddToCartCommandHandler(SalesDbContext context, InventoryDbContext inventoryContext)
    {
        _context = context;
        _inventoryContext = inventoryContext;
    }

    public async Task<Guid> Handle(AddToCartCommand request, CancellationToken cancellationToken)
    {
        // 1. Kiểm tra tồn kho — ưu tiên tồn theo biến thể nếu có VariantId,
        //    ngược lại rơi về tồn tổng (VariantId=null) để tương thích code cũ.
        var inventoryItem = await FindInventoryItemAsync(request.ProductId, request.VariantId, cancellationToken);

        if (inventoryItem == null)
            throw new InvalidOperationException("Sản phẩm không tồn tại trong kho");

        if (inventoryItem.AvailableQuantity < request.Quantity)
            throw new InvalidOperationException($"Không đủ hàng trong kho. Còn lại: {inventoryItem.AvailableQuantity}");

        // 2. Lấy hoặc tạo giỏ hàng
        var cart = await _context.Carts
            .FirstOrDefaultAsync(c => c.CustomerId == request.CustomerId, cancellationToken);

        if (cart == null)
        {
            cart = new Cart(request.CustomerId);
            _context.Carts.Add(cart);
        }

        // 3. Dòng giỏ hàng unique theo (ProductId, VariantId) — không gộp khác biến thể.
        var existingItem = cart.Items.FirstOrDefault(i =>
            i.ProductId == request.ProductId && i.VariantId == request.VariantId);
        var totalQuantity = request.Quantity + (existingItem?.Quantity ?? 0);

        if (inventoryItem.AvailableQuantity < totalQuantity)
            throw new InvalidOperationException($"Không đủ hàng trong kho. Còn lại: {inventoryItem.AvailableQuantity}");

        // 4. Reserve stock trong Inventory
        try
        {
            inventoryItem.ReserveStock(request.Quantity);

            // 5. Tạo reservation record
            var reservation = new InventoryModule.Domain.StockReservation(
                inventoryItem.Id,
                request.ProductId,
                request.Quantity,
                cart.Id.ToString(),
                "Cart",
                24, // Hết hạn sau 24 giờ
                $"Reserved for cart {cart.Id}"
            );

            _inventoryContext.StockReservations.Add(reservation);
            await _inventoryContext.SaveChangesAsync(cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException($"Không thể đặt trước hàng: {ex.Message}");
        }

        // 6. Thêm vào giỏ hàng (kèm snapshot biến thể)
        cart.AddItem(
            request.ProductId,
            request.ProductName,
            request.Price,
            request.Quantity,
            request.VariantId,
            request.VariantName,
            request.VariantSku);
        await _context.SaveChangesAsync(cancellationToken);

        return cart.Id;
    }

    // Tách hàm để giảm nesting; nullable VariantId khớp chính xác (kể cả null-with-null).
    private async Task<InventoryModule.Domain.InventoryItem?> FindInventoryItemAsync(
        Guid productId, Guid? variantId, CancellationToken ct)
    {
        return await _inventoryContext.InventoryItems
            .FirstOrDefaultAsync(i => i.ProductId == productId && i.VariantId == variantId, ct);
    }
}
