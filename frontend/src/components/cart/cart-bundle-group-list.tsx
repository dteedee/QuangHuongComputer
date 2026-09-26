import { useCart, type CartBundleGroup } from '../../context/CartContext';
import { CartBundleGroupCard } from './cart-bundle-group';

/**
 * Mọi combo trong giỏ, mỗi combo một thẻ. Dòng combo mà server chưa trả nhóm (hiếm: đang tải
 * lại) vẫn được gom theo `bundleId` với trạng thái "đang tính" thay vì rơi mất khỏi giỏ.
 */
export function CartBundleGroupList() {
    const { items, bundles, isUpdating, updateBundleItem, removeBundleItem, removeBundle } = useCart();
    const bundleIds = Array.from(new Set(items.filter(i => i.bundleId).map(i => i.bundleId!)));
    if (bundleIds.length === 0) return null;

    return (
        <div className="space-y-4">
            {bundleIds.map((bundleId) => {
                const lines = items.filter(i => i.bundleId === bundleId);
                const group: CartBundleGroup = bundles.find(b => b.bundleId === bundleId) ?? {
                    bundleId, name: lines[0]?.bundleName ?? 'Combo', isApplied: false,
                    reason: 'Đang tính giá combo', sets: 1, listTotal: 0, bundleTotal: 0, discount: 0, pendingCheckout: false,
                };
                return (
                    <CartBundleGroupCard
                        key={bundleId}
                        group={group}
                        lines={lines}
                        disabled={isUpdating}
                        onUpdateItem={(b, p, q) => { void updateBundleItem(b, p, q); }}
                        onRemoveItem={(b, p) => { void removeBundleItem(b, p); }}
                        onRemoveGroup={(b) => { void removeBundle(b); }}
                    />
                );
            })}
        </div>
    );
}

export default CartBundleGroupList;
