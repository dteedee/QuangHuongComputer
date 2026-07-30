import { Navigate } from 'react-router-dom';

/**
 * Đã hợp nhất vào PromotionsPage. Giữ component redirect để không phá bookmark cũ.
 * Xem Phase 04 luồng D — bước 2.
 */
export default function FlashSalesPage() {
  return <Navigate to="/backoffice/promotions?type=FlashSale" replace />;
}
