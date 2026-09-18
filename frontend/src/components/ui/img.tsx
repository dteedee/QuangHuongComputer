/**
 * Img — the single image component. Replaces `components/LazyImage.tsx`.
 *
 * Fixes the blank-product-card class of bug in one place:
 *  - root-relative `/media/…` and `/uploads/…` go through `resolveMediaUrl`
 *    (D02) so they load when FE and API are on different origins; absolute
 *    URLs pass through untouched;
 *  - a fixed aspect ratio box + `width`/`height` → no CLS (§7 performance);
 *  - skeleton while loading, muted placeholder on error — never a broken glyph;
 *  - `javascript:` and `data:text/html` sources are refused outright (security
 *    note in the phase file), because product image URLs are user-editable in
 *    the admin.
 */
import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { sanitizeImageSrc } from './kit-utils';

export interface ImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'loading'> {
  src: string | null | undefined;
  /** Required: an empty alt is only correct for decoration — pass `alt=""` then. */
  alt: string;
  /** CSS aspect-ratio for the frame, e.g. `1/1` (product), `16/9` (banner). */
  ratio?: string;
  /** `contain` for product shots on `--stage` (§1), `cover` for banners. */
  fit?: 'contain' | 'cover';
  /** Product photography: white background blends into `--stage` (§1). */
  blend?: boolean;
  /** `eager` for above-the-fold hero images only. */
  priority?: boolean;
  /** Wrapper class; `className` styles the `<img>` itself. */
  wrapperClassName?: string;
}

export const Img = ({
  src,
  alt,
  ratio = '1/1',
  fit = 'contain',
  blend = false,
  priority = false,
  className,
  wrapperClassName,
  ...props
}: ImgProps) => {
  const resolved = sanitizeImageSrc(src);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(
    resolved ? 'loading' : 'error',
  );

  /* A card that is recycled in a virtualised list keeps its DOM node; without
   * this the new product shows the previous product's loaded state. */
  useEffect(() => {
    setState(resolved ? 'loading' : 'error');
  }, [resolved]);

  return (
    <div
      className={cn('relative overflow-hidden bg-stage', wrapperClassName)}
      style={{ aspectRatio: ratio }}
    >
      {state === 'loading' && <div className="sk absolute inset-0 rounded-none" aria-hidden />}
      {state === 'error' ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-fg-subtle"
          role="img"
          aria-label={alt || 'Không có ảnh'}
        >
          <ImageOff size={24} aria-hidden />
          <span className="text-2xs">Chưa có ảnh</span>
        </div>
      ) : (
        <img
          src={resolved}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
          className={cn(
            'absolute inset-0 h-full w-full transition-opacity duration-220 ease-out',
            fit === 'contain' ? 'object-contain p-[7%]' : 'object-cover',
            blend && 'mix-blend-multiply dark:mix-blend-multiply',
            state === 'ready' ? 'opacity-100' : 'opacity-0',
            className,
          )}
          {...props}
        />
      )}
    </div>
  );
};

export default Img;
