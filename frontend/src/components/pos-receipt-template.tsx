import { forwardRef } from 'react';
import { useCompanyInfo } from '../hooks/use-company-info';

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface ReceiptOrder {
  orderNumber: string;
  orderDate: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
}

interface PosReceiptTemplateProps {
  order: ReceiptOrder;
}

const PosReceiptTemplate = forwardRef<HTMLDivElement, PosReceiptTemplateProps>(
  ({ order }, ref) => {
    const { companyInfo } = useCompanyInfo();
    return (
      <div
        ref={ref}
        className="w-[80mm] mx-auto font-mono text-xs p-2 bg-white print:p-0"
        id="pos-receipt"
      >
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-sm font-bold">{companyInfo.name}</h1>
          <p>{companyInfo.address}</p>
          <p>ĐT: {companyInfo.phone2}</p>
          <p className="text-[10px]">MST: {companyInfo.taxCode}</p>
        </div>

        {/* Order Info */}
        <div className="border-t border-dashed border-black pt-2 mb-2">
          <p>Số HĐ: {order.orderNumber}</p>
          <p>Ngày: {new Date(order.orderDate).toLocaleString('vi-VN')}</p>
          {order.customerName && <p>KH: {order.customerName}</p>}
          {order.customerPhone && <p>SĐT: {order.customerPhone}</p>}
        </div>

        {/* Items */}
        <div className="border-t border-dashed border-black pt-2">
          {order.items.map((item, i) => (
            <div key={i} className="mb-1">
              <div className="truncate">{item.name}</div>
              <div className="flex justify-between">
                <span>
                  {item.quantity} x {item.unitPrice.toLocaleString('vi-VN')}
                </span>
                <span>{(item.quantity * item.unitPrice).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-dashed border-black pt-2 mt-2">
          <div className="flex justify-between">
            <span>Tạm tính:</span>
            <span>{order.subtotal.toLocaleString('vi-VN')}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span>Giảm giá:</span>
              <span>-{order.discount.toLocaleString('vi-VN')}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between">
              <span>Thuế (VAT):</span>
              <span>{order.tax.toLocaleString('vi-VN')}</span>
            </div>
          )}
          {order.shippingFee > 0 && (
            <div className="flex justify-between">
              <span>Phí ship:</span>
              <span>{order.shippingFee.toLocaleString('vi-VN')}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-dashed border-black pt-1 mt-1">
            <span>TỔNG CỘNG:</span>
            <span>{order.total.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Thanh toán:</span>
            <span>{order.paymentMethod}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-3 border-t border-dashed border-black pt-2">
          <p>Cảm ơn quý khách!</p>
          <p className="text-[10px]">Bảo hành theo chính sách nhà sản xuất</p>
        </div>
      </div>
    );
  }
);

PosReceiptTemplate.displayName = 'PosReceiptTemplate';
export default PosReceiptTemplate;
