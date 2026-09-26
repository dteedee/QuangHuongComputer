import { describe, it, expect } from 'vitest';

/**
 * Guard: server/CMS HTML reaches the DOM through ONE sink only — `SafeHtml` (DOMPurify). A new bare
 * `dangerouslySetInnerHTML`, an `innerHTML =` assignment, or auth tokens read back from
 * localStorage fail this test instead of waiting for a review to spot them.
 */
const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

const productionFiles = Object.entries(sources).filter(
    ([path]) => !/\.(test|spec)\.tsx?$/.test(path) && !path.includes('/__tests__/'),
);

/** Strips comments so documentation that names a sink does not count as using it. */
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

function offenders(pattern: RegExp, allowed: string[]): string[] {
    return productionFiles
        .filter(([path, source]) => pattern.test(code(source)) && !allowed.some((a) => path.endsWith(a)))
        .map(([path]) => path);
}

describe('HTML sinks', () => {
    it('dangerouslySetInnerHTML chỉ được dùng trong components/ui/safe-html.tsx', () => {
        expect(productionFiles.length).toBeGreaterThan(100);
        expect(offenders(/dangerouslySetInnerHTML/, ['/components/ui/safe-html.tsx'])).toEqual([]);
    });

    it('không gán innerHTML trực tiếp (trừ trình soạn thảo đã qua DOMPurify)', () => {
        expect(offenders(/\.innerHTML\s*=(?!=)/, ['/components/cms/RichTextEditor.tsx'])).toEqual([]);
    });

    it('không đọc/ghi token đăng nhập ở localStorage', () => {
        expect(offenders(/(getItem|setItem)\(\s*['"](token|refreshToken)['"]/, [])).toEqual([]);
    });
});
