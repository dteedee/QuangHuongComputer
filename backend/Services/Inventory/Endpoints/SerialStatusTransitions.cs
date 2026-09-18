using BuildingBlocks.Endpoints;
using InventoryModule.Domain;

namespace InventoryModule.Endpoints;

/// <summary>
/// Máy trạng thái của một serial, dịch sang thông điệp người dùng đọc được (W2-5).
/// Tách khỏi <see cref="SerialEndpoints"/>: đây là quy tắc nghiệp vụ, không phải định tuyến.
/// </summary>
internal static class SerialStatusTransitions
{
    public static void Apply(SerialNumber serial, UpdateSerialStatusDto dto)
    {
        try
        {
            switch (dto.Action)
            {
                case "sell": serial.Sell(dto.ReferenceId ?? Guid.Empty, dto.CustomerId); break;
                case "reserve": serial.Reserve(dto.ReferenceId ?? Guid.Empty); break;
                case "release": serial.ReleaseReservation(); break;
                case "return": serial.Return(dto.Notes); break;
                case "defective": serial.MarkDefective(dto.Notes); break;
                case "repair": serial.SendForRepair(dto.ReferenceId ?? Guid.Empty); break;
                case "complete-repair": serial.CompleteRepair(); break;
                default: throw new DomainException($"Thao tác '{dto.Action}' không hợp lệ.");
            }
        }
        catch (InvalidOperationException ex)
        {
            // Thông điệp của state machine là tiếng Anh nội bộ; đổi sang câu người dùng đọc được.
            throw new DomainException($"Không thực hiện được thao tác trên serial: {ex.Message}");
        }
    }
}
