namespace BuildingBlocks.Testing;

public static class MockDataGenerator
{
    private static readonly Random _random = new();

    public static string GenerateEmail()
    {
        return $"test{_random.Next(1000, 9999)}@example.com";
    }

    public static string GeneratePhone()
    {
        return $"+84{_random.Next(100000000, 999999999)}";
    }

    public static string GenerateName()
    {
        var firstNames = new[] { "John", "Jane", "Michael", "Emily", "David", "Sarah", "Robert", "Lisa" };
        var lastNames = new[] { "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis" };
        return $"{firstNames[_random.Next(firstNames.Length)]} {lastNames[_random.Next(lastNames.Length)]}";
    }

    public static string GenerateAddress()
    {
        var streets = new[] { "Main St", "Oak Ave", "Pine Rd", "Maple Dr", "Cedar Ln" };
        return $"{_random.Next(1, 999)} {streets[_random.Next(streets.Length)]}, City {_random.Next(1, 100)}";
    }

    public static decimal GeneratePrice(decimal min = 1, decimal max = 1000)
    {
        return Math.Round((decimal)(_random.NextDouble() * (double)(max - min)) + min, 2);
    }

    public static int GenerateQuantity(int min = 1, int max = 100)
    {
        return _random.Next(min, max + 1);
    }

    public static DateTime GenerateDate(int daysBack = 365)
    {
        return DateTime.UtcNow.AddDays(-_random.Next(0, daysBack));
    }

    public static string GenerateString(int length = 10)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        return new string(Enumerable.Range(0, length)
            .Select(_ => chars[_random.Next(chars.Length)])
            .ToArray());
    }
}
