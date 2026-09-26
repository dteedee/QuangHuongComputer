namespace Repair.Domain;

/// <summary>Mức ưu tiên của phiếu sửa, lễ tân đặt khi nhận máy. Lưu int — chỉ thêm, không đổi số.</summary>
public enum WorkOrderPriority
{
    Low = 0,     // Thấp
    Normal = 1,  // Bình thường (mặc định)
    High = 2,    // Cao
    Urgent = 3   // Gấp
}

/// <summary>Ảnh chụp trong quá trình sửa gắn với một dòng nhật ký.</summary>
public enum WorkOrderPhotoStage
{
    Before = 0,  // Trước khi sửa
    After = 1    // Sau khi sửa
}
