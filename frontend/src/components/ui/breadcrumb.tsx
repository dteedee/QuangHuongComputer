/**
 * Breadcrumb — `<nav aria-label>` + ordered list, current page marked with
 * `aria-current="page"` and NOT a link. Separators are decorative.
 * design-direction.md §3 (11–12px meta text, muted).
 */
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  label: string;
  /** Omit on the last item — the current page is never a link. */
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  /** Accessible name of the nav landmark. */
  label?: string;
}

export const Breadcrumb = ({ items, className, label = 'Đường dẫn' }: BreadcrumbProps) => {
  if (items.length === 0) return null;

  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-xs leading-4 text-fg-subtle">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className="flex items-center">
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="rounded-sm transition-colors duration-140 ease-out hover:text-fg"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cn(isLast && 'font-medium text-fg-muted')}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden className="flex items-center text-fg-subtle/70">
                  <ChevronRight size={12} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
