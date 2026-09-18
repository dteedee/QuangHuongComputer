/**
 * In phiếu quầy. Không dùng `window.print()` của cả trang (sẽ in luôn sidebar, header, nút bấm):
 * dựng một iframe ẩn, chép nguyên CSS đang chạy sang đó rồi in đúng khối phiếu.
 */
export function printReceipt(node: HTMLElement | null): boolean {
    if (!node) return false;

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    if (!doc) {
        frame.remove();
        return false;
    }

    // Chép mọi <style> và <link rel=stylesheet> đang có, để phiếu in giữ nguyên bố cục 80mm.
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((el) => el.outerHTML)
        .join('\n');

    doc.open();
    doc.write(
        `<!doctype html><html lang="vi"><head><meta charset="utf-8">${styles}` +
        `<style>@page{size:80mm auto;margin:4mm}body{margin:0;background:#fff}</style>` +
        `</head><body>${node.outerHTML}</body></html>`
    );
    doc.close();

    const run = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        window.setTimeout(() => frame.remove(), 1000);
    };
    if (doc.readyState === 'complete') run();
    else frame.onload = run;
    return true;
}
