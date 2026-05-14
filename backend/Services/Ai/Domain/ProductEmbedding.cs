using BuildingBlocks.SharedKernel;
namespace Ai.Domain;

public class ProductEmbedding : Entity<Guid>
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public string CategoryName { get; set; } = "";
    public string BrandName { get; set; } = "";
    public decimal Price { get; set; }
    public string SearchText { get; set; } = ""; // Composed text for search
    public string? EmbeddingJson { get; set; } // Store as JSON until pgvector available
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}
