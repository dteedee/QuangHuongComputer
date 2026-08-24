import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { ConfigurationEntry, ConfigValueType } from '../../api/systemConfig';

const VALUE_TYPES: ConfigValueType[] = ['String', 'Number', 'Boolean', 'Json', 'Secret', 'Url', 'Email', 'Percentage'];
const KEY_PATTERN = /^[A-Z0-9_]+$/;

interface ConfigKeyEditorDialogProps {
    existingCategories: string[];
    nextSortOrder: number;
    onClose: () => void;
    onSubmit: (entry: ConfigurationEntry) => Promise<void>;
}

/** Dialog thêm 1 key cấu hình mới — gọi POST /config (upsert) rồi refetch ở component cha. */
export const ConfigKeyEditorDialog = ({ existingCategories, nextSortOrder, onClose, onSubmit }: ConfigKeyEditorDialogProps) => {
    const [key, setKey] = useState('');
    const [value, setValue] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(existingCategories[0] ?? '');
    const [module, setModule] = useState('Global');
    const [valueType, setValueType] = useState<ConfigValueType>('String');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!KEY_PATTERN.test(key)) {
            setError('Key chỉ được chứa chữ HOA, số và dấu gạch dưới (VD: COMPANY_NAME)');
            return;
        }
        if (!category.trim()) {
            setError('Danh mục không được để trống');
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            await onSubmit({
                key,
                value,
                description,
                category: category.trim(),
                module: module.trim() || 'Global',
                valueType,
                jsonValue: null,
                isSystem: false,
                sortOrder: nextSortOrder,
                lastUpdated: new Date().toISOString(),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-950 flex items-center gap-2">
                        <Plus size={18} className="text-accent" /> Thêm cấu hình mới
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Key *</label>
                        <input
                            value={key}
                            onChange={(e) => setKey(e.target.value.toUpperCase())}
                            placeholder="VD: COMPANY_NAME"
                            className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-mono focus:outline-none focus:border-accent"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Giá trị</label>
                        <input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-accent"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Mô tả</label>
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-accent"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Danh mục</label>
                            <input
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                list="config-category-options"
                                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-accent"
                            />
                            <datalist id="config-category-options">
                                {existingCategories.map((c) => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Module</label>
                            <input
                                value={module}
                                onChange={(e) => setModule(e.target.value)}
                                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-accent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Kiểu giá trị</label>
                        <select
                            value={valueType}
                            onChange={(e) => setValueType(e.target.value as ConfigValueType)}
                            className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-accent"
                        >
                            {VALUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="px-5 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50">
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !key || !value}
                        className="px-5 py-3 rounded-xl text-sm font-medium text-white bg-accent hover:bg-accent-hover disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Đang thêm...' : 'Thêm cấu hình'}
                    </button>
                </div>
            </div>
        </div>
    );
};
