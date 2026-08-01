interface StepReasonDescriptionProps {
    title: string;
    reasons: string[];
    reason: string;
    setReason: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
}

export const StepReasonDescription = ({
    title, reasons, reason, setReason, description, setDescription,
}: StepReasonDescriptionProps) => (
    <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
        <div className="space-y-2 mb-4">
            {reasons.map((r) => (
                <label
                    key={r}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        reason === r ? 'border-accent bg-red-50/40' : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                    <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-4 h-4 text-accent"
                    />
                    <span className="text-sm font-medium text-gray-700">{r}</span>
                </label>
            ))}
        </div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Mô tả chi tiết <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
        </label>
        <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Mô tả thêm giúp CSKH xử lý nhanh hơn..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none text-sm"
        />
    </div>
);

export default StepReasonDescription;
