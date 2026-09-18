/** Print-document date formatting, explicit `Asia/Ho_Chi_Minh` (D-plan: never trust the browser TZ). */
export function formatPrintDate(iso: string | Date, withTime = false): string {
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
}
