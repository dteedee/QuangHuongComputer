using HC.CORE.Base;

namespace BuildingBlocks.Repository;

public class QueryParams : BaseSearchParam
{
    public string? SortBy { get; set; }
    public bool? SortDescending { get; set; } = false;
    public bool? IncludeInactive { get; set; } = false;

    public int Skip => ((PageNumber < 1 ? 1 : PageNumber) - 1) * (PageSize < 1 ? 20 : PageSize);
    public int Take => PageSize < 1 ? 20 : PageSize;
}
