using System.ComponentModel.DataAnnotations;

namespace BuildingBlocks.Validation;

/// <summary>
/// Extension methods for API validation
/// </summary>
public static class ValidationExtensions
{
    /// <summary>
    /// Validate pagination parameters
    /// </summary>
    public static bool ValidatePaginationParams(int page, int pageSize, out string errorMessage)
    {
        errorMessage = string.Empty;

        if (page < 1)
        {
            errorMessage = "Số trang phải lớn hơn hoặc bằng 1.";
            return false;
        }

        if (pageSize < 1 || pageSize > 100)
        {
            errorMessage = "Kích thước trang phải nằm trong khoảng từ 1 đến 100.";
            return false;
        }

        return true;
    }

    /// <summary>
    /// Validate search term
    /// </summary>
    public static bool ValidateSearchTerm(string? searchTerm, out string errorMessage, int minLength = 2, int maxLength = 100)
    {
        errorMessage = string.Empty;

        if (string.IsNullOrWhiteSpace(searchTerm))
            return true; // Search term is optional

        if (searchTerm.Length < minLength)
        {
            errorMessage = $"Tìm kiếm phải có ít nhất {minLength} ký tự.";
            return false;
        }

        if (searchTerm.Length > maxLength)
        {
            errorMessage = $"Tìm kiếm không được vượt quá {maxLength} ký tự.";
            return false;
        }

        return true;
    }

    /// <summary>
    /// Validate price range
    /// </summary>
    public static bool ValidatePriceRange(decimal? minPrice, decimal? maxPrice, out string errorMessage)
    {
        errorMessage = string.Empty;

        if (minPrice.HasValue && minPrice.Value < 0)
        {
            errorMessage = "Giá tối thiểu không được là số âm.";
            return false;
        }

        if (maxPrice.HasValue && maxPrice.Value < 0)
        {
            errorMessage = "Giá tối đa không được là số âm.";
            return false;
        }

        if (minPrice.HasValue && maxPrice.HasValue && minPrice.Value > maxPrice.Value)
        {
            errorMessage = "Giá tối thiểu không được vượt quá giá tối đa.";
            return false;
        }

        return true;
    }

    /// <summary>
    /// Validate GUID
    /// </summary>
    public static bool ValidateGuid(Guid id, out string errorMessage)
    {
        errorMessage = string.Empty;

        if (id == Guid.Empty)
        {
            errorMessage = "ID không được để trống.";
            return false;
        }

        return true;
    }

    /// <summary>
    /// Validate string length
    /// </summary>
    public static bool ValidateStringLength(
        string? value,
        out string errorMessage,
        int minLength = 1,
        int maxLength = 500,
        string fieldName = "Field")
    {
        errorMessage = string.Empty;

        if (string.IsNullOrWhiteSpace(value))
        {
            errorMessage = $"{fieldName} là bắt buộc.";
            return false;
        }

        if (value.Length < minLength)
        {
            errorMessage = $"{fieldName} phải có ít nhất {minLength} ký tự.";
            return false;
        }

        if (value.Length > maxLength)
        {
            errorMessage = $"{fieldName} không được vượt quá {maxLength} ký tự.";
            return false;
        }

        return true;
    }

    /// <summary>
    /// Validate quantity
    /// </summary>
    public static bool ValidateQuantity(int quantity, out string errorMessage, int minQuantity = 1, int maxQuantity = 999)
    {
        errorMessage = string.Empty;

        if (quantity < minQuantity)
        {
            errorMessage = $"Số lượng phải ít nhất là {minQuantity}.";
            return false;
        }

        if (quantity > maxQuantity)
        {
            errorMessage = $"Số lượng không được vượt quá {maxQuantity}.";
            return false;
        }

        return true;
    }
}

/// <summary>
/// Validation result
/// </summary>
public record ValidationItemResult(bool IsValid, string? ErrorMessage)
{
    public static ValidationItemResult Success => new(true, null);
    
    public static ValidationItemResult Failure(string errorMessage) => new(false, errorMessage);
}

