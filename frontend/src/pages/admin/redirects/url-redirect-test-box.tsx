import { useState, type FormEvent } from 'react';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { Button, Input, StatusBadge } from '../../../components/ui';
import { urlRedirectsApi, type UrlRedirectTestResult } from '../../../api/content/url-redirects';
import { normalizeApiError } from '../../../lib/api-error';
import { STATUS_META } from './url-redirect-schema';

/**
 * "Thử URL": nhập một đường dẫn, xem cửa hàng sẽ trả gì ngay lúc này — tra CÙNG bảng trong bộ
 * nhớ mà SEO shell dùng (không tính là một lượt truy cập).
 */
export function UrlRedirectTestBox() {
  const [path, setPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UrlRedirectTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (e: FormEvent) => {
    e.preventDefault();
    if (!path.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await urlRedirectsApi.test(path.trim()));
    } catch (err) {
      setResult(null);
      setError(normalizeApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={run} className="space-y-3" aria-label="Thử một đường dẫn">
      <div className="flex flex-wrap items-end gap-2">
        <Input
          label="Thử URL"
          inputSize="sm"
          icon={FlaskConical}
          placeholder="/duong-dan-cu.html"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          wrapperClassName="min-w-[16rem] flex-1"
        />
        <Button type="submit" size="sm" variant="outline" loading={busy} disabled={!path.trim()}>
          Kiểm tra
        </Button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {result && <TestOutcome result={result} />}
    </form>
  );
}

function TestOutcome({ result }: { result: UrlRedirectTestResult }) {
  const { match } = result;
  return (
    <div className="rounded-lg border border-line bg-sunken px-3 py-2 text-13" role="status">
      <p className="text-fg-muted">
        Đường dẫn chuẩn hoá: <code className="num text-fg">{result.normalizedPath}</code>
      </p>
      {result.blockedReason && <p className="mt-1 text-warning">{result.blockedReason}</p>}
      {!match && !result.blockedReason && (
        <p className="mt-1 text-fg">Không có chuyển hướng — cửa hàng hiển thị trang bình thường (hoặc 404).</p>
      )}
      {match && (
        <p className="mt-1 flex flex-wrap items-center gap-2 text-fg">
          <StatusBadge tone={STATUS_META[match.statusCode].tone}>{STATUS_META[match.statusCode].label}</StatusBadge>
          <code className="num">{match.fromPath}</code>
          <ArrowRight size={14} aria-hidden />
          <code className="num break-all">{match.target ?? 'Đã gỡ (410)'}</code>
          {match.hops > 1 && <span className="text-xs text-warning">gộp {match.hops} bước — nên trỏ thẳng</span>}
        </p>
      )}
    </div>
  );
}
