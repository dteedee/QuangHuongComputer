/**
 * Slim row for the picker drawer — deliberately its own component, not
 * `ProductCard` (phase-57 Implementation Steps #3: "…or a slim row component
 * of its own"): `PcCandidate`'s shape (`filterAttributes`, two-state
 * `compatibility`) does not match the storefront `Product` type `ProductCard`
 * expects, and a compact grid tile has no room for the socket/RAM-type chips
 * that are the entire point of this list.
 */
import { Check } from 'lucide-react';
import { Badge, Button, Img, Price } from '../ui';
import type { PcCandidate } from '../../api/pcbuilder';

export interface PcCandidateRowProps {
    candidate: PcCandidate;
    selected: boolean;
    onPick: (candidate: PcCandidate) => void;
}

/** The 2-3 attribute chips worth showing at a glance (socket/chipset/ramType/formFactor…). */
function keyAttrs(attrs: Record<string, string>): Array<[string, string]> {
    return Object.entries(attrs).slice(0, 3);
}

export const PcCandidateRow = ({ candidate, selected, onPick }: PcCandidateRowProps) => (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
        <Img
            src={candidate.imageUrl}
            alt={candidate.name}
            ratio="1/1"
            fit="contain"
            blend
            className="h-14 w-14 shrink-0 rounded-md"
        />
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{candidate.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {!candidate.inStock && <Badge variant="danger">Hết hàng</Badge>}
                {candidate.compatibility === 'CannotVerify' && (
                    <Badge variant="warning">Không thể kiểm tra</Badge>
                )}
                {keyAttrs(candidate.filterAttributes).map(([k, v]) => (
                    <Badge key={k} variant="neutral">{v}</Badge>
                ))}
            </div>
            <Price value={candidate.price} compareAt={candidate.oldPrice} className="mt-1 text-sm" />
        </div>
        <Button
            size="sm"
            variant={selected ? 'ink' : 'primary'}
            icon={selected ? Check : undefined}
            disabled={!candidate.inStock && !selected}
            onClick={() => onPick(candidate)}
        >
            {selected ? 'Đã chọn' : 'Chọn'}
        </Button>
    </li>
);

export default PcCandidateRow;
