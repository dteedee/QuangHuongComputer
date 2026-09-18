import type { ReactNode } from 'react';

interface FloatingStackProps {
  children: ReactNode;
  className?: string;
}

/**
 * The single owner of the bottom-right floating slot (chat launcher,
 * back-to-top, admin quick-actions FAB). Before this, each widget hardcoded
 * its own `fixed bottom-N right-N z-N` (chat: bottom-20/z-50, back-to-top:
 * bottom-24/z-[90], ...) with no shared stacking rule, so they could overlap.
 *
 * Consumers render as plain children, stacked bottom-up with a fixed gap:
 *   <FloatingStack><BackToTop /><AiChatWidgetTrigger /></FloatingStack>
 *
 * z-40 = "nổi" (floating) on the design system's documented scale (10 sticky,
 * 30 topbar, 40 floating, 50 scrim, 60 drawer, 70 toast, 80 command palette).
 * The bottom offset clears the mobile bottom nav on small screens; desktop
 * uses the tighter edge spacing from the same design spec.
 */
export function FloatingStack({ children, className = '' }: FloatingStackProps) {
  return (
    <div
      className={`fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
