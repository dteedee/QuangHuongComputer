using BuildingBlocks.Database;
using Microsoft.EntityFrameworkCore;

namespace Ai.Infrastructure;

/// <summary>
/// W2-15: SearchEntry and ProductEmbedding (+ SimpleEmbeddingService) were removed - the phase
/// file's binding instruction ("Delete: Ai SimpleEmbeddingService, ProductEmbeddings,
/// SearchEntries") and confirmed dead: no code anywhere ever inserted a row into either table
/// (grepped `SearchEntries.Add|new SearchEntry(` across backend/Services - zero hits), so they
/// always returned empty results. pgvector-based embeddings stay in the backlog per the phase
/// file. Product RAG now goes through IProductRetrievalService (SQL-side, see Application/).
/// </summary>
public class AiDbContext : DbContext
{
    public AiDbContext(DbContextOptions<AiDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("ai");

        PostgreSQLConfig.ConfigureCommonColumnProperties(modelBuilder);
    }
}
