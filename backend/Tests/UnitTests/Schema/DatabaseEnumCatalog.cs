using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace UnitTests.Schema;

/// <summary>Một cột trong CSDL đang lưu giá trị của một enum .NET.</summary>
public sealed record EnumColumn(string Module, string Table, string Column, Type EnumType, string StoreType);

/// <summary>
/// Đọc model EF của các module và liệt kê mọi cột đang lưu enum dưới dạng số.
///
/// Vì sao cần: CSDL có 108 cột enum-as-int và không có từ điển nào (audit
/// db-schema-migrations-22). Người đọc `SELECT "Status" FROM "Orders"` thấy số 3 mà không có
/// cách nào biết 3 nghĩa là gì. Bảng liệt kê ở <c>docs/database-enums.md</c> được SINH RA từ
/// chính model EF nên không thể lỗi thời mà không làm hỏng test.
/// </summary>
public static class DatabaseEnumCatalog
{
    /// <summary>Chuỗi kết nối design-time không thể kết nối được (D12) - chỉ để dựng model.</summary>
    private const string UnreachableConnection =
        "Host=127.0.0.1;Port=1;Database=qh_design_time_only;Username=none;Password=none;Timeout=1";

    private static IModel ModelOf<TContext>() where TContext : DbContext
    {
        var builder = new DbContextOptionsBuilder<TContext>();
        builder.UseNpgsql(UnreachableConnection);
        var context = (TContext)Activator.CreateInstance(typeof(TContext), builder.Options)!;
        using (context)
        {
            return context.Model;
        }
    }

    /// <summary>Các module mà `UnitTests.csproj` tham chiếu tới. Thêm module = thêm dòng ở đây.</summary>
    public static IReadOnlyList<(string Module, IModel Model)> Models() => new List<(string, IModel)>
    {
        ("Catalog", ModelOf<global::Catalog.Infrastructure.CatalogDbContext>()),
        ("Sales", ModelOf<global::Sales.Infrastructure.SalesDbContext>()),
        ("Inventory", ModelOf<global::InventoryModule.Infrastructure.InventoryDbContext>()),
        ("Accounting", ModelOf<global::Accounting.Infrastructure.AccountingDbContext>()),
        ("HR", ModelOf<global::HR.Infrastructure.HRDbContext>()),
        ("Warranty", ModelOf<global::Warranty.Infrastructure.WarrantyDbContext>()),
        ("Content", ModelOf<global::Content.Infrastructure.ContentDbContext>()),
        ("Payments", ModelOf<global::Payments.Infrastructure.PaymentsDbContext>()),
        ("SystemConfig", ModelOf<global::SystemConfig.Infrastructure.SystemConfigDbContext>()),
        ("SystemConfig", ModelOf<global::SystemConfig.Infrastructure.CustomFieldDbContext>()),
    };

    /// <summary>Mọi cột enum của mọi module, sắp xếp ổn định để kết quả sinh ra luôn giống nhau.</summary>
    public static IReadOnlyList<EnumColumn> Collect()
    {
        var columns = new List<EnumColumn>();

        foreach (var (module, model) in Models())
        {
            foreach (var entityType in model.GetEntityTypes())
            {
                var table = entityType.GetTableName();
                if (table is null)
                {
                    continue;
                }

                var schema = entityType.GetSchema() ?? model.GetDefaultSchema() ?? "public";

                foreach (var property in entityType.GetProperties())
                {
                    var enumType = ResolveEnumType(property);
                    if (enumType is null)
                    {
                        continue;
                    }

                    columns.Add(new EnumColumn(
                        module,
                        $"{schema}.{table}",
                        property.GetColumnName(),
                        enumType,
                        property.GetColumnType() ?? "integer"));
                }
            }
        }

        return columns
            .DistinctBy(c => (c.Table, c.Column))
            .OrderBy(c => c.Module, StringComparer.Ordinal)
            .ThenBy(c => c.Table, StringComparer.Ordinal)
            .ThenBy(c => c.Column, StringComparer.Ordinal)
            .ToList();
    }

    /// <summary>
    /// Kiểu enum đứng sau một property, kể cả khi nó đi qua value converter
    /// (<c>HasConversion&lt;int&gt;()</c>) - lúc đó <c>ClrType</c> đã là <c>int</c>.
    /// </summary>
    private static Type? ResolveEnumType(IProperty property)
    {
        var direct = Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType;
        if (direct.IsEnum)
        {
            return direct;
        }

        var converter = property.GetValueConverter();
        if (converter is null)
        {
            return null;
        }

        var modelType = Nullable.GetUnderlyingType(converter.ModelClrType) ?? converter.ModelClrType;
        return modelType.IsEnum ? modelType : null;
    }

    /// <summary>Bảng giá trị của một enum, ví dụ <c>0 = Pending, 1 = Confirmed</c>.</summary>
    public static string MembersOf(Type enumType)
    {
        var builder = new StringBuilder();
        var names = Enum.GetNames(enumType);
        var values = Enum.GetValues(enumType);

        for (var i = 0; i < names.Length; i++)
        {
            if (i > 0)
            {
                builder.Append(", ");
            }

            builder.Append(Convert.ToInt64(values.GetValue(i))).Append(" = ").Append(names[i]);
        }

        return builder.ToString();
    }
}
