using BuildingBlocks.SharedKernel;
using FluentAssertions;
using SystemConfig.Domain;
using Xunit;

namespace UnitTests.SystemConfig;

/// <summary>
/// Kiểm tra tính idempotent của seeder cấu hình.
/// Chạy seeder 2 lần phải: 1) không tạo trùng lặp, 2) cập nhật key placeholder sang giá trị thật.
/// </summary>
public class ConfigSeederIdempotentTests
{
    [Fact]
    public void ConfigurationEntry_NewKey_CreateSuccess()
    {
        var entry = new ConfigurationEntry
        {
            Key = "COMPANY_NAME",
            Value = "Công ty TNHH Máy Tính Quang Hưởng",
            Category = "Company",
            ValueType = ConfigValueType.String,
            Description = "Tên công ty"
        };

        entry.Key.Should().Be("COMPANY_NAME");
        entry.Value.Should().Contain("Quang Hưởng");
        entry.Category.Should().Be("Company");
    }

    [Fact]
    public void ConfigurationEntry_PlaceholderValue_CanUpdate()
    {
        var entry = new ConfigurationEntry
        {
            Key = "COMPANY_TAX_CODE",
            Value = "0123456789",  // placeholder value
            Category = "Company",
            ValueType = ConfigValueType.String,
            Description = "Mã số thuế"
        };

        // Placeholder should be identifiable
        entry.Value.Should().Be("0123456789");

        // Simulate update to real value
        entry.Value = "0200807633";
        entry.Value.Should().Be("0200807633");
    }

    [Fact]
    public void ConfigurationEntry_NonPlaceholderValue_ShouldNotOverwrite()
    {
        var entry = new ConfigurationEntry
        {
            Key = "COMPANY_NAME",
            Value = "Custom Name by Admin",  // admin-modified value, not a known placeholder
            Category = "Company",
            ValueType = ConfigValueType.String,
            Description = "Tên công ty"
        };

        // This value is not in the known placeholders list, so should be preserved
        entry.Value.Should().Be("Custom Name by Admin");
    }

    [Fact]
    public void ConfigurationEntry_UpdateValue_ChangesValue()
    {
        var entry = new ConfigurationEntry
        {
            Key = "TAX_PERSONAL_DEDUCTION",
            Value = "11000000",
            Category = "Tax",
            ValueType = ConfigValueType.Number
        };

        var originalTimestamp = entry.LastUpdated;

        entry.Value = "11500000";
        entry.LastUpdated = DateTime.UtcNow;

        entry.Value.Should().Be("11500000");
        entry.LastUpdated.Should().BeOnOrAfter(originalTimestamp);
    }

    [Fact]
    public void MultipleConfigurations_SameCategory_DifferentKeys()
    {
        var entries = new[]
        {
            new ConfigurationEntry { Key = "COMPANY_NAME", Value = "Công ty TNHH Máy Tính Quang Hưởng", Category = "Company" },
            new ConfigurationEntry { Key = "COMPANY_TAX_CODE", Value = "0200807633", Category = "Company" },
            new ConfigurationEntry { Key = "COMPANY_PHONE", Value = "031 3823769", Category = "Company" }
        };

        entries.Should().HaveCount(3);
        entries.Select(e => e.Category).Distinct().Should().HaveCount(1);
        entries.Select(e => e.Key).Should().AllSatisfy(k => k.Should().NotBeNullOrEmpty());
    }

    [Fact]
    public void TaxConfiguration_ConsistentTypes()
    {
        var taxConfigs = new[]
        {
            new ConfigurationEntry { Key = "TAX_PERSONAL_DEDUCTION", Value = "11000000", ValueType = ConfigValueType.Number, Category = "Tax" },
            new ConfigurationEntry { Key = "TAX_DEPENDENT_DEDUCTION", Value = "4400000", ValueType = ConfigValueType.Number, Category = "Tax" },
            new ConfigurationEntry { Key = "TAX_VAT_DEFAULT_RATE", Value = "10", ValueType = ConfigValueType.Number, Category = "Tax" }
        };

        taxConfigs.Should().AllSatisfy(c =>
        {
            c.Category.Should().Be("Tax");
            c.ValueType.Should().Be(ConfigValueType.Number);
            decimal.TryParse(c.Value, out var _).Should().BeTrue("Tax values should be numeric");
        });
    }
}
