import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button, Img, notify } from '../../../components/ui';
import { catalogAdminApi } from '../../../api/catalog/admin';

interface Props {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  hint?: string;
  /** Thư mục lưu trên máy chủ, ví dụ "categories" / "brands". */
  area: string;
}

/**
 * Ô tải một ảnh cho ngành hàng / thương hiệu.
 *
 * Dùng `POST /api/media/upload` (W1-6) chứ KHÔNG dùng `/catalog/media/upload`:
 * route của catalog bắt buộc phải kèm `productId` có thật
 * (`CatalogMediaEndpoints.cs:59`), nên không dùng được cho taxonomy.
 */
export function TaxonomyImageField({ label, value, onChange, hint, area }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await catalogAdminApi.uploadTaxonomyImage(file, area);
      onChange(res.url);
      notify.success('Đã tải ảnh lên');
    } catch (error) {
      notify.error('Tải ảnh thất bại', { description: (error as Error).message });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-13 font-medium text-fg">{label}</p>
      <div className="flex items-center gap-3">
        <div className="w-20 shrink-0">
          {value ? (
            <Img src={value} alt="" ratio="1/1" fit="cover" wrapperClassName="rounded-xl" />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line-strong bg-sunken text-fg-subtle">
              <ImagePlus size={20} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
            {value ? 'Đổi ảnh' : 'Tải ảnh lên'}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
              <Trash2 size={15} /> Gỡ ảnh
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={label}
        onChange={(e) => void upload(e.target.files?.[0])}
      />
    </div>
  );
}
