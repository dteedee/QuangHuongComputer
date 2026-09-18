using Accounting.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Accounting.Infrastructure.Configurations;

/// <summary>Đối chiếu một PaymentIntent với hoá đơn.</summary>
public class PaymentApplicationConfiguration : IEntityTypeConfiguration<PaymentApplication>
{
    public void Configure(EntityTypeBuilder<PaymentApplication> entity)
    {
        entity.HasKey(e => e.Id);
        // W2-14 verify: khoá Guid do domain tự sinh. Không có ValueGeneratedNever, EF coi dòng con mới
        // thêm vào một gốc ĐÃ lưu là "Modified" → UPDATE 0 dòng → DbUpdateConcurrencyException
        // (đã tái hiện trên Postgres: ghi nhận thanh toán cho hoá đơn đã tồn tại luôn hỏng).
        entity.Property(e => e.Id).ValueGeneratedNever();
        entity.Property(e => e.Amount).HasPrecision(18, 2);
        entity.HasIndex(e => e.PaymentIntentId);
        entity.HasIndex(e => e.InvoiceId);
        entity.ToTable(t =>
            t.HasCheckConstraint("CK_PaymentApplications_Amount_NonNegative", "\"Amount\" >= 0"));
    }
}
