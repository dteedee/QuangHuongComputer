using FluentValidation;
using InventoryModule.Endpoints.Purchasing;

namespace InventoryModule.Application.Purchasing.Validators;

/// <summary>
/// W2-12 bước 5 — validator cho mọi chứng từ mua hàng ghi dữ liệu.
///
/// <para>
/// Trước đây <c>POST /api/inventory/po</c> nhận cả đơn không dòng nào, số lượng 0 hoặc âm và giá
/// âm; hai check constraint của W2-5 (<c>CK_PurchaseOrderItem_Quantity_Positive</c>,
/// <c>CK_PurchaseOrderItem_UnitPrice_NonNegative</c>) chặn ở CSDL nhưng khi đó lỗi đã là 400 không
/// chỉ ra được trường nào sai. Validator trả đúng <c>errors[]</c> theo
/// <c>docs/api-conventions.md</c> §2 nên form ở FE tô đỏ được ô hỏng.
/// </para>
/// <para>
/// Ai là người tạo thì KHÔNG nằm trong DTO: mọi endpoint lấy từ JWT (<see cref="PurchasingGuards"/>).
/// Quy tắc cần CSDL (NCC còn hoạt động, sản phẩm tồn tại) nằm ở handler dưới dạng
/// <c>RequestValidationException</c>.
/// </para>
/// </summary>
public sealed class CreatePurchaseOrderDtoValidator : AbstractValidator<CreatePurchaseOrderDto>
{
    public CreatePurchaseOrderDtoValidator()
    {
        RuleFor(x => x.SupplierId).NotEmpty().WithMessage("Phải chọn nhà cung cấp.");
        RuleFor(x => x.Items).NotEmpty().WithMessage("Đơn mua hàng phải có ít nhất một dòng.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty().WithMessage("Phải chọn sản phẩm.");
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Số lượng phải lớn hơn 0.");
            item.RuleFor(i => i.UnitPrice).GreaterThanOrEqualTo(0).WithMessage("Đơn giá không được âm.");
        });
    }
}

public sealed class CreateGRNDtoValidator : AbstractValidator<CreateGRNDto>
{
    public CreateGRNDtoValidator()
    {
        RuleFor(x => x.Items).NotEmpty().WithMessage("Phiếu nhập phải có ít nhất một dòng hàng.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty().WithMessage("Phải chọn sản phẩm.");
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Số lượng nhận phải lớn hơn 0.");
            item.RuleFor(i => i.UnitCost).GreaterThanOrEqualTo(0).WithMessage("Giá vốn không được âm.");
        });
    }
}

public sealed class QuickReceiveDtoValidator : AbstractValidator<QuickReceiveDto>
{
    public QuickReceiveDtoValidator()
    {
        // D10: NCC là bắt buộc — chọn sẵn HOẶC khai mới tại chỗ.
        RuleFor(x => x)
            .Must(x => x.SupplierId.HasValue || !string.IsNullOrWhiteSpace(x.NewSupplier?.Name))
            .WithName("supplierId")
            .WithMessage("Phải chọn nhà cung cấp hoặc nhập tên nhà cung cấp mới.");

        RuleFor(x => x.Items).NotEmpty().WithMessage("Phải có ít nhất một dòng hàng.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty().WithMessage("Phải chọn sản phẩm.");
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Số lượng phải lớn hơn 0.");
            // D10: nhập nhanh BẮT BUỘC có giá vốn — không có giá thì giá vốn bình quân sai ngay.
            item.RuleFor(i => i.UnitCost).GreaterThan(0).WithMessage("Nhập nhanh phải có giá vốn cho từng dòng.");
        });
    }
}

public sealed class CreatePurchaseRequisitionDtoValidator : AbstractValidator<CreatePurchaseRequisitionDto>
{
    public CreatePurchaseRequisitionDtoValidator()
    {
        RuleFor(x => x.Urgency).IsInEnum().WithMessage("Mức độ khẩn không hợp lệ.");
        RuleFor(x => x.Items).NotEmpty().WithMessage("Đề nghị mua phải có ít nhất một dòng.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty().WithMessage("Phải chọn sản phẩm.");
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Số lượng phải lớn hơn 0.");
        });
    }
}

public sealed class CreateRfqDtoValidator : AbstractValidator<CreateRfqDto>
{
    public CreateRfqDtoValidator()
    {
        RuleFor(x => x.Items).NotEmpty().WithMessage("Yêu cầu báo giá phải có ít nhất một dòng.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty().WithMessage("Phải chọn sản phẩm.");
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Số lượng phải lớn hơn 0.");
        });
    }
}

public sealed class CreatePurchaseReturnDtoValidator : AbstractValidator<CreatePurchaseReturnDto>
{
    public CreatePurchaseReturnDtoValidator()
    {
        RuleFor(x => x.SupplierId).NotEmpty().WithMessage("Phải chọn nhà cung cấp.");
        RuleFor(x => x.Items).NotEmpty().WithMessage("Phiếu trả hàng phải có ít nhất một dòng.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty().WithMessage("Phải chọn sản phẩm.");
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Số lượng trả phải lớn hơn 0.");
            item.RuleFor(i => i.UnitCost).GreaterThanOrEqualTo(0).WithMessage("Giá vốn không được âm.");
        });
    }
}
