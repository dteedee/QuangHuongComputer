using System.Diagnostics;

namespace BuildingBlocks.Testing;

/// <summary>
/// Performance testing helper for measuring query and API response times
/// </summary>
public class PerformanceTester
{
    private readonly List<PerformanceMetric> _metrics = new();

    /// <summary>
    /// Measures the execution time of a delegate
    /// </summary>
    public PerformanceMetric Measure(string name, Action action, int iterations = 1)
    {
        var sw = Stopwatch.StartNew();
        
        for (int i = 0; i < iterations; i++)
        {
            action.Invoke();
        }
        
        sw.Stop();
        
        var metric = new PerformanceMetric
        {
            Name = name,
            ElapsedMilliseconds = sw.ElapsedMilliseconds,
            Iterations = iterations,
            AverageMilliseconds = (double)sw.ElapsedMilliseconds / iterations
        };
        
        _metrics.Add(metric);
        return metric;
    }

    /// <summary>
    /// Measures the execution time of an async delegate
    /// </summary>
    public async Task<PerformanceMetric> MeasureAsync(string name, Func<Task> action, int iterations = 1)
    {
        var sw = Stopwatch.StartNew();
        
        for (int i = 0; i < iterations; i++)
        {
            await action.Invoke();
        }
        
        sw.Stop();
        
        var metric = new PerformanceMetric
        {
            Name = name,
            ElapsedMilliseconds = sw.ElapsedMilliseconds,
            Iterations = iterations,
            AverageMilliseconds = (double)sw.ElapsedMilliseconds / iterations
        };
        
        _metrics.Add(metric);
        return metric;
    }

    /// <summary>
    /// Compares performance between two implementations
    /// </summary>
    public PerformanceComparison Compare(
        string name1,
        Action action1,
        string name2,
        Action action2,
        int iterations = 1)
    {
        var metric1 = Measure(name1, action1, iterations);
        var metric2 = Measure(name2, action2, iterations);
        
        var improvement = ((metric1.AverageMilliseconds - metric2.AverageMilliseconds) / metric1.AverageMilliseconds) * 100;
        
        return new PerformanceComparison
        {
            Method1 = metric1,
            Method2 = metric2,
            ImprovementPercentage = improvement,
            WinnerName = improvement > 0 ? name2 : name1
        };
    }

    /// <summary>
    /// Gets all recorded metrics
    /// </summary>
    public IReadOnlyList<PerformanceMetric> GetMetrics() => _metrics.AsReadOnly();

    /// <summary>
    /// Gets summary statistics
    /// </summary>
    public PerformanceSummary GetSummary()
    {
        if (_metrics.Count == 0)
            return new PerformanceSummary();

        return new PerformanceSummary
        {
            TotalMetrics = _metrics.Count,
            TotalElapsedMilliseconds = _metrics.Sum(m => m.ElapsedMilliseconds),
            AverageMilliseconds = _metrics.Average(m => m.AverageMilliseconds),
            MinMilliseconds = _metrics.Min(m => m.AverageMilliseconds),
            MaxMilliseconds = _metrics.Max(m => m.AverageMilliseconds),
            Metrics = _metrics.AsReadOnly()
        };
    }

    /// <summary>
    /// Prints summary to console
    /// </summary>
    public void PrintSummary()
    {
        var summary = GetSummary();
        
        Console.WriteLine("\n📊 Performance Test Results:");
        Console.WriteLine(new string('=', 60));
        Console.WriteLine($"Total Metrics: {summary.TotalMetrics}");
        Console.WriteLine($"Total Time: {summary.TotalElapsedMilliseconds}ms");
        Console.WriteLine($"Average Time: {summary.AverageMilliseconds:F2}ms");
        Console.WriteLine($"Min Time: {summary.MinMilliseconds:F2}ms");
        Console.WriteLine($"Max Time: {summary.MaxMilliseconds:F2}ms");
        Console.WriteLine(new string('=', 60));
        
        foreach (var metric in summary.Metrics)
        {
            Console.WriteLine($"\n{metric.Name}:");
            Console.WriteLine($"  Total: {metric.ElapsedMilliseconds}ms");
            Console.WriteLine($"  Average: {metric.AverageMilliseconds:F2}ms");
            Console.WriteLine($"  Iterations: {metric.Iterations}");
        }
        
        Console.WriteLine(new string('=', 60));
    }

    /// <summary>
    /// Clears all metrics
    /// </summary>
    public void Clear() => _metrics.Clear();
}

/// <summary>
/// Performance metric data
/// </summary>
public class PerformanceMetric
{
    public string Name { get; set; } = string.Empty;
    public long ElapsedMilliseconds { get; set; }
    public int Iterations { get; set; } = 1;
    public double AverageMilliseconds { get; set; }
}

/// <summary>
/// Performance comparison between two implementations
/// </summary>
public class PerformanceComparison
{
    public PerformanceMetric Method1 { get; set; } = null!;
    public PerformanceMetric Method2 { get; set; }= null!;
    public double ImprovementPercentage { get; set; }
    public string WinnerName { get; set; } = string.Empty;
}

/// <summary>
/// Performance test summary
/// </summary>
public class PerformanceSummary
{
    public int TotalMetrics { get; set; }
    public long TotalElapsedMilliseconds { get; set; }
    public double AverageMilliseconds { get; set; }
    public double MinMilliseconds { get; set; }
    public double MaxMilliseconds { get; set; }
    public IReadOnlyList<PerformanceMetric> Metrics { get; set; }= new List<PerformanceMetric>();
}
