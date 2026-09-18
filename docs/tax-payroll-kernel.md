# Tax + Payroll Kernel — hợp đồng đóng băng (W1-15)

> **Đây là tài liệu DUY NHẤT bạn cần đọc** để tính tiền (VAT, giảm giá, hoàn tiền) hoặc tính lương
> (TNCN, bảo hiểm, làm thêm giờ) trong hệ thống này. Căn cứ: `decisions/D01` (VAT + giá bán),
> `decisions/D06` (lương - thuế - bảo hiểm 2026).
> Cập nhật 2026-09-18 · trạng thái: đã freeze cho wave 2+ · mọi hàm dưới đây là HÀM THUẦN (không I/O).

## 0. Ba luật bất di bất dịch

1. **Giá bán luôn ĐÃ GỒM VAT.** VAT không bao giờ làm đổi số tiền khách trả — VAT chỉ được **tách ra**.
   `Total = Σ payable_i + shippingGross`. Không có chỗ nào được cộng thuế lên trên giá.
   (Luật Giá 16/2023 Đ.29: giá niêm yết phải đã gồm thuế; cấm bán cao hơn giá niêm yết.)
2. **Không hardcode ngày, không hardcode thuế suất.** Mọi "hôm nay" đi qua `IBusinessClock.TodayVn`;
   mọi thuế suất đi qua `VatRateResolver`; mọi tham số lương đi qua `IStatutoryParameterProvider`.
3. **Không viết lại công thức.** Nếu bạn định gõ `Math.Round(x / 1.08m)` hoặc `* 0.105m` ở đâu đó,
   bạn đang tạo nguồn sự thật thứ hai — đúng cái bệnh track này vừa chữa. Gọi API dưới đây.

Mọi số tiền là **số nguyên VND, không âm**. Mọi điểm làm tròn ghi rõ
`MidpointRounding.AwayFromZero` (mặc định của .NET là banker's rounding và cho kết quả khác ở số lẻ .5).

---

## 1. `IBusinessClock` — nguồn thời gian

`backend/BuildingBlocks/Time/` · namespace `BuildingBlocks.Time`

```csharp
public interface IBusinessClock
{
    DateTimeOffset UtcNow { get; }                 // lưu DB / audit
    DateTime      NowVn { get; }                   // giờ treo tường VN, để hiển thị
    DateOnly      TodayVn { get; }                 // MỌI so sánh ngày hiệu lực
    TimeZoneInfo  TimeZone { get; }                // Asia/Ho_Chi_Minh, +07:00, không DST
    DateOnly      ToBusinessDate(DateTimeOffset instant);   // quy đổi mốc UTC đã lưu
}
```

| Implementation | Dùng ở đâu |
|---|---|
| `SystemBusinessClock` | production. Tìm `Asia/Ho_Chi_Minh`, fallback `SE Asia Standard Time`, cuối cùng múi giờ tự dựng +07:00. Không bao giờ ném. |
| `FixedBusinessClock` | unit test. `FixedBusinessClock.AtUtc("2026-12-31T17:00:00Z")` hoặc `.AtVietnamDate(2026, 9, 18)`; có `Advance()`/`Set()`. |

DI: `services.AddBusinessClock()` (`TryAddSingleton`, gọi nhiều lần vô hại).
**Chưa được nối vào `AddPlatformKernel()`** — xem integration request W1-15-IR-01.

**Cấm** `DateTime.Now` / `DateTime.Today` / `DateTimeOffset.Now` trong code thuế · giá · lương.
Lệch 7 tiếng làm sai đúng ba mốc: 01/01/2026 (TNCN + lương tối thiểu vùng), 01/07/2026 (lương cơ sở +
trần BH + tiền ăn ca), 01/01/2027 (VAT về 10%).

---

## 2. Thuế suất GTGT — `VatRateResolver`

`backend/BuildingBlocks/TaxEngine/VatRateResolver.cs`

Mô hình D01 phương án C: **thuế suất luật định − mức giảm tạm thời**.

```csharp
decimal rate = VatRateResolver.Resolve(
    statutoryRate:      category.VatRate,              // 0.10 cho mọi nhóm hiện có
    reductionEligible:  category.VatReductionEligible, // mặc định true (W2-1 thêm cột)
    businessDateVn:     clock.TodayVn,                 // hoá đơn: NGÀY LẬP hoá đơn
    window:             vatWindow);                    // bỏ qua → dùng hằng số luật định
```

Giảm 2 điểm **chỉ khi cả ba** đúng: dòng hàng eligible **và** `statutoryRate == window.StandardRate`
**và** ngày nằm trong `[From, To]`. Thuế suất ≤ 0 (0%, miễn thuế `-1`) luôn giữ nguyên.

Hằng số luật định (`BuildingBlocks/TaxRates.cs`, fallback khi config thiếu/sai):

| Hằng số | Giá trị | Căn cứ |
|---|---|---|
| `TaxRates.VatStatutoryStandard` | `0.10m` | Luật GTGT 48/2024 Đ.9.3 |
| `TaxRates.VatReductionPoints` | `0.02m` | NQ 204/2025/QH15 Đ.1.1 |
| `TaxRates.VatReductionFrom` | `2025-07-01` | NĐ 174/2025 Đ.2.1 |
| `TaxRates.VatReductionTo` | `2026-12-31` | NĐ 174/2025 Đ.2.1 |
| `TaxRates.VatReductionLegalBasis` | `"NQ 204/2025/QH15; NĐ 174/2025/NĐ-CP"` | in trên chứng từ |

`TaxRates.VatStandard = 0.08m` là **`[Obsolete]`** — hằng số không có ngày hiệu lực, sai từ
01/01/2027. W4-5 xoá.

Cấu hình (SystemConfig, category `Tax`, đơn vị **phần trăm**): `TAX_VAT_DEFAULT_RATE=10`,
`TAX_VAT_REDUCTION_POINTS=2`, `TAX_VAT_REDUCTION_FROM=2025-07-01`, `TAX_VAT_REDUCTION_TO=2026-12-31`,
`TAX_VAT_REDUCTION_LEGAL_BASIS`. Khoá `TAX_RATE` phải bị **xoá**.
`VatReductionWindow.FromSettings(settings, out problems)` dựng cửa sổ từ config; mọi trường sai/thiếu
rơi về hằng số luật định tương ứng và được liệt kê trong `problems` để caller log warning.
Gia hạn giảm thuế sang 2027 = sửa **một ngày trong config**, không code, không deploy.

---

## 3. Số học tiền — `DiscountAllocator` + `VietnameseTaxEngine.ExtractVat*`

### 3.1 Thứ tự bắt buộc

1. `gross_i = Round(UnitPrice_i × Qty_i) − lineDiscount_i` (giảm theo % làm tròn đồng **ngay**, AwayFromZero).
2. Phân bổ giảm giá cấp đơn `D` (coupon, điểm, giảm tay) về các dòng **không phải quà** theo tỉ lệ `gross_i`.
3. `shipGross = max(0, ShippingFee − ShippingDiscount)` — giảm ship không đụng dòng hàng.
4. Tách VAT **THEO DÒNG**: `net = Round(payable / (1 + rate))`, `vat = payable − net`.
5. `Total = Σ payable_i + shipGross`; `Tax = Σ vat_i + vat_ship`.

Tách theo dòng chứ không theo cả đơn: `290.000 + ship 30.000` → theo dòng `21.481 + 2.222 = 23.703`,
tách cả đơn `320.000` → `23.704`. Đa thuế suất **bắt buộc** tách theo dòng (Luật GTGT Đ.9.4).

### 3.2 API

```csharp
decimal[] alloc = DiscountAllocator.Allocate(lines, discount);   // lines: IReadOnlyList<DiscountLine>
public readonly record struct DiscountLine(int Sequence, decimal Gross, bool IsGift = false);

VatLineBreakdown line = VietnameseTaxEngine.ExtractVatLine(
    unitPriceIncludingVat, quantity, lineDiscount, allocatedOrderDiscount, vatRate);
// → GrossBeforeDiscount, LineDiscount, Payable, NetAmount, VatRate, VatAmount

VatCalculationResult r = VietnameseTaxEngine.ExtractVat(grossIncludingVat, vatRate); // tách 1 số
```

`ExtractVat`/`CalculateVat` **bắt buộc truyền thuế suất**; overload 1 tham số còn tồn tại nhưng
`[Obsolete]` (W4-5 xoá). `VatLineBreakdown` chính là bộ cột `OrderItems`/`InvoiceLines` phải snapshot —
khoản giảm giá **phải hiện rõ trên từng dòng hoá đơn** (NĐ 123/2020 Đ.10.6.đ), **không** dùng một
dòng giảm giá âm chung ở cuối (không phân bổ được về thuế suất từng dòng).

### 3.3 Ba chốt chặn (thiếu cái nào cũng ra số sai — đã chứng minh bằng script)

| # | Tình huống | Quy tắc | Nếu thiếu |
|---|---|---|---|
| 1 | `D > Σ gross` | `D = min(D, Σ gross)` | 250.000 trên 2 dòng 100.000 → −25.000/dòng, **VAT âm** |
| 2 | `Σ gross == 0` (đơn toàn quà) | mọi `alloc_i = 0` **và** `D` ép về 0 | **chia cho 0** |
| 3 | phần lẻ bằng nhau | "+1đ" theo `Sequence` tăng dần, rồi index | giỏ / đơn / hoá đơn phân bổ khác nhau, snapshot lệch |

Dòng `IsGift` bị loại khỏi cơ sở phân bổ (NĐ 181/2025 Đ.6.2: hàng khuyến mại → giá tính thuế = 0).

### 3.4 Trả hàng từng phần

```csharp
decimal refund = DiscountAllocator.RefundForReturn(
    linePayable, lineQuantity, returningQuantity, alreadyReturnedQuantity, alreadyRefunded);
```
Lần trả **cuối cùng** lấy toàn bộ phần còn lại. Không có quy tắc này thì dòng `payable = 1.268.113`,
`qty = 3`, trả lẻ 3 lần chỉ hoàn `1.268.112` (thiếu 1đ). VAT hoàn = `refund − Round(refund/(1+rate))`
với thuế suất của **hoá đơn gốc**.

### 3.5 Golden vectors (test hồi quy — `UnitTests.Kernel.Tax.VatGoldenVectorTests`)

| Đầu vào | Kết quả |
|---|---|
| dòng 27.599.000 / 580.000 / 1.290.000, coupon 500.000 @8% | alloc **468.272 / 9.841 / 21.887** · net **25.121.044 / 527.925 / 1.174.179** · VAT **2.009.684 / 42.234 / 93.934** · Total **28.969.000** · Tax **2.145.852** |
| 1.000.000 @8% | net 925.926 · VAT **74.074** |
| 290.000 + ship 30.000 @8% | Total **320.000** · Tax **23.703** (tách cả đơn = 23.704 → SAI) |

---

## 4. Tham số lương/thuế/bảo hiểm — `IStatutoryParameterProvider`

### 4.1 Mô hình: mỗi tham số — mỗi mốc — một dòng

```csharp
public sealed record StatutoryParameterRow(
    string Code, DateOnly EffectiveFrom, decimal? NumberValue, string? JsonValue,
    StatutoryParameterUnit Unit, string LegalBasis, string SourceUrl,
    string? Note = null, bool IsVerified = true);
```

* **KHÔNG có `EffectiveTo`** — khoảng hiệu lực suy ra từ dòng kế tiếp → không thể hở/chồng khoảng.
* `UNIQUE (Code, EffectiveFrom)`. Đúng **một** trong `NumberValue`/`JsonValue` có giá trị.
* `Unit ∈ { Vnd, Rate, Hours, Days, Count, Json, Text, Bool }` — **W2-25 dùng đúng tập này cho CHECK
  constraint của `hr."StatutoryParameters".Unit`**. `Text` lưu JSON string (`"I"`), `Bool` lưu `true`/`false`.
* Validate: `Rate ∈ [0;1]`, `Vnd/Hours/Days/Count ≥ 0`, biểu thuế tăng dần, **bậc cuối không có trần**.
* Đổi luật = **THÊM dòng**. Dòng có `EffectiveFrom ≤` kỳ lương đã `Paid` gần nhất: cấm sửa/xoá (409).

### 4.2 Resolve

```csharp
StatutoryParameterSet set = await provider.ResolveAsync(asOf);        // DB (W2-25) hoặc mặc định
StatutoryParameterSet set = VietnamStatutoryDefaults.Resolve(asOf);   // chỉ mặc định biên dịch sẵn
```
Với mỗi `Code`, lấy dòng có `EffectiveFrom` lớn nhất mà `EffectiveFrom ≤ asOf`. Thiếu mã nào →
`InvalidOperationException` nêu tên mã (KHÔNG âm thầm tính sai).

**Ngày tra (quan trọng — hai ngày khác nhau):**

| Nhóm tham số | Tra tại |
|---|---|
| Bảo hiểm, lương tối thiểu vùng, hệ số/trần OT | **ngày 01 của THÁNG LƯƠNG** |
| TNCN, giảm trừ, tiền ăn ca, chế độ miễn OT, ngưỡng khấu trừ 10% | **`PayrollRun.PayDate`** (mặc định ngày 05 tháng sau) |
| Quyết toán năm | tham số tại **31/12** của năm quyết toán |

`Payroll.StatutorySnapshotJson` phải lưu nguyên `StatutoryParameterSet` đã dùng — đó là thứ làm một
bảng lương đã trả tái lập được khi thanh tra.

### 4.3 Bảng mặc định (`VietnamStatutoryDefaults`, = seed của `hr.StatutoryParameters`)

| Code | Mốc → giá trị | Căn cứ |
|---|---|---|
| `PIT_PERSONAL_DEDUCTION` | 2020-07-01: 11.000.000 → **2026-01-01: 15.500.000** | NQ 110/2025; Luật 109/2025 Đ.10.1, Đ.29.2 |
| `PIT_DEPENDENT_DEDUCTION` | 4.400.000 → **2026-01-01: 6.200.000** | như trên |
| `PIT_BRACKETS` | 2009-01-01: 7 bậc → **2026-01-01: 5 bậc** (≤10tr 5% · 10-30 10% · 30-60 20% · 60-100 30% · >100 35%) | Luật 109/2025 Đ.9.2 |
| `PIT_NONRESIDENT_RATE` | 0.20 | Luật 109/2025 Đ.21 |
| `PIT_FLAT_RATE` / `PIT_FLAT_THRESHOLD` | 0.10 / 2.000.000 → **2026-01-01: 5.000.000** | NĐ 253/2026 Đ.50.2 + Đ.69.1.a |
| `PIT_OT_EXEMPT_MODE` | `PremiumOnly` → **2026-01-01: `FullWithinLegalHours`** | Luật 109/2025 Đ.4.8; NĐ 253 Đ.26.1 |
| `PIT_MEAL_TAXFREE_CAP` | 730.000 → **2026-07-01: 1.200.000** | NĐ 253 Đ.8.2.g + Đ.69.1.b |
| `SI_REFERENCE_LEVEL` | 2024-07-01: 2.340.000 → **2026-07-01: 2.530.000** | NĐ 73/2024 → NĐ 161/2026 |
| `SI_CAP_MULTIPLIER` / `UI_CAP_MULTIPLIER` | 20 / 20 → trần BHXH+BHYT 46.800.000 → **50.600.000**; trần BHTN vùng I 99.200.000 → **106.200.000** | Luật 41/2024 Đ.31.1.đ; Luật 74/2025 Đ.34.2 |
| `REGIONAL_MIN_WAGE` | 2024-07-01: 4.960.000/4.410.000/3.860.000/3.450.000 → **2026-01-01: 5.310.000/4.730.000/4.140.000/3.700.000** (giờ 25.500/22.700/20.000/17.800) | NĐ 293/2025 |
| `COMPANY_WAGE_REGION` | `I` (xã Vĩnh Bảo, TP Hải Phòng) | NĐ 293/2025 phụ lục mục 13 |
| NLĐ | `SI_EE` 0.08 · `HI_EE` 0.015 · `UI_EE` 0.01 (Σ 10,5%) | Luật 41/2024 Đ.33; NĐ 188/2025; Luật 74/2025 Đ.33 |
| NSDLĐ | `SI_ER_SICK` 0.03 · `SI_ER_PENSION` 0.14 · `SI_ER_ACCIDENT` 0.005 · `HI_ER` 0.03 · `UI_ER` 0.01 (Σ 21,5%) · `UNION_FEE_ER` 0.02 | như trên + NĐ 58/2020, Luật CĐ 50/2024 |
| `UNION_DUES_EE` / `UNION_DUES_EE_CAP_RATIO` | 0.01 / 0.10 × mức tham chiếu, **chỉ đoàn viên, mặc định tắt** | QĐ 1908/QĐ-TLĐ |
| `SI_UNPAID_DAYS_SKIP` / `HI_…` / `UI_…` | 14 ngày làm việc / true / true | Luật 41/2024 Đ.33.5 (BHYT-BHTN: thực hành QĐ 595) |
| `OT_MULTIPLIERS` | weekday 1.5 · restDay 2.0 · holiday 3.0 · nightPremium 0.3 · nightOtExtra 0.2 | BLLĐ Đ.98 + NĐ 145/2020 Đ.57 |
| `OT_LIMITS` | month 40 · year 200 | BLLĐ Đ.107 |
| `PROBATION_MIN_RATIO` | 0.85 | BLLĐ Đ.26 |

Dòng có `IsVerified = false` là các giá trị D06 đánh dấu **CHƯA XÁC MINH** từ nguồn sơ cấp
(`PIT_FLAT_THRESHOLD` cả hai mốc, `PIT_MEAL_TAXFREE_CAP` 730.000, `UI_ER`, `UNION_DUES_*`,
`HI/UI_UNPAID_DAYS_SKIP`, `REGIONAL_MIN_WAGE` 2024, `COMPANY_WAGE_REGION` 2024, `OT_LIMITS`,
`PROBATION_MIN_RATIO`). Mỗi dòng như vậy bắt buộc có `Note`. UI quản trị (W3-6) phải hiện cờ này.

---

## 5. Tính lương — `PayrollTaxCalculator`

```csharp
PayrollBreakdown result = PayrollTaxCalculator.Calculate(
    input,                                   // PayrollTaxInput — record thuần, không entity
    periodParameters,                        // resolve tại ngày 01 tháng lương
    payDateParameters);                      // resolve tại PayrollRun.PayDate
// overload 1 tham số dùng VietnamStatutoryDefaults cho cả hai ngày
```

### 5.1 Thứ tự tính (đừng đổi)

1. **Lương giờ** `= Round((lương HĐ + phụ cấp IsInsurable) / (công chuẩn × giờ/ngày))`
   — **làm tròn về đồng TRƯỚC khi nhân hệ số và số giờ**. TV1 ra 649.035 theo thứ tự này, 649.038 nếu đảo.
2. **Tiền OT** mỗi khối `= Round(lương giờ × hệ số × số giờ)`.
   Hệ số đêm `= hệ số ngày + 0,3 + 0,2 × hệ số lương của ngày (thường 1,0 / nghỉ tuần 2,0 / lễ 3,0)`
   → **200% / 270% / 390%**. "Ngày nghỉ hằng tuần" lấy theo **lịch ca**, không mặc định Chủ nhật.
3. **Gross** = lương theo công + phụ cấp (kể cả khoản được miễn) + thưởng + OT + phụ cấp đêm.
4. **Bảo hiểm** — căn cứ = `SalaryStructure.InsurableSalary` (KHÔNG phải gross):
   BHXH/BHYT kẹp `[SI_REFERENCE_LEVEL; SI_CAP_MULTIPLIER × SI_REFERENCE_LEVEL]`;
   BHTN kẹp trần riêng `UI_CAP_MULTIPLIER × LTT vùng` (không có sàn riêng).
5. **Thu nhập chịu thuế** = lương theo công + phụ cấp chịu thuế + thưởng + phần ăn ca **vượt** hạn mức
   + phần OT/đêm **không** được miễn.
   OT miễn: `giờ miễn = min(giờ OT tháng, OT_LIMITS.month, OT_LIMITS.year − luỹ kế năm)`;
   `tiền miễn = Round(tiền OT × giờ miễn / tổng giờ OT)`; phụ cấp đêm được miễn toàn bộ ở chế độ
   `FullWithinLegalHours`. Chế độ `PremiumOnly` (đến kỳ 2025) chỉ miễn phần chênh so với lương giờ thường.
6. **TNCN** theo `PitMethod` (mục 5.2).
7. **Net** = gross − BH NLĐ − đoàn phí − TNCN − giảm trừ khác.
   **Tổng chi phí DN** = gross + BH NSDLĐ + KPCĐ. KPCĐ = 2% × **căn cứ đóng BHXH** (đã kẹp trần).

### 5.2 `PitMethod` — `PitCalculator.SelectMethod(input)`

| Điều kiện | Method | Cách tính |
|---|---|---|
| không cư trú | `NonResident20` | 20% × tổng thu nhập, **không giảm trừ** |
| **HĐ thử việc RIÊNG** / không HĐ / HĐ < 3 tháng | `Flat10` | 10% mỗi lần chi, **chỉ khi ≥ `PIT_FLAT_THRESHOLD`**; có cam kết → 0 |
| còn lại (HĐLĐ ≥ 3 tháng, cư trú) | `Progressive` | luỹ tiến từng phần trên thu nhập tính thuế |

**`ContractType.Probation` MỘT MÌNH không đủ.** BLLĐ Đ.24 cho phép ghi nội dung thử việc ngay trong
HĐLĐ — khi đó **vẫn đóng đủ bảo hiểm** và HĐLĐ ≥ 3 tháng thì **vẫn luỹ tiến**. Chỉ
`EmploymentContract.IsStandaloneProbation = true` mới miễn BH và dùng `Flat10`
(NĐ 158/2025 Đ.3.5; Luật 74/2025 Đ.31.2).

### 5.3 Nghỉ không hưởng lương ≥ 14 ngày làm việc

Ba cờ **riêng biệt** (Luật 41/2024 Đ.33.5 chỉ nói BHXH):
`SI_UNPAID_DAYS_SKIP` (có căn cứ) · `HI_UNPAID_DAYS_SKIP` / `UI_UNPAID_DAYS_SKIP` (CHƯA XÁC MINH,
mặc định BẬT). `Payroll.KeepSiOnUnpaidLeave = true` (thoả thuận NSDLĐ-NLĐ, Đ.34.3) chỉ giữ **BHXH**.

### 5.4 Test vectors (`UnitTests.Kernel.Tax.PayrollTaxCalculatorTests`)

| # | Tình huống | Kết quả then chốt |
|---|---|---|
| TV1 | kỳ 9/2026 · HĐLĐ 12T · 9tr · ăn trưa 1tr · 1 NPT · OT 10h thường | lương giờ 43.269 · OT 649.035 · BH NLĐ 945.000 · TNCN 0 · **net 9.704.035** · NSDLĐ 1.935.000 · KPCĐ 180.000 · tổng chi phí 12.764.035 |
| TV2a | kỳ 9/2026 · 60tr · thưởng 5tr · 2 NPT | BH 5.407.000 (trần 50,6tr) · TN tính thuế 31.693.000 · TNCN **2.838.600** · net 56.754.400 · KPCĐ 1.012.000 |
| TV2b | như TV2a, kỳ 6/2026 (trần 46,8tr) | BH 5.046.000 · TNCN **2.910.800** · net 57.043.200 · **chênh BH 361.000** |
| TV3 | HĐ thử việc riêng, 8.5tr | BH 0 · TNCN 850.000 · net 7.650.000; cam kết → 0; chi 4.25tr < 5tr → 0 |
| TV4 | 30tr, 0 NPT, PayDate 12/2025 vs 01/2026 | 2025: 1.627.500 / 25.222.500 · 2026: **635.000** / 26.215.000 |
| TV5 | thử việc TRONG HĐLĐ 12T, 8.5tr | BH **892.500** · Progressive · TNCN 0 · net 7.607.500 |
| TV6 | quyết toán 2026, 30tr × 12, 0 NPT | giảm trừ 186.000.000 · TN tính thuế 136.200.000 · **TNCN năm 7.620.000** |

---

## 6. API cũ đã `[Obsolete]` (còn nguyên, W4-5 mới xoá)

`TaxRates.VatStandard` · `VietnameseTaxEngine.{VatStandard, VatRateForCategory, CalculateVat(1 tham số),
ExtractVat(1 tham số), PersonalDeduction, DependentDeduction, BaseSalary2025, MaxInsurableSalary,
8 hằng số *InsuranceRate_*, CalculateMonthlyPit, CalculateAnnualPit, CalculateInsurance, CalculatePayroll}`.

Chúng vẫn biên dịch và vẫn trả đúng số **của luật trước 2026** — 63 test thuế hiện có dựa vào đó và
vẫn xanh. Code MỚI không được gọi chúng: trình biên dịch sẽ cảnh báo kèm tên API thay thế.
W4-1 tham số hoá 63 test đó thành vector "kỳ 2025"; W4-5 xoá các thành viên `[Obsolete]`,
`SystemConfigTaxSettingsProvider` phần TNCN/BH và facade `Services/Accounting/Domain/VietnameseTaxEngine.cs`.

`Sales/Application/Pricing/DiscountAllocator.cs` là bản **tạm** của W0-4 — W2-3 xoá nó và chuyển sang
`BuildingBlocks.TaxEngine.DiscountAllocator` (bản này có thêm tie-break theo `Sequence`, loại dòng quà,
và quy tắc số dư khi trả hàng).

---

## 7. Việc còn lại của các track sau

| Track | Việc |
|---|---|
| W1-4 | seed 4 khoá `TAX_VAT_REDUCTION_*`, **xoá** `TAX_RATE` và 9 khoá rác "HR & Payroll" + 3 khoá `TAX_*` của D06 |
| W1-5 | `services.AddBusinessClock()` trong host; `InvoiceRequested` mang `vatStatutoryRate`/`vatReductionEligible`/`orderBusinessDate` theo dòng |
| W2-1 | migration `Categories.VatReductionEligible bool NOT NULL DEFAULT true` |
| W2-3 | 7 cột snapshot thuế trên `OrderItems`/`Orders`; xoá allocator tạm của W0-4 |
| W2-10 | hoàn tiền dùng `DiscountAllocator.RefundForReturn`, thuế suất hoá đơn gốc |
| W2-14 | hoá đơn re-resolve thuế suất tại **ngày lập**; `InvoiceLine` lưu `GrossBeforeDiscount`/`LineDiscount`/`NetAmount`/`VatRate`/`VatAmount` |
| W2-16 | VAT đầu ra nhóm theo `VatRate`; mẫu 05/KK-TNCN chuyển sang `PitCalculator.Annual` + `IStatutoryParameterProvider` |
| W2-25 | bảng `hr.StatutoryParameters` + seeder từ `VietnamStatutoryDefaults.Rows` + `HrStatutoryParameterProvider`; `PayrollCalculationService`/`PitFinalizationService` chuyển sang `PayrollTaxCalculator` |
| W3-6 | màn hình tham số: dòng thời gian theo `Code`, hiện `LegalBasis`/`SourceUrl`/cờ `IsVerified`, khoá dòng quá khứ |

## 8. Câu hỏi còn mở (kế toán xác nhận, không chặn)

1. Có nghị quyết gia hạn giảm VAT sang 2027 không (chưa thấy đến 18/09/2026) — nếu có, chỉ sửa config.
2. Ngưỡng khấu trừ 10% cho kỳ 01-06/2026: D06 áp 5.000.000 theo NĐ 253 Đ.69.1.a, nhưng NĐ chỉ hiệu lực 01/07/2026.
3. Có bỏ BHYT/BHTN khi nghỉ không lương ≥ 14 ngày không (Đ.33.5 chỉ nói BHXH) — hai cờ riêng, mặc định BẬT.
4. "Mức quy định" của giờ OT miễn thuế (NĐ 253 Đ.26.3) — hiện hiểu là trần BLLĐ Đ.107 (40h/tháng, 200h/năm).
5. Phụ cấp làm đêm KHÔNG phải OT có bị áp trần giờ không — hiện miễn toàn bộ ở chế độ `FullWithinLegalHours`.
