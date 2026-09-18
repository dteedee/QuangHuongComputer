/** Lưới hàng của quầy: tìm theo tên, quét mã vạch/SKU chính xác, phân trang server. */
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PackageSearch, Search } from 'lucide-react';
import {
    Button, Card, Img, Input, Money, Pagination, QueryBoundary, Skeleton,
} from '../../../components/ui';
import BarcodeScannerInput from '../../../components/barcode-scanner-input';
import type { ListingProduct } from '../../../api/catalog/public-listing';
import { searchPosProducts } from './pos-catalog-lookup';

const PAGE_SIZE = 12;

interface PosProductGridProps {
    onPick: (product: ListingProduct) => void;
    onScan: (code: string) => void;
    /** Nhiều hàng khớp một mã quét — thu ngân chọn đúng máy thay vì đoán. */
    ambiguous: ListingProduct[] | null;
    onClearAmbiguous: () => void;
}

export default function PosProductGrid({ onPick, onScan, ambiguous, onClearAmbiguous }: PosProductGridProps) {
    const [search, setSearch] = useState('');
    const [term, setTerm] = useState('');
    const [page, setPage] = useState(1);

    const query = useQuery({
        queryKey: ['pos', 'products', term, page],
        queryFn: () => searchPosProducts({ search: term, page, pageSize: PAGE_SIZE }),
        placeholderData: keepPreviousData,
    });

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setTerm(search.trim());
        setPage(1);
    };

    return (
        <div className="flex h-full flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row">
                <form onSubmit={submitSearch} className="flex flex-1 items-center gap-2">
                    <div className="flex-1">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            icon={Search}
                            placeholder="Tìm theo tên hoặc SKU"
                            aria-label="Tìm sản phẩm"
                        />
                    </div>
                    <Button type="submit" variant="outline">Tìm</Button>
                </form>
                <div className="sm:w-72"><BarcodeScannerInput onScan={onScan} /></div>
            </div>

            {ambiguous && ambiguous.length > 1 && (
                <Card padded className="border-warning">
                    <p className="mb-2 text-sm text-fg-muted">
                        Mã vừa quét khớp {ambiguous.length} sản phẩm — chọn đúng máy giao cho khách:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {ambiguous.map((p) => (
                            <Button key={p.id} size="sm" variant="outline" onClick={() => { onPick(p); onClearAmbiguous(); }}>
                                {p.name} · {p.sku}
                            </Button>
                        ))}
                        <Button size="sm" variant="ghost" onClick={onClearAmbiguous}>Bỏ qua</Button>
                    </div>
                </Card>
            )}

            <QueryBoundary
                query={query}
                isEmpty={(d) => d.products.length === 0}
                skeleton={
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
                    </div>
                }
                empty={{
                    icon: PackageSearch,
                    title: 'Không có sản phẩm nào khớp',
                    description: 'Thử từ khoá khác, hoặc quét mã vạch trên thân máy.',
                    action: { label: 'Xoá tìm kiếm', onClick: () => { setSearch(''); setTerm(''); setPage(1); } },
                }}
            >
                {(data) => (
                    <div className="flex flex-1 flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                            {data.products.map((p) => (
                                <Card
                                    key={p.id}
                                    interactive
                                    className="cursor-pointer p-3 text-left"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onPick(p)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(p); } }}
                                >
                                    <Img src={p.thumbnailUrl ?? p.imageUrl} alt={p.name} ratio="1/1" blend />
                                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{p.name}</p>
                                    <p className="num mt-1 text-xs text-fg-subtle">{p.sku}</p>
                                    <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                                        <Money value={p.price} className="font-semibold" />
                                        <span className="num text-xs text-fg-muted">Tồn {p.stockQuantity}</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                        <Pagination
                            page={page}
                            pageSize={PAGE_SIZE}
                            total={data.total ?? 0}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </QueryBoundary>
        </div>
    );
}
