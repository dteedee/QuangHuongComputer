using System.Collections.Concurrent;
using System.Reflection;
using System.Runtime.ExceptionServices;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Endpoints;

/// <summary>
/// M6 — chốt DUY NHẤT quyết định message của một exception có được đưa ra client hay không.
///
/// Bối cảnh: ~100 chỗ trong các module viết <c>catch (InvalidOperationException ex) =&gt;
/// Results.BadRequest(new { error = ex.Message })</c>. Phần lớn exception đó là quy tắc nghiệp vụ
/// do chính domain ném (message tiếng Việt viết cho người dùng — phải giữ), nhưng cùng kiểu
/// <see cref="InvalidOperationException"/> cũng bay ra từ EF Core / thư viện, với message chứa tên
/// bảng, biểu thức LINQ, trạng thái tracking... Các chỗ catch đó đi VÒNG qua
/// <see cref="GlobalExceptionHandlingMiddleware"/> nên lộ nguyên văn trên Production.
///
/// Quy tắc "an toàn để hiển thị":
///   1. <see cref="DomainException"/> (và lớp con) — luôn an toàn, message là copy cho người dùng.
///   2. Exception được NÉM từ code của dự án (assembly là BuildingBlocks hoặc tham chiếu
///      BuildingBlocks — mọi module, không thư viện ngoài nào) và mọi InnerException cũng an toàn.
///   3. Còn lại (EF, System.Linq, Npgsql, TargetSite không xác định...) — KHÔNG an toàn.
///
/// <see cref="Message"/> với exception không an toàn sẽ NÉM LẠI nguyên exception (giữ stack) để
/// middleware toàn cục ghi log đầy đủ và trả message chung tiếng Việt ngoài Development.
/// </summary>
public static class ClientSafeError
{
    /// <summary>Cùng câu mà middleware trả cho InvalidOperationException ngoài Development.</summary>
    public const string GenericMessage = "Yêu cầu không thực hiện được ở trạng thái hiện tại.";

    private static readonly string KernelAssemblyName = typeof(ClientSafeError).Assembly.GetName().Name!;
    private static readonly ConcurrentDictionary<Assembly, bool> ProjectAssemblyCache = new();

    /// <summary>
    /// Message để trả cho client. Exception không an toàn ⇒ ném lại nguyên trạng cho middleware
    /// (log đầy đủ + message chung). Dùng ở endpoint và ở chỗ đổi exception sang DomainException.
    /// </summary>
    public static string Message(Exception exception)
    {
        if (IsSafeToShow(exception)) return exception.Message;
        ExceptionDispatchInfo.Capture(exception).Throw();
        return GenericMessage; // không tới được
    }

    /// <summary>
    /// Biến thể KHÔNG ném — cho vòng lặp gom lỗi (ví dụ chạy lương từng nhân viên) nơi một lỗi
    /// không được làm hỏng cả lô. Exception không an toàn được log đầy đủ và thay bằng câu chung.
    /// </summary>
    public static string MessageOrGeneric(Exception exception, ILogger? logger = null)
    {
        if (IsSafeToShow(exception)) return exception.Message;
        logger?.LogError(exception, "Ẩn message exception không an toàn khỏi client");
        return GenericMessage;
    }

    public static bool IsSafeToShow(Exception exception)
    {
        if (exception is DomainException) return true;
        if (exception.InnerException is not null && !IsSafeToShow(exception.InnerException)) return false;

        var thrower = exception.TargetSite?.DeclaringType?.Assembly;
        return thrower is not null && ProjectAssemblyCache.GetOrAdd(thrower, IsProjectAssembly);
    }

    private static bool IsProjectAssembly(Assembly assembly)
    {
        if (assembly.GetName().Name == KernelAssemblyName) return true;
        return assembly.GetReferencedAssemblies().Any(r => r.Name == KernelAssemblyName);
    }
}
