namespace BuildingBlocks.Repository;

public class QueryParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public string? SortBy { get; set; }
    public bool SortDescending { get; set; } = false;
    public bool IncludeInactive { get; set; } = false;

    public int Skip => (Page - 1) * PageSize;
    public int Take => PageSize;
}
