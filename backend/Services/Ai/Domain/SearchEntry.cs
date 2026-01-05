using BuildingBlocks.SharedKernel;

namespace Ai.Domain;

/// <summary>
/// A consolidated search entry for products, posts, and services
/// used by the AI Chatbot for RAG
/// </summary>
public class SearchEntry : Entity<Guid>
{
    public string Title { get; private set; }
    public string Content { get; private set; }
    public string SourceType { get; private set; } // Product, Post, Service
    public string ExternalId { get; private set; }
    public string? Url { get; private set; }
    public decimal? Price { get; private set; }
    public string? MetadataJson { get; private set; }

    protected SearchEntry() { }

    public SearchEntry(string title, string content, string sourceType, string externalId)
    {
        Id = Guid.NewGuid();
        Title = title;
        Content = content;
        SourceType = sourceType;
        ExternalId = externalId;
        CreatedAt = DateTime.UtcNow;
    }

    public void Update(string title, string content)
    {
        Title = title;
        Content = content;
        UpdatedAt = DateTime.UtcNow;
    }
}
