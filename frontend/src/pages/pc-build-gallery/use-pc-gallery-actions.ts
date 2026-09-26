import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PcGalleryBuild } from '../../api/pcbuilder-gallery';
import type { PcSavedBuildItem, PcSlotId } from '../../api/pcbuilder';
import { useCart } from '../../context/CartContext';
import { sessionBrowserStorage } from '../../lib/browser-storage';
import { ROUTES } from '../../routes';
import { notify } from '../../components/ui';
import { PC_BUILD_SESSION_KEY, pcBuildStateFromSavedItems } from '../build-pc/pc-build-state-types';

/** Gallery item → hình dạng "build đã lưu" mà builder đã biết nạp (dùng lại đúng cơ chế của trang chia sẻ). */
export function toSavedItems(build: PcGalleryBuild): PcSavedBuildItem[] {
    return build.items.map((i) => ({
        productId: i.productId,
        slotId: i.slotId as PcSlotId | 'khac',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.unitPrice * i.quantity,
        product: i.isAvailable
            ? { name: i.name, sku: i.sku ?? '', slug: i.slug ?? '', imageUrl: i.imageUrl }
            : null,
    }));
}

/** "Mua cả bộ" + "Tùy chỉnh" cho một thẻ cấu hình mẫu. */
export function usePcGalleryActions() {
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const [buyingId, setBuyingId] = useState<string | null>(null);

    const buyAll = async (build: PcGalleryBuild) => {
        setBuyingId(build.id);
        let ok = 0;
        const failed: string[] = [];
        // Tuần tự để báo đúng từng linh kiện (cùng luật với trang cấu hình đã chia sẻ).
        for (const item of build.items) {
            if (!item.isAvailable) { failed.push(item.name); continue; }
            const success = await addToCart(
                { id: item.productId, name: item.name, price: item.unitPrice, stockQuantity: 9999 },
                item.quantity,
                { silent: true },
            );
            if (success) ok += 1; else failed.push(item.name);
        }
        setBuyingId(null);
        if (failed.length === 0) notify.success(`Đã thêm ${ok} linh kiện của "${build.title}" vào giỏ hàng`);
        else if (ok === 0) notify.error('Không thêm được linh kiện nào vào giỏ hàng.');
        else notify.error(`Đã thêm ${ok}/${build.items.length} linh kiện. Không thêm được: ${failed.join(', ')}.`);
    };

    const customize = (build: PcGalleryBuild) => {
        const state = pcBuildStateFromSavedItems(toSavedItems(build));
        if (Object.keys(state).length === 0) {
            notify.error('Không thể mở cấu hình này trong trình xây dựng.');
            return;
        }
        sessionBrowserStorage.setJSON(PC_BUILD_SESSION_KEY, state);
        navigate(ROUTES.PC_BUILDER);
    };

    return { buyAll, customize, buyingId };
}
