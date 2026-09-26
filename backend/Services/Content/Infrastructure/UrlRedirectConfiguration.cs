using Content.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Content.Infrastructure;

/// <summary>EF mapping of <see cref="UrlRedirect"/> — table <c>content."UrlRedirects"</c>.</summary>
public sealed class UrlRedirectConfiguration : IEntityTypeConfiguration<UrlRedirect>
{
    public void Configure(EntityTypeBuilder<UrlRedirect> entity)
    {
        entity.ToTable("UrlRedirects", t =>
            t.HasCheckConstraint("CK_UrlRedirects_StatusCode", "\"StatusCode\" IN (301, 302, 410)"));
        entity.HasKey(e => e.Id);

        entity.Property(e => e.FromPath).IsRequired().HasMaxLength(UrlRedirect.FromPathMaxLength);
        entity.Property(e => e.ToPath).HasMaxLength(UrlRedirect.ToPathMaxLength);
        entity.Property(e => e.Note).HasMaxLength(UrlRedirect.NoteMaxLength);
        entity.Property(e => e.Source).IsRequired().HasMaxLength(30);

        // FromPath is stored lowercase-normalised, so a plain unique index IS the
        // case-insensitive uniqueness rule (UrlRedirectPath.TryNormalizeSource).
        entity.HasIndex(e => e.FromPath).IsUnique().HasDatabaseName("IX_UrlRedirect_FromPath");
        entity.HasIndex(e => e.IsActive).HasDatabaseName("IX_UrlRedirect_IsActive");
    }
}
