namespace Repair.Domain;

/// <summary>Loại dòng báo giá sửa chữa. Lưu dạng int — chỉ THÊM giá trị, không đổi số.</summary>
public enum RepairQuoteLineKind
{
    Part = 0,     // Linh kiện
    Labor = 1,    // Công sửa
    Service = 2,  // Dịch vụ trong danh mục (vệ sinh, cài đặt, phí tận nơi...)
    Other = 3     // Khoản khác
}
