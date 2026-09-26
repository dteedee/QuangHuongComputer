using FluentAssertions;
using HR.Application.Attendance;
using Xunit;
using static UnitTests.Domain.HR.AttendanceValidatorTests;

namespace UnitTests.Domain.HR;

/// <summary>
/// Secret TOTP chấm công: KHÔNG có hằng số fallback trong mã nguồn. Thiếu / placeholder / quá ngắn
/// / trùng hằng số cũ đã lộ ⇒ chấm công QR bị từ chối (fail-closed), endpoint sinh mã trả null.
/// </summary>
public class AttendanceTotpSecretTests
{
    private const string LeakedLegacySecret = "QuangHuongComputer2026-TOTP-Secret-DoNotShare";
    private static readonly Guid Store = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private static AttendanceValidator Validator(string? secret)
        => new(new InMemoryStoreLocationProvider(), ConfigWithSecret(secret));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("${ATTENDANCE_TOTP_SECRET}")]
    [InlineData("CHANGE_ME_ATTENDANCE_TOTP_SECRET_PLACEHOLDER_VALUE")]
    [InlineData("too-short")]
    [InlineData(LeakedLegacySecret)]
    public void SecretKhongHopLe_ThiQrBiTuChoi(string? secret)
    {
        var v = Validator(secret);

        v.IsQrConfigured.Should().BeFalse();
        v.GenerateCode(Store).Should().BeNull();

        // Kể cả mã sinh bằng hằng số cũ (kẻ tấn công đọc được từ git history) cũng không lọt.
        var forged = AttendanceValidator.GenerateQr(Store, LeakedLegacySecret);
        var res = v.ValidateQr(forged, Store);
        res.IsValid.Should().BeFalse();
        res.Reason.Should().Be(AttendanceValidator.QrNotConfiguredReason);
    }

    [Fact]
    public void KhongTruyenConfig_ThiQrBiTuChoi()
    {
        var v = new AttendanceValidator(new InMemoryStoreLocationProvider());
        v.IsQrConfigured.Should().BeFalse();
        v.ValidateQr("123456", Store).IsValid.Should().BeFalse();
    }

    [Fact]
    public void SecretHopLe_ThiMaSinhRaKiemDuoc()
    {
        var v = Validator(TestSecret);

        v.IsQrConfigured.Should().BeTrue();
        var code = v.GenerateCode(Store);
        code.Should().NotBeNull();
        v.ValidateQr(code!, Store).IsValid.Should().BeTrue();
    }

    [Fact]
    public void MaSinhBangSecretKhac_ThiBiTuChoi()
    {
        var v = Validator(TestSecret);
        var forged = AttendanceValidator.GenerateQr(Store, LeakedLegacySecret);
        v.ValidateQr(forged, Store).IsValid.Should().BeFalse();
    }

    [Fact]
    public void Describe_KhongBaoGioChuaGiaTriSecret()
    {
        AttendanceTotpSecret.Describe("short-secret-value").Should().NotContain("short-secret-value");
        AttendanceTotpSecret.Describe(TestSecret).Should().BeNull();
    }
}
