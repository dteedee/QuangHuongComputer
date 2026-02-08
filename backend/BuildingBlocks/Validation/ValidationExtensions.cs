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
            errorMessage = "Page must be greater than or equal to 1.";
            return false;
        }

        if (pageSize < 1 || pageSize > 100)
        {
            errorMessage = "PageSize must be between 1 and 100.";
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
            errorMessage = $"Search term must be at least {minLength} characters long.";
            return false;
        }

        if (searchTerm.Length > maxLength)
        {
            errorMessage = $"Search term cannot exceed {maxLength} characters.";
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
            errorMessage = "Minimum price cannot be negative.";
            return false;
        }

        if (maxPrice.HasValue && maxPrice.Value < 0)
        {
            errorMessage = "Maximum price cannot be negative.";
            return false;
        }

        if (minPrice.HasValue && maxPrice.HasValue && minPrice.Value > maxPrice.Value)
        {
            errorMessage = "Minimum price cannot exceed maximum price.";
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
            errorMessage = "ID cannot be empty.";
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
            errorMessage = $"{fieldName} is required.";
            return false;
        }

        if (value.Length < minLength)
        {
            errorMessage = $"{fieldName} must be at least {minLength} characters long.";
            return false;
        }

        if (value.Length > maxLength)
        {
            errorMessage = $"{fieldName}cannot exceed {maxLength} characters.";
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
            errorMessage = $"Quantity must be at least {minQuantity}.";
            return false;
        }

        if (quantity > maxQuantity)
        {
            errorMessage = $"Quantity cannot exceed {maxQuantity}.";
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

