/**
 * PageHeader — title block at the top of every page: optional breadcrumb, the
 * H1, a one-line description and the page-level actions.
 * design-direction.md §3 (4xl page H1, `tracking-tight` ≥24px) and §6.
 *
 * The heading is always an `<h1>`: a page with three `<div class="text-2xl">`
 * and no h1 is what the accessibility audit kept finding.
 */
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Breadcrumb, type BreadcrumbItem } from './breadcrumb';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /** Buttons, right aligned on ≥sm, stacked below the title on mobile. */
  actions?: ReactNode;
  /** Tabs / filter row rendered under the header, inside the same block. */
  children?: ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: PageHeaderProps) => (
  <header className={cn('mb-5', className)}>
    {breadcrumbs && breadcrumbs.length > 0 && (
      <Breadcrumb items={breadcrumbs} className="mb-2" />
    )}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1
          className={cn(
            'font-display font-semibold tracking-tight text-fg',
            /* 36/44 storefront H1 · admin pages are denser (§3, §4) */
            'text-3xl leading-9 [[data-shell=admin]_&]:text-xl [[data-shell=admin]_&]:leading-7',
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-prose text-sm leading-5 text-fg-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children && <div className="mt-4">{children}</div>}
  </header>
);

export default PageHeader;
