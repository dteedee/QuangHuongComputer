import { Camera, MessageSquare, Plus } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';
import type { ActivityLog } from '../../../api/repair/types';
import { RepairPhotoGrid } from './intake/repair-photo-grid';

interface Props {
    logs: ActivityLog[];
    onAddNote: () => void;
    onAddPhotos?: () => void;
}

/** Activity log incl. before/after photo entries. */
export function WorkOrderActivityCard({ logs, onAddNote, onAddPhotos }: Props) {
    return (
        <Card padded>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2"><MessageSquare size={18} aria-hidden /> Lịch sử hoạt động</CardTitle>
                <div className="flex gap-2">
                    {onAddPhotos && <Button size="sm" variant="outline" icon={Camera} onClick={onAddPhotos}>Ảnh trước/sau</Button>}
                    <Button size="sm" variant="outline" icon={Plus} onClick={onAddNote}>Thêm ghi chú</Button>
                </div>
            </CardHeader>
            <CardBody>
                <ol className="max-h-[32rem] space-y-3 overflow-y-auto">
                    {logs.map((log) => (
                        <li key={log.id} className="rounded-lg border border-line p-3">
                            <p className="flex flex-wrap items-center gap-2 text-13 font-medium text-fg">
                                {log.activity}
                                {log.photoStage && <Badge variant="info">{log.photoStage === 'Before' ? 'Trước khi sửa' : 'Sau khi sửa'}</Badge>}
                            </p>
                            {log.description && <p className="mt-1 whitespace-pre-line text-13 text-fg-muted">{log.description}</p>}
                            {(log.photoUrls?.length ?? 0) > 0 && <div className="mt-2"><RepairPhotoGrid urls={log.photoUrls!} alt={log.activity} /></div>}
                            <p className="mt-1 text-2xs text-fg-subtle">
                                {log.performedByName || 'Hệ thống'} · {new Date(log.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                            </p>
                        </li>
                    ))}
                </ol>
            </CardBody>
        </Card>
    );
}
