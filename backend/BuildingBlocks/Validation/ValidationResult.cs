namespace BuildingBlocks.Validation;

public class ValidationResult
{
    public bool IsValid { get; set; }
    public Dictionary<string, List<string>> Errors { get; set; } = new();

    public ValidationResult()
    {
        IsValid = true;
    }

    public static ValidationResult Success() => new() { IsValid = true };

    public static ValidationResult Failure(Dictionary<string, List<string>> errors)
    {
        return new() { IsValid = false, Errors = errors };
    }

    public static ValidationResult Failure(string field, string error)
    {
        var errors = new Dictionary<string, List<string>>
        {
            { field, new List<string> { error } }
        };
        return new() { IsValid = false, Errors = errors };
    }

    public void AddError(string field, string error)
    {
        IsValid = false;
        if (!Errors.ContainsKey(field))
        {
            Errors[field] = new List<string>();
        }
        Errors[field].Add(error);
    }

    public void Merge(ValidationResult other)
    {
        if (!other.IsValid)
        {
            IsValid = false;
            foreach (var (field, errors) in other.Errors)
            {
                if (!Errors.ContainsKey(field))
                {
                    Errors[field] = new List<string>();
                }
                Errors[field].AddRange(errors);
            }
        }
    }
}
