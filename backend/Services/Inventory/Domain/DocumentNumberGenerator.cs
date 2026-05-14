namespace InventoryModule.Domain;

public static class DocumentNumberGenerator
{
    private static int _grnCounter = 0;
    private static int _dnCounter = 0;
    private static int _countCounter = 0;
    private static string _currentMonth = "";

    public static string GenerateGRN()
    {
        ResetIfNewMonth();
        return $"PN-{DateTime.UtcNow:yyyyMM}-{Interlocked.Increment(ref _grnCounter):D5}";
    }

    public static string GenerateDN()
    {
        ResetIfNewMonth();
        return $"PX-{DateTime.UtcNow:yyyyMM}-{Interlocked.Increment(ref _dnCounter):D5}";
    }

    public static string GenerateCount()
    {
        ResetIfNewMonth();
        return $"KK-{DateTime.UtcNow:yyyyMM}-{Interlocked.Increment(ref _countCounter):D5}";
    }

    private static void ResetIfNewMonth()
    {
        var month = DateTime.UtcNow.ToString("yyyyMM");
        if (_currentMonth != month)
        {
            _currentMonth = month;
            _grnCounter = 0;
            _dnCounter = 0;
            _countCounter = 0;
        }
    }
}
