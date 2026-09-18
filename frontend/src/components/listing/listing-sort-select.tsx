/** Sort control. Values are exactly the ones the backend switch accepts. */
import { Select } from '../ui';
import { SORT_OPTIONS } from './use-listing-query';
import type { ListingSort } from '../../api/catalog/public-listing';

export interface ListingSortSelectProps {
    value: ListingSort;
    onChange: (value: ListingSort) => void;
    className?: string;
}

export const ListingSortSelect = ({ value, onChange, className }: ListingSortSelectProps) => (
    <Select
        className={className}
        aria-label="Sắp xếp sản phẩm"
        options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        value={value}
        onChange={(e) => onChange(e.target.value as ListingSort)}
    />
);

export default ListingSortSelect;
