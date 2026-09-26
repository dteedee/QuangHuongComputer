import { Package, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, IconButton, Money, Table, TBody, Td, Th, THead, Tr } from '../../../components/ui';
import type { WorkOrderPart } from '../../../api/repair/types';

interface Props {
    parts: WorkOrderPart[];
    partsCost: number;
    editable: boolean;
    onAdd: () => void;
    onRemove: (partId: string) => void;
}

/** Parts used on the work order — from stock (reserved) or bought-in (cost shown, no stock movement). */
export function WorkOrderPartsCard({ parts, partsCost, editable, onAdd, onRemove }: Props) {
    return (
        <Card padded>
            <CardHeader className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2"><Package size={18} aria-hidden /> Linh kiện sử dụng</CardTitle>
                {editable && <Button size="sm" variant="outline" icon={Plus} onClick={onAdd}>Thêm linh kiện</Button>}
            </CardHeader>
            <CardBody>
                {parts.length === 0 ? <p className="text-13 text-fg-muted">Chưa có linh kiện nào.</p> : (
                    <div className="overflow-x-auto">
                        <Table>
                            <caption className="sr-only">Linh kiện của phiếu sửa</caption>
                            <THead><Tr><Th>Linh kiện</Th><Th align="right">SL</Th><Th align="right">Đơn giá</Th><Th align="right">Giá vốn</Th><Th align="right">Thành tiền</Th>{editable && <Th />}</Tr></THead>
                            <TBody>
                                {parts.map((p) => (
                                    <Tr key={p.id}>
                                        <Td>
                                            <span className="block text-13 text-fg">{p.partName}</span>
                                            <span className="flex flex-wrap gap-1 text-2xs text-fg-subtle">
                                                {p.partNumber && <span className="num">#{p.partNumber}</span>}
                                                {p.serialNumber && <span className="num">S/N {p.serialNumber}</span>}
                                                {p.isBoughtIn && <Badge variant="warning">Mua ngoài</Badge>}
                                            </span>
                                        </Td>
                                        <Td align="right" className="num">{p.quantity}</Td>
                                        <Td align="right" nowrap><Money value={p.unitPrice} /></Td>
                                        <Td align="right" nowrap><Money value={p.unitCost ?? null} /></Td>
                                        <Td align="right" nowrap><Money value={p.totalPrice} /></Td>
                                        {editable && (
                                            <Td align="right">
                                                <IconButton aria-label={`Xoá ${p.partName}`} size="sm" variant="ghost" onClick={() => onRemove(p.id)}><Trash2 size={15} /></IconButton>
                                            </Td>
                                        )}
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                )}
                {parts.length > 0 && (
                    <p className="mt-2 text-right text-13">Tổng linh kiện: <Money value={partsCost} className="font-semibold" /></p>
                )}
            </CardBody>
        </Card>
    );
}
