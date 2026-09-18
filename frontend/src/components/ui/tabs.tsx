/**
 * Tabs — underlined tab bar on `@radix-ui/react-tabs` (roving tabindex, arrow
 * keys, `aria-selected`, panel association all handled by Radix).
 *
 * The moving underline is a `layoutId` shared element (design-direction §7,
 * "gạch tab"), which is measurement-free — the prototype's manual version had
 * to re-measure on `load`, `resize` and `document.fonts.ready` and still drifted
 * with Vietnamese diacritics. Under reduced motion framer-motion drops the
 * animation and the bar simply appears under the active tab.
 */
import { createContext, useContext, useId, type ReactNode } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { dur, ease } from '../../design-system/motion';

/** Each Tabs instance needs its own layoutId or two tab bars share one bar. */
const TabsIdContext = createContext<string>('tabs');

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export const Tabs = ({ value, onValueChange, children, className }: TabsProps) => {
  const id = useId();
  return (
    <TabsIdContext.Provider value={id}>
      <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
        {children}
      </RadixTabs.Root>
    </TabsIdContext.Provider>
  );
};

export interface TabListProps {
  children: ReactNode;
  className?: string;
  /** Accessible name for the tab set, e.g. "Trạng thái đơn hàng". */
  'aria-label'?: string;
}

export const TabList = ({ children, className, ...props }: TabListProps) => (
  <RadixTabs.List
    className={cn(
      'relative flex items-center gap-5 overflow-x-auto border-b border-line',
      className,
    )}
    {...props}
  >
    {children}
  </RadixTabs.List>
);

export interface TabProps {
  value: string;
  children: ReactNode;
  /** Right-hand count chip, e.g. the number of orders in this status. */
  count?: number;
  disabled?: boolean;
  className?: string;
}

export const Tab = ({ value, children, count, disabled, className }: TabProps) => {
  const layoutId = useContext(TabsIdContext);
  return (
    <RadixTabs.Trigger
      value={value}
      disabled={disabled}
      className={cn(
        'group relative -mb-px shrink-0 whitespace-nowrap pb-2.5 pt-1 text-sm font-medium',
        'text-fg-subtle transition-colors duration-140 ease-out hover:text-fg',
        'data-[state=active]:text-fg disabled:opacity-50',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {typeof count === 'number' && (
          <span className="num rounded-sm bg-sunken px-1.5 text-2xs font-semibold text-fg-muted">
            {count}
          </span>
        )}
      </span>
      {/* Only the active trigger renders the bar; framer moves it between them. */}
      <span className="absolute inset-x-0 bottom-0 hidden h-0.5 group-data-[state=active]:block">
        <motion.span
          layoutId={`tabline-${layoutId}`}
          className="block h-0.5 w-full rounded-full bg-fg"
          transition={{ duration: dur.move, ease: ease.expo }}
        />
      </span>
    </RadixTabs.Trigger>
  );
};

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabPanel = ({ value, children, className }: TabPanelProps) => (
  /* The panel keeps the global focus ring. Radix makes it focusable, and a
   * utility that clears the outline is 0,2,0 — it beats the `:focus-visible`
   * rule in styles/base.css (0,1,0) and leaves a keyboard user with nothing
   * visible on the panel. Do not add one back. */
  <RadixTabs.Content value={value} className={cn('pt-4', className)}>
    {children}
  </RadixTabs.Content>
);

export default Tabs;
