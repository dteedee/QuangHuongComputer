using Microsoft.AspNetCore.Mvc;

namespace HC.CORE.Base;

public abstract class BaseSearchParam
{
    [FromQuery(Name = "page")]
    public int PageNumber { get; set; } = 1;
    
    [FromQuery(Name = "pageSize")]
    public int PageSize { get; set; } = 10;
    
    [FromQuery(Name = "search")]
    public string? SearchText { get; set; }

    public BaseSearchParam()
    {

    }

    public BaseSearchParam(int pageNumber, int pageSize)
    {
        PageNumber = pageNumber < 1 ? 1 : pageNumber;
        PageSize = pageSize < 1 ? 10 : pageSize;
    }
}
