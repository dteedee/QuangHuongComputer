using Microsoft.Extensions.DependencyInjection;

namespace Reporting;

public static class DependencyInjection
{
    /// <summary>
    /// W2-16: QuestPDF/ScottPlot registration removed with <c>Reporting/Pdf/**</c> (~400 LOC,
    /// never called — PDF export is backlog, Excel via ClosedXML is the real export path).
    /// </summary>
    public static IServiceCollection AddReportingModule(this IServiceCollection services)
    {
        return services;
    }
}
