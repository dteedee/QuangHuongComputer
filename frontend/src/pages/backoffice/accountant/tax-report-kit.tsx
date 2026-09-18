/**
 * Small shared pieces of the 8 tax-report tabs: a figure row, a report frame
 * that always renders the four query states, and the CSV export button.
 *
 * The export writes the rows the API returned — there is no server-side export
 * for these reports yet (integration-requests-w3.md, W3-13 #2), and inventing
 * numbers client-side would be worse than no export at all.
 */
import type { ReactNode } from 'react';
import { Download } from 'lucide-react';
import {
    Button, Card, CardBody, CardHeader, CardTitle, Money, QueryBoundary, Skeleton,
    type QueryLike,
} from '../../../components/ui';
import { downloadBlob, toCsv } from '../../../api/tax-reports';

export const Figure = ({ label, value, strong = false, hint }: {
    label: string; value: number | null | undefined; strong?: boolean; hint?: ReactNode;
}) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-0">
        <span className={strong ? 'text-sm font-medium text-fg' : 'text-sm text-fg-muted'}>
            {label}
            {hint && <span className="ml-1 text-xs text-fg-subtle">{hint}</span>}
        </span>
        <Money value={value ?? null} className={strong ? 'text-base font-semibold text-fg' : undefined} />
    </div>
);

export const TextRow = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-0">
        <span className="text-sm text-fg-muted">{label}</span>
        <span className="text-sm font-medium text-fg">{value}</span>
    </div>
);

export interface ReportPanelProps<T> {
    title: string;
    subtitle?: ReactNode;
    query: QueryLike<T>;
    children: (data: T) => ReactNode;
    /** Builds the CSV when the user exports. Omit to hide the export button. */
    csv?: (data: T) => { filename: string; headers: string[]; rows: (string | number)[][] };
    actions?: ReactNode;
}

export function ReportPanel<T>({ title, subtitle, query, children, csv, actions }: ReportPanelProps<T>) {
    const data = query.data;
    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>{title}</CardTitle>
                    {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {actions}
                    {csv && (
                        <Button
                            variant="outline" size="sm" disabled={!data}
                            onClick={() => {
                                if (!data) return;
                                const spec = csv(data);
                                downloadBlob(toCsv(spec.headers, spec.rows), spec.filename);
                            }}
                        >
                            <Download size={14} aria-hidden /> Xuất CSV
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardBody>
                <QueryBoundary
                    query={query}
                    errorTitle={`Không tải được ${title.toLowerCase()}`}
                    skeleton={<div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>}
                >
                    {children}
                </QueryBoundary>
            </CardBody>
        </Card>
    );
}
