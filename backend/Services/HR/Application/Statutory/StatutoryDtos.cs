using BuildingBlocks.TaxEngine;

namespace HR.Application.Statutory;

/// <summary>W2-25 — DTO của API tham số pháp luật (`/api/hr/statutory-parameters`).</summary>
public sealed record StatutoryParameterDto(
    Guid Id,
    string Code,
    DateOnly EffectiveFrom,
    decimal? NumberValue,
    string? JsonValue,
    string Unit,
    string LegalBasis,
    string SourceUrl,
    string? Note,
    bool IsSeed,
    bool IsVerified,
    bool IsLocked);

/// <summary>Tạo một mốc hiệu lực mới. Đổi luật = THÊM dòng, không sửa dòng cũ (D06 §3).</summary>
public sealed record CreateStatutoryParameterDto(
    string Code,
    DateOnly EffectiveFrom,
    decimal? NumberValue,
    string? JsonValue,
    StatutoryParameterUnit Unit,
    string LegalBasis,
    string SourceUrl,
    string? Note,
    bool IsVerified = true,
    string? Reason = null);

/// <summary>Sửa một dòng CHƯA bị khoá. <c>Code</c>/<c>EffectiveFrom</c> không đổi được.</summary>
public sealed record UpdateStatutoryParameterDto(
    decimal? NumberValue,
    string? JsonValue,
    StatutoryParameterUnit Unit,
    string LegalBasis,
    string SourceUrl,
    string? Note,
    bool IsVerified = true,
    string? Reason = null);

/// <summary>Ngày nghỉ lễ (`/api/hr/public-holidays`).</summary>
public sealed record PublicHolidayDto(
    Guid Id,
    DateOnly Date,
    string Name,
    bool IsPaid,
    bool IsConfirmed,
    string? LegalBasis,
    string? Note);

public sealed record UpsertPublicHolidayDto(
    DateOnly Date,
    string Name,
    bool IsPaid = true,
    bool IsConfirmed = false,
    string? LegalBasis = null,
    string? Note = null);

/// <summary>
/// Bảng kê giờ + tiền làm thêm/làm đêm theo nhân viên (NĐ 253/2026 Đ.26.1 bắt buộc doanh nghiệp
/// lập và xuất trình khi cơ quan thuế yêu cầu).
/// </summary>
public sealed record OvertimeScheduleLineDto(
    Guid EmployeeId,
    string EmployeeCode,
    string FullName,
    decimal HourlyRate,
    decimal WeekdayHours,
    decimal RestDayHours,
    decimal HolidayHours,
    decimal NightWeekdayHours,
    decimal NightRestDayHours,
    decimal NightHolidayHours,
    decimal TotalHours,
    decimal TotalPay,
    decimal ExemptHours,
    decimal ExemptPay,
    decimal TaxablePay);

public sealed record OvertimeScheduleDto(
    int Year,
    int Month,
    decimal MonthlyLimitHours,
    decimal YearlyLimitHours,
    string LegalBasis,
    IReadOnlyList<OvertimeScheduleLineDto> Lines,
    decimal TotalHours,
    decimal TotalPay,
    decimal TotalExemptPay,
    decimal TotalTaxablePay);
