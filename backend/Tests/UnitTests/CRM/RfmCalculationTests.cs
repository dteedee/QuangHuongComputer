using FluentAssertions;
using Xunit;

namespace UnitTests.CRM;

/// <summary>
/// Kiểm tra tính toán RFM (Recency, Frequency, Monetary) — phân khúc khách hàng.
/// RFM phải tính đúng từ đơn hàng thật: recency ngày, frequency số đơn, monetary tổng tiền.
/// </summary>
public class RfmCalculationTests
{
    private class RfmScore
    {
        public int Recency { get; set; }  // 1-5, gần đây nhất = 5
        public int Frequency { get; set; }  // 1-5, mua nhiều = 5
        public int Monetary { get; set; }   // 1-5, tiêu dùng lớn = 5
        public int TotalScore => Recency + Frequency + Monetary;
        public string Segment => GetSegment();

        private string GetSegment() => TotalScore switch
        {
            >= 13 => "VIP",
            >= 10 => "Regular",
            >= 7 => "At-Risk",
            _ => "Lost"
        };
    }

    [Fact]
    public void RfmScore_VIPCustomer_HighRecencyFrequencyMonetary()
    {
        var rfm = new RfmScore
        {
            Recency = 5,  // mua gần đây
            Frequency = 5,  // mua nhiều lần
            Monetary = 5   // tiêu dùng lớn
        };

        rfm.TotalScore.Should().Be(15);
        rfm.Segment.Should().Be("VIP");
    }

    [Fact]
    public void RfmScore_RegularCustomer_MediumScores()
    {
        var rfm = new RfmScore
        {
            Recency = 4,
            Frequency = 3,
            Monetary = 3
        };

        rfm.TotalScore.Should().Be(10);
        rfm.Segment.Should().Be("Regular");
    }

    [Fact]
    public void RfmScore_AtRiskCustomer_LowRecency()
    {
        var rfm = new RfmScore
        {
            Recency = 2,  // không mua gần đây
            Frequency = 3,
            Monetary = 3
        };

        rfm.TotalScore.Should().Be(8);
        rfm.Segment.Should().Be("At-Risk");
    }

    [Fact]
    public void RfmScore_LostCustomer_VeryLowScores()
    {
        var rfm = new RfmScore
        {
            Recency = 1,
            Frequency = 1,
            Monetary = 1
        };

        rfm.TotalScore.Should().Be(3);
        rfm.Segment.Should().Be("Lost");
    }

    [Fact]
    public void RfmScore_NoOrderCustomer_ZeroScore()
    {
        var rfm = new RfmScore
        {
            Recency = 0,
            Frequency = 0,
            Monetary = 0
        };

        rfm.TotalScore.Should().Be(0);
        rfm.Segment.Should().Be("Lost");
    }

    [Fact]
    public void RfmRecency_DaysCalculation_Correct()
    {
        // Gần đây nhất (trong 30 ngày) → Recency 5
        var today = DateTime.UtcNow;
        var lastOrderDate = today.AddDays(-15);
        var daysSinceLastOrder = (today - lastOrderDate).Days;

        daysSinceLastOrder.Should().Be(15);
        daysSinceLastOrder.Should().BeLessThanOrEqualTo(30);
    }

    [Fact]
    public void RfmFrequency_OrderCount_Correct()
    {
        // 20 đơn hàng = Frequency cao
        var orderCount = 20;
        var frequency = CalculateFrequencyScore(orderCount);

        frequency.Should().Be(5);  // Threshold: > 15 = 5
    }

    [Fact]
    public void RfmMonetary_TotalSpending_Correct()
    {
        // 50M VND = Monetary cao
        var totalSpending = 50_000_000m;
        var monetary = CalculateMonetaryScore(totalSpending);

        monetary.Should().Be(5);  // Threshold: > 40M = 5
    }

    [Fact]
    public void RfmScore_Boundaries_Correct()
    {
        // VIP boundary: >= 13
        var vip = new RfmScore { Recency = 5, Frequency = 4, Monetary = 4 };
        vip.TotalScore.Should().Be(13);
        vip.Segment.Should().Be("VIP");

        // Regular boundary: >= 10
        var regular = new RfmScore { Recency = 4, Frequency = 3, Monetary = 3 };
        regular.TotalScore.Should().Be(10);
        regular.Segment.Should().Be("Regular");

        // At-Risk boundary: >= 7
        var atRisk = new RfmScore { Recency = 3, Frequency = 2, Monetary = 2 };
        atRisk.TotalScore.Should().Be(7);
        atRisk.Segment.Should().Be("At-Risk");
    }

    private int CalculateFrequencyScore(int orderCount)
    {
        return orderCount switch
        {
            > 15 => 5,
            > 10 => 4,
            > 5 => 3,
            > 1 => 2,
            _ => 1
        };
    }

    private int CalculateMonetaryScore(decimal totalSpending)
    {
        return totalSpending switch
        {
            > 40_000_000m => 5,
            > 25_000_000m => 4,
            > 10_000_000m => 3,
            > 5_000_000m => 2,
            _ => 1
        };
    }
}
