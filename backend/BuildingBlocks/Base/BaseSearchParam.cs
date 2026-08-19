using Microsoft.AspNetCore.Mvc;

namespace HC.CORE.Base;

public abstract class BaseSearchParam
{
    // Backing nullable để [AsParameters] coi là optional — property non-nullable bị
    // RequestDelegateFactory yêu cầu bắt buộc trên query string (initializer không được tính).
    private int? _pageNumber;
    private int? _pageSize;

    [FromQuery(Name = "page")]
    public int? Page { get => _pageNumber; set => _pageNumber = value; }

    [FromQuery(Name = "pageSize")]
    public int? Size { get => _pageSize; set => _pageSize = value; }

    /// <summary>Trang hiện tại (mặc định 1). Get-only để AsParameters không bind (bind qua alias "page").</summary>
    public int PageNumber => _pageNumber is > 0 ? _pageNumber.Value : 1;

    /// <summary>Kích thước trang (mặc định 10). Get-only để AsParameters không bind (bind qua alias "pageSize").</summary>
    public int PageSize => _pageSize is > 0 ? _pageSize.Value : 10;

    [FromQuery(Name = "search")]
    public string? SearchText { get; set; }

    public BaseSearchParam()
    {

    }

    public BaseSearchParam(int pageNumber, int pageSize)
    {
        _pageNumber = pageNumber < 1 ? 1 : pageNumber;
        _pageSize = pageSize < 1 ? 10 : pageSize;
    }
}
