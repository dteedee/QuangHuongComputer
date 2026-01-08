using BuildingBlocks.SharedKernel;

namespace Content.Domain;

public class Post : Entity<Guid>
{
    public string Title { get; private set; }
    public string Slug { get; private set; }
    public string Content { get; private set; }
    public string? ThumbnailUrl { get; private set; }
    public PostType Type { get; private set; }
    public bool IsPublished { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public List<string> Tags { get; private set; } = new();

    protected Post() { }

    public Post(string title, string slug, string content, PostType type)
    {
        Id = Guid.NewGuid();
        Title = title;
        Slug = slug;
        Content = content;
        Type = type;
        IsPublished = false;
        CreatedAt = DateTime.UtcNow;
    }

    public void Publish()
    {
        IsPublished = true;
        PublishedAt = DateTime.UtcNow;
    }

    public void Unpublish()
    {
        IsPublished = false;
    }

    public void UpdateDetails(string title, string content)
    {
        Title = title;
        Content = content;
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum PostType
{
    Article,
    News,
    Promotion,
    Banner,
    Ad
}
