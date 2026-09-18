import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import {
  Card, CardBody, CardHeader, CardTitle, Money, QueryBoundary, SkeletonText, Table, TBody, Td, Th, THead, Tr,
} from '../../../../components/ui';
import { catalogAdminApi } from '../../../../api/catalog/admin';
import { formatDateTime } from '../admin-formatting';

interface Props {
  productId: string;
}

const SOURCE_LABEL: Record<string, string> = {
  Manual: 'Sửa tay',
  Import: 'Nhập Excel',
  BulkPrice: 'Đổi giá hàng loạt',
};

/**
 * Tab "Lịch sử giá" (D10). Bảng `ProductPriceChanges` và hook ghi của nó đã
 * chạy thật, nhưng CHƯA có endpoint đọc (`GET /catalog/products/{id}/price-changes`
 * trả 404 khi đo trên :5050 ngày 2026-09-18) — đã gửi yêu cầu tích hợp. Cho
 * tới lúc đó màn hình hiện đúng lỗi thật, không bịa dữ liệu.
 */
export function ProductPriceHistorySection({ productId }: Props) {
  const query = useQuery({
    queryKey: ['catalog', 'price-history', productId],
    queryFn: () => catalogAdminApi.getPriceHistory(productId),
    retry: false,
  });

  return (
    <Card padded>
      <CardHeader>
        <CardTitle>Lịch sử giá</CardTitle>
      </CardHeader>
      <CardBody>
        <QueryBoundary
          query={query}
          inline
          errorTitle="Chưa đọc được lịch sử giá"
          skeleton={<SkeletonText lines={4} />}
          isEmpty={(rows) => rows.length === 0}
          empty={{
            icon: History,
            title: 'Chưa có thay đổi giá',
            description: 'Mỗi lần sửa giá bán hoặc giá vốn sẽ được ghi lại tại đây.',
          }}
        >
          {(rows) => (
            <Table>
              <THead>
                <Tr>
                  <Th>Thời điểm</Th>
                  <Th align="right">Giá bán cũ</Th>
                  <Th align="right">Giá bán mới</Th>
                  <Th align="right">Giá vốn mới</Th>
                  <Th>Nguồn</Th>
                </Tr>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td className="num whitespace-nowrap">{formatDateTime(row.at)}</Td>
                    <Td align="right"><Money value={row.oldPrice ?? null} /></Td>
                    <Td align="right"><Money value={row.newPrice ?? null} /></Td>
                    <Td align="right"><Money value={row.newCostPrice ?? null} /></Td>
                    <Td>{SOURCE_LABEL[row.source ?? ''] ?? row.source ?? '—'}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </QueryBoundary>
      </CardBody>
    </Card>
  );
}
