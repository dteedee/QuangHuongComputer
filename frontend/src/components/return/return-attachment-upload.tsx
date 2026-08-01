import { useRef, useState } from 'react';
import { Upload, X, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi } from '../../api/catalog';

/**
 * Upload ảnh minh chứng cho yêu cầu đổi/trả.
 * - Multi-file, tối đa `maxFiles` (default 5), mỗi file ≤ `maxSizeMB` (default 2).
 * - Chỉ chấp nhận image/*.
 * - Sử dụng lại endpoint `/catalog/media/upload` (Phase 03).
 * - Trả về mảng URL qua `onChange`.
 */

interface ReturnAttachmentUploadProps {
    value: string[];
    onChange: (urls: string[]) => void;
    maxFiles?: number;
    maxSizeMB?: number;
}

export const ReturnAttachmentUpload = ({
    value,
    onChange,
    maxFiles = 5,
    maxSizeMB = 2,
}: ReturnAttachmentUploadProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const validateAndUpload = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        if (value.length + fileArray.length > maxFiles) {
            toast.error(`Chỉ được tải tối đa ${maxFiles} ảnh`);
            return;
        }

        for (const file of fileArray) {
            if (!file.type.startsWith('image/')) {
                toast.error(`${file.name}: chỉ chấp nhận ảnh`);
                return;
            }
            if (file.size > maxSizeMB * 1024 * 1024) {
                toast.error(`${file.name}: dung lượng vượt ${maxSizeMB}MB`);
                return;
            }
        }

        try {
            setIsUploading(true);
            const uploaded: string[] = [];
            for (const file of fileArray) {
                const res = await catalogApi.uploadMedia(file);
                uploaded.push(res.url);
            }
            onChange([...value, ...uploaded]);
            toast.success(`Đã tải ${uploaded.length} ảnh`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Không tải được ảnh';
            toast.error(msg);
        } finally {
            setIsUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const handleRemove = (url: string) => {
        onChange(value.filter((u) => u !== url));
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            void validateAndUpload(e.dataTransfer.files);
        }
    };

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && validateAndUpload(e.target.files)}
            />

            {/* Drop zone */}
            {value.length < maxFiles && (
                <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        isDragging
                            ? 'border-accent bg-red-50/40'
                            : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                    }`}
                >
                    {isUploading ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent" />
                            Đang tải ảnh...
                        </div>
                    ) : (
                        <>
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                                Kéo thả ảnh hoặc bấm để chọn
                            </p>
                            <p className="text-xs text-gray-500">
                                Tối đa {maxFiles} ảnh — mỗi ảnh ≤ {maxSizeMB}MB
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Preview grid */}
            {value.length > 0 && (
                <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2">
                    {value.map((url) => (
                        <div
                            key={url}
                            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group"
                        >
                            <img
                                src={url}
                                alt="Ảnh minh chứng"
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemove(url)}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                aria-label="Xoá ảnh"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    {value.length < maxFiles && (
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="aspect-square rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-300 flex items-center justify-center cursor-pointer"
                            aria-label="Thêm ảnh"
                        >
                            <ImagePlus className="w-5 h-5" />
                        </button>
                    )}
                </div>
            )}

            <p className="text-xs text-gray-400 mt-2">
                {value.length}/{maxFiles} ảnh
            </p>
        </div>
    );
};

export default ReturnAttachmentUpload;
