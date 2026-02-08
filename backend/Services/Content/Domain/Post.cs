using BuildingBlocks.SharedKernel;
using BuildingBlocks.Validation;

namespace Content.Domain;

public class Post : Entity<Guid>
{
    public string Title { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;
    
    // Mapped to ThumbnailUrl column in database
    public string? ThumbnailUrl { get; private set; }
    
    public string? Category { get; private set; }
    public List<string> Tags { get; private set; } = new();
    public PostStatus Status { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public PostType Type { get; private set; }
    public bool IsPublished => Status == PostStatus.Published;

    protected Post() { }

    public Post(string title, string slug, string content, string? category = null, string? thumbnailUrl = null)
    {
        Id = Guid.NewGuid();
        Title = title;
        Slug = slug;
        Content = content;
        Category = category;
        ThumbnailUrl = thumbnailUrl;
        Status = PostStatus.Draft;
        Type = PostType.Article;
        CreatedAt = DateTime.UtcNow;
    }

    public Post(string title, string slug, string content, PostType type, string? category = null, string? thumbnailUrl = null)
        : this(title, slug, content, category, thumbnailUrl)
    {
        Type = type;
    }

    public void Publish()
    {
        if (Status == PostStatus.Published)
            return;

        Status = PostStatus.Published;
        PublishedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Unpublish()
    {
        if (Status == PostStatus.Draft)
            return;

        Status = PostStatus.Draft;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateDetails(string title, string content, string? category = null, string? thumbnailUrl = null)
    {
        Title = title;
        Content = content;
        Category = category;
        ThumbnailUrl = thumbnailUrl;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateTags(List<string> tags)
    {
        Tags = tags ?? new List<string>();
        UpdatedAt = DateTime.UtcNow;
    }

    public ValidationResult Validate()
    {
        var result = new ValidationResult();

        if (!CommonValidators.IsNotEmpty(Title))
        {
            result.AddError(nameof(Title), "Title is required");
        }
        else if (!CommonValidators.IsMaxLength(Title, 200))
        {
            result.AddError(nameof(Title), "Title must not exceed 200 characters");
        }

        if (!CommonValidators.IsNotEmpty(Slug))
        {
            result.AddError(nameof(Slug), "Slug is required");
        }
        else if (!CommonValidators.IsMaxLength(Slug, 250))
        {
            result.AddError(nameof(Slug), "Slug must not exceed 250 characters");
        }

        if (!CommonValidators.IsNotEmpty(Content))
        {
            result.AddError(nameof(Content), "Content is required");
        }

        if (ThumbnailUrl != null && !CommonValidators.IsMaxLength(ThumbnailUrl, 500))
        {
            result.AddError(nameof(ThumbnailUrl), "Featured image URL must not exceed 500 characters");
        }

        if (Category != null && !CommonValidators.IsMaxLength(Category, 100))
        {
            result.AddError(nameof(Category), "Category must not exceed 100 characters");
        }

        return result;
    }
}

public enum PostStatus
{
    Draft,
    Published
}

public enum PostType
{
    News,
    Article,
    Promotion
}
