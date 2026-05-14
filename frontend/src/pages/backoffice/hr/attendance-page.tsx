import { useState, useEffect } from 'react';
import { checkIn, checkOut, getAttendanceToday, getMyAttendanceReport } from '../../../api/hr';

const STATUS_COLORS: Record<string, string> = {
    Present: 'bg-green-200 text-green-800',
    Late: 'bg-yellow-200 text-yellow-800',
    Absent: 'bg-red-200 text-red-800',
    Holiday: 'bg-blue-200 text-blue-800',
    OnLeave: 'bg-purple-200 text-purple-800',
};

const STATUS_LABELS: Record<string, string> = {
    Present: 'Có mặt',
    Late: 'Đi trễ',
    Absent: 'Vắng',
    Holiday: 'Ngày lễ',
    OnLeave: 'Nghỉ phép',
};

export default function AttendancePage() {
    const [today, setToday] = useState<any>(null);
    const [report, setReport] = useState<any[]>([]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getAttendanceToday().then(setToday).catch(() => {});
    }, []);

    useEffect(() => {
        getMyAttendanceReport(month)
            .then(data => setReport(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, [month]);

    const handleCheckIn = async () => {
        setLoading(true);
        try {
            const data = await checkIn();
            setToday(data);
        } catch (e: any) {
            alert(e.response?.data?.error || 'Lỗi check-in');
        }
        setLoading(false);
    };

    const handleCheckOut = async () => {
        setLoading(true);
        try {
            const data = await checkOut();
            setToday(data);
        } catch (e: any) {
            alert(e.response?.data?.error || 'Lỗi check-out');
        }
        setLoading(false);
    };

    const summary = report.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Chấm Công</h1>

            {/* Today Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold mb-4">
                    Hôm nay — {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
                <div className="flex flex-wrap gap-4 items-center">
                    <button
                        onClick={handleCheckIn}
                        disabled={loading || !!today?.checkInTime}
                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        ✅ Check In
                    </button>
                    <button
                        onClick={handleCheckOut}
                        disabled={loading || !today?.checkInTime || !!today?.checkOutTime}
                        className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        🔴 Check Out
                    </button>
                    {today?.checkInTime && (
                        <span className="text-sm text-gray-600 bg-green-50 px-3 py-2 rounded-lg">
                            Check-in: {new Date(today.checkInTime).toLocaleTimeString('vi-VN')}
                        </span>
                    )}
                    {today?.checkOutTime && (
                        <span className="text-sm text-gray-600 bg-red-50 px-3 py-2 rounded-lg">
                            Check-out: {new Date(today.checkOutTime).toLocaleTimeString('vi-VN')}
                            {today.workHours != null && ` | ${Number(today.workHours).toFixed(1)}h`}
                        </span>
                    )}
                    {!today?.checkInTime && (
                        <span className="text-sm text-gray-400">Chưa check-in hôm nay</span>
                    )}
                </div>
            </div>

            {/* Summary Stats */}
            {report.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { key: 'Present', label: 'Có mặt', color: 'text-green-600 bg-green-50' },
                        { key: 'Late', label: 'Đi trễ', color: 'text-yellow-600 bg-yellow-50' },
                        { key: 'Absent', label: 'Vắng mặt', color: 'text-red-600 bg-red-50' },
                        { key: 'Holiday', label: 'Ngày lễ', color: 'text-blue-600 bg-blue-50' },
                        { key: 'OnLeave', label: 'Nghỉ phép', color: 'text-purple-600 bg-purple-50' },
                    ].map(s => (
                        <div key={s.key} className={`rounded-xl p-4 text-center ${s.color}`}>
                            <p className="text-2xl font-bold">{summary[s.key] || 0}</p>
                            <p className="text-xs font-medium mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Monthly Calendar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">Báo cáo tháng</h2>
                    <input
                        type="month"
                        value={month}
                        onChange={e => setMonth(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {report.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">Không có dữ liệu cho tháng này</p>
                ) : (
                    <div className="grid grid-cols-7 gap-1">
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
                        ))}
                        {report.map((r: any, i: number) => (
                            <div
                                key={i}
                                className={`text-center text-xs py-2 rounded-lg font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}
                                title={STATUS_LABELS[r.status] || r.status}
                            >
                                {new Date(r.date).getDate()}
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <span key={key} className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[key]}`}>{label}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}
