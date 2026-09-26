namespace Content.Domain;

/// <summary>
/// Save-time chain/loop check (pure: the caller passes the active table as a map).
///
/// Google follows a few hops but loses link equity and crawl budget on each, and a loop is a
/// dead page. So the table must stay FLAT: every active row points at a final destination.
/// Rejected at save time:
///   · self-redirect (A -&gt; A),
///   · loops (A -&gt; B while B -&gt; … -&gt; A), found by walking at most <see cref="MaxDepth"/> hops,
///   · outgoing chains (A -&gt; B while B -&gt; C): the message names C so the admin points at it directly,
///   · incoming chains (X -&gt; A while saving A -&gt; B): the message names X.
/// Absolute-URL and 410 targets end the walk (they are not in our table).
/// </summary>
public static class UrlRedirectChainGuard
{
    public const int MaxDepth = 10;

    /// <param name="fromKey">Normalised source of the row being saved.</param>
    /// <param name="targetKey">Normalised relative target, or null for absolute URL / 410.</param>
    /// <param name="activeTargets">Other ACTIVE rows: source key -&gt; target key (null = absolute/410). Must not contain the row being saved.</param>
    /// <returns>Vietnamese error, or null when the row keeps the table flat.</returns>
    public static string? Check(string fromKey, string? targetKey, IReadOnlyDictionary<string, string?> activeTargets)
    {
        if (targetKey is not null && targetKey == fromKey)
            return "Đường dẫn đích trùng đường dẫn cũ (tự chuyển hướng về chính nó).";

        if (targetKey is not null && activeTargets.ContainsKey(targetKey))
        {
            var (final, loop, tooDeep) = Walk(fromKey, targetKey, activeTargets);
            if (loop) return $"Tạo vòng lặp chuyển hướng: {fromKey} → {targetKey} → … quay lại đường dẫn đã đi qua.";
            if (tooDeep) return $"Chuỗi chuyển hướng từ {targetKey} dài quá {MaxDepth} bước.";
            return $"Đích {targetKey} đang chuyển hướng tiếp tới {final ?? "một URL ngoài / trang đã gỡ"} — hãy trỏ thẳng tới đích cuối.";
        }

        var incoming = activeTargets.Where(kv => kv.Value == fromKey).Select(kv => kv.Key).OrderBy(k => k).ToList();
        if (incoming.Count > 0)
        {
            var sample = string.Join(", ", incoming.Take(3));
            return $"Đã có chuyển hướng trỏ vào {fromKey} ({sample}{(incoming.Count > 3 ? ", …" : "")}) — sửa các dòng đó trỏ thẳng tới đích mới trước.";
        }

        return null;
    }

    /// <summary>Follows the chain starting at <paramref name="start"/>; reports its final relative key (null when it ends outside the table).</summary>
    private static (string? Final, bool Loop, bool TooDeep) Walk(
        string fromKey, string start, IReadOnlyDictionary<string, string?> activeTargets)
    {
        var visited = new HashSet<string>(StringComparer.Ordinal) { fromKey };
        var current = start;
        for (var depth = 0; depth < MaxDepth; depth++)
        {
            if (!visited.Add(current)) return (null, true, false);
            if (!activeTargets.TryGetValue(current, out var next)) return (current, false, false);
            if (next is null) return (null, false, false);
            current = next;
        }
        return (null, false, true);
    }
}
