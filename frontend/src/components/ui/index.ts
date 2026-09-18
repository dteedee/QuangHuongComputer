/**
 * ============================================================================
 * THE UI KIT — one import path for every primitive in the app.
 *   import { Button, Dialog, DataTable, Price } from '@/components/ui';
 *
 * Contract: docs/ui-kit-components.md (READ IT before building a page).
 * Visual/motion contract: design/design-direction.md.
 * Owner: W1-12. Additions go through the lead, not straight into this file.
 *
 * If a page needs a raw <button>, a hand-rolled modal or a hand-rolled table,
 * something is missing here — raise it, do not fork it.
 * ==========================================================================*/

/* --- variants (for composing new surfaces on the same tokens) -------------- */
export {
  buttonVariants,
  iconButtonVariants,
  controlVariants,
  badgeVariants,
  cardVariants,
  labelClass,
  hintClass,
  errorClass,
  overlayClass,
  type ButtonVariants,
  type IconButtonVariants,
  type ControlVariants,
  type BadgeVariants,
  type CardVariants,
} from './variants';

/* --- actions -------------------------------------------------------------- */
export { Button, type ButtonProps } from './Button';
export { IconButton, type IconButtonProps } from './icon-button';

/* --- display -------------------------------------------------------------- */
export { Badge, type BadgeProps } from './Badge';
export { StatusBadge, type StatusBadgeProps } from './status-badge';
export { Card, CardHeader, CardBody, CardFooter, CardTitle, type CardProps } from './card';
export { Avatar, type AvatarProps } from './avatar';
export { Img, type ImgProps } from './img';
export { SafeHtml, type SafeHtmlProps } from './safe-html';
export { Price, Money, type PriceProps } from './price';

/* Pure helpers — kept out of the .tsx files so Fast Refresh stays granular. */
export {
  formatDong,
  sanitizeImageSrc,
  sanitizeHtml,
  initialsOf,
  pageWindow,
  createStatusMap,
  type StatusTone,
} from './kit-utils';
export { useSkeletonFloor } from './use-skeleton-floor';
export { PageHeader, type PageHeaderProps } from './page-header';
export { StatCard, type StatCardProps } from './stat-card';
export { Breadcrumb, type BreadcrumbItem, type BreadcrumbProps } from './breadcrumb';

/* --- states --------------------------------------------------------------- */
export { Skeleton, SkeletonText, SkeletonCircle, type SkeletonProps } from './Skeleton';
export { EmptyState, type EmptyStateProps } from './empty-state';
export { ErrorState, type ErrorStateProps } from './error-state';
export { QueryBoundary, type QueryBoundaryProps, type QueryLike } from './query-boundary';

/* --- inputs (prop contract shared with W1-9's FormField) ------------------ */
export { Input, type InputProps } from './Input';
export { Textarea, type TextareaProps } from './Textarea';
export { Select, type SelectProps, type SelectOption } from './Select';
export {
  SearchableSelect,
  SearchableSelect as Combobox,
  type SearchableSelectProps,
  type SearchableSelectOption,
} from './SearchableSelect';
export { AsyncSearchableSelect, type AsyncSearchableSelectProps } from './AsyncSearchableSelect';
export { Checkbox, type CheckboxProps } from './checkbox';
export { Radio, RadioGroup, type RadioProps, type RadioGroupProps } from './radio';
export { Switch, type SwitchProps } from './switch';

/* --- overlays ------------------------------------------------------------- */
export {
  Dialog,
  ConfirmDialog,
  DialogRoot,
  DialogTrigger,
  DialogClose,
  type DialogProps,
  type DialogSize,
  type ConfirmDialogProps,
} from './dialog';
export { Drawer, type DrawerProps, type DrawerSide } from './drawer';
export { Popover, type PopoverProps, type PopoverAlign } from './popover';
export { Tooltip, type TooltipProps } from './tooltip';
export { Tabs, TabList, Tab, TabPanel, type TabsProps, type TabProps } from './tabs';
export { notify, type ToastTone, type NotifyOptions } from './toast';

/* --- data ----------------------------------------------------------------- */
export { Table, THead, TBody, Tr, Th, Td, RowActions } from './table';
export { DataTable } from './data-table';
export type {
  DataTableColumn,
  DataTableProps,
  SortState,
  SortDirection,
} from './data-table-types';
export { SortHeader, ColumnMenu } from './data-table-header';
export { Pagination, type PaginationProps } from './pagination';

/* --- app chrome that already lived here ----------------------------------- */
export { AudienceSwitcher } from './audience-switcher';
export { FontSizeToggle } from './font-size-toggle';

/**
 * @deprecated `Modal` is an adapter over `Dialog` for wave-0 pages.
 * New code uses `Dialog`.
 */
export { Modal, type ModalProps } from './Modal';
