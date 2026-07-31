import { useState } from 'react';
import { QrCode, Search, RefreshCw, Barcode } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AnimatedSection } from '../../../components/motion/animated-section';
import BarcodeScannerInput from '../../../components/barcode-scanner-input';
import SerialTraceTimeline from '../../../components/inventory/serial-trace-timeline';
import { serialTimelineApi } from '../../../api/inventory';
import type { SerialTimelineEvent } from '../../../api/inventory';

/**
 * Trang tra cứu vòng đời serial:
 * - Nhập tay hoặc quét mã vạch.
 * - Không lộ có tồn tại nếu không tìm thấy.
 */
export default function SerialTracePage() {
    const [serial, setSerial] = useState('');
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState<SerialTimelineEvent[] | null>(null);
    const [searchedSerial, setSearchedSerial] = useState<string>('');
    const [notFound, setNotFound] = useState(false);

    const lookup = async (input: string) => {
        const s = input.trim();
        if (!s) { toast.error('Nhập serial cần tra cứu'); return; }
        setLoading(true);
        setNotFound(false);
        setEvents(null);
        setSearchedSerial(s);
        try {
            const data = await serialTimelineApi.getTimeline(s);
            if (!data || !data.length) {
                setNotFound(true);
            } else {
                setEvents(data);
            }
        } catch (err) {
            // Cả 404 và lỗi khác đều xử lý như "không tìm thấy" để không lộ tồn tại
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 404) {
                setNotFound(true);
            } else {
                toast.error('Lỗi tra cứu serial');
                setNotFound(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-[1000px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-200">
                        <QrCode size={22} className="text-white" />
                    </div>
                    Tra cứu vòng đời serial
                </h1>
                <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                    Từ NCC nào, ngày nào, bán cho ai, bảo hành/sửa chữa bao nhiêu lần.
                </p>
            </div>

            <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Serial number</label>
                        <div className="relative">
                            <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={serial}
                                onChange={e => setSerial(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') void lookup(serial); }}
                                placeholder="Ví dụ: SN-2026-000123"
                                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => void lookup(serial)}
                        disabled={loading || !serial.trim()}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                        Tra cứu
                    </button>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Hoặc quét mã vạch</label>
                    <BarcodeScannerInput
                        onScan={(code) => { setSerial(code); void lookup(code); }}
                        placeholder="Đặt con trỏ vào ô này rồi quét..."
                        className="w-full"
                    />
                </div>
            </AnimatedSection>

            {events && (
                <AnimatedSection delay={0.05}>
                    <SerialTraceTimeline events={events} serial={searchedSerial} />
                </AnimatedSection>
            )}

            {notFound && !loading && (
                <AnimatedSection className="border border-dashed border-gray-300 rounded-xl bg-gray-50/50 p-10 text-center" delay={0.05}>
                    <QrCode size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">Không tìm thấy serial phù hợp.</p>
                </AnimatedSection>
            )}
        </div>
    );
}
