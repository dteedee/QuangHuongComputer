import type { ReactNode } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui';

interface PrintPageShellProps {
    title: string;
    children: ReactNode;
    /** Extra actions next to "In" (e.g. a sheet-layout picker on the label builder). */
    toolbar?: ReactNode;
}

/**
 * Wraps every W3-16 print page: on-screen chrome (back, title, layout controls, the "In" button)
 * hidden entirely under `@media print` via `.print-only`/`.no-print` (defined once in
 * `print-sheet.css`), so the printed sheet carries nothing but the document itself — no
 * navbar/sidebar bleed, per the phase file's "no background bleed" requirement.
 */
export function PrintPageShell({ title, children, toolbar }: PrintPageShellProps) {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-surface-subtle">
            {/* Print-color-adjust: exact keeps label/note backgrounds from being dropped by the
                browser's "save ink" default (Risk Assessment — "drill is done in Chrome"). */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-doc, .print-doc * { visibility: visible; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-doc { position: absolute; left: 0; top: 0; }
                    .no-print { display: none !important; }
                }
            `}</style>
            <div className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại
                </Button>
                <h1 className="flex-1 text-sm font-semibold text-fg">{title}</h1>
                {toolbar}
                <Button size="sm" onClick={() => window.print()}>
                    <Printer className="mr-1.5 h-4 w-4" /> In
                </Button>
            </div>
            <div className="mx-auto py-6">{children}</div>
        </div>
    );
}
