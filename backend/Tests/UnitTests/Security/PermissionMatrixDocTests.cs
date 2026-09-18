using System.Runtime.CompilerServices;
using BuildingBlocks.Security;
using FluentAssertions;
using Xunit;

namespace UnitTests.Security;

/// <summary>
/// <c>docs/permission-matrix.md</c> được SINH RA từ code, không viết tay. Test này vừa
/// sinh lại file vừa báo đỏ khi nội dung trên đĩa đã lệch — chạy lại lần hai là xanh,
/// và diff trong git cho thấy đúng thứ đã đổi.
///
/// Đường dẫn repo lấy từ <see cref="CallerFilePathAttribute"/> vì output build nằm ở
/// thư mục artifacts ngoài repo (qh-build.sh --artifacts-path), không suy ra được từ
/// <c>AppContext.BaseDirectory</c>.
/// </summary>
public class PermissionMatrixDocTests
{
    private const string DocRelativePath = "docs/permission-matrix.md";
    private const string JsonRelativePath =
        "plans/260917-2100-full-system-overhaul/reports/w1-1-permissions.json";

    private static string RepoRoot([CallerFilePath] string thisFile = "")
    {
        // <repo>/backend/Tests/UnitTests/Security/<file>.cs -> Security > UnitTests > Tests
        // > backend > <repo>: đúng 4 cấp.
        var dir = new DirectoryInfo(Path.GetDirectoryName(thisFile)!);
        for (var i = 0; i < 4 && dir.Parent != null; i++) dir = dir.Parent;
        return dir.FullName;
    }

    [Fact]
    public void PermissionMatrixDoc_IsRegeneratedAndUpToDate()
    {
        var path = Path.Combine(RepoRoot(), DocRelativePath);
        Directory.Exists(Path.GetDirectoryName(path)).Should().BeTrue($"thư mục docs phải tồn tại: {path}");

        var expected = PermissionCatalogExport.ToMarkdown();
        var actual = File.Exists(path) ? File.ReadAllText(path) : null;

        if (actual == expected) return;

        File.WriteAllText(path, expected);
        Assert.Fail($"{DocRelativePath} đã lệch với danh mục quyền và vừa được sinh lại. " +
                    "Kiểm tra git diff rồi chạy lại test.");
    }

    [Fact]
    public void PermissionCatalogJson_IsExportedForTheFrontend()
    {
        var path = Path.Combine(RepoRoot(), JsonRelativePath);
        var dir = Path.GetDirectoryName(path)!;
        if (!Directory.Exists(dir)) return; // thư mục plans có thể đã bị dọn sau khi đóng đợt

        var expected = PermissionCatalogExport.ToJson();
        if (!File.Exists(path) || File.ReadAllText(path) != expected)
        {
            File.WriteAllText(path, expected);
        }

        File.ReadAllText(path).Should().Contain(Permissions.Sales.Pos);
    }

    [Fact]
    public void MarkdownContainsEveryPermissionAndRole()
    {
        var markdown = PermissionCatalogExport.ToMarkdown();

        foreach (var permission in Permissions.GetAllPermissions())
        {
            markdown.Should().Contain(permission[Permissions.Prefix.Length..]);
        }

        foreach (var role in Roles.All)
        {
            markdown.Should().Contain(role);
        }
    }

    [Fact]
    public void MarkdownGenerationIsDeterministic()
    {
        PermissionCatalogExport.ToMarkdown().Should().Be(PermissionCatalogExport.ToMarkdown());
        PermissionCatalogExport.ToJson().Should().Be(PermissionCatalogExport.ToJson());
    }
}
