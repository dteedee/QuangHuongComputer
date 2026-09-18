/**
 * CMS section adapter (`sectionType: custom_html`).
 *
 * The HTML comes from the homepage-builder tables, i.e. from whoever can write
 * a CMS section. It therefore goes through `SafeHtml` (DOMPurify, fixed
 * allow-list) — a bare `dangerouslySetInnerHTML` here was a stored-XSS sink on
 * the storefront home page (phase §Security Considerations).
 */
import React from 'react';
import { SafeHtml } from '../ui';

interface CustomHtmlProps {
    title?: string;
    config: {
        html?: string | null;
    };
}

export const CustomHtml: React.FC<CustomHtmlProps> = ({ config }) => {
    if (!config?.html) return null;
    return (
        <div className="mx-auto mt-12 w-full max-w-shell px-4">
            <SafeHtml html={config.html} className="custom-html-section" />
        </div>
    );
};

export default CustomHtml;
