/** Mobile: the same filter body in a full-height drawer with Apply / Clear. */
import { Button, Drawer } from '../ui';
import { ListingFilterPanel, type ListingFilterPanelProps } from './listing-filter-panel';

export interface ListingFilterDrawerProps extends ListingFilterPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Result count with the current filters — "Xem 12 sản phẩm". */
    total: number;
    onClear: () => void;
}

export const ListingFilterDrawer = ({ open, onOpenChange, total, onClear, ...panel }: ListingFilterDrawerProps) => (
    <Drawer
        open={open}
        onOpenChange={onOpenChange}
        side="left"
        title="Bộ lọc"
        className="w-[88vw] max-w-sm"
        footer={
            <div className="flex gap-2">
                <Button variant="outline" size="md" className="flex-1" onClick={onClear}>
                    Xoá lọc
                </Button>
                <Button size="md" className="flex-1" onClick={() => onOpenChange(false)}>
                    Xem {total} sản phẩm
                </Button>
            </div>
        }
    >
        <ListingFilterPanel {...panel} />
    </Drawer>
);

export default ListingFilterDrawer;
