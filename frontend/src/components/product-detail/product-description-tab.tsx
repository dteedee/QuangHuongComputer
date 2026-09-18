/**
 * Product description. The importer writes the verified rich text into
 * `Products.Attributes.descriptionHtml` and a flattened plain-text copy into
 * `Products.Description`, because this tab used to interpolate the description
 * as TEXT (integration-requests-w0 #35). It now renders the HTML through
 * `SafeHtml` (DOMPurify, the one sanctioned sink), so the rich version — and
 * the verified `highlights` bullet list nothing rendered until now — are live.
 */
import { Check } from 'lucide-react';

import { SafeHtml } from '../ui';

interface ProductDescriptionTabProps {
  description?: string;
  /** Raw `Products.Attributes` JSON string, as the DTO carries it. */
  attributes?: string | null;
}

/** `attributes` is a JSON string on the wire; bad JSON must never blank the tab. */
function readAttributes(attributes?: string | null): { descriptionHtml?: string; highlights?: string[] } {
  if (!attributes) return {};
  try {
    const parsed = JSON.parse(attributes) as Record<string, unknown>;
    const highlights = Array.isArray(parsed.highlights)
      ? (parsed.highlights as unknown[]).filter((h): h is string => typeof h === 'string')
      : undefined;
    return {
      descriptionHtml: typeof parsed.descriptionHtml === 'string' ? parsed.descriptionHtml : undefined,
      highlights,
    };
  } catch {
    return {};
  }
}

export default function ProductDescriptionTab({ description, attributes }: ProductDescriptionTabProps) {
  const { descriptionHtml, highlights } = readAttributes(attributes);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-fg">Giới thiệu sản phẩm</h3>

      {highlights && highlights.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
          {highlights.map((h) => (
            <li key={h} className="flex items-start gap-2 text-sm text-fg">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
        {descriptionHtml ? (
          <SafeHtml html={descriptionHtml} className="max-w-none text-sm leading-relaxed" />
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">
            {description || 'Chưa có mô tả sản phẩm.'}
          </p>
        )}
      </div>
    </div>
  );
}
