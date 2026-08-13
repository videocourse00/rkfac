import React, { useState, useEffect } from 'react';
import { BentoCard } from '../bento/BentoCard';
import { translations, formatCurrency } from '../../core/i18n/translations';
import { generatePdfReport } from '../../core/pdf/generator';
import {
  generateReportData,
  ReportType,
  DateRangeFilter,
  ReportDataPackage,
} from '../../core/accounting/reportsEngine';
import {
  Transaction,
  Category,
  Account,
  FinancialSummary,
  Language,
} from '../../types';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building,
} from 'lucide-react';

interface ReportsViewProps {
  summary: FinancialSummary;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  familyName: string;
  currencySymbol: string;
  lang: Language;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  summary,
  transactions,
  categories,
  accounts,
  familyName,
  currencySymbol,
  lang,
}) => {
  const t = translations[lang];

  const [activeReportType, setActiveReportType] = useState<ReportType>('INCOME_EXPENSE_SUMMARY');

  // Date Filter State
  const [filterType, setFilterType] = useState<'ALL' | 'MONTHLY' | 'YEARLY' | 'CUSTOM'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [reportPackage, setReportPackage] = useState<ReportDataPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reportList: { id: ReportType; labelEn: string; labelBn: string }[] = [
    { id: 'INCOME', labelEn: '1. Income Report', labelBn: '১. আয় বিবরণী' },
    { id: 'EXPENSE', labelEn: '2. Expense Report', labelBn: '২. ব্যয় বিবরণী' },
    { id: 'INCOME_EXPENSE_SUMMARY', labelEn: '3. Income & Expense Summary', labelBn: '৩. আয় ও ব্যয়ের সারসংক্ষেপ' },
    { id: 'RECEIPTS_PAYMENTS', labelEn: '4. Receipts & Payments', labelBn: '৪. প্রাপ্তি ও প্রদান বিবরণী' },
    { id: 'DETAILED_INCOME_EXPENSE', labelEn: '5. Detailed Income & Expense', labelBn: '৫. বিস্তারিত আয় ও ব্যয় বিবরণী' },
    { id: 'FINANCIAL_POSITION', labelEn: '6. Financial Position (Balance Sheet)', labelBn: '৬. আর্থিক অবস্থার বিবরণী (ব্যালেন্স শীট)' },
    { id: 'MEMBER_INCOME', labelEn: '7. Member-wise Income', labelBn: '৭. সদস্যভিত্তিক আয়' },
    { id: 'MEMBER_EXPENSE', labelEn: '8. Member-wise Expense', labelBn: '৮. সদস্যভিত্তিক ব্যয়' },
    { id: 'MEMBER_SAVINGS', labelEn: '9. Member-wise Savings', labelBn: '৯. সদস্যভিত্তিক সঞ্চয়' },
    { id: 'BANK_STATEMENT', labelEn: '10. Bank Statement', labelBn: '১০. ব্যাংক স্টেটমেন্ট' },
    { id: 'ASSET_STATEMENT', labelEn: '11. Asset Statement', labelBn: '১১. সম্পদ বিবরণী' },
    { id: 'LIABILITY_STATEMENT', labelEn: '12. Liability Statement', labelBn: '১২. দায় বিবরণী' },
  ];

  // Fetch / Calculate Report Data
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const dateFilter: DateRangeFilter = {
      type: filterType,
      month: selectedMonth,
      year: selectedYear,
      startDate,
      endDate,
    };

    const familyId = transactions[0]?.family_id || accounts[0]?.family_id || 'default_family';

    generateReportData(
      activeReportType,
      familyId,
      dateFilter,
      lang,
      currencySymbol,
      selectedAccountId
    ).then((data) => {
      if (isMounted) {
        setReportPackage(data);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    activeReportType,
    filterType,
    selectedMonth,
    selectedYear,
    startDate,
    endDate,
    selectedAccountId,
    transactions,
    accounts,
    lang,
    currencySymbol,
  ]);

  const handleExportPdf = () => {
    if (!reportPackage) return;

    if (!reportPackage.validation.isValid) {
      alert(
        lang === 'bn'
          ? 'সতর্কতা: আর্থিক বিবরণীতে ডাটা অসামঞ্জস্যতা দেখা দিয়েছে। সঠিক হিসাব নিশ্চিত না করে পিডিএফ রিপোর্ট জেনারেট করা সম্ভব নয়।'
          : 'Validation Alert: Accounting discrepancies detected. Final PDF reports are blocked to avoid misleading financial statements.'
      );
      return;
    }

    generatePdfReport({
      title: lang === 'bn' ? reportPackage.titleBn : reportPackage.titleEn,
      familyName,
      periodLabel: reportPackage.periodLabel,
      currencySymbol,
      lang,
      headers: reportPackage.headers,
      rows: reportPackage.rows,
      summaryCards: reportPackage.summaryCards,
    });
  };

  const handlePrint = () => {
    if (reportPackage && !reportPackage.validation.isValid) {
      alert(
        lang === 'bn'
          ? 'সতর্কতা: আর্থিক হিসাব অসামঞ্জস্যপূর্ণ। ভুল রিপোর্ট প্রিন্ট করা ব্লক করা হয়েছে।'
          : 'Validation Alert: Financial position equation is not balanced. Printing is blocked.'
      );
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Report Selector Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base">
              {lang === 'bn' ? 'স্বয়ংক্রিয় আর্থিক রিপোর্ট জেনারেটর' : 'Automated Accounting Reports Engine'}
            </h2>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              onClick={handleExportPdf}
              disabled={!reportPackage?.validation.isValid}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.export_pdf}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!reportPackage?.validation.isValid}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.print_report}</span>
            </button>
          </div>
        </div>

        {/* 12 Reports Dropdown & Grid Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              {lang === 'bn' ? 'রিপোর্ট নির্বাচন করুন (12টি রিপোর্ট)' : 'Select Report (12 Required Reports)'}
            </label>
            <select
              value={activeReportType}
              onChange={(e) => setActiveReportType(e.target.value as ReportType)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
            >
              {reportList.map((r) => (
                <option key={r.id} value={r.id}>
                  {lang === 'bn' ? r.labelBn : r.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Selection */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              {lang === 'bn' ? 'সময়কাল ফিল্টার' : 'Date Filter Range'}
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
            >
              <option value="ALL">{lang === 'bn' ? 'সর্বকালের (All Time)' : 'All-Time'}</option>
              <option value="MONTHLY">{lang === 'bn' ? 'মাসিক (Monthly)' : 'Monthly'}</option>
              <option value="YEARLY">{lang === 'bn' ? 'বার্ষিক (Yearly)' : 'Yearly'}</option>
              <option value="CUSTOM">{lang === 'bn' ? 'কাস্টম তারিখ সীমা (Custom Date Range)' : 'Custom Range'}</option>
            </select>
          </div>

          {/* Date Range Inputs */}
          {filterType === 'MONTHLY' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                {lang === 'bn' ? 'মাস নির্বাচন' : 'Select Month'}
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none"
              />
            </div>
          )}

          {filterType === 'YEARLY' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                {lang === 'bn' ? 'বছর নির্বাচন' : 'Select Year'}
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none"
              />
            </div>
          )}

          {filterType === 'CUSTOM' && (
            <div className="flex gap-2 col-span-1 md:col-span-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  {lang === 'bn' ? 'শুরুর তারিখ' : 'From Date'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  {lang === 'bn' ? 'শেষ তারিখ' : 'To Date'}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeReportType === 'BANK_STATEMENT' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                {lang === 'bn' ? 'ব্যাংক/ক্যাশ অ্যাকাউন্ট' : 'Bank/Cash Account'}
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Validation Engine Status Alert Banner */}
      {reportPackage && !reportPackage.validation.isValid && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-500 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>
              {lang === 'bn'
                ? 'হিসাব প্রক্রিয়াকরণে ত্রুটি ও অসামঞ্জস্যতা সনাক্ত করা হয়েছে (Accounting Validation Failed)'
                : 'Accounting Validation Failure: Report output blocked to prevent misleading statements'}
            </span>
          </div>
          <div className="text-xs text-rose-700 dark:text-rose-300 space-y-1">
            {reportPackage.validation.errors.map((err, idx) => (
              <p key={idx} className="font-mono">
                • {err.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Printable Report Document Card */}
      <div id="printable-report">
        <BentoCard
          eyebrow={familyName.toUpperCase()}
          title={reportPackage ? (lang === 'bn' ? reportPackage.titleBn : reportPackage.titleEn) : 'Report'}
          badgeText={reportPackage?.periodLabel || 'PERIOD'}
          badgeType="indigo"
          icon={<FileSpreadsheet className="w-4 h-4 text-indigo-500" />}
        >
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-mono">
              Computing double-entry financial statement records...
            </div>
          ) : !reportPackage ? (
            <div className="py-12 text-center text-xs text-slate-400">No report data generated.</div>
          ) : (
            <div className="space-y-6 mt-2">
              {/* Summary Metrics Cards */}
              {reportPackage.summaryCards && reportPackage.summaryCards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {reportPackage.summaryCards.map((card, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 border rounded-xl ${
                        card.color === 'emerald'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                          : card.color === 'rose'
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                          : card.color === 'amber'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                          : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                        {card.label}
                      </span>
                      <span className="text-lg font-black font-mono block mt-1">{card.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {reportPackage.notes && (
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                  {reportPackage.notes}
                </div>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      {reportPackage.headers.map((h, idx) => (
                        <th
                          key={idx}
                          className={`pb-2.5 px-2 ${idx === reportPackage.headers.length - 1 ? 'text-right' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportPackage.rows.length === 0 ? (
                      <tr>
                        <td colSpan={reportPackage.headers.length} className="py-8 text-center text-slate-400">
                          No accounting records found for the selected date range and filter criteria.
                        </td>
                      </tr>
                    ) : (
                      reportPackage.rows.map((row, rowIdx) => {
                        const isTotalRow = String(row[0]).includes('TOTAL') || String(row[0]).includes('মোট');
                        const isDividerRow = String(row[0]) === '---';

                        if (isDividerRow) {
                          return (
                            <tr key={rowIdx}>
                              <td colSpan={reportPackage.headers.length} className="py-2 border-t border-slate-300 dark:border-slate-700" />
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={rowIdx}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                              isTotalRow ? 'font-bold bg-slate-100/60 dark:bg-slate-800/60 text-indigo-700 dark:text-indigo-300' : ''
                            }`}
                          >
                            {row.map((cell, cellIdx) => (
                              <td
                                key={cellIdx}
                                className={`py-2.5 px-2 ${
                                  cellIdx === row.length - 1 ? 'text-right font-mono font-bold' : ''
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </BentoCard>
      </div>
    </div>
  );
};
