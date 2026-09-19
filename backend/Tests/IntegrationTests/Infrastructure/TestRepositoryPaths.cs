using System.Reflection;

namespace IntegrationTests.Infrastructure;

/// <summary>
/// Định vị thư mục repo. WebApplicationFactory cần ContentRoot trỏ đúng backend/ApiGateway,
/// nếu không appsettings.json và wwwroot sẽ không nạp được.
///
/// Không dò ngược từ AppContext.BaseDirectory được: qh-build.sh bắt buộc dùng --artifacts-path
/// nên assembly test nằm ngoài cây repo. Đường dẫn được MSBuild nhúng vào assembly lúc biên dịch.
/// </summary>
public static class TestRepositoryPaths
{
    public static string RepoRoot { get; } = ResolveRepoRoot();

    public static string ApiGatewayContentRoot => Path.Combine(RepoRoot, "backend", "ApiGateway");

    private static string ResolveRepoRoot()
    {
        var embedded = Assembly.GetExecutingAssembly()
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .FirstOrDefault(a => a.Key == "QhRepoRoot")?.Value;

        if (!string.IsNullOrEmpty(embedded) && Directory.Exists(Path.Combine(embedded, "backend", "ApiGateway")))
        {
            return embedded;
        }

        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "backend", "ApiGateway"))) return dir.FullName;
            dir = dir.Parent;
        }

        throw new InvalidOperationException(
            $"Không xác định được thư mục repo (QhRepoRoot='{embedded}', base='{AppContext.BaseDirectory}').");
    }
}
