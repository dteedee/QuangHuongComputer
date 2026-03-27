import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calculator, FileText, Download, Building2, Calendar, LayoutList } from 'lucide-react';
import { taxApi } from '../../../api/tax';
import { formatCurrency } from '../../../utils/format';
import toast from 'react-hot-toast';

export function TaxReportsPage() {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [vatType, setVatType] = useState<'in' | 'out'>('out');

    // 1. VAT Ledger
    const { data: vatLedger, isLoading: isLoadingLedger } = useQuery({
        queryKey: ['vat-ledger', month, year, vatType],
        queryFn: () => taxApi.getVatLedger(month, year, vatType),
    });

    // 2. VAT Declaration (Tờ khai TTGT/01)
    const currentQuarter = Math.ceil(month / 3);
    const { data: vatDeclaration, isLoading: isLoadingDeclaration } = useQuery({
        queryKey: ['vat-declaration', currentQuarter, year],
        queryFn: () => taxApi.getVatDeclaration(currentQuarter, year),
    });

    // 3. CIT Report (Thuế TNDN)
    const { data: citReport, isLoading: isLoadingCit } = useQuery({
        queryKey: ['cit-report', year],
        queryFn: () => taxApi.getCitReport(year),
    });

    const handleExport = () => {
        toast.success(`Đã xuất báo cáo thuế tháng ${month}/${year}`);
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight uppercase italic leading-none mb-3">
                        Báo Cáo <span className="text-accent">Thuế</span>
                    </h1>
                    <p className="text-gray-600 font-semibold text-sm">
                        Quản lý tờ khai GTGT, bảng kê hóa đơn và thuế TNDN (Chuẩn pháp luật VN)
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="px-4 py-2 border-2 border-gray-200 rounded-xl font-bold outline-none focus:border-accent"
                    >
                        {Array.from({ length: 12 }).map((_, i) => (
                            <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="w-24 px-4 py-2 border-2 border-gray-200 rounded-xl font-bold outline-none focus:border-accent"
                    />
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-3 px-6 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        <Download size={16} />
                        Xuất HTKK
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* VAT Declaration Form 01/GTGT */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="premium-card p-8 border-2 border-blue-100">
                    <h2 className="text-xl font-black text-blue-900 uppercase italic flex items-center gap-2 mb-6">
                        <FileText className="text-blue-600" />
                        Tờ Khai Thuế GTGT (Mẫu 01/GTGT)
                    </h2>
                    
                    {isLoadingDeclaration ? (
                        <div className="h-40 flex items-center justify-center"><div className="animate-spin w-8 h-8 flex-shrink-0 border-4 border-blue-200 border-t-blue-600 rounded-full"></div></div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase">Kỳ tính thuế</span>
                                    <p className="font-black text-gray-900">Quý {vatDeclaration?.quarter} Năm {vatDeclaration?.year}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Trạng thái</span>
                                    <p className="font-black text-emerald-600">Đã chốt</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                                    <span className="font-bold text-sm text-red-800">[26] HHDV bán ra chịu thuế</span>
                                    <span className="font-black text-red-700">{formatCurrency(vatDeclaration?.indicator26 || 0)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-red-100 rounded-lg border border-red-200">
                                    <span className="font-bold text-sm text-red-900">[28] Thuế GTGT đầu ra</span>
                                    <span className="font-black text-red-800">{formatCurrency(vatDeclaration?.indicator28 || 0)}</span>
                                </div>
                                <div className="h-px bg-gray-200 my-2"></div>
                                <div className="flex justify-between p-3 bg-emerald-50 rounded-lg">
                                    <span className="font-bold text-sm text-emerald-800">[23] Giá trị HHDV mua vào</span>
                                    <span className="font-black text-emerald-700">{formatCurrency(vatDeclaration?.indicator23 || 0)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-emerald-100 rounded-lg border border-emerald-200">
                                    <span className="font-bold text-sm text-emerald-900">[25] Thuế GTGT đầu vào được khấu trừ</span>
                                    <span className="font-black text-emerald-800">{formatCurrency(vatDeclaration?.indicator25 || 0)}</span>
                                </div>
                            </div>

                            <div className="mt-6 p-6 bg-blue-600 rounded-2xl text-white shadow-lg flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-black text-blue-200 uppercase tracking-widest">[40] Thuế GTGT phải nộp</span>
                                    <p className="text-3xl font-black mt-1">{formatCurrency(vatDeclaration?.indicator40 || 0)}</p>
                                </div>
                                <Calculator className="w-12 h-12 text-blue-400 opacity-50" />
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* CIT Report */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="premium-card p-8 border-2 border-purple-100">
                    <h2 className="text-xl font-black text-purple-900 uppercase italic flex items-center gap-2 mb-6">
                        <Building2 className="text-purple-600" />
                        Quyết Toán Thuế TNDN Tạm Tính
                    </h2>
                    
                    {isLoadingCit ? (
                        <div className="h-40 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full"></div></div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase">Năm Tài Chính</span>
                                    <p className="font-black text-gray-900">{citReport?.year}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Thuế suất</span>
                                    <p className="font-black text-purple-600">{citReport?.citRate}%</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center pb-3 border-b border-gray-100 text-sm">
                                    <span className="font-bold text-gray-600">Tổng doanh thu tính thuế</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(citReport?.totalRevenue || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-gray-100 text-sm">
                                    <span className="font-bold text-gray-600">Tổng chi phí được trừ</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(citReport?.deductibleExpenses || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-gray-100 text-sm">
                                    <span className="font-bold text-purple-700">Thu nhập tính thuế</span>
                                    <span className="font-black text-purple-800">{formatCurrency(citReport?.taxableIncome || 0)}</span>
                                </div>
                            </div>

                            <div className="mt-6 p-6 bg-purple-900 rounded-2xl text-white shadow-lg flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-black text-purple-300 uppercase tracking-widest">Thuế TNDN phải nộp</span>
                                    <p className="text-3xl font-black mt-1 text-purple-100">{formatCurrency(citReport?.citPayable || 0)}</p>
                                </div>
                                <Building2 className="w-12 h-12 text-purple-700 opacity-50" />
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* VAT Ledger Table */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="premium-card overflow-hidden border-2">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-900 uppercase italic flex items-center gap-2">
                        <LayoutList className="text-gray-400" />
                        Bảng Kê Hóa Đơn Chứng Từ
                    </h2>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setVatType('out')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${vatType === 'out' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Bán ra (Đầu ra)
                        </button>
                        <button
                            onClick={() => setVatType('in')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${vatType === 'in' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Mua vào (Đầu vào)
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-xs font-black text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Ký hiệu/Số HĐ</th>
                                <th className="px-6 py-4">Ngày HĐ</th>
                                <th className="px-6 py-4">Đối tác</th>
                                <th className="px-6 py-4 text-right">Doanh số (Chưa thuế)</th>
                                <th className="px-6 py-4 text-center">Thuế suất</th>
                                <th className="px-6 py-4 text-right">Thuế GTGT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoadingLedger ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-2"></div>
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : vatLedger?.records.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-bold">
                                        Không có hóa đơn trong kỳ này.
                                    </td>
                                </tr>
                            ) : (
                                vatLedger?.records.map((record: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{record.invoiceNo}</td>
                                        <td className="px-6 py-4 text-gray-600">{new Date(record.date).toLocaleDateString('vi-VN')}</td>
                                        <td className="px-6 py-4 text-gray-900">{record.buyer}</td>
                                        <td className="px-6 py-4 text-right font-medium">{formatCurrency(record.gross)}</td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-500">{record.taxRate}%</td>
                                        <td className="px-6 py-4 text-right font-black text-accent">{formatCurrency(record.taxAmount)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {!isLoadingLedger && vatLedger?.records.length > 0 && (
                            <tfoot className="bg-gray-50 font-black">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-right text-gray-600 uppercase">Tổng cộng</td>
                                    <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(vatLedger.totalGross)}</td>
                                    <td className="px-6 py-4"></td>
                                    <td className="px-6 py-4 text-right text-accent">{formatCurrency(vatLedger.totalTax)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </motion.div>
        </div>
    );
}

export default TaxReportsPage;
