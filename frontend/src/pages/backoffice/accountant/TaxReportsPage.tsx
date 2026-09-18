/**
 * Báo cáo thuế — 8 tab (W3-13).
 *
 * Trạng thái trước track này: 5/8 tab gọi `/api/reporting/tax/*` (404) và nút
 * "Xuất VAT" gọi `/accounting/tax-reports/export/vat` (không tồn tại). Bây giờ
 * mỗi tab có ĐÚNG MỘT query, chỉ chạy khi tab đó đang mở (`enabled: active`),
 * và mọi tab đều đi qua `QueryBoundary` nên lỗi API hiện ra chứ không thành 0đ.
 *
 * Kỳ báo cáo lấy theo ngày làm việc Việt Nam (`Asia/Ho_Chi_Minh`).
 */
import { useState } from 'react';
import { Tab, TabList, TabPanel, Tabs, PageHeader, Card, Select } from '../../../components/ui';
import { VatFormTab, VatLedgerTab, VatPeriodTab, type PeriodState } from './tax-report-vat-tabs';
import { BalanceSheetTab, FinancialNotesTab, IncomeStatementTab } from './tax-report-financial-tabs';
import { CitTab, PitSettlementTab } from './tax-report-tax-tabs';

type TabKey = 'vat-ledger' | 'vat-period' | 'vat-form' | 'balance-sheet' | 'income-statement' | 'financial-notes' | 'cit' | 'pit';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'vat-ledger', label: 'Bảng kê GTGT' },
    { key: 'vat-period', label: 'Tổng hợp GTGT' },
    { key: 'vat-form', label: 'Tờ khai 01/GTGT' },
    { key: 'balance-sheet', label: 'B01-DNN' },
    { key: 'income-statement', label: 'B02-DNN' },
    { key: 'financial-notes', label: 'B09-DNN' },
    { key: 'cit', label: 'Thuế TNDN' },
    { key: 'pit', label: 'Quyết toán TNCN' },
];

/** "Hôm nay" theo giờ Việt Nam — kỳ mặc định phải là kỳ của doanh nghiệp. */
function vnToday(): { year: number; month: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit',
    }).format(new Date()).split('-');
    return { year: Number(parts[0]), month: Number(parts[1]) };
}

export const TaxReportsPage = () => {
    const today = vnToday();
    const [tab, setTab] = useState<TabKey>('vat-ledger');
    const [period, setPeriod] = useState<PeriodState>({
        year: today.year,
        month: today.month,
        quarter: Math.floor((today.month - 1) / 3) + 1,
    });
    const [ledgerType, setLedgerType] = useState<'in' | 'out'>('out');
    const [vatMode, setVatMode] = useState<'monthly' | 'quarterly'>('monthly');

    const years = Array.from({ length: 6 }, (_, i) => today.year - i);

    return (
        <div className="space-y-5">
            <PageHeader
                title="Báo cáo thuế"
                description="Bảng kê, tờ khai và báo cáo tài chính theo Thông tư 133/2016/TT-BTC."
                breadcrumbs={[{ label: 'Tài chính', to: '/backoffice/accounting' }, { label: 'Báo cáo thuế' }]}
            />

            <Card className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Select
                        label="Năm" className="sm:w-36"
                        value={String(period.year)}
                        onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
                        options={years.map((y) => ({ value: String(y), label: String(y) }))}
                    />
                    <Select
                        label="Tháng" className="sm:w-36"
                        value={String(period.month)}
                        onChange={(e) => {
                            const m = Number(e.target.value);
                            setPeriod((p) => ({ ...p, month: m, quarter: Math.floor((m - 1) / 3) + 1 }));
                        }}
                        options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }))}
                    />
                    <Select
                        label="Quý" className="sm:w-36"
                        value={String(period.quarter)}
                        onChange={(e) => setPeriod((p) => ({ ...p, quarter: Number(e.target.value) }))}
                        options={[1, 2, 3, 4].map((q) => ({ value: String(q), label: `Quý ${q}` }))}
                    />
                    <p className="text-xs text-fg-subtle sm:pb-2">
                        Kỳ báo cáo tính theo ngày làm việc Việt Nam (Asia/Ho_Chi_Minh).
                    </p>
                </div>
            </Card>

            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
                <TabList>
                    {TABS.map((t) => <Tab key={t.key} value={t.key}>{t.label}</Tab>)}
                </TabList>

                <div className="pt-4">
                    <TabPanel value="vat-ledger">
                        <VatLedgerTab period={period} active={tab === 'vat-ledger'} type={ledgerType} onTypeChange={setLedgerType} />
                    </TabPanel>
                    <TabPanel value="vat-period">
                        <VatPeriodTab period={period} active={tab === 'vat-period'} mode={vatMode} onModeChange={setVatMode} />
                    </TabPanel>
                    <TabPanel value="vat-form"><VatFormTab period={period} active={tab === 'vat-form'} /></TabPanel>
                    <TabPanel value="balance-sheet"><BalanceSheetTab period={period} active={tab === 'balance-sheet'} /></TabPanel>
                    <TabPanel value="income-statement"><IncomeStatementTab period={period} active={tab === 'income-statement'} /></TabPanel>
                    <TabPanel value="financial-notes"><FinancialNotesTab period={period} active={tab === 'financial-notes'} /></TabPanel>
                    <TabPanel value="cit"><CitTab period={period} active={tab === 'cit'} /></TabPanel>
                    <TabPanel value="pit"><PitSettlementTab period={period} active={tab === 'pit'} /></TabPanel>
                </div>
            </Tabs>
        </div>
    );
};

export default TaxReportsPage;
