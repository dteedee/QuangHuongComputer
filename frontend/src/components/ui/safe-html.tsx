/**
 * SafeHtml — the ONLY sanctioned way to render HTML that came from the server.
 *
 * Product descriptions, CMS blocks and email previews are authored in a rich
 * text editor and stored as raw HTML. Today they reach the DOM through bare
 * `dangerouslySetInnerHTML` in several pages: any admin account (or anyone who
 * can write those tables) can ship stored XSS to every visitor. DOMPurify runs
 * in `kit-utils.sanitizeHtml`, once, with a fixed allow-list — and a
 * `dangerouslySetInnerHTML` outside this file is a review failure.
 */
import { useMemo, type ElementType } from 'react';
import { cn } from '../../lib/utils';
import { sanitizeHtml } from './kit-utils';
import './ui-kit.css'; // `.prose-content` defaults for editor HTML

export interface SafeHtmlProps {
  /** Server-authored HTML. `null`/empty renders nothing. */
  html: string | null | undefined;
  /** Wrapper element — `div` by default, `span` for inline snippets. */
  as?: ElementType;
  className?: string;
}

export const SafeHtml = ({ html, as: Tag = 'div', className }: SafeHtmlProps) => {
  const clean = useMemo(() => (html ? sanitizeHtml(html) : ''), [html]);
  if (!clean) return null;
  return (
    <Tag
      className={cn('prose-content text-fg', className)}
      /* Sanitised on the line above. This is the ONE sanctioned
       * `dangerouslySetInnerHTML` in the codebase; any other is a review fail. */
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
};

export default SafeHtml;
