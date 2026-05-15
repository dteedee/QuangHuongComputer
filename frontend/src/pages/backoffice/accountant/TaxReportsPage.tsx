import React, { useState } from 'react';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calculator, FileText, Download, Building2, LayoutList, Users } from 'lucide-react';
import { taxApi, getVatDeclaration, exportTaxReport } from '../../../api/tax';
import { taxReportsApi } from '../../../api/tax-reports';
import { formatCurrency } from '../../../utils/format';
import toast from 'react-hot-toast';

type MainTab = 'existing' | 'tt133';
type TT133Tab = 'b01' | 'b02' | 'b09' | 'vat' | 'pit';

export function TaxReportsPage() {
    const [mainTab, setMainTab] = useState<MainTab>('existing');
    const [tt133Tab, setTT133Tab] = useState<TT133Tab>('b01');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [vatType, setVatType] = useState<'in' | 'out'>('out');
    const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('monthly');

    // period string for new API: "YYYY-MM"
    const period = `${year}-${String(month).padStart(2, '0')}`;

    // 1. VAT Ledger
    const { data: vatLedger, isLoading: isLoadingLedger } = useQuery({
        queryKey: ['vat-ledger', month, year, vatType],
        queryFn: () => taxApi.getVatLedger(month, year, vatType),
    });

    // 2. VAT Declaration — uses new standalone fn with period/type params
    const { data: vatDeclaration, isLoading: isLoadingDeclaration } = useQuery({
        queryKey: ['vat-declaration-v2', period, periodType],
        queryFn: () => getVatDeclaration(period, periodType),
    });

    // 3. CIT Report (Thuế TNDN)
    const { data: citReport, isLoading: isLoadingCit } = useQuery({
        queryKey: ['cit-report', year],
        queryFn: () => taxApi.getCitReport(year),
    });

    // TT133 queries
    const { data: balanceSheet, isLoading: isLoadingBS } = useQuery({
        queryKey: ['tt133-balance-sheet', year],
        queryFn: () => taxReportsApi.getBalanceSheet(year),
        enabled: mainTab === 'tt133' && tt133Tab === 'b01',
    });
    const { data: incomeStatement, isLoading: isLoadingIS } = useQuery({
        queryKey: ['tt133-income-statement', year, month],
        queryFn: () => taxReportsApi.getIncomeStatement(year, undefined, month),
        enabled: mainTab === 'tt133' && tt133Tab === 'b02',
    });
    const { data: financialNotes, isLoading: isLoadingNotes } = useQuery({
        queryKey: ['tt133-financial-notes', year],
        queryFn: () => taxReportsApi.getFinancialNotes(year),
        enabled: mainTab === 'tt133' && tt133Tab === 'b09',
    });
    const { data: vatTT133, isLoading: isLoadingVatTT133 } = useQuery({
        queryKey: ['tt133-vat', month, year],
        queryFn: () => taxReportsApi.getVatDeclarationTT133(month, year),
        enabled: mainTab === 'tt133' && tt133Tab === 'vat',
    });
    const { data: pitSettlement, isLoading: isLoadingPIT } = useQuery({
        queryKey: ['tt133-pit', year],
        queryFn: () => taxReportsApi.getPitSettlement(year),
        enabled: mainTab === 'tt133' && tt133Tab === 'pit',
    });

    const handleExportPdf = async (type: 'balance-sheet' | 'income-statement') => {
        try {
            const blob = type === 'balance-sheet'
                ? await taxReportsApi.exportBalanceSheetPdf(year)
                : await taxReportsApi.exportIncomeStatementPdf(year, undefined, month);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-${year}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Đã xuất PDF thành công');
        } catch {
            toast.error('Không thể xuất PDF. Vui lòng thử lại.');
        }
    };

    const handleExport = async () => {
        try {
            const blob = await exportTaxReport(period, periodType);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `bao-cao-thue-${period}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success(`Đã xuất báo cáo thuế ${period}`);
        } catch {
            toast.error('Không thể xuất báo cáo. Vui lòng thử lại.');
        }
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">

                <div>
                    <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight  leading-none mb-3">
                        Báo Cáo <span className="text-accent">Thuế</span>
                    </h1>
                    <p className="text-gray-600 font-semibold text-sm">
                        Quản lý tờ khai GTGT, bảng kê hóa đơn và thuế TNDN (Chuẩn pháp luật VN)
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setPeriodType('monthly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${periodType === 'monthly' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Theo tháng
                        </button>
                        <button
                            onClick={() => setPeriodType('quarterly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${periodType === 'quarterly' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Theo quý
                        </button>
                    </div>
                    <SearchableSelect
                        value={month}
                        onChange={(val) => setMonth(Number(val))}
                        options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))}
                        placeholder="Chọn tháng"
                    />
                    <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="w-24 px-4 py-2 border-2 border-gray-200 rounded-xl font-bold outline-none focus:border-accent"
                    />
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-3 px-6 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        <Download size={16} />
                        Xuất Excel
                    </button>
                </div>
            </div>

            {/* Main Tab Bar */}
            <div className="flex gap-1 border-b-2 border-gray-200">
                {([['existing', 'Khai thuế & Sổ kê'], ['tt133', 'TT133 — BCTC']] as [MainTab, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setMainTab(key)}
                        className={`px-5 py-2.5 text-sm font-bold rounded-t-lg border-b-2 -mb-0.5 transition-colors ${mainTab === key ? 'border-accent text-accent bg-accent/5' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {mainTab === 'tt133' && (
                <TT133Section
                    tab={tt133Tab} setTab={setTT133Tab}
                    month={month} year={year}
                    balanceSheet={balanceSheet} isLoadingBS={isLoadingBS}
                    incomeStatement={incomeStatement} isLoadingIS={isLoadingIS}
                    financialNotes={financialNotes} isLoadingNotes={isLoadingNotes}
                    vatTT133={vatTT133} isLoadingVatTT133={isLoadingVatTT133}
                    pitSettlement={pitSettlement} isLoadingPIT={isLoadingPIT}
                    onExportPdf={handleExportPdf}
                />
            )}

            {mainTab === 'existing' && <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* VAT Declaration Form 01/GTGT */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="premium-card p-8 border-2 border-blue-100">
                    <h2 className="text-xl font-semibold text-blue-900  flex items-center gap-2 mb-6">
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
                                    <p className="font-semibold text-gray-900">
                                        {periodType === 'quarterly'
                                            ? `Quý ${vatDeclaration?.quarter || Math.ceil(month / 3)} Năm ${year}`
                                            : `Tháng ${month}/${year}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Trạng thái</span>
                                    <p className="font-semibold text-emerald-600">Đã chốt</p>
                                </div>
                            </div>

                            {/* VAT Summary Cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-green-50 p-3 rounded-xl text-center">
                                    <p className="text-xs text-gray-600 font-semibold mb-1">Thuế đầu ra</p>
                                    <p className="text-lg font-semibold text-green-700">{formatCurrency(vatDeclaration?.outputVat?.vatAmount ?? vatDeclaration?.indicator28 ?? 0)}</p>
                                    {vatDeclaration?.outputVat?.invoiceCount != null && (
                                        <p className="text-xs text-gray-500">{vatDeclaration.outputVat.invoiceCount} hóa đơn</p>
                                    )}
                                </div>
                                <div className="bg-orange-50 p-3 rounded-xl text-center">
                                    <p className="text-xs text-gray-600 font-semibold mb-1">Thuế đầu vào</p>
                                    <p className="text-lg font-semibold text-orange-600">{formatCurrency(vatDeclaration?.inputVat?.vatAmount ?? vatDeclaration?.indicator25 ?? 0)}</p>
                                    {vatDeclaration?.inputVat?.invoiceCount != null && (
                                        <p className="text-xs text-gray-500">{vatDeclaration.inputVat.invoiceCount} hóa đơn</p>
                                    )}
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl text-center">
                                    <p className="text-xs text-gray-600 font-semibold mb-1">Phải nộp</p>
                                    <p className="text-lg font-semibold text-blue-700">{formatCurrency(vatDeclaration?.vatPayable ?? vatDeclaration?.indicator40 ?? 0)}</p>
                                    {vatDeclaration?.vatRefundable > 0 && (
                                        <p className="text-xs text-red-500">Hoàn: {formatCurrency(vatDeclaration.vatRefundable)}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                                    <span className="font-bold text-sm text-red-800">[26] HHDV bán ra chịu thuế</span>
                                    <span className="font-semibold text-red-700">{formatCurrency(vatDeclaration?.indicator26 ?? vatDeclaration?.outputVat?.taxableAmount ?? 0)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-red-100 rounded-lg border border-red-200">
                                    <span className="font-bold text-sm text-red-900">[28] Thuế GTGT đầu ra</span>
                                    <span className="font-semibold text-red-800">{formatCurrency(vatDeclaration?.indicator28 ?? vatDeclaration?.outputVat?.vatAmount ?? 0)}</span>
                                </div>
                                <div className="h-px bg-gray-200 my-2"></div>
                                <div className="flex justify-between p-3 bg-emerald-50 rounded-lg">
                                    <span className="font-bold text-sm text-emerald-800">[23] Giá trị HHDV mua vào</span>
                                    <span className="font-semibold text-emerald-700">{formatCurrency(vatDeclaration?.indicator23 ?? vatDeclaration?.inputVat?.taxableAmount ?? 0)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-emerald-100 rounded-lg border border-emerald-200">
                                    <span className="font-bold text-sm text-emerald-900">[25] Thuế GTGT đầu vào được khấu trừ</span>
                                    <span className="font-semibold text-emerald-800">{formatCurrency(vatDeclaration?.indicator25 ?? vatDeclaration?.inputVat?.vatAmount ?? 0)}</span>
                                </div>
                            </div>

                            <div className="mt-6 p-6 bg-blue-600 rounded-xl text-white shadow-lg flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold text-blue-200 uppercase">[40] Thuế GTGT phải nộp</span>
                                    <p className="text-3xl font-semibold mt-1">{formatCurrency(vatDeclaration?.indicator40 ?? vatDeclaration?.vatPayable ?? 0)}</p>
                                </div>
                                <Calculator className="w-12 h-12 text-blue-400 opacity-50" />
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* CIT Report */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="premium-card p-8 border-2 border-purple-100">
                    <h2 className="text-xl font-semibold text-purple-900  flex items-center gap-2 mb-6">
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
                                    <p className="font-semibold text-gray-900">{citReport?.year}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Thuế suất</span>
                                    <p className="font-semibold text-purple-600">{citReport?.citRate}%</p>
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
                                    <span className="font-semibold text-purple-800">{formatCurrency(citReport?.taxableIncome || 0)}</span>
                                </div>
                            </div>

                            <div className="mt-6 p-6 bg-purple-900 rounded-xl text-white shadow-lg flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold text-purple-300 uppercase">Thuế TNDN phải nộp</span>
                                    <p className="text-3xl font-semibold mt-1 text-purple-100">{formatCurrency(citReport?.citPayable || 0)}</p>
                                </div>
                                <Building2 className="w-12 h-12 text-purple-700 opacity-50" />
                            </div>
                        </div>
                    )}
                </motion.div>

            {/* VAT Ledger Table */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="premium-card overflow-hidden border-2">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900  flex items-center gap-2">
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
                        <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                                        <td className="px-6 py-4 text-right font-semibold text-accent">{formatCurrency(record.taxAmount)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {!isLoadingLedger && vatLedger?.records.length > 0 && (
                            <tfoot className="bg-gray-50 font-semibold">
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
            </div>}
        </div>
    );
}

// ============================================
// TT133 SECTION COMPONENT
// ============================================

const TT133_TABS: { key: TT133Tab; label: string }[] = [
    { key: 'b01', label: 'B01-BCTC' },
    { key: 'b02', label: 'B02-KQKD' },
    { key: 'b09', label: 'B09-TMBC' },
    { key: 'vat', label: 'VAT-TT133' },
    { key: 'pit', label: 'PIT-TT133' },
];

function LoadingSpinner() {
    return <div className="h-40 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-accent rounded-full"></div></div>;
}

function ReportRow({ label, code, value, bold }: { label: string; code?: string; value: string; bold?: boolean }) {
    return (
        <div className={`flex justify-between items-center py-2.5 px-3 rounded-lg ${bold ? 'bg-accent/5 font-semibold' : 'hover:bg-gray-50'}`}>
            <div className="flex gap-3 items-center">
                {code && <span className="text-xs font-mono text-gray-400 w-8">{code}</span>}
                <span className={`text-sm ${bold ? 'text-gray-900' : 'text-gray-700'}`}>{label}</span>
            </div>
            <span className={`text-sm font-bold ${bold ? 'text-accent' : 'text-gray-900'}`}>{value}</span>
        </div>
    );
}

interface TT133SectionProps {
    tab: TT133Tab; setTab: (t: TT133Tab) => void;
    month: number; year: number;
    balanceSheet: any; isLoadingBS: boolean;
    incomeStatement: any; isLoadingIS: boolean;
    financialNotes: any; isLoadingNotes: boolean;
    vatTT133: any; isLoadingVatTT133: boolean;
    pitSettlement: any; isLoadingPIT: boolean;
    onExportPdf: (type: 'balance-sheet' | 'income-statement') => void;
}

function TT133Section({ tab, setTab, month, year, balanceSheet, isLoadingBS, incomeStatement, isLoadingIS, financialNotes, isLoadingNotes, vatTT133, isLoadingVatTT133, pitSettlement, isLoadingPIT, onExportPdf }: TT133SectionProps) {
    return (
        <div className="space-y-6">
            {/* TT133 Tab Bar */}
            <div className="flex gap-1 flex-wrap">
                {TT133_TABS.map(({ key, label }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`px-4 py-2 text-xs font-medium rounded-lg border-2 transition-colors ${tab === key ? 'border-accent bg-accent text-white' : 'border-gray-200 text-gray-600 hover:border-accent hover:text-accent'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* B01: Balance Sheet */}
            {tab === 'b01' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-8 border-2 border-emerald-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-emerald-900 ">B01-DNN — Báo Cáo Tình Hình Tài Chính</h2>
                        <button onClick={() => onExportPdf('balance-sheet')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">
                            <Download size={14} /> PDF
                        </button>
                    </div>
                    {isLoadingBS ? <LoadingSpinner /> : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">I. Tài Sản</p>
                                <div className="space-y-1">
                                    <ReportRow label="Tiền và tương đương tiền" code="110" value={formatCurrency(balanceSheet?.assets?.shortTerm?.cash ?? 0)} />
                                    <ReportRow label="Phải thu ngắn hạn" code="130" value={formatCurrency(balanceSheet?.assets?.shortTerm?.accountsReceivable ?? 0)} />
                                    <ReportRow label="Hàng tồn kho" code="140" value={formatCurrency(balanceSheet?.assets?.shortTerm?.inventory ?? 0)} />
                                    <ReportRow label="TỔNG CỘNG TÀI SẢN" code="270" value={formatCurrency(balanceSheet?.assets?.total ?? 0)} bold />
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">II. Nguồn Vốn</p>
                                <div className="space-y-1">
                                    <ReportRow label="Phải trả người bán" code="311" value={formatCurrency(balanceSheet?.liabilities?.accountsPayable ?? 0)} />
                                    <ReportRow label="Chi phí phải trả" code="315" value={formatCurrency(balanceSheet?.liabilities?.pendingExpenses ?? 0)} />
                                    <ReportRow label="Tổng Nợ Phải Trả" code="300" value={formatCurrency(balanceSheet?.liabilities?.total ?? 0)} bold />
                                    <ReportRow label="Vốn Chủ Sở Hữu" code="400" value={formatCurrency(balanceSheet?.equity?.total ?? 0)} />
                                    <ReportRow label="TỔNG NGUỒN VỐN" code="440" value={formatCurrency(balanceSheet?.totalLiabilitiesAndEquity ?? 0)} bold />
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* B02: Income Statement */}
            {tab === 'b02' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-8 border-2 border-blue-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-blue-900 ">B02-DNN — Kết Quả HĐKD — {month}/{year}</h2>
                        <button onClick={() => onExportPdf('income-statement')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">
                            <Download size={14} /> PDF
                        </button>
                    </div>
                    {isLoadingIS ? <LoadingSpinner /> : (
                        <div className="space-y-1 max-w-lg">
                            <ReportRow label="Doanh thu bán hàng" code="01" value={formatCurrency(incomeStatement?.revenue?.goodsAndServices ?? 0)} />
                            <ReportRow label="Giá vốn hàng bán" code="11" value={formatCurrency(incomeStatement?.cogs ?? 0)} />
                            <ReportRow label="Lợi nhuận gộp" code="20" value={formatCurrency(incomeStatement?.grossProfit ?? 0)} bold />
                            <ReportRow label="Chi phí quản lý" code="25" value={formatCurrency(incomeStatement?.operatingExpenses ?? 0)} />
                            <ReportRow label="Lợi nhuận trước thuế" code="50" value={formatCurrency(incomeStatement?.profitBeforeTax ?? 0)} bold />
                            <ReportRow label="Thuế TNDN (20%)" code="51" value={formatCurrency(incomeStatement?.incomeTax ?? 0)} />
                            <ReportRow label="LỢI NHUẬN SAU THUẾ" code="60" value={formatCurrency(incomeStatement?.netProfit ?? 0)} bold />
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                                Biên lợi nhuận: <strong>{incomeStatement?.profitMargin ?? 0}%</strong>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* B09: Financial Notes */}
            {tab === 'b09' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-8 border-2 border-purple-100">
                    <h2 className="text-xl font-semibold text-purple-900  mb-6">B09-DNN — Thuyết Minh BCTC — {year}</h2>
                    {isLoadingNotes ? <LoadingSpinner /> : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase">Thông tin công ty</p>
                                {financialNotes?.company && Object.entries(financialNotes.company).map(([k, v]) => (
                                    <div key={k} className="flex justify-between text-sm"><span className="text-gray-600 capitalize">{k}</span><span className="font-bold">{String(v)}</span></div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase">Chính sách kế toán</p>
                                <div className="text-sm space-y-2 text-gray-700">
                                    <p><strong>Doanh thu:</strong> {financialNotes?.accountingPolicies?.revenueRecognition}</p>
                                    <p><strong>HTK:</strong> {financialNotes?.accountingPolicies?.inventoryValuation}</p>
                                </div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mt-4">Ghi chú HTK</p>
                                <ReportRow label="Giá trị tồn kho" value={formatCurrency(financialNotes?.notes?.inventory?.totalValue ?? 0)} />
                                <ReportRow label="Số mặt hàng" value={`${financialNotes?.notes?.inventory?.itemCount ?? 0} SKU`} />
                                <ReportRow label="Phải thu còn lại" value={formatCurrency(financialNotes?.notes?.accountsReceivable?.outstanding ?? 0)} />
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* VAT TT133 */}
            {tab === 'vat' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-8 border-2 border-orange-100">
                    <h2 className="text-xl font-semibold text-orange-900  mb-6">Mẫu 01/GTGT — Tờ Khai Thuế GTGT — {month}/{year}</h2>
                    {isLoadingVatTT133 ? <LoadingSpinner /> : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <p className="text-xs font-semibold text-red-600 uppercase mb-3">Thuế Đầu Ra</p>
                                <div className="space-y-1">
                                    <ReportRow label="[26] HHDV bán ra chịu thuế" code="26" value={formatCurrency(vatTT133?.outputVAT?.indicator26 ?? 0)} />
                                    <ReportRow label="[28] Thuế GTGT đầu ra" code="28" value={formatCurrency(vatTT133?.outputVAT?.indicator28 ?? 0)} bold />
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase mb-3">Thuế Đầu Vào</p>
                                <div className="space-y-1">
                                    <ReportRow label="[23] Giá trị HHDV mua vào" code="23" value={formatCurrency(vatTT133?.inputVAT?.indicator23 ?? 0)} />
                                    <ReportRow label="[25] Thuế GTGT được khấu trừ" code="25" value={formatCurrency(vatTT133?.inputVAT?.indicator25 ?? 0)} bold />
                                </div>
                            </div>
                            <div className="lg:col-span-2 p-6 bg-orange-600 rounded-xl text-white flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-semibold text-orange-200 uppercase">[40] Thuế GTGT phải nộp</p>
                                    <p className="text-3xl font-semibold mt-1">{formatCurrency(vatTT133?.indicator40 ?? 0)}</p>
                                    {(vatTT133?.carryForward ?? 0) > 0 && <p className="text-sm text-orange-200 mt-1">Số dư khấu trừ kỳ sau: {formatCurrency(vatTT133.carryForward)}</p>}
                                </div>
                                <Calculator className="w-12 h-12 text-orange-300 opacity-50" />
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* PIT TT133 */}
            {tab === 'pit' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="premium-card border-2 border-indigo-100">
                    <div className="p-8 pb-4">
                        <h2 className="text-xl font-semibold text-indigo-900  mb-2">Mẫu 05/KK-TNCN — Quyết Toán Thuế TNCN — {year}</h2>
                        {!isLoadingPIT && pitSettlement?.summary && (
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <div className="bg-indigo-50 p-4 rounded-xl text-center">
                                    <p className="text-xs text-gray-500 font-semibold">Nhân viên</p>
                                    <p className="text-2xl font-semibold text-indigo-700">{pitSettlement.summary.totalEmployees}</p>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-xl text-center">
                                    <p className="text-xs text-gray-500 font-semibold">Tổng thu nhập</p>
                                    <p className="text-xl font-semibold text-indigo-700">{formatCurrency(pitSettlement.summary.totalGrossIncome)}</p>
                                </div>
                                <div className="bg-indigo-900 p-4 rounded-xl text-center">
                                    <p className="text-xs text-indigo-300 font-semibold">Tổng thuế TNCN</p>
                                    <p className="text-xl font-semibold text-white">{formatCurrency(pitSettlement.summary.totalPitTax)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {isLoadingPIT ? <div className="p-8"><LoadingSpinner /></div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3 text-left">Họ tên</th>
                                        <th className="px-5 py-3 text-left">MST</th>
                                        <th className="px-5 py-3 text-left">Phòng ban</th>
                                        <th className="px-5 py-3 text-right">Thu nhập gộp</th>
                                        <th className="px-5 py-3 text-right">Thu nhập chịu thuế</th>
                                        <th className="px-5 py-3 text-right">Thuế TNCN</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {pitSettlement?.employees?.map((emp: any) => (
                                        <tr key={emp.employeeId} className="hover:bg-gray-50">
                                            <td className="px-5 py-3 font-bold flex items-center gap-2"><Users size={14} className="text-gray-400" />{emp.fullName}</td>
                                            <td className="px-5 py-3 text-gray-500 font-mono text-xs">{emp.taxCode}</td>
                                            <td className="px-5 py-3 text-gray-600">{emp.department}</td>
                                            <td className="px-5 py-3 text-right">{formatCurrency(emp.totalGrossIncome)}</td>
                                            <td className="px-5 py-3 text-right">{formatCurrency(emp.taxableIncome)}</td>
                                            <td className="px-5 py-3 text-right font-semibold text-indigo-700">{formatCurrency(emp.pitTax)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}

export default TaxReportsPage;
