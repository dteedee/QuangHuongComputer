using System.Runtime.CompilerServices;
using System.Text;
using FluentAssertions;
using Xunit;

namespace UnitTests.Schema;

/// <summary>
/// `docs/database-enums.md` được SINH RA từ model EF, không viết tay.
///
/// Chạy lại với biến môi trường <c>QH_UPDATE_DOCS=1</c> để ghi đè phần được sinh ra:
///   QH_UPDATE_DOCS=1 dotnet test --filter FullyQualifiedName~DatabaseEnumDictionaryTests
/// Không có biến đó thì test CHỈ so sánh và báo lỗi nếu tài liệu đã lỗi thời.
/// </summary>
public class DatabaseEnumDictionaryTests
{
    private const string BeginMarker = "<!-- BEGIN GENERATED: database-enums -->";
    private const string EndMarker = "<!-- END GENERATED: database-enums -->";

    [Fact]
    public void Every_enum_column_is_listed_in_the_generated_dictionary()
    {
        var path = DocPath();
        File.Exists(path).Should().BeTrue($"{path} phải tồn tại - nó là hợp đồng W1-11 đóng băng");

        var current = File.ReadAllText(path).Replace("\r\n", "\n");
        var generated = Generate();

        var beginIndex = current.IndexOf(BeginMarker, StringComparison.Ordinal);
        var endIndex = current.IndexOf(EndMarker, StringComparison.Ordinal);
        beginIndex.Should().BeGreaterThan(-1, "thiếu mốc BEGIN GENERATED");
        endIndex.Should().BeGreaterThan(beginIndex, "thiếu mốc END GENERATED");

        var expected = current[..(beginIndex + BeginMarker.Length)]
            + "\n\n" + generated + "\n"
            + current[endIndex..];

        if (Environment.GetEnvironmentVariable("QH_UPDATE_DOCS") == "1")
        {
            File.WriteAllText(path, expected);
            return;
        }

        current.Should().Be(
            expected,
            "docs/database-enums.md đã lỗi thời - chạy lại với QH_UPDATE_DOCS=1 để sinh lại");
    }

    [Fact]
    public void Enum_columns_are_discovered_for_every_referenced_module()
    {
        var columns = DatabaseEnumCatalog.Collect();

        columns.Should().NotBeEmpty();
        // Ba cột enum quan trọng nhất về nghiệp vụ - nếu một trong ba biến mất thì phản chiếu
        // model đã hỏng chứ không phải tài liệu lỗi thời.
        columns.Should().Contain(c => c.Table == "public.Orders" && c.Column == "Status");
        columns.Should().Contain(c => c.Table == "public.StockReservations" && c.Column == "Status");
        columns.Should().Contain(c => c.Table == "public.Invoices" && c.Column == "Status");
    }

    private static string Generate()
    {
        var columns = DatabaseEnumCatalog.Collect();
        var builder = new StringBuilder();

        builder.AppendLine("## Bảng giá trị của từng enum");
        builder.AppendLine();
        builder.AppendLine("| Enum | Giá trị lưu trong CSDL |");
        builder.AppendLine("|---|---|");

        foreach (var enumType in columns
                     .Select(c => c.EnumType)
                     .DistinctBy(t => t.FullName)
                     .OrderBy(t => t.Name, StringComparer.Ordinal)
                     .ThenBy(t => t.FullName, StringComparer.Ordinal))
        {
            builder.Append("| `").Append(enumType.Name).Append("` | ")
                .Append(DatabaseEnumCatalog.MembersOf(enumType)).AppendLine(" |");
        }

        builder.AppendLine();
        builder.AppendLine($"## Cột nào lưu enum nào ({columns.Count} cột)");
        builder.AppendLine();
        builder.AppendLine("| Module | Bảng | Cột | Enum | Kiểu cột |");
        builder.AppendLine("|---|---|---|---|---|");

        foreach (var column in columns)
        {
            builder.Append("| ").Append(column.Module)
                .Append(" | `").Append(column.Table)
                .Append("` | `").Append(column.Column)
                .Append("` | `").Append(column.EnumType.Name)
                .Append("` | ").Append(column.StoreType)
                .AppendLine(" |");
        }

        return builder.ToString().TrimEnd('\n');
    }

    /// <summary>
    /// Gốc repo suy ra từ ĐƯỜNG DẪN MÃ NGUỒN của chính file này, không phải từ
    /// <c>AppContext.BaseDirectory</c>: `qh-build.sh` chạy test với `--artifacts-path` trỏ ra
    /// ngoài repo (/tmp/qh-scratch), nên đi ngược từ thư mục chạy sẽ không bao giờ thấy `docs`.
    /// </summary>
    private static string DocPath([CallerFilePath] string sourceFile = "")
    {
        var directory = new DirectoryInfo(Path.GetDirectoryName(sourceFile)!);
        while (directory is not null && !Directory.Exists(Path.Combine(directory.FullName, "docs")))
        {
            directory = directory.Parent;
        }

        directory.Should().NotBeNull("không tìm thấy gốc repo (thư mục chứa `docs`)");
        return Path.Combine(directory!.FullName, "docs", "database-enums.md");
    }
}
