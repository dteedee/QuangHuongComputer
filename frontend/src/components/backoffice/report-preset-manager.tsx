import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, BookmarkCheck, ChevronDown, Plus, Trash2, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    reportCustomizationApi,
    type ReportPreset,
    type SavePresetPayload,
} from '../../api/report-customization';

interface Props {
    reportCode: string;
    visibleColumns: string[];
    filterValues: Record<string, unknown>;
    onLoad: (preset: ReportPreset) => void;
}

export function ReportPresetManager({ reportCode, visibleColumns, filterValues, onLoad }: Props) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [isShared, setIsShared] = useState(false);
    const queryClient = useQueryClient();

    const { data: presets = [] } = useQuery({
        queryKey: ['report-presets', reportCode],
        queryFn: () => reportCustomizationApi.listPresets(reportCode),
        enabled: open,
    });

    const saveMutation = useMutation({
        mutationFn: (payload: SavePresetPayload) =>
            reportCustomizationApi.savePreset(reportCode, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['report-presets', reportCode] });
            setNewName('');
            setSaving(false);
            toast.success('Đã lưu preset');
        },
        onError: () => toast.error('Lỗi lưu preset'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => reportCustomizationApi.deletePreset(reportCode, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['report-presets', reportCode] });
            toast.success('Đã xóa preset');
        },
        onError: () => toast.error('Lỗi xóa preset'),
    });

    const handleSave = () => {
        if (!newName.trim()) return;
        saveMutation.mutate({
            name: newName.trim(),
            visibleColumns: JSON.stringify(visibleColumns),
            filterValues: JSON.stringify(filterValues),
            isDefault: false,
            isShared,
        });
    };

    const handleLoad = (preset: ReportPreset) => {
        onLoad(preset);
        setOpen(false);
        toast.success(`Đã áp dụng preset "${preset.name}"`);
    };

    const ownPresets = presets.filter(p => p.isOwn);
    const sharedPresets = presets.filter(p => p.isShared && !p.isOwn);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-all"
            >
                <Bookmark size={14} />
                Preset
                {ownPresets.length > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-1.5 rounded">
                        {ownPresets.length}
                    </span>
                )}
                <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-xl w-72 py-2">
                        {/* Save new preset */}
                        <div className="px-3 pb-3 border-b border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Lưu cấu hình hiện tại</p>
                            {saving ? (
                                <div className="space-y-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Tên preset..."
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-accent outline-none"
                                    />
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isShared}
                                                onChange={e => setIsShared(e.target.checked)}
                                                className="rounded"
                                            />
                                            <Share2 size={11} />
                                            Chia sẻ với nhóm
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSaving(false)}
                                                className="text-xs text-gray-400 hover:text-gray-600"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={!newName.trim() || saveMutation.isPending}
                                                className="text-xs bg-accent text-white px-3 py-1 rounded-lg disabled:opacity-50"
                                            >
                                                Lưu
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setSaving(true)}
                                    className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-accent hover:text-accent transition-all"
                                >
                                    <Plus size={12} />
                                    Lưu preset mới
                                </button>
                            )}
                        </div>

                        {/* Own presets */}
                        {ownPresets.length > 0 && (
                            <div className="px-3 pt-2">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Của tôi</p>
                                {ownPresets.map(preset => (
                                    <PresetRow
                                        key={preset.id}
                                        preset={preset}
                                        onLoad={() => handleLoad(preset)}
                                        onDelete={() => deleteMutation.mutate(preset.id)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Shared presets */}
                        {sharedPresets.length > 0 && (
                            <div className="px-3 pt-2 border-t border-gray-100">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Chia sẻ</p>
                                {sharedPresets.map(preset => (
                                    <PresetRow
                                        key={preset.id}
                                        preset={preset}
                                        onLoad={() => handleLoad(preset)}
                                        onDelete={undefined}
                                    />
                                ))}
                            </div>
                        )}

                        {presets.length === 0 && !saving && (
                            <p className="text-center text-xs text-gray-400 py-4">Chưa có preset nào</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function PresetRow({
    preset,
    onLoad,
    onDelete,
}: {
    preset: ReportPreset;
    onLoad: () => void;
    onDelete?: () => void;
}) {
    return (
        <div className="flex items-center gap-1 py-1 group">
            <button
                onClick={onLoad}
                className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
                {preset.isDefault
                    ? <BookmarkCheck size={13} className="text-accent flex-shrink-0" />
                    : <Bookmark size={13} className="text-gray-300 flex-shrink-0" />
                }
                <span className="text-sm text-gray-700 truncate">{preset.name}</span>
                {preset.isShared && (
                    <Share2 size={11} className="text-blue-400 flex-shrink-0" />
                )}
            </button>
            {onDelete && (
                <button
                    onClick={onDelete}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                >
                    <Trash2 size={13} />
                </button>
            )}
        </div>
    );
}
