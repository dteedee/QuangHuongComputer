/**
 * Save + share by code (contract §5, auth required). An unauthenticated
 * customer is told plainly to log in first — the old anonymous-save hole
 * W1-10 patched does not come back here.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link as LinkIcon } from 'lucide-react';
import { pcBuilderApi, type PcBuildItem } from '../../api/pcbuilder';
import { useAuth } from '../../context/AuthContext';
import { Button, Dialog, Input, notify } from '../ui';
import { paths, ROUTES } from '../../routes';

export interface PcSaveShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: PcBuildItem[];
}

export const PcSaveShareDialog = ({ open, onOpenChange, items }: PcSaveShareDialogProps) => {
    const { isAuthenticated } = useAuth();
    const [name, setName] = useState('Cấu hình của tôi');
    const [savedUrl, setSavedUrl] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: () => pcBuilderApi.saveBuild({ name: name.trim() || 'Cấu hình của tôi', items }),
        onSuccess: (data) => {
            const path = paths.storefront.pcBuilderDetail(data.buildCode);
            setSavedUrl(`${window.location.origin}${path}`);
        },
    });

    const copyLink = async () => {
        if (!savedUrl) return;
        try {
            await navigator.clipboard.writeText(savedUrl);
            notify.success('Đã sao chép liên kết');
        } catch {
            notify.error('Không sao chép được — vui lòng chọn và sao chép thủ công.');
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => { onOpenChange(v); if (!v) { setSavedUrl(null); mutation.reset(); } }}
            title="Lưu & chia sẻ cấu hình"
            size="sm"
            footer={
                savedUrl ? (
                    <Button variant="primary" onClick={() => onOpenChange(false)}>Xong</Button>
                ) : (
                    <Button
                        variant="primary"
                        loading={mutation.isPending}
                        disabled={!isAuthenticated || items.length === 0}
                        onClick={() => mutation.mutate()}
                    >
                        Lưu cấu hình
                    </Button>
                )
            }
        >
            {!isAuthenticated ? (
                <p className="text-sm text-fg-muted">
                    Vui lòng <a href={ROUTES.LOGIN} className="font-medium text-brand-text hover:underline">đăng nhập</a>{' '}
                    để lưu và chia sẻ cấu hình.
                </p>
            ) : savedUrl ? (
                <div className="space-y-3">
                    <p className="text-sm text-success">Đã lưu cấu hình thành công.</p>
                    <div className="flex items-center gap-2">
                        <Input readOnly value={savedUrl} className="flex-1" />
                        <Button variant="outline" icon={LinkIcon} onClick={copyLink}>Sao chép</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <Input
                        label="Tên cấu hình"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                    />
                    {mutation.isError && (
                        <p className="text-sm text-danger">Lưu thất bại. Vui lòng kiểm tra lại cấu hình và thử lại.</p>
                    )}
                </div>
            )}
        </Dialog>
    );
};

export default PcSaveShareDialog;
