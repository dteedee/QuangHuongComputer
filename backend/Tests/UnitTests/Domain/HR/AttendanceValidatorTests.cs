using FluentAssertions;
using HR.Application.Attendance;
using Xunit;

namespace UnitTests.Domain.HR;

/// <summary>
/// AttendanceValidator: Haversine chuẩn (2 điểm HN cách ~10km), IP prefix, TOTP đổi 30s.
/// </summary>
public class AttendanceValidatorTests
{
    private static readonly Guid Store1 = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Store2 = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static AttendanceValidator MakeValidator()
    {
        var provider = new InMemoryStoreLocationProvider(new()
        {
            [Store1] = new StoreLocationInfo(Store1,
                Latitude: 21.028511m, Longitude: 105.804817m,   // Hồ Gươm Hà Nội
                AllowedIps: new[] { "192.168.1.*", "10.0.0.5" }),
            [Store2] = new StoreLocationInfo(Store2,
                Latitude: null, Longitude: null,
                AllowedIps: new string[0])
        });
        return new AttendanceValidator(provider);
    }

    // ============ HAVERSINE ============

    [Fact]
    public void Haversine_HaiDiemTrungNhau_TraVe0()
    {
        var d = AttendanceValidator.HaversineMeters(10.0, 106.0, 10.0, 106.0);
        d.Should().BeApproximately(0, 0.1);
    }

    [Fact]
    public void Haversine_HoGuomToLangBac_KhoangCach10Km_PlusMinus1Km()
    {
        // Hồ Gươm → Lăng Bác ~ 2.6km (không phải 10km)
        // Dùng 2 điểm rõ ràng cách ~10km để test
        var d = AttendanceValidator.HaversineMeters(21.028511, 105.804817, 21.118, 105.804817);
        d.Should().BeInRange(9000, 11000);
    }

    // ============ GPS ============

    [Fact]
    public async Task ValidateGps_TrongBanKinh_TraVeOk()
    {
        var v = MakeValidator();
        var res = await v.ValidateGpsAsync(Store1, 21.028511m, 105.804817m, radiusMeters: 100);
        res.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateGps_NgoaiBanKinh_TraVeFail_ChoBietKhoangCach()
    {
        var v = MakeValidator();
        // ~1km xa Hồ Gươm
        var res = await v.ValidateGpsAsync(Store1, 21.037611m, 105.804817m, radiusMeters: 100);
        res.IsValid.Should().BeFalse();
        res.Reason.Should().Contain("cách chi nhánh");
    }

    [Fact]
    public async Task ValidateGps_StoreKhongCoToaDo_TraVeFail()
    {
        var v = MakeValidator();
        var res = await v.ValidateGpsAsync(Store2, 10m, 106m);
        res.IsValid.Should().BeFalse();
        res.Reason.Should().Contain("chưa cấu hình toạ độ");
    }

    // ============ WIFI ============

    [Fact]
    public async Task ValidateWifi_IpExactMatch_TraVeOk()
    {
        var v = MakeValidator();
        var res = await v.ValidateWifiAsync(Store1, "10.0.0.5");
        res.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateWifi_IpPrefixMatch_TraVeOk()
    {
        var v = MakeValidator();
        var res = await v.ValidateWifiAsync(Store1, "192.168.1.42");
        res.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateWifi_IpNgoaiDai_TraVeFail()
    {
        var v = MakeValidator();
        var res = await v.ValidateWifiAsync(Store1, "8.8.8.8");
        res.IsValid.Should().BeFalse();
    }

    // ============ QR TOTP ============

    [Fact]
    public void GenerateQr_TraVeChuoi6ChuSo()
    {
        var code = AttendanceValidator.GenerateQr(Store1);
        code.Length.Should().Be(6);
        code.All(char.IsDigit).Should().BeTrue();
    }

    [Fact]
    public void ValidateQr_MaHienTai_TraVeOk()
    {
        var v = MakeValidator();
        var now = DateTimeOffset.UtcNow;
        var code = AttendanceValidator.GenerateQr(Store1, now);
        var res = v.ValidateQr(code, Store1, now);
        res.IsValid.Should().BeTrue();
    }

    [Fact]
    public void ValidateQr_MaCu60Giay_TraVeFail()
    {
        var v = MakeValidator();
        var past = DateTimeOffset.UtcNow.AddSeconds(-60);
        var codeOld = AttendanceValidator.GenerateQr(Store1, past);
        var res = v.ValidateQr(codeOld, Store1);
        res.IsValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateQr_MaSaiFormat_TraVeFail()
    {
        var v = MakeValidator();
        v.ValidateQr("abc", Store1).IsValid.Should().BeFalse();
        v.ValidateQr("", Store1).IsValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateQr_MaCuaStoreKhac_TraVeFail()
    {
        var v = MakeValidator();
        var code = AttendanceValidator.GenerateQr(Store1);
        var res = v.ValidateQr(code, Store2);
        res.IsValid.Should().BeFalse();
    }

    // ============ MANUAL ============

    [Fact]
    public void ValidateManual_ThieuReason_TraVeFail()
    {
        var v = MakeValidator();
        v.ValidateManual(Guid.NewGuid(), null).IsValid.Should().BeFalse();
        v.ValidateManual(Guid.NewGuid(), "").IsValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateManual_ReasonQuaNgan_TraVeFail()
    {
        var v = MakeValidator();
        v.ValidateManual(Guid.NewGuid(), "quên").IsValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateManual_HopLe_TraVeOk()
    {
        var v = MakeValidator();
        v.ValidateManual(Guid.NewGuid(), "Nhân viên quên quẹt thẻ, đã xác minh").IsValid.Should().BeTrue();
    }
}
