using System.Globalization;
using System.Text.Json;

namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D06 §3 — dựng <see cref="StatutoryParameterSet"/> từ các dòng hiệu lực theo ngày.
///
/// Quy tắc resolve: với mỗi <c>Code</c>, lấy dòng có <c>EffectiveFrom</c> LỚN NHẤT mà
/// <c>EffectiveFrom &lt;= asOf</c>. Không có <c>EffectiveTo</c> nên không thể hở/chồng khoảng.
/// Dùng chung cho cả dòng biên dịch sẵn (<see cref="VietnamStatutoryDefaults"/>) và dòng đọc từ
/// bảng <c>hr."StatutoryParameters"</c> (W2-25) — MỘT đường parse duy nhất.
///
/// Parse JSON và số luôn theo <see cref="CultureInfo.InvariantCulture"/>.
/// </summary>
public static class StatutoryParameterSetFactory
{
    public static StatutoryParameterSet Resolve(IEnumerable<StatutoryParameterRow> rows, DateOnly asOf)
    {
        var effective = new Dictionary<string, StatutoryParameterRow>(StringComparer.Ordinal);
        foreach (var row in rows)
        {
            if (row.EffectiveFrom > asOf) continue;
            if (!row.TryValidate(out var error)) throw new InvalidOperationException(error);
            if (effective.TryGetValue(row.Code, out var current) && current.EffectiveFrom >= row.EffectiveFrom) continue;
            effective[row.Code] = row;
        }

        var missing = StatutoryParameterCodes.All.Where(c => !effective.ContainsKey(c)).ToList();
        if (missing.Count > 0)
        {
            throw new InvalidOperationException(
                $"Thiếu tham số pháp luật tại {asOf:yyyy-MM-dd}: {string.Join(", ", missing)}.");
        }

        var set = new StatutoryParameterSet
        {
            AsOf = asOf,
            PitPersonalDeduction = Number(effective, StatutoryParameterCodes.PitPersonalDeduction),
            PitDependentDeduction = Number(effective, StatutoryParameterCodes.PitDependentDeduction),
            PitBrackets = ParseBrackets(Json(effective, StatutoryParameterCodes.PitBrackets)),
            PitNonResidentRate = Number(effective, StatutoryParameterCodes.PitNonResidentRate),
            PitFlatRate = Number(effective, StatutoryParameterCodes.PitFlatRate),
            PitFlatThreshold = Number(effective, StatutoryParameterCodes.PitFlatThreshold),
            PitOvertimeExemptMode = Enum.Parse<OvertimeExemptMode>(
                Text(effective, StatutoryParameterCodes.PitOvertimeExemptMode), ignoreCase: true),
            PitMealTaxFreeCap = Number(effective, StatutoryParameterCodes.PitMealTaxFreeCap),

            SiReferenceLevel = Number(effective, StatutoryParameterCodes.SiReferenceLevel),
            SiCapMultiplier = Number(effective, StatutoryParameterCodes.SiCapMultiplier),
            UiCapMultiplier = Number(effective, StatutoryParameterCodes.UiCapMultiplier),
            Rates = new InsuranceRates(
                SiEmployee: Number(effective, StatutoryParameterCodes.SiEmployee),
                HiEmployee: Number(effective, StatutoryParameterCodes.HiEmployee),
                UiEmployee: Number(effective, StatutoryParameterCodes.UiEmployee),
                SiEmployerSickness: Number(effective, StatutoryParameterCodes.SiEmployerSickness),
                SiEmployerPension: Number(effective, StatutoryParameterCodes.SiEmployerPension),
                SiEmployerAccident: Number(effective, StatutoryParameterCodes.SiEmployerAccident),
                HiEmployer: Number(effective, StatutoryParameterCodes.HiEmployer),
                UiEmployer: Number(effective, StatutoryParameterCodes.UiEmployer),
                UnionFeeEmployer: Number(effective, StatutoryParameterCodes.UnionFeeEmployer),
                UnionDuesEmployee: Number(effective, StatutoryParameterCodes.UnionDuesEmployee),
                UnionDuesCapRatio: Number(effective, StatutoryParameterCodes.UnionDuesCapRatio)),
            SiUnpaidDaysSkip = Number(effective, StatutoryParameterCodes.SiUnpaidDaysSkip),
            HiSkipOnUnpaidDays = Bool(effective, StatutoryParameterCodes.HiUnpaidDaysSkip),
            UiSkipOnUnpaidDays = Bool(effective, StatutoryParameterCodes.UiUnpaidDaysSkip),

            RegionalMinWages = ParseMinWages(Json(effective, StatutoryParameterCodes.RegionalMinWage)),
            CompanyWageRegion = Enum.Parse<WageRegion>(
                Text(effective, StatutoryParameterCodes.CompanyWageRegion), ignoreCase: true),
            OvertimeMultipliers = ParseOvertimeMultipliers(Json(effective, StatutoryParameterCodes.OvertimeMultipliers)),
            OvertimeLimits = ParseOvertimeLimits(Json(effective, StatutoryParameterCodes.OvertimeLimits)),
            ProbationMinRatio = Number(effective, StatutoryParameterCodes.ProbationMinRatio),

            SourceRows = effective
        };

        Validate(set);
        return set;
    }

    /// <summary>Bất biến bắt buộc: biểu thuế tăng dần và bậc cuối KHÔNG có trần (D06 §3).</summary>
    private static void Validate(StatutoryParameterSet set)
    {
        var brackets = set.PitBrackets;
        if (brackets.Count == 0) throw new InvalidOperationException("PIT_BRACKETS rỗng.");

        decimal previous = 0m;
        for (var i = 0; i < brackets.Count; i++)
        {
            var b = brackets[i];
            if (b.Rate is < 0m or > 1m)
                throw new InvalidOperationException($"PIT_BRACKETS bậc {i + 1}: thuế suất {b.Rate} ngoài [0;1].");

            var isLast = i == brackets.Count - 1;
            if (isLast)
            {
                if (b.UpTo is not null)
                    throw new InvalidOperationException("PIT_BRACKETS: bậc cuối phải KHÔNG có trần (upTo = null).");
                continue;
            }

            if (b.UpTo is null)
                throw new InvalidOperationException($"PIT_BRACKETS bậc {i + 1}: chỉ bậc cuối được bỏ trần.");
            if (b.UpTo <= previous)
                throw new InvalidOperationException($"PIT_BRACKETS bậc {i + 1}: trần {b.UpTo} phải lớn hơn {previous}.");
            previous = b.UpTo.Value;
        }

        if (set.RegionalMinWages.Count == 0) throw new InvalidOperationException("REGIONAL_MIN_WAGE rỗng.");
        if (!set.RegionalMinWages.ContainsKey(set.CompanyWageRegion))
            throw new InvalidOperationException($"REGIONAL_MIN_WAGE không có vùng {set.CompanyWageRegion} của công ty.");
    }

    private static decimal Number(IReadOnlyDictionary<string, StatutoryParameterRow> rows, string code)
        => rows[code].NumberValue
           ?? throw new InvalidOperationException($"{code}: mong đợi NumberValue nhưng dòng lưu JSON.");

    private static string Json(IReadOnlyDictionary<string, StatutoryParameterRow> rows, string code)
        => rows[code].JsonValue
           ?? throw new InvalidOperationException($"{code}: mong đợi JsonValue nhưng dòng lưu số.");

    private static string Text(IReadOnlyDictionary<string, StatutoryParameterRow> rows, string code)
        => JsonDocument.Parse(Json(rows, code)).RootElement.GetString()
           ?? throw new InvalidOperationException($"{code}: JSON không phải chuỗi.");

    private static bool Bool(IReadOnlyDictionary<string, StatutoryParameterRow> rows, string code)
        => JsonDocument.Parse(Json(rows, code)).RootElement.GetBoolean();

    private static IReadOnlyList<PitBracket> ParseBrackets(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var list = new List<PitBracket>();
        foreach (var element in doc.RootElement.EnumerateArray())
        {
            decimal? upTo = element.TryGetProperty("upTo", out var u) && u.ValueKind == JsonValueKind.Number
                ? u.GetDecimal()
                : null;
            var rate = element.GetProperty("rate").GetDecimal();
            var quick = element.TryGetProperty("quickDeduction", out var q) && q.ValueKind == JsonValueKind.Number
                ? q.GetDecimal()
                : 0m;
            list.Add(new PitBracket(upTo, rate, quick));
        }

        return list;
    }

    private static IReadOnlyDictionary<WageRegion, RegionalMinWage> ParseMinWages(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var map = new Dictionary<WageRegion, RegionalMinWage>();
        foreach (var property in doc.RootElement.EnumerateObject())
        {
            if (!Enum.TryParse<WageRegion>(property.Name, ignoreCase: true, out var region)) continue;
            var month = property.Value.GetProperty("month").GetDecimal();
            var hour = property.Value.TryGetProperty("hour", out var h) && h.ValueKind == JsonValueKind.Number
                ? h.GetDecimal()
                : 0m;
            map[region] = new RegionalMinWage(month, hour);
        }

        return map;
    }

    private static OvertimeMultipliers ParseOvertimeMultipliers(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        return new OvertimeMultipliers(
            root.GetProperty("weekday").GetDecimal(),
            root.GetProperty("restDay").GetDecimal(),
            root.GetProperty("holiday").GetDecimal(),
            root.GetProperty("nightPremium").GetDecimal(),
            root.GetProperty("nightOtExtra").GetDecimal());
    }

    private static OvertimeLimits ParseOvertimeLimits(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        return new OvertimeLimits(root.GetProperty("month").GetDecimal(), root.GetProperty("year").GetDecimal());
    }
}
