import { useEffect, useState } from 'react';
import { paymentApi } from '../../api/payment';
import type { SePayTransaction, SePayStats, PaymentConfig } from '../../api/payment';
import { toast } from 'react-hot-toast';
import { Loader2, DollarSign, Activity, FileText, Settings, Key, Hash, Building2, Save } from 'lucide-react';

export default function SePayAdminPage() {
    const [stats, setStats] = useState<SePayStats | null>(null);
    const [transactions, setTransactions] = useState<SePayTransaction[]>([]);
    const [configs, setConfigs] = useState<PaymentConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'transactions' | 'config'>('transactions');

    // Config form data
    const [formConfig, setFormConfig] = useState({
        apiKey: '',
        accountNumber: '',
        bankCode: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsData, txData, configData] = await Promise.all([
                paymentApi.getSePayStats(),
                paymentApi.getSePayTransactions(),
                paymentApi.getPaymentConfigs()
            ]);
            setStats(statsData);
            setTransactions(txData);
            setConfigs(configData);

            // Map configs to form
            const apiKey = configData.find(c => c.key === 'SePay:ApiKey')?.value || '';
            const accNum = configData.find(c => c.key === 'SePay:AccountNumber')?.value || '';
            const bank = configData.find(c => c.key === 'SePay:BankCode')?.value || '';
            setFormConfig({ apiKey, accountNumber: accNum, bankCode: bank });

        } catch (error) {
            console.error('Error loading SePay data:', error);
            toast.error('Không thể tải dữ liệu SePay');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await Promise.all([
                paymentApi.updatePaymentConfig({ key: 'SePay:ApiKey', value: formConfig.apiKey, isSecret: true, description: 'SePay API Key for Webhooks' }),
                paymentApi.updatePaymentConfig({ key: 'SePay:AccountNumber', value: formConfig.accountNumber, isSecret: false, description: 'Bank Account Number' }),
                paymentApi.updatePaymentConfig({ key: 'SePay:BankCode', value: formConfig.bankCode, isSecret: false, description: 'Bank Code (e.g. MB, VCB)' })
            ]);
            toast.success('Cập nhật cấu hình thành công!');
            loadData();
        } catch (error) {
            toast.error('Lỗi khi lưu cấu hình');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Quản lý thanh toán SePay</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${activeTab === 'transactions' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Activity className="w-4 h-4" /> Giao dịch
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${activeTab === 'config' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Settings className="w-4 h-4" /> Cấu hình
                    </button>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="text-slate-500 text-sm mb-1 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Tổng doanh thu</div>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.totalRevenue || 0)}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="text-slate-500 text-sm mb-1 flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" /> Doanh thu hôm nay</div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.todayRevenue || 0)}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="text-slate-500 text-sm mb-1 flex items-center gap-2"><FileText className="w-4 h-4" /> Tổng giao dịch</div>
                    <div className="text-2xl font-bold text-slate-900">{stats?.totalTransactions}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="text-slate-500 text-sm mb-1 flex items-center gap-2"><Activity className="w-4 h-4" /> Tỷ lệ thành công</div>
                    <div className="text-2xl font-bold text-blue-600">{stats?.successRate.toFixed(1)}%</div>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'transactions' ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="font-semibold text-slate-800">Lịch sử giao dịch gần đây</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3">ID</th>
                                    <th className="px-6 py-3">Thời gian</th>
                                    <th className="px-6 py-3">Số tiền</th>
                                    <th className="px-6 py-3">Nội dung</th>
                                    <th className="px-6 py-3">Đơn hàng</th>
                                    <th className="px-6 py-3">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="bg-white border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-mono text-slate-500">#{tx.id}</td>
                                        <td className="px-6 py-4">{new Date(tx.transactionDate).toLocaleString('vi-VN')}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{formatCurrency(tx.transferAmount)}</td>
                                        <td className="px-6 py-4 text-slate-600">{tx.content}</td>
                                        <td className="px-6 py-4 text-slate-600 font-mono">{tx.relatedOrderId ? tx.relatedOrderId.substring(0, 8).toUpperCase() : '-'}</td>
                                        <td className="px-6 py-4">
                                            {tx.isProcessed ? (
                                                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Thành công</span>
                                            ) : (
                                                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded" title={tx.processingError}>Thất bại</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chưa có giao dịch nào</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="font-semibold text-slate-800">Cấu hình kết nối SePay</h2>
                    </div>
                    <form onSubmit={handleSaveConfig} className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                    <Key className="w-4 h-4" /> SePay API Key
                                </label>
                                <input
                                    type="password"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    value={formConfig.apiKey}
                                    onChange={e => setFormConfig({ ...formConfig, apiKey: e.target.value })}
                                    placeholder="Nhập API Key từ SePay..."
                                />
                                <p className="text-xs text-slate-500 mt-1">Dùng để xác thực Webhook</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                        <Hash className="w-4 h-4" /> Số tài khoản
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={formConfig.accountNumber}
                                        onChange={e => setFormConfig({ ...formConfig, accountNumber: e.target.value })}
                                        placeholder="Ví dụ: 0352..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                        <Building2 className="w-4 h-4" /> Ngân hàng (Bank Code)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={formConfig.bankCode}
                                        onChange={e => setFormConfig({ ...formConfig, bankCode: e.target.value })}
                                        placeholder="Ví dụ: MB, VCB"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
                            >
                                <Save className="w-4 h-4" /> Lưu cấu hình
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
