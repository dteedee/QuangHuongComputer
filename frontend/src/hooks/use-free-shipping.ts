import { useSystemConfig } from '../context/SystemConfigContext';

export interface FreeShippingState {
    /** Ngưỡng miễn phí ship đang áp dụng (VNĐ). */
    threshold: number;
    /** Đã đạt ngưỡng ⇒ phí ship chắc chắn bằng 0. */
    reached: boolean;
    /** Còn thiếu bao nhiêu để đạt ngưỡng (0 khi đã đạt). */
    remaining: number;
    /** % tiến độ, chặn ở 100. */
    progress: number;
}

/**
 * NGUỒN DUY NHẤT phía web cho chính sách miễn phí vận chuyển.
 *
 * Ngưỡng đọc từ config public `FREESHIP_THRESHOLD` — cùng khoá mà server dùng trong
 * `ShippingFeePolicy`, nên thanh tiến độ ở giỏ hàng và số tiền thu ở bước thanh toán không thể
 * lệch nhau. Chính sách phía server chỉ phụ thuộc tiền hàng sau giảm (không phụ thuộc địa chỉ),
 * vì vậy khi `reached` là true thì giỏ hàng được phép nói thẳng "Miễn phí" thay vì hoãn sang
 * bước thanh toán.
 *
 * @param amount Tiền hàng sau giảm giá dùng để tính tiến độ.
 * @param threshold Ghi đè ngưỡng (hiếm dùng — chỉ cho màn hình cần mô phỏng).
 */
export function useFreeShipping(amount: number, threshold?: number): FreeShippingState {
    const { getNumber } = useSystemConfig();
    const effectiveThreshold = threshold ?? getNumber('FREESHIP_THRESHOLD', 500000);
    const safeAmount = Math.max(0, amount);
    const progress = effectiveThreshold > 0
        ? Math.min((safeAmount / effectiveThreshold) * 100, 100)
        : 100;

    return {
        threshold: effectiveThreshold,
        reached: safeAmount >= effectiveThreshold,
        remaining: Math.max(0, effectiveThreshold - safeAmount),
        progress,
    };
}
