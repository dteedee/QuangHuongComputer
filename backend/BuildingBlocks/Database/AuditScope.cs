namespace BuildingBlocks.Database;

/// <summary>
/// Marks the calling flow as a BULK operation so <see cref="AuditSaveChangesInterceptor"/> records
/// one summary row instead of one row per entity.
///
/// Why (D10): the interceptor serialises every changed property of every changed entity into JSON.
/// A 5.000-row Excel import therefore writes 5.000 audit rows - each carrying a full before/after
/// document - inside a single request. That is tens of megabytes of JSON, a table that outgrows the
/// data it audits, and an audit screen nobody can read. The audit question for an import is not
/// "what did row 2.817 look like"; it is "who imported which file, when, and how many rows".
///
/// Usage - the scope is ambient, so nothing has to be threaded through the call chain:
/// <code>
/// using (AuditScope.Bulk("Nhập sản phẩm", fileName))
/// {
///     db.Products.AddRange(rows);
///     await db.SaveChangesAsync(ct);
/// }
/// </code>
/// Scopes nest: an inner scope does not widen or narrow the outer one, and the outer summary is what
/// survives. <see cref="AsyncLocal{T}"/> flows into awaited continuations, so an async import keeps
/// the scope; it does NOT flow into fire-and-forget work started before the scope opened.
/// </summary>
public static class AuditScope
{
    private static readonly AsyncLocal<BulkOperation?> CurrentScope = new();

    /// <summary>The active bulk operation, or null when this flow is a normal request.</summary>
    public static BulkOperation? Current => CurrentScope.Value;

    /// <summary>True while a bulk scope is open on this async flow.</summary>
    public static bool IsBulk => CurrentScope.Value is not null;

    /// <param name="operation">What is being imported, in Vietnamese - it is shown in the audit row.</param>
    /// <param name="fileName">Uploaded file name, when there is one. Recorded as the row's entity id.</param>
    public static IDisposable Bulk(string operation, string? fileName = null)
    {
        var previous = CurrentScope.Value;

        // Already inside a bulk scope: keep the outer one so the summary stays a single row, and hand
        // back a no-op disposable rather than silently replacing the caller's scope.
        if (previous is not null) return NoOpScope.Instance;

        CurrentScope.Value = new BulkOperation(
            string.IsNullOrWhiteSpace(operation) ? "Thao tác hàng loạt" : operation.Trim(),
            fileName);

        return new ScopeHandle();
    }

    /// <summary>What a bulk scope knows about itself. Immutable; counting happens in the interceptor.</summary>
    /// <param name="Operation">Vietnamese label written into the audit row's Details.</param>
    /// <param name="FileName">Source file, or null.</param>
    public sealed record BulkOperation(string Operation, string? FileName);

    private sealed class ScopeHandle : IDisposable
    {
        private bool _disposed;

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            CurrentScope.Value = null;
        }
    }

    private sealed class NoOpScope : IDisposable
    {
        public static readonly NoOpScope Instance = new();
        public void Dispose() { }
    }
}
