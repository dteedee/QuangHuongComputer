/**
 * Biểu đồ của trang báo cáo tài chính. Tách riêng để trang chính dưới 200 dòng
 * và để việc đăng ký Chart.js chỉ xảy ra một lần, ở đúng một chỗ.
 * Màu lấy từ token ngữ nghĩa qua biến CSS nên dark mode tự đúng.
 */
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);

/** Reads a semantic token so the chart follows the theme (no hard-coded hex). */
const token = (name: string, alpha = 1): string => {
    if (typeof window === 'undefined') return `rgb(0 0 0 / ${alpha})`;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return raw ? `rgb(${raw} / ${alpha})` : `rgb(0 0 0 / ${alpha})`;
};

const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const } },
    scales: { y: { beginAtZero: true } },
};

export const RevenueExpenseChart = ({ rows }: { rows: { month: string; revenue: number; expense: number }[] }) => (
    <div className="h-64">
        <Bar
            options={baseOptions}
            data={{
                labels: rows.map((r) => r.month),
                datasets: [
                    { label: 'Doanh thu', data: rows.map((r) => r.revenue), backgroundColor: token('--success', 0.8), borderRadius: 6 },
                    { label: 'Chi phí', data: rows.map((r) => r.expense), backgroundColor: token('--danger', 0.8), borderRadius: 6 },
                ],
            }}
        />
    </div>
);

export const CashFlowChart = ({ inflows, outflows }: {
    inflows: { month: string; amount: number }[];
    outflows: { month: string; amount: number }[];
}) => {
    const labels = Array.from(new Set([...inflows.map((i) => i.month), ...outflows.map((o) => o.month)]));
    const pick = (rows: { month: string; amount: number }[]) => labels.map((l) => rows.find((r) => r.month === l)?.amount ?? 0);
    return (
        <div className="h-64">
            <Line
                options={baseOptions}
                data={{
                    labels,
                    datasets: [
                        { label: 'Thu vào', data: pick(inflows), borderColor: token('--success'), backgroundColor: token('--success', 0.1), fill: true, tension: 0.4 },
                        { label: 'Chi ra', data: pick(outflows), borderColor: token('--danger'), backgroundColor: token('--danger', 0.1), fill: true, tension: 0.4 },
                    ],
                }}
            />
        </div>
    );
};
