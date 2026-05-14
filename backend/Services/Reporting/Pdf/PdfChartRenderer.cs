using ScottPlot;

namespace Reporting.Pdf;

public static class PdfChartRenderer
{
    public static byte[] RenderBarChart(string title, string[] labels, double[] values, int width = 600, int height = 300)
    {
        var plot = new Plot();
        var positions = Enumerable.Range(0, labels.Length).Select(i => (double)i).ToArray();
        plot.Add.Bars(positions, values);
        var tickGen = new ScottPlot.TickGenerators.NumericManual();
        for (int i = 0; i < labels.Length; i++)
            tickGen.AddMajor(i, labels[i]);
        plot.Axes.Bottom.TickGenerator = tickGen;
        plot.Axes.Bottom.TickLabelStyle.Rotation = labels.Length > 6 ? 45 : 0;
        plot.Title(title);
        plot.Axes.Margins(bottom: 0.2);
        return plot.GetImageBytes(width, height, ScottPlot.ImageFormat.Png);
    }

    public static byte[] RenderLineChart(string title, string[] labels, double[] values, int width = 600, int height = 300)
    {
        var plot = new Plot();
        var xs = Enumerable.Range(0, values.Length).Select(i => (double)i).ToArray();
        plot.Add.Scatter(xs, values);
        var tickGen = new ScottPlot.TickGenerators.NumericManual();
        for (int i = 0; i < labels.Length; i++)
            tickGen.AddMajor(i, labels[i]);
        plot.Axes.Bottom.TickGenerator = tickGen;
        plot.Axes.Bottom.TickLabelStyle.Rotation = labels.Length > 6 ? 45 : 0;
        plot.Title(title);
        plot.Axes.Margins(bottom: 0.2);
        return plot.GetImageBytes(width, height, ScottPlot.ImageFormat.Png);
    }

    public static byte[] RenderPieChart(string title, string[] labels, double[] values, int width = 400, int height = 300)
    {
        var plot = new Plot();
        var slices = labels.Zip(values, (l, v) => new PieSlice { Value = v, Label = l }).ToList();
        plot.Add.Pie(slices);
        plot.Title(title);
        plot.Axes.Bottom.IsVisible = false;
        plot.Axes.Left.IsVisible = false;
        plot.Axes.Right.IsVisible = false;
        plot.Axes.Top.IsVisible = false;
        return plot.GetImageBytes(width, height, ScottPlot.ImageFormat.Png);
    }
}
