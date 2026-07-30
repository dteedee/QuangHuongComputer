import { Navigate } from 'react-router-dom';

/**
 * Đã hợp nhất vào PromotionsPage (Type=Code).
 * Giữ redirect để không phá URL cũ /backoffice/coupons.
 * Xem Phase 04 luồng D — bước 2.
 */
export function CouponsPage() {
  return <Navigate to="/backoffice/promotions?type=Code" replace />;
}

export default CouponsPage;
