/**
 * Convert dialog (Implementation Steps #5). The contract's `POST /convert`
 * (`docs/api-contracts/sales-quotations.md` §2) has no dry-run/preview —
 * it either converts or returns a flat error, so a real diff has to be
 * built here: fetch each line's CURRENT catalog price/stock and compare to
 * what was snapshotted on the quotation. Never sends a price either way —
 * the server always re-reads amounts from the quotation itself at commit.
 */
import { useEffect, useState } from 'react';
import { Dialog, Button, Input, Checkbox, notify, Skeleton } from '../../../components/ui';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { quotationsApi, type ConvertQuotationRequest, type QuotationDto } from '../../../api/sales/quotations';

interface LineDiff {
  productName: string;
  quotedPrice: number;
  currentPrice: number | null;
  quantity: number;
  currentStock: number | null;
}

export function QuotationConvertDialog({ open, onOpenChange, quotation, onConverted }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: QuotationDto;
  onConverted: (orderNumber: string) => void;
}) {
  const [isPickup, setIsPickup] = useState(true);
  const [recipientName, setRecipientName] = useState(quotation.customerName ?? '');
  const [phone, setPhone] = useState(quotation.customerPhone ?? '');
  const [streetAddress, setStreetAddress] = useState(quotation.buyerAddress ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [diffs, setDiffs] = useState<LineDiff[] | null>(null);
  const [diffFailed, setDiffFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDiffs(null); setDiffFailed(false);
    (async () => {
      try {
        const rows = await Promise.all(quotation.lines.map(async (l) => {
          try {
            const p = await catalogAdminApi.getProductForEdit(l.productId);
            return { productName: l.productName, quotedPrice: l.unitPrice, currentPrice: p.price, quantity: l.quantity, currentStock: p.stockQuantity };
          } catch {
            return { productName: l.productName, quotedPrice: l.unitPrice, currentPrice: null, quantity: l.quantity, currentStock: null };
          }
        }));
        setDiffs(rows);
      } catch {
        setDiffFailed(true);
      }
    })();
  }, [open, quotation.lines]);

  const submit = async () => {
    const body: ConvertQuotationRequest = {
      recipientName, phone, isPickup,
      streetAddress: isPickup ? null : streetAddress,
    };
    setSubmitting(true);
    try {
      const result = await quotationsApi.convert(quotation.id, body);
      if (!result.success) {
        notify.error('Không thể chuyển đơn', { description: result.errorMessage });
        return;
      }
      notify.success(`Đã tạo đơn ${result.orderNumber}`);
      onConverted(result.orderNumber as string);
    } catch (err) {
      const message = (err as { normalized?: { message?: string } })?.normalized?.message;
      notify.error('Không thể chuyển đơn', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Chuyển báo giá ${quotation.quotationNumber} thành đơn hàng`}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Giá của báo giá đã CHỐT lúc lập ({quotation.totalAmount.toLocaleString('vi-VN')}đ) — máy chủ
          luôn đọc lại đúng số này khi chuyển đơn, không bao giờ nhận giá từ trình duyệt. So sánh dưới
          đây cho biết giá NIÊM YẾT hiện tại và tồn kho đã đổi thế nào so với lúc lập, để cân nhắc trước khi chuyển.
        </p>

        {diffFailed ? (
          <p className="text-sm text-danger">Không so sánh được giá/tồn hiện tại — vẫn có thể chuyển đơn, giá dùng sẽ là giá đã chốt trên báo giá.</p>
        ) : !diffs ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="overflow-hidden rounded border border-line text-sm">
            <table className="w-full">
              <thead><tr className="border-b border-line bg-surface-subtle">
                <th className="p-2 text-left">Sản phẩm</th>
                <th className="p-2 text-right">Giá đã chốt</th>
                <th className="p-2 text-right">Giá niêm yết hiện tại</th>
                <th className="p-2 text-right">Tồn kho hiện tại</th>
              </tr></thead>
              <tbody>
                {diffs.map((d) => {
                  const priceChanged = d.currentPrice !== null && d.currentPrice !== d.quotedPrice;
                  const stockShort = d.currentStock !== null && d.currentStock < d.quantity;
                  return (
                    <tr key={d.productName} className="border-b border-line last:border-0">
                      <td className="p-2">{d.productName}</td>
                      <td className="p-2 text-right num">{d.quotedPrice.toLocaleString('vi-VN')}đ</td>
                      <td className={`p-2 text-right num ${priceChanged ? 'font-semibold text-warning' : ''}`}>
                        {d.currentPrice === null ? 'Không rõ' : `${d.currentPrice.toLocaleString('vi-VN')}đ${priceChanged ? ' (đã đổi)' : ''}`}
                      </td>
                      <td className={`p-2 text-right num ${stockShort ? 'font-semibold text-danger' : ''}`}>
                        {d.currentStock === null ? 'Không rõ' : `${d.currentStock}${stockShort ? ` (thiếu, cần ${d.quantity})` : ''}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Checkbox label="Khách tự đến lấy hàng (không giao)" checked={isPickup} onChange={(e) => setIsPickup(e.target.checked)} />
        <Input label="Người nhận" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
        <Input label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {!isPickup && <Input label="Địa chỉ giao hàng" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Huỷ</Button>
          <Button loading={submitting} onClick={() => void submit()}>Chuyển đơn</Button>
        </div>
      </div>
    </Dialog>
  );
}
