/**
 * Action buttons of a transfer, gated by state AND permission (`allowedTransferActions`). Every
 * stock-moving action asks for confirmation first; "Nhận hàng" opens the count dialog. A 409 from
 * the server (someone else already acted) is shown as-is and the detail is reloaded.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    inventoryTransfersApi, type ReceiveTransferRequest, type TransferDetail,
} from '../../../../api/inventory-transfers';
import { Button, ConfirmDialog, buttonVariants, notify } from '../../../../components/ui';
import { usePermissions } from '../../../../hooks/usePermissions';
import { normalizeApiError } from '../../../../lib/api-error';
import {
    allowedTransferActions, transferActionConfirm, transferActionLabels, type TransferAction,
} from './transfer-status-meta';
import { TransferReceiveDialog } from './transfer-receive-dialog';
import { paths } from '../../../../routes';

type Pending = Exclude<TransferAction, 'receive'>;

export function TransferActions({ transfer }: { transfer: TransferDetail }) {
    const { hasPermission } = usePermissions();
    const queryClient = useQueryClient();
    const [confirming, setConfirming] = useState<Pending | null>(null);
    const [receiving, setReceiving] = useState(false);

    const mutation = useMutation({
        mutationFn: async ({ action, body }: { action: TransferAction; body?: ReceiveTransferRequest }) => {
            switch (action) {
                case 'approve': return inventoryTransfersApi.approve(transfer.id);
                case 'ship': return inventoryTransfersApi.ship(transfer.id);
                case 'receive': return inventoryTransfersApi.receive(transfer.id, body);
                case 'complete': return inventoryTransfersApi.complete(transfer.id);
                case 'cancel': return inventoryTransfersApi.cancel(transfer.id);
            }
        },
        onSuccess: (res) => {
            notify.success(res.message);
            setConfirming(null);
            setReceiving(false);
        },
        onError: (err) => notify.error(normalizeApiError(err).message),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] }),
    });

    const actions = allowedTransferActions(transfer.status, hasPermission);
    // One primary button per screen (§9.1): the next step of the normal flow.
    const primary = actions.find((a) => a !== 'cancel' && a !== 'complete');

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Link
                to={paths.backoffice.inventoryTransferPrint(transfer.id)}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
                <Printer className="h-4 w-4" aria-hidden /> In phiếu
            </Link>
            {actions.map((action) => (
                <Button
                    key={action}
                    size="sm"
                    variant={action === primary ? 'primary' : action === 'cancel' ? 'ghost' : 'outline'}
                    disabled={mutation.isPending}
                    onClick={() => (action === 'receive' ? setReceiving(true) : setConfirming(action))}
                >
                    {transferActionLabels[action]}
                </Button>
            ))}

            <ConfirmDialog
                open={confirming !== null}
                onOpenChange={(open) => { if (!open) setConfirming(null); }}
                title={confirming ? transferActionLabels[confirming] : ''}
                description={confirming ? transferActionConfirm[confirming] : undefined}
                confirmLabel={confirming ? transferActionLabels[confirming] : undefined}
                tone={confirming === 'cancel' ? 'danger' : 'primary'}
                loading={mutation.isPending}
                onConfirm={() => { if (confirming) mutation.mutate({ action: confirming }); }}
            />
            <TransferReceiveDialog
                open={receiving}
                onOpenChange={setReceiving}
                lines={transfer.items}
                submitting={mutation.isPending}
                onSubmit={(body) => mutation.mutate({ action: 'receive', body })}
            />
        </div>
    );
}
