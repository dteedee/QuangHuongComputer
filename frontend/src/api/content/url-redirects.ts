/**
 * Content — URL redirect manager (`/api/content/admin/redirects`).
 * Read: `Content.ViewRedirects`; write/import: `Content.ManageRedirects`.
 * The SEO shell answers these as real HTTP 301/302/410 before any page renders
 * (docs/seo-shell.md "Redirect manager").
 */
import client from '../client';

export type UrlRedirectStatusCode = 301 | 302 | 410;

export interface UrlRedirect {
    id: string;
    fromPath: string;
    toPath: string | null;
    statusCode: UrlRedirectStatusCode;
    isActive: boolean;
    hitCount: number;
    lastHitAt: string | null;
    note: string | null;
    /** `manual` | `import` | `product-slug` | `category-slug` */
    source: string;
    createdAt: string;
    updatedAt: string | null;
    createdBy: string | null;
    updatedBy: string | null;
}

export interface UrlRedirectWriteDto {
    fromPath: string;
    toPath: string | null;
    statusCode: UrlRedirectStatusCode;
    note: string | null;
    isActive: boolean;
}

export interface UrlRedirectListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    statusCode?: UrlRedirectStatusCode;
    isActive?: boolean;
    source?: string;
}

export interface UrlRedirectPage {
    items: UrlRedirect[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface UrlRedirectTestResult {
    input: string;
    normalizedPath: string;
    blockedReason: string | null;
    match: { id: string; fromPath: string; statusCode: UrlRedirectStatusCode; target: string | null; hops: number } | null;
}

export interface UrlRedirectImportResult {
    mode: 'dryRun' | 'commit';
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    committed: boolean;
    errors: { row: number; column: string | null; message: string }[];
}

const BASE = '/content/admin/redirects';

export const urlRedirectsApi = {
    list: async (query: UrlRedirectListQuery): Promise<UrlRedirectPage> =>
        (await client.get<UrlRedirectPage>(BASE, { params: query })).data,

    create: async (dto: UrlRedirectWriteDto): Promise<UrlRedirect> =>
        (await client.post<UrlRedirect>(BASE, dto)).data,

    update: async (id: string, dto: UrlRedirectWriteDto): Promise<UrlRedirect> =>
        (await client.put<UrlRedirect>(`${BASE}/${id}`, dto)).data,

    setActive: async (id: string, isActive: boolean): Promise<UrlRedirect> =>
        (await client.post<UrlRedirect>(`${BASE}/${id}/active`, { isActive })).data,

    remove: async (id: string): Promise<void> => {
        await client.delete(`${BASE}/${id}`);
    },

    /** What the storefront would answer for `path` right now (does not count as a hit). */
    test: async (path: string): Promise<UrlRedirectTestResult> =>
        (await client.get<UrlRedirectTestResult>(`${BASE}/test`, { params: { path } })).data,

    exportCsv: async (): Promise<Blob> =>
        (await client.get<Blob>(`${BASE}/export`, { responseType: 'blob' })).data,

    downloadTemplate: async (): Promise<Blob> =>
        (await client.get<Blob>(`${BASE}/template`, { responseType: 'blob' })).data,

    /** `mode=dryRun` reports only; `commit` writes only when every row is valid (all-or-nothing). */
    import: async (file: File, mode: 'dryRun' | 'commit', onDuplicate: 'skip' | 'update'): Promise<UrlRedirectImportResult> => {
        const form = new FormData();
        form.append('file', file);
        const res = await client.post<UrlRedirectImportResult>(`${BASE}/import`, form, {
            params: { mode, onDuplicate },
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },
};
