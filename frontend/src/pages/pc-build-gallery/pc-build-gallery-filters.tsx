import { PC_BUDGET_RANGES, PC_USE_CASE_TAGS } from '../../api/pcbuilder-gallery';
import { Button } from '../../components/ui';

interface Props {
    tag: string;
    budget: string;
    onChange: (next: { tag?: string; budget?: string }) => void;
}

interface ChipGroupProps {
    label: string;
    options: ReadonlyArray<{ value: string; label: string }>;
    value: string;
    onPick: (value: string) => void;
}

const ChipGroup = ({ label, options, value, onPick }: ChipGroupProps) => (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => (
            <Button key={o.value || 'all'} size="sm" variant={value === o.value ? 'ink' : 'outline'}
                aria-pressed={value === o.value} onClick={() => onPick(o.value)}>
                {o.label}
            </Button>
        ))}
    </div>
);

/** Chip lọc theo nhu cầu + ngân sách. Trạng thái nằm trên URL (?tag=&budget=), không ở state cục bộ. */
export function PcBuildGalleryFilters({ tag, budget, onChange }: Props) {
    return (
        <div className="space-y-3">
            <ChipGroup label="Lọc theo nhu cầu" value={tag} onPick={(v) => onChange({ tag: v })}
                options={[{ value: '', label: 'Tất cả' }, ...PC_USE_CASE_TAGS]} />
            <ChipGroup label="Lọc theo ngân sách" value={budget} onPick={(v) => onChange({ budget: v })}
                options={[{ value: '', label: 'Mọi ngân sách' }, ...PC_BUDGET_RANGES]} />
        </div>
    );
}
