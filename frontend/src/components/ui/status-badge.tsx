/**
 * StatusBadge — a domain status rendered as a Badge with a dot.
 *
 * Colour is never the only channel (design-direction §2, note b): the dot is a
 * shape, the label is words. Callers pass an explicit `tone`; the mapping from
 * a backend enum to `[tone, label]` is built with `createStatusMap`
 * (`kit-utils.ts`) so each domain declares it once.
 */
import type { ReactNode } from 'react';
import { Badge, type BadgeProps } from './Badge';
import type { StatusTone } from './kit-utils';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'dot' | 'children'> {
  tone?: StatusTone;
  /** Vietnamese label. Never render a raw backend enum to a customer. */
  children: ReactNode;
}

export const StatusBadge = ({ tone = 'neutral', ...props }: StatusBadgeProps) => (
  <Badge variant={tone} dot {...props} />
);

export default StatusBadge;
