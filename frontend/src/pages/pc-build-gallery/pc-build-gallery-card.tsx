import { Pencil, ShoppingCart, Star } from 'lucide-react';
import type { PcGalleryBuild } from '../../api/pcbuilder-gallery';
import { Badge, Button, Card, CardBody, Price } from '../../components/ui';
import { PcVerdictBadge } from '../../components/pc-builder/pc-verdict-badge';

interface Props {
    build: PcGalleryBuild;
    buying: boolean;
    onBuyAll: (build: PcGalleryBuild) => void;
    onCustomize: (build: PcGalleryBuild) => void;
}

/** Thẻ một cấu hình mẫu. `id` = mã build để khớp anchor ItemList của SEO shell. */
export function PcBuildGalleryCard({ build, buying, onBuyAll, onCustomize }: Props) {
    const issues = build.issues.slice(0, 2);

    return (
        <Card id={build.buildCode} className="flex h-full flex-col" data-testid="pc-gallery-card">
            <CardBody className="flex flex-1 flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge>{build.useCaseLabel}</Badge>
                    {build.isFeatured && (
                        <Badge variant="brand"><Star size={12} aria-hidden /> Nổi bật</Badge>
                    )}
                    <span className="ml-auto"><PcVerdictBadge verdict={build.overallVerdict} /></span>
                </div>

                <h2 className="font-display text-lg font-semibold leading-snug text-fg">{build.title}</h2>

                <ul className="space-y-1.5 text-sm">
                    {build.items.map((item) => (
                        <li key={`${item.slotId}-${item.productId}`} className="flex gap-2">
                            <span className="w-20 shrink-0 text-2xs text-fg-subtle">{item.slotLabel}</span>
                            <span className={item.isAvailable ? 'min-w-0 flex-1 text-fg' : 'min-w-0 flex-1 text-fg-subtle line-through'}>
                                {item.name}
                                {item.quantity > 1 && <span className="num text-fg-muted"> ×{item.quantity}</span>}
                            </span>
                            {!item.isAvailable && <span className="shrink-0 text-2xs text-danger">Ngừng bán</span>}
                            {item.isAvailable && !item.inStock && <span className="shrink-0 text-2xs text-warning">Hết hàng</span>}
                        </li>
                    ))}
                </ul>

                {issues.length > 0 && (
                    <ul className="space-y-1 rounded-lg bg-sunken p-3 text-xs text-fg-muted">
                        {issues.map((issue) => <li key={issue.ruleId}>{issue.message}</li>)}
                    </ul>
                )}

                <div className="mt-auto space-y-3 border-t border-line pt-3">
                    <div className="flex items-baseline justify-between">
                        <span className="text-sm text-fg-muted">Tổng theo giá hôm nay</span>
                        <Price value={build.liveTotal} className="text-lg font-semibold" />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="primary" icon={ShoppingCart} block loading={buying}
                            disabled={!build.isPurchasable} onClick={() => onBuyAll(build)}>
                            Mua cả bộ
                        </Button>
                        <Button variant="outline" icon={Pencil} block onClick={() => onCustomize(build)}>
                            Tùy chỉnh
                        </Button>
                    </div>
                    {!build.isPurchasable && (
                        <p className="text-xs text-fg-subtle">Có linh kiện tạm hết hàng hoặc ngừng bán — bấm "Tùy chỉnh" để chọn thay thế.</p>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}
