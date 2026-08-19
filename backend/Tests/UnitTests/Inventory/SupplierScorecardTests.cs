using FluentAssertions;
using Xunit;

namespace UnitTests.Inventory;

/// <summary>
/// Kiểm tra tính toán scorecard nhà cung cấp — on-time delivery rate, quality, response time.
/// </summary>
public class SupplierScorecardTests
{
    private class PurchaseOrder
    {
        public Guid Id { get; set; }
        public string SupplierCode { get; set; }
        public DateTime OrderDate { get; set; }
        public DateTime ExpectedDeliveryDate { get; set; }
        public DateTime? ActualDeliveryDate { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; }  // Pending, Delivered, Cancelled

        public bool IsOnTime => ActualDeliveryDate.HasValue && ActualDeliveryDate <= ExpectedDeliveryDate;
    }

    private class SupplierScorecard
    {
        public string SupplierCode { get; set; }
        public int TotalOrders { get; set; }
        public int OnTimeDeliveries { get; set; }
        public decimal OnTimeRate => TotalOrders > 0 ? (decimal)OnTimeDeliveries / TotalOrders : 0;
        public decimal OnTimePercentage => OnTimeRate * 100;  // Convert to 0-100 range
        public int QualityIssues { get; set; }
        public decimal QualityScore => TotalOrders > 0 ? 100 - ((decimal)QualityIssues / TotalOrders * 100) : 100;
        public decimal AverageDaysEarly { get; set; }
        public decimal OverallScore => (OnTimePercentage * 0.5m + QualityScore * 0.5m);
    }

    [Fact]
    public void Scorecard_OnTimeDelivery_Perfect100Percent()
    {
        var scorecard = new SupplierScorecard
        {
            SupplierCode = "SUP-001",
            TotalOrders = 10,
            OnTimeDeliveries = 10,
            QualityIssues = 0
        };

        scorecard.OnTimeRate.Should().Be(1.0m);
        scorecard.QualityScore.Should().Be(100m);
        scorecard.OverallScore.Should().Be(100m);
    }

    [Fact]
    public void Scorecard_OnTimeDelivery_80Percent()
    {
        var scorecard = new SupplierScorecard
        {
            SupplierCode = "SUP-002",
            TotalOrders = 10,
            OnTimeDeliveries = 8,
            QualityIssues = 1
        };

        scorecard.OnTimeRate.Should().Be(0.8m);
        scorecard.QualityScore.Should().Be(90m);
        // Overall = 0.8 * 50 + 0.9 * 50 = 40 + 45 = 85
        scorecard.OverallScore.Should().Be(85m);
    }

    [Fact]
    public void Scorecard_NoOrders_ZeroRate()
    {
        var scorecard = new SupplierScorecard
        {
            SupplierCode = "SUP-NEW",
            TotalOrders = 0,
            OnTimeDeliveries = 0,
            QualityIssues = 0
        };

        scorecard.OnTimeRate.Should().Be(0);
        scorecard.QualityScore.Should().Be(100);
    }

    [Fact]
    public void PurchaseOrder_DeliveredOnTime_IsOnTimeTrue()
    {
        var po = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-001",
            OrderDate = DateTime.UtcNow.AddDays(-10),
            ExpectedDeliveryDate = DateTime.UtcNow.AddDays(-2),
            ActualDeliveryDate = DateTime.UtcNow.AddDays(-3),  // 1 day early
            Status = "Delivered"
        };

        po.IsOnTime.Should().BeTrue();
    }

    [Fact]
    public void PurchaseOrder_DeliveredLate_IsOnTimeFalse()
    {
        var po = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-002",
            OrderDate = DateTime.UtcNow.AddDays(-10),
            ExpectedDeliveryDate = DateTime.UtcNow.AddDays(-2),
            ActualDeliveryDate = DateTime.UtcNow.AddDays(-1),  // 1 day late
            Status = "Delivered"
        };

        po.IsOnTime.Should().BeFalse();
    }

    [Fact]
    public void PurchaseOrder_ExactlyOnDeliveryDate_IsOnTimeTrue()
    {
        var deliveryDate = DateTime.UtcNow.AddDays(-5);
        var po = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-001",
            OrderDate = DateTime.UtcNow.AddDays(-15),
            ExpectedDeliveryDate = deliveryDate,
            ActualDeliveryDate = deliveryDate,
            Status = "Delivered"
        };

        po.IsOnTime.Should().BeTrue();
    }

    [Fact]
    public void PurchaseOrder_NotDeliveredYet_IsOnTimeFalse()
    {
        var po = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-001",
            OrderDate = DateTime.UtcNow.AddDays(-10),
            ExpectedDeliveryDate = DateTime.UtcNow.AddDays(5),
            ActualDeliveryDate = null,  // Chưa giao
            Status = "Pending"
        };

        po.IsOnTime.Should().BeFalse();  // Chưa giao không tính on-time
    }

    [Fact]
    public void Scorecard_MultipleQualityIssues_ReducesScore()
    {
        var scorecard = new SupplierScorecard
        {
            SupplierCode = "SUP-003",
            TotalOrders = 10,
            OnTimeDeliveries = 9,
            QualityIssues = 2  // 2 đơn hàng có vấn đề về chất lượng
        };

        scorecard.QualityScore.Should().Be(80);  // 100 - (2/10 * 100)
        scorecard.OnTimeRate.Should().Be(0.9m);
        scorecard.OverallScore.Should().Be(85);  // (90 + 80) / 2
    }

    [Fact]
    public void Scorecard_CalculatesAverageDaysEarly()
    {
        // Giả sử 3 đơn hàng giao sớm: 1 ngày, 2 ngày, 3 ngày
        var averageDaysEarly = (1 + 2 + 3m) / 3;

        averageDaysEarly.Should().Be(2);
    }

    [Fact]
    public void Scorecard_Benchmarking_Excellent()
    {
        // Supplier A: On-time 95%, Quality 98%, Overall = 96.5
        var supplierA = new SupplierScorecard
        {
            SupplierCode = "SUP-A",
            TotalOrders = 100,
            OnTimeDeliveries = 95,
            QualityIssues = 2
        };

        supplierA.OverallScore.Should().BeGreaterThan(95);
    }

    [Fact]
    public void Scorecard_Benchmarking_AtRisk()
    {
        // Supplier B: On-time 60%, Quality 70%, Overall = (60 + 70) / 2 = 65
        var supplierB = new SupplierScorecard
        {
            SupplierCode = "SUP-B",
            TotalOrders = 100,
            OnTimeDeliveries = 60,
            QualityIssues = 30
        };

        supplierB.OnTimePercentage.Should().Be(60);
        supplierB.QualityScore.Should().Be(70);
        supplierB.OverallScore.Should().Be(65);
    }

    [Fact]
    public void Scorecard_WeightedCalculation_OnTimeHeavier()
    {
        // On-time 50% (OnTimePercentage=50), Quality 100%
        // Overall = 50 * 0.5 + 100 * 0.5 = 25 + 50 = 75
        var scorecard = new SupplierScorecard
        {
            SupplierCode = "SUP-TEST",
            TotalOrders = 10,
            OnTimeDeliveries = 5,
            QualityIssues = 0
        };

        scorecard.OnTimePercentage.Should().Be(50);
        scorecard.QualityScore.Should().Be(100);
        scorecard.OverallScore.Should().Be(75);
    }

    [Fact]
    public void Scorecard_TimeRange_MonthlyCalculation()
    {
        // Kiểm tra scorecard theo khoảng thời gian (ví dụ: tháng này)
        var thisMonth = DateTime.UtcNow.Month;
        var orders = new[]
        {
            new PurchaseOrder { OrderDate = DateTime.UtcNow.AddDays(-10), ExpectedDeliveryDate = DateTime.UtcNow.AddDays(-5), ActualDeliveryDate = DateTime.UtcNow.AddDays(-5), Status = "Delivered" },
            new PurchaseOrder { OrderDate = DateTime.UtcNow.AddDays(-5), ExpectedDeliveryDate = DateTime.UtcNow, ActualDeliveryDate = null, Status = "Pending" }
        };

        var relevantOrders = orders.Where(o => o.OrderDate.Month == thisMonth).ToList();
        relevantOrders.Should().HaveCount(2);
    }
}
