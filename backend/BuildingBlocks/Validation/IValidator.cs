namespace BuildingBlocks.Validation;

public interface IValidator<T>
{
    ValidationResult Validate(T instance);
    Task<ValidationResult> ValidateAsync(T instance);
}
