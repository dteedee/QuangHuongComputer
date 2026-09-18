using Accounting.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Accounting;

/// <summary>
/// W2-14 — đối soát ca thu ngân. Bản cũ tính chênh lệch = cuối ca − đầu ca, tức là bỏ qua
/// toàn bộ doanh thu tiền mặt trong ca, nên một ca bán 3 triệu luôn bị báo "thừa quỹ 3 triệu".
/// </summary>
public class ShiftReconciliationTests
{
    private static readonly DateTime OpenedAt = new(2026, 9, 18, 1, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime ClosedAt = new(2026, 9, 18, 11, 0, 0, DateTimeKind.Utc);
    private static readonly Guid Cashier = Guid.NewGuid();

    private static ShiftSession OpenWithMovements()
    {
        var shift = ShiftSession.Open(Cashier, Guid.NewGuid(), 500_000m, OpenedAt);
        shift.RecordTransaction("Bán hàng tiền mặt", 3_000_000m, TransactionType.Credit,
            OpenedAt.AddHours(2), ShiftTransactionSource.PosSale, "POS-1");
        shift.RecordTransaction("Chi tạm ứng", 200_000m, TransactionType.Debit,
            OpenedAt.AddHours(3), ShiftTransactionSource.ExpensePayout, "EXP-1");
        return shift;
    }

    [Fact]
    public void Expected_cash_is_opening_plus_cash_in_minus_cash_out()
    {
        // Success criteria của phase-52: 500.000 + 3.000.000 − 200.000 = 3.300.000.
        var shift = OpenWithMovements();

        shift.CashIn.Should().Be(3_000_000m);
        shift.CashOut.Should().Be(200_000m);
        shift.CurrentExpectedCash.Should().Be(3_300_000m);
    }

    [Fact]
    public void Closing_with_the_expected_amount_leaves_zero_variance()
    {
        var shift = OpenWithMovements();
        shift.Close(3_300_000m, ClosedAt);

        shift.ExpectedCash.Should().Be(3_300_000m);
        shift.Variance.Should().Be(0m);
        shift.Status.Should().Be(ShiftStatus.Closed);
    }

    [Fact]
    public void A_shortfall_is_negative_and_is_persisted_with_its_reason()
    {
        var shift = OpenWithMovements();
        shift.Close(3_250_000m, ClosedAt, "Thiếu quỹ, đang rà soát");

        shift.Variance.Should().Be(-50_000m);
        shift.VarianceReason.Should().Be("Thiếu quỹ, đang rà soát");
    }

    [Fact]
    public void Closing_with_a_variance_and_no_reason_is_refused()
    {
        var shift = OpenWithMovements();

        var act = () => shift.Close(3_250_000m, ClosedAt);

        act.Should().Throw<InvalidOperationException>().WithMessage("*lý do*");
    }

    [Fact]
    public void A_cashier_cannot_approve_their_own_variance()
    {
        var shift = OpenWithMovements();
        shift.Close(3_250_000m, ClosedAt, "Thiếu quỹ");

        var act = () => shift.ApproveVariance(Cashier, ClosedAt);

        act.Should().Throw<InvalidOperationException>();

        shift.ApproveVariance(Guid.NewGuid(), ClosedAt);
        shift.VarianceApprovedBy.Should().NotBeNull();
    }

    [Fact]
    public void A_closed_shift_accepts_no_further_transactions()
    {
        var shift = OpenWithMovements();
        shift.Close(3_300_000m, ClosedAt);

        var act = () => shift.RecordTransaction("Bán thêm", 1_000m, TransactionType.Credit, ClosedAt);

        act.Should().Throw<InvalidOperationException>();
    }
}
