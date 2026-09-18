/**
 * Avatar — image with an initials fallback. Vietnamese names are taken from the
 * END ("Nguyễn Văn Bình" → "B"), because the given name is the last syllable;
 * taking the first letter would show every customer as "N".
 */
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { sanitizeImageSrc, initialsOf } from './kit-utils';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  xs: 'h-6 w-6 text-2xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

export const Avatar = ({ name, src, size = 'md', className }: AvatarProps) => {
  const resolved = sanitizeImageSrc(src);
  const [failed, setFailed] = useState(false);
  const showImage = resolved && !failed;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-sunken font-semibold text-fg-muted select-none',
        SIZES[size],
        className,
      )}
      title={name}
    >
      {showImage ? (
        <img
          src={resolved}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{initialsOf(name)}</span>
      )}
      {!showImage && <span className="sr-only">{name}</span>}
    </span>
  );
};

export default Avatar;
