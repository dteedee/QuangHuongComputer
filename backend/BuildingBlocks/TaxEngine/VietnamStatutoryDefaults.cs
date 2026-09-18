namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D06 §2 — BẢNG THAM SỐ PHÁP LUẬT VIỆT NAM biên dịch sẵn.
///
/// Hai vai trò: (1) SEED cho bảng <c>hr."StatutoryParameters"</c> (W2-25 chèn đúng những dòng này,
/// chỉ INSERT dòng còn thiếu theo (Code, EffectiveFrom), không ghi đè dòng admin đã sửa);
/// (2) FALLBACK khi bảng trống hoặc thiếu dòng — hệ thống phải tính đúng ngay cả với DB trắng.
///
/// Mỗi dòng mang căn cứ pháp lý + link nguồn (truy cập 2026-09-18) và cờ
/// <c>IsVerified=false</c> cho những giá trị D06 đánh dấu CHƯA XÁC MINH từ nguồn sơ cấp.
/// Đổi luật = THÊM dòng mới ở đây (hoặc thêm dòng trong DB), KHÔNG sửa dòng cũ.
/// </summary>
public static class VietnamStatutoryDefaults
{
    private const string Ml = "https://xaydungchinhsach.chinhphu.vn";
    private const string PitLawUrl = "https://cms.luatvietnam.vn/uploaded/Others/2025/12/30/Luat-109-2025-QH15_3012143156.pdf";
    private const string Decree253Url = "https://xdcs.cdnchinhphu.vn/446259493575335936/2026/7/13/253m-ndcp-signed-1783937347218325693981.pdf";
    private const string SiLawUrl = Ml + "/toan-van-luat-so-41-2024-qh15-bao-hiem-xa-hoi-119240723163650489.htm";
    private const string Decree158Url = Ml + "/toan-van-nghi-dinh-158-2025-nd-cp-quy-dinh-ve-bao-hiem-xa-hoi-bat-buoc-119250629171336803.htm";
    private const string JobsLawUrl = Ml + "/toan-van-luat-viec-lam-119250711173403835.htm";
    private const string MinWageUrl = Ml + "/nghi-dinh-so-293-2025-nd-cp-quy-dinh-muc-luong-toi-thieu-doi-voi-nguoi-lao-dong-lam-viec-theo-hop-dong-lao-dong-119251110172808433.htm";
    private const string BaseSalaryUrl = "https://baochinhphu.vn/chinh-thuc-tang-luong-co-so-len-2530000-dong-thang-tu-01-7-2026-102260516214238878.htm";
    private const string LabourCodeUrl = "https://vanban.chinhphu.vn/?pageid=27160&docid=198540";
    private const string HealthInsuranceUrl = "https://baochinhphu.vn/quy-dinh-moi-ve-doi-tuong-muc-dong-bao-hiem-y-te-102250711120524105.htm";
    private const string AccidentUrl = "https://baochinhphu.vn/muc-dong-bhxh-bat-buoc-vao-quy-bao-hiem-tai-nan-lao-dong-benh-nghe-nghiep-102273307.htm";
    private const string UnionLawUrl = Ml + "/quy-dinh-moi-ve-mien-giam-tam-dung-dong-kinh-phi-cong-doan-119241216121905197.htm";

    /// <summary>Biểu 7 bậc, áp dụng đến hết kỳ tính thuế 2025 (Luật TNCN 04/2007 Đ.22).</summary>
    private const string Brackets2009 =
        """
        [{"upTo":5000000,"rate":0.05,"quickDeduction":0},
         {"upTo":10000000,"rate":0.10,"quickDeduction":250000},
         {"upTo":18000000,"rate":0.15,"quickDeduction":750000},
         {"upTo":32000000,"rate":0.20,"quickDeduction":1650000},
         {"upTo":52000000,"rate":0.25,"quickDeduction":3250000},
         {"upTo":80000000,"rate":0.30,"quickDeduction":5850000},
         {"upTo":null,"rate":0.35,"quickDeduction":9850000}]
        """;

    /// <summary>Biểu 5 bậc, từ kỳ tính thuế 2026 (Luật 109/2025/QH15 Đ.9.2).</summary>
    private const string Brackets2026 =
        """
        [{"upTo":10000000,"rate":0.05,"quickDeduction":0},
         {"upTo":30000000,"rate":0.10,"quickDeduction":500000},
         {"upTo":60000000,"rate":0.20,"quickDeduction":3500000},
         {"upTo":100000000,"rate":0.30,"quickDeduction":9500000},
         {"upTo":null,"rate":0.35,"quickDeduction":14500000}]
        """;

    /// <summary>NĐ 74/2024: D06 chỉ nêu mức THÁNG (suy ra từ mức tăng ở [N5]) — không có mức GIỜ nên bỏ trống.</summary>
    private const string MinWage2024 =
        """
        {"I":{"month":4960000},"II":{"month":4410000},"III":{"month":3860000},"IV":{"month":3450000}}
        """;

    /// <summary>NĐ 293/2025/NĐ-CP, hiệu lực 01/01/2026.</summary>
    private const string MinWage2026 =
        """
        {"I":{"month":5310000,"hour":25500},
         "II":{"month":4730000,"hour":22700},
         "III":{"month":4140000,"hour":20000},
         "IV":{"month":3700000,"hour":17800}}
        """;

    private const string OvertimeMultipliersJson =
        """
        {"weekday":1.5,"restDay":2.0,"holiday":3.0,"nightPremium":0.3,"nightOtExtra":0.2}
        """;

    private const string OvertimeLimitsJson = """{"month":40,"year":200}""";

    /// <summary>Toàn bộ bảng D06 §2, một dòng cho mỗi (tham số, mốc hiệu lực).</summary>
    public static readonly IReadOnlyList<StatutoryParameterRow> Rows = BuildRows();

    /// <summary>Resolve bộ tham số tại một ngày, chỉ từ mặc định biên dịch sẵn.</summary>
    public static StatutoryParameterSet Resolve(DateOnly asOf) => StatutoryParameterSetFactory.Resolve(Rows, asOf);

    private static StatutoryParameterRow[] BuildRows() =>
    [
        // ---------- Thuế TNCN ----------
        Vnd(StatutoryParameterCodes.PitPersonalDeduction, 2020, 7, 1, 11_000_000m,
            "NQ 954/2020/UBTVQH14", Ml + "/nghi-quyet-110-2025-ubtvqh15-dieu-chinh-muc-giam-tru-gia-canh-cua-thue-thu-nhap-ca-nhan-119251110101313787.htm"),
        Vnd(StatutoryParameterCodes.PitPersonalDeduction, 2026, 1, 1, 15_500_000m,
            "NQ 110/2025/UBTVQH15; Luật 109/2025/QH15 Đ.10.1, Đ.29.2 (từ kỳ tính thuế 2026)", PitLawUrl),
        Vnd(StatutoryParameterCodes.PitDependentDeduction, 2020, 7, 1, 4_400_000m,
            "NQ 954/2020/UBTVQH14", Ml + "/nghi-quyet-110-2025-ubtvqh15-dieu-chinh-muc-giam-tru-gia-canh-cua-thue-thu-nhap-ca-nhan-119251110101313787.htm"),
        Vnd(StatutoryParameterCodes.PitDependentDeduction, 2026, 1, 1, 6_200_000m,
            "NQ 110/2025/UBTVQH15; Luật 109/2025/QH15 Đ.10.1", PitLawUrl),

        Json(StatutoryParameterCodes.PitBrackets, 2009, 1, 1, Brackets2009,
            "Luật Thuế TNCN 04/2007/QH12 Đ.22 (biểu 7 bậc)", PitLawUrl,
            note: "Chỉ dùng cho kỳ tính thuế đến hết 2025 và test hồi quy."),
        Json(StatutoryParameterCodes.PitBrackets, 2026, 1, 1, Brackets2026,
            "Luật Thuế TNCN 109/2025/QH15 Đ.9.2 (biểu 5 bậc), Đ.29.2", PitLawUrl),

        Rate(StatutoryParameterCodes.PitNonResidentRate, 2009, 1, 1, 0.20m,
            "Luật Thuế TNCN 109/2025/QH15 Đ.21 (cá nhân không cư trú: 20% tổng thu nhập, không giảm trừ)", PitLawUrl),

        Rate(StatutoryParameterCodes.PitFlatRate, 2013, 7, 1, 0.10m,
            "NĐ 253/2026/NĐ-CP Đ.50.2 (khấu trừ 10% mỗi lần chi)", Decree253Url),
        Vnd(StatutoryParameterCodes.PitFlatThreshold, 2013, 7, 1, 2_000_000m,
            "TT 111/2013/TT-BTC Đ.25.1.i", Decree253Url,
            note: "CHƯA XÁC MINH nguyên văn từ nguồn sơ cấp (D06).", verified: false),
        Vnd(StatutoryParameterCodes.PitFlatThreshold, 2026, 1, 1, 5_000_000m,
            "NĐ 253/2026/NĐ-CP Đ.50.2, hiệu lực theo Đ.69.1.a (từ kỳ tính thuế 2026)", Decree253Url,
            note: "Điểm diễn giải: NĐ hiệu lực 01/07/2026 nhưng Đ.69.1.a áp dụng quy định về tiền lương từ kỳ tính thuế 2026.",
            verified: false),

        Text(StatutoryParameterCodes.PitOvertimeExemptMode, 2009, 1, 1, nameof(OvertimeExemptMode.PremiumOnly),
            "TT 111/2013/TT-BTC (chỉ miễn phần chênh của tiền làm thêm/làm đêm)", PitLawUrl),
        Text(StatutoryParameterCodes.PitOvertimeExemptMode, 2026, 1, 1, nameof(OvertimeExemptMode.FullWithinLegalHours),
            "Luật 109/2025/QH15 Đ.4.8; NĐ 253/2026/NĐ-CP Đ.26.1 (miễn toàn bộ trong phạm vi giờ hợp pháp)", Decree253Url),

        Vnd(StatutoryParameterCodes.PitMealTaxFreeCap, 2016, 10, 15, 730_000m,
            "TT 26/2016/TT-BLĐTBXH", Decree253Url,
            note: "CHƯA XÁC MINH. Đây là mức SỐNG cho kỳ 01-06/2026, không chỉ 'kỳ cũ'.", verified: false),
        Vnd(StatutoryParameterCodes.PitMealTaxFreeCap, 2026, 7, 1, 1_200_000m,
            "NĐ 253/2026/NĐ-CP Đ.8.2.g, hiệu lực theo Đ.69.1.b (01/07/2026)", Decree253Url),

        // ---------- Bảo hiểm bắt buộc ----------
        Vnd(StatutoryParameterCodes.SiReferenceLevel, 2024, 7, 1, 2_340_000m,
            "NĐ 73/2024/NĐ-CP (lương cơ sở); NĐ 158/2025/NĐ-CP Đ.5.2 (mức tham chiếu = lương cơ sở)", Decree158Url),
        Vnd(StatutoryParameterCodes.SiReferenceLevel, 2026, 7, 1, 2_530_000m,
            "NĐ 161/2026/NĐ-CP ngày 15/05/2026 (lương cơ sở 2.530.000 từ 01/07/2026)", BaseSalaryUrl),

        Count(StatutoryParameterCodes.SiCapMultiplier, 2016, 1, 1, 20m,
            "Luật BHXH 41/2024/QH15 Đ.31.1.đ (trần = 20 lần mức tham chiếu)", SiLawUrl),
        Count(StatutoryParameterCodes.UiCapMultiplier, 2016, 1, 1, 20m,
            "Luật Việc làm 74/2025/QH15 Đ.34.2 (trần = 20 lần LTT tháng theo vùng)", JobsLawUrl),

        Rate(StatutoryParameterCodes.SiEmployee, 2016, 1, 1, 0.08m,
            "Luật BHXH 41/2024/QH15 Đ.33.1.a (8%); trước 01/07/2025: Luật BHXH 58/2014 Đ.85 — cùng mức", SiLawUrl),
        Rate(StatutoryParameterCodes.HiEmployee, 2016, 1, 1, 0.015m,
            "Luật BHYT + NĐ 188/2025/NĐ-CP (4,5%, NLĐ chịu 1/3 = 1,5%)", HealthInsuranceUrl),
        Rate(StatutoryParameterCodes.UiEmployee, 2016, 1, 1, 0.01m,
            "Luật Việc làm 74/2025/QH15 Đ.33 + NĐ 374/2025/NĐ-CP (1%); trước đó Luật 38/2013 — cùng mức", JobsLawUrl),

        Rate(StatutoryParameterCodes.SiEmployerSickness, 2016, 1, 1, 0.03m,
            "Luật BHXH 41/2024/QH15 Đ.34.1 (3% quỹ ốm đau - thai sản)", SiLawUrl),
        Rate(StatutoryParameterCodes.SiEmployerPension, 2016, 1, 1, 0.14m,
            "Luật BHXH 41/2024/QH15 Đ.34.1 (14% quỹ hưu trí - tử tuất)", SiLawUrl),
        Rate(StatutoryParameterCodes.SiEmployerAccident, 2020, 7, 15, 0.005m,
            "NĐ 58/2020/NĐ-CP (TNLĐ-BNN 0,5%; 0,3% nếu được duyệt — công ty chưa được duyệt)", AccidentUrl),
        Rate(StatutoryParameterCodes.HiEmployer, 2016, 1, 1, 0.03m,
            "Luật BHYT + NĐ 188/2025/NĐ-CP (NSDLĐ chịu 2/3 của 4,5% = 3%)", HealthInsuranceUrl),
        Rate(StatutoryParameterCodes.UiEmployer, 2016, 1, 1, 0.01m,
            "Luật Việc làm 74/2025/QH15 Đ.33 + NĐ 374/2025/NĐ-CP (1%)", JobsLawUrl,
            note: "Luật Đ.33 chỉ ghi 'tối đa bằng 1%'; mức 1% do NĐ 374/2025 ấn định — CHƯA XÁC MINH nguyên văn.",
            verified: false),

        Days(StatutoryParameterCodes.SiUnpaidDaysSkip, 2016, 1, 1, 14m,
            "Luật BHXH 41/2024/QH15 Đ.33.5 + Đ.34.3 (không hưởng lương ≥ 14 ngày làm việc/tháng thì không đóng BHXH)", SiLawUrl),
        Bool(StatutoryParameterCodes.HiUnpaidDaysSkip, 2016, 1, 1, true,
            "Thực hành theo QĐ 595/QĐ-BHXH", SiLawUrl,
            note: "CHƯA XÁC MINH: Đ.33.5 chỉ nói BHXH. Mặc định BẬT, kế toán xác nhận.", verified: false),
        Bool(StatutoryParameterCodes.UiUnpaidDaysSkip, 2016, 1, 1, true,
            "Thực hành theo QĐ 595/QĐ-BHXH", JobsLawUrl,
            note: "CHƯA XÁC MINH: Đ.33.5 chỉ nói BHXH. Mặc định BẬT, kế toán xác nhận.", verified: false),

        // ---------- Công đoàn ----------
        Rate(StatutoryParameterCodes.UnionFeeEmployer, 2013, 1, 1, 0.02m,
            "Luật Công đoàn 50/2024/QH15 (KPCĐ 2% quỹ tiền lương làm căn cứ đóng BHXH bắt buộc)", UnionLawUrl),
        Rate(StatutoryParameterCodes.UnionDuesEmployee, 2017, 1, 1, 0.01m,
            "QĐ 1908/QĐ-TLĐ (đoàn phí 1%, CHỈ đoàn viên — mặc định tắt)", UnionLawUrl,
            note: "CHƯA XÁC MINH nguyên văn (D06).", verified: false),
        Rate(StatutoryParameterCodes.UnionDuesCapRatio, 2017, 1, 1, 0.10m,
            "QĐ 1908/QĐ-TLĐ (trần đoàn phí = 10% lương cơ sở)", UnionLawUrl,
            note: "CHƯA XÁC MINH nguyên văn (D06).", verified: false),

        // ---------- Lao động ----------
        Json(StatutoryParameterCodes.RegionalMinWage, 2024, 7, 1, MinWage2024,
            "NĐ 74/2024/NĐ-CP (lương tối thiểu vùng)", MinWageUrl,
            note: "CHƯA XÁC MINH: D06 suy ra mức tháng từ mức tăng nêu ở [N5]; KHÔNG có mức giờ 2024.",
            verified: false),
        Json(StatutoryParameterCodes.RegionalMinWage, 2026, 1, 1, MinWage2026,
            "NĐ 293/2025/NĐ-CP ngày 10/11/2025, hiệu lực 01/01/2026", MinWageUrl),

        Text(StatutoryParameterCodes.CompanyWageRegion, 2024, 7, 1, nameof(WageRegion.I),
            "Địa chỉ công ty (D09): xã Vĩnh Bảo, TP Hải Phòng", MinWageUrl,
            note: "CHƯA XÁC MINH: ánh xạ địa bàn theo NĐ 74/2024 (giả định không đổi so với NĐ 293/2025).",
            verified: false),
        Text(StatutoryParameterCodes.CompanyWageRegion, 2026, 1, 1, nameof(WageRegion.I),
            "NĐ 293/2025/NĐ-CP phụ lục địa bàn mục 13 — vùng I TP Hải Phòng liệt kê đích danh xã Vĩnh Bảo", MinWageUrl),

        Json(StatutoryParameterCodes.OvertimeMultipliers, 2021, 1, 1, OvertimeMultipliersJson,
            "BLLĐ 45/2019/QH14 Đ.98 + NĐ 145/2020/NĐ-CP Đ.57 (150/200/300%, đêm +30%, OT đêm +20%)", LabourCodeUrl),
        Json(StatutoryParameterCodes.OvertimeLimits, 2021, 1, 1, OvertimeLimitsJson,
            "BLLĐ 45/2019/QH14 Đ.107 (40 giờ/tháng, 200 giờ/năm)", LabourCodeUrl,
            note: "CHƯA XÁC MINH nguyên văn (D06). Cho phép nâng năm lên 300 giờ với ngành nghề đủ điều kiện.",
            verified: false),
        Rate(StatutoryParameterCodes.ProbationMinRatio, 2021, 1, 1, 0.85m,
            "BLLĐ 45/2019/QH14 Đ.26 (lương thử việc ≥ 85% lương chính thức)", LabourCodeUrl,
            note: "CHƯA XÁC MINH nguyên văn (D06).", verified: false)
    ];

    private static StatutoryParameterRow Vnd(string code, int y, int m, int d, decimal value, string basis, string url,
        string? note = null, bool verified = true)
        => new(code, new DateOnly(y, m, d), value, null, StatutoryParameterUnit.Vnd, basis, url, note, verified);

    private static StatutoryParameterRow Rate(string code, int y, int m, int d, decimal value, string basis, string url,
        string? note = null, bool verified = true)
        => new(code, new DateOnly(y, m, d), value, null, StatutoryParameterUnit.Rate, basis, url, note, verified);

    private static StatutoryParameterRow Days(string code, int y, int m, int d, decimal value, string basis, string url,
        string? note = null, bool verified = true)
        => new(code, new DateOnly(y, m, d), value, null, StatutoryParameterUnit.Days, basis, url, note, verified);

    private static StatutoryParameterRow Count(string code, int y, int m, int d, decimal value, string basis, string url,
        string? note = null, bool verified = true)
        => new(code, new DateOnly(y, m, d), value, null, StatutoryParameterUnit.Count, basis, url, note, verified);

    private static StatutoryParameterRow Json(string code, int y, int m, int d, string json, string basis, string url,
        string? note = null, bool verified = true)
        => new(code, new DateOnly(y, m, d), null, json, StatutoryParameterUnit.Json, basis, url, note, verified);

    private static StatutoryParameterRow Text(string code, int y, int m, int d, string value, string basis, string url,
        string? note = null, bool verified = true)
        => new(code, new DateOnly(y, m, d), null, $"\"{value}\"", StatutoryParameterUnit.Text, basis, url, note, verified);

    private static StatutoryParameterRow Bool(string code, int y, int m, int d, bool value, string basis, string url,
        string? note = null, bool verified = true)
        => new(code, new DateOnly(y, m, d), null, value ? "true" : "false", StatutoryParameterUnit.Bool, basis, url, note, verified);
}
