namespace BuildingBlocks.SharedKernel;

/// <summary>
/// Result pattern for handling success/failure without exceptions
/// </summary>
public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error { get; }

    protected Result(bool isSuccess, Error error)
    {
        IsSuccess = isSuccess;
        Error = error;
    }

    public static Result Success() => new(true, Error.None);
    public static Result Failure(Error error) => new(false, error);
    public static Result<T> Success<T>(T value) => new(value, true, Error.None);
    public static Result<T> Failure<T>(Error error) => new(default!, false, error);
}

/// <summary>
/// Generic Result with value
/// </summary>
public class Result<T> : Result
{
    public T Value { get; }

    protected internal Result(T value, bool isSuccess, Error error)
        : base(isSuccess, error)
    {
        Value = value;
    }

    public static implicit operator Result<T>(T value) => Success(value);
}

/// <summary>
/// Error representation
/// </summary>
public sealed record Error(string Code, string Message)
{
    public static readonly Error None = new(string.Empty, string.Empty);
    public static readonly Error NullValue = new("Error.NullValue", "The specified result value is null.");
    
    public static Error NotFound(string entity, object id) => 
        new($"{entity}.NotFound", $"{entity} with id '{id}' was not found.");
    
    public static Error Validation(string message) => 
        new("Validation.Error", message);
    
    public static Error Conflict(string message) => 
        new("Conflict.Error", message);
    
    public static Error Unauthorized(string message = "Unauthorized access") => 
        new("Authorization.Error", message);
}
