import { db } from '../../db/dexie';
import type {
  Transaction,
  Category,
  Account,
  FamilyMember,
  Asset,
  Liability,
  FinancialSummary,
  Language,
} from '../../types';
import { formatCurrency } from '../i18n/translations';
import { validateFinancialPositionBalance } from './validation';
import type { FinancialPositionReport, ValidationResult } from './types';

export type ReportType =
  | 'INCOME'
  | 'EXPENSE'
  | 'INCOME_EXPENSE_SUMMARY'
  | 'RECEIPTS_PAYMENTS'
  | 'DETAILED_INCOME_EXPENSE'
  | 'FINANCIAL_POSITION'
  | 'MEMBER_INCOME'
  | 'MEMBER_EXPENSE'
  | 'MEMBER_SAVINGS'
  | 'BANK_STATEMENT'
  | 'ASSET_STATEMENT'
  | 'LIABILITY_STATEMENT';

export interface DateRangeFilter {
  type: 'ALL' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  month?: string; // YYYY-MM
  year?: number; // YYYY
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface ReportDataPackage {
  reportType: ReportType;
  titleEn: string;
  titleBn: string;
  periodLabel: string;
  headers: string[];
  rows: (string | number)[][];
  summaryCards: { label: string; value: string; color?: 'indigo' | 'emerald' | 'rose' | 'amber' }[];
  validation: ValidationResult;
  notes?: string;
}

export function filterTransactionsByDateRange(
  transactions: Transaction[],
  filter: DateRangeFilter
): Transaction[] {
  return transactions.filter((tx) => {
    if (tx.is_deleted) return false;
    if (filter.type === 'ALL') return true;
    if (filter.type === 'MONTHLY' && filter.month) {
      return tx.transaction_date.startsWith(filter.month);
    }
    if (filter.type === 'YEARLY' && filter.year) {
      return tx.transaction_date.startsWith(filter.year.toString());
    }
    if (filter.type === 'CUSTOM') {
      const start = filter.startDate || '1970-01-01';
      const end = filter.endDate || '2099-12-31';
      return tx.transaction_date >= start && tx.transaction_date <= end;
    }
    return true;
  });
}

export function getPeriodLabel(filter: DateRangeFilter, lang: Language): string {
  if (filter.type === 'ALL') return lang === 'bn' ? 'সর্বকালের বিবরণী (All-Time)' : 'All-Time Statement';
  if (filter.type === 'MONTHLY' && filter.month) {
    return lang === 'bn' ? `মাসিক বিবরণী: ${filter.month}` : `Monthly Statement: ${filter.month}`;
  }
  if (filter.type === 'YEARLY' && filter.year) {
    return lang === 'bn' ? `বার্ষিক বিবরণী: ${filter.year}` : `Yearly Statement: ${filter.year}`;
  }
  if (filter.type === 'CUSTOM' && filter.startDate && filter.endDate) {
    return `${filter.startDate} - ${filter.endDate}`;
  }
  return 'Custom Period';
}

/**
 * Generate any of the 12 Required Reports with full validation
 */
export async function generateReportData(
  reportType: ReportType,
  familyId: string,
  filter: DateRangeFilter,
  lang: Language,
  currencySymbol: string,
  selectedAccountId?: string
): Promise<ReportDataPackage> {
  const transactionsRaw = await db.transactions.where('family_id').equals(familyId).toArray();
  const transactions = filterTransactionsByDateRange(transactionsRaw, filter);
  const categories = await db.categories.where('family_id').equals(familyId).toArray();
  const accounts = await db.accounts.where('family_id').equals(familyId).toArray();
  const members = await db.familyMembers.where('family_id').equals(familyId).toArray();
  const assets = await db.assets.where('family_id').equals(familyId).toArray();
  const liabilities = await db.liabilities.where('family_id').equals(familyId).toArray();
  const journalEntries = await db.journalEntries.where('family_id').equals(familyId).toArray();

  const periodLabel = getPeriodLabel(filter, lang);
  const emptyValidation: ValidationResult = { isValid: true, errors: [] };

  // Helper map lookups
  const getCatName = (id: string) => {
    const c = categories.find((cat) => cat.id === id);
    if (!c) return 'General';
    return lang === 'bn' ? c.name_bn : c.name_en;
  };

  const getMemberName = (id?: string) => {
    if (!id) return lang === 'bn' ? 'পারিবারিক ফান্ডের অংশ' : 'Shared Family';
    const m = members.find((mem) => mem.id === id);
    return m ? m.name : 'Unknown Member';
  };

  const getAccountName = (id?: string) => {
    if (!id) return '-';
    const a = accounts.find((acc) => acc.id === id);
    return a ? a.account_name : '-';
  };

  // -------------------------------------------------------------
  // 1. Income Report
  // -------------------------------------------------------------
  if (reportType === 'INCOME') {
    const incomeTx = transactions.filter((tx) => tx.type === 'INCOME');
    const totalCents = incomeTx.reduce((sum, tx) => sum + tx.total_amount_cents, 0);

    const rows = incomeTx.map((tx) => [
      tx.transaction_date,
      tx.voucher_no,
      getCatName(tx.category_id),
      getMemberName(tx.created_by_member_id || tx.target_member_id),
      getAccountName(tx.destination_account_id),
      tx.payment_method || 'CASH',
      tx.description,
      formatCurrency(tx.total_amount_cents, currencySymbol, lang),
    ]);

    return {
      reportType,
      titleEn: 'Income Report',
      titleBn: 'আয় বিবরণী (Income Report)',
      periodLabel,
      headers: [
        lang === 'bn' ? 'তারিখ' : 'Date',
        lang === 'bn' ? 'ভাউচার' : 'Voucher',
        lang === 'bn' ? 'ক্যাটাগরি' : 'Category',
        lang === 'bn' ? 'সদস্য' : 'Member',
        lang === 'bn' ? 'অ্যাকাউন্ট' : 'Account',
        lang === 'bn' ? 'পদ্ধতি' : 'Method',
        lang === 'bn' ? 'বিবরণ' : 'Description',
        lang === 'bn' ? 'পরিমাণ' : 'Amount',
      ],
      rows,
      summaryCards: [
        { label: lang === 'bn' ? 'মোট আয়' : 'Total Income', value: formatCurrency(totalCents, currencySymbol, lang), color: 'emerald' },
        { label: lang === 'bn' ? 'মোট লেনদেন' : 'Total Transactions', value: `${incomeTx.length}`, color: 'indigo' },
      ],
      validation: emptyValidation,
    };
  }

  // -------------------------------------------------------------
  // 2. Expense Report
  // -------------------------------------------------------------
  if (reportType === 'EXPENSE') {
    const expenseTx = transactions.filter((tx) => tx.type === 'EXPENSE');
    const totalCents = expenseTx.reduce((sum, tx) => sum + tx.total_amount_cents, 0);

    let personalCents = 0;
    let familyCents = 0;

    const rows = expenseTx.map((tx) => {
      const isPersonal = !!tx.target_member_id;
      if (isPersonal) personalCents += tx.total_amount_cents;
      else familyCents += tx.total_amount_cents;

      return [
        tx.transaction_date,
        tx.voucher_no,
        getCatName(tx.category_id),
        isPersonal ? (lang === 'bn' ? 'ব্যক্তিগত' : 'Personal') : (lang === 'bn' ? 'পারিবারিক' : 'Family'),
        getMemberName(tx.target_member_id || tx.created_by_member_id),
        getAccountName(tx.source_account_id),
        tx.description,
        formatCurrency(tx.total_amount_cents, currencySymbol, lang),
      ];
    });

    return {
      reportType,
      titleEn: 'Expense Report',
      titleBn: 'ব্যয় বিবরণী (Expense Report)',
      periodLabel,
      headers: [
        lang === 'bn' ? 'তারিখ' : 'Date',
        lang === 'bn' ? 'ভাউচার' : 'Voucher',
        lang === 'bn' ? 'ক্যাটাগরি' : 'Category',
        lang === 'bn' ? 'ধরন' : 'Nature',
        lang === 'bn' ? 'সদস্য' : 'Member',
        lang === 'bn' ? 'অ্যাকাউন্ট' : 'Account',
        lang === 'bn' ? 'বিবরণ' : 'Description',
        lang === 'bn' ? 'পরিমাণ' : 'Amount',
      ],
      rows,
      summaryCards: [
        { label: lang === 'bn' ? 'মোট ব্যয়' : 'Total Expense', value: formatCurrency(totalCents, currencySymbol, lang), color: 'rose' },
        { label: lang === 'bn' ? 'পারিবারিক ব্যয়' : 'Family Expense', value: formatCurrency(familyCents, currencySymbol, lang), color: 'indigo' },
        { label: lang === 'bn' ? 'ব্যক্তিগত ব্যয়' : 'Personal Expense', value: formatCurrency(personalCents, currencySymbol, lang), color: 'amber' },
      ],
      validation: emptyValidation,
    };
  }

  // -------------------------------------------------------------
  // 3. Income + Expense Summary
  // -------------------------------------------------------------
  if (reportType === 'INCOME_EXPENSE_SUMMARY') {
    let totalIncomeCents = 0;
    let totalExpenseCents = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') totalIncomeCents += tx.total_amount_cents;
      if (tx.type === 'EXPENSE') totalExpenseCents += tx.total_amount_cents;
    });

    const netSurplusCents = totalIncomeCents - totalExpenseCents;

    const catSummaryMap = new Map<string, { type: string; total: number }>();
    transactions.forEach((tx) => {
      if (tx.type === 'INCOME' || tx.type === 'EXPENSE') {
        const cur = catSummaryMap.get(tx.category_id) || { type: tx.type, total: 0 };
        cur.total += tx.total_amount_cents;
        catSummaryMap.set(tx.category_id, cur);
      }
    });

    const rows: (string | number)[][] = [];
    catSummaryMap.forEach((val, catId) => {
      rows.push([
        getCatName(catId),
        val.type === 'INCOME' ? (lang === 'bn' ? 'আয়' : 'Income') : (lang === 'bn' ? 'ব্যয়' : 'Expense'),
        formatCurrency(val.total, currencySymbol, lang),
        totalIncomeCents > 0 && val.type === 'INCOME'
          ? `${((val.total / totalIncomeCents) * 100).toFixed(1)}%`
          : totalExpenseCents > 0 && val.type === 'EXPENSE'
          ? `${((val.total / totalExpenseCents) * 100).toFixed(1)}%`
          : '0.0%',
      ]);
    });

    return {
      reportType,
      titleEn: 'Income & Expense Summary',
      titleBn: 'আয় ও ব্যয়ের সারসংক্ষেপ (Income & Expense Summary)',
      periodLabel,
      headers: [
        lang === 'bn' ? 'ক্যাটাগরি' : 'Category Name',
        lang === 'bn' ? 'ধরন' : 'Type',
        lang === 'bn' ? 'মোট পরিমাণ' : 'Total Amount',
        lang === 'bn' ? 'শতকরা হাড়' : '% Share',
      ],
      rows,
      summaryCards: [
        { label: lang === 'bn' ? 'মোট আয়' : 'Total Income', value: formatCurrency(totalIncomeCents, currencySymbol, lang), color: 'emerald' },
        { label: lang === 'bn' ? 'মোট ব্যয়' : 'Total Expense', value: formatCurrency(totalExpenseCents, currencySymbol, lang), color: 'rose' },
        { label: lang === 'bn' ? 'নিট উদ্বৃত্ত' : 'Net Surplus', value: formatCurrency(netSurplusCents, currencySymbol, lang), color: 'indigo' },
      ],
      validation: emptyValidation,
    };
  }

  // -------------------------------------------------------------
  // 4. Receipts & Payments Statement
  // -------------------------------------------------------------
  if (reportType === 'RECEIPTS_PAYMENTS') {
    let openingCashBankCents = 0;
    let closingCashBankCents = 0;

    accounts.forEach((acc) => {
      if (acc.is_deleted) return;
      if (acc.account_type === 'CASH' || acc.account_type === 'BANK' || acc.account_type === 'MOBILE_WALLET') {
        openingCashBankCents += acc.opening_balance_cents;
        closingCashBankCents += acc.current_balance_cents;
      }
    });

    let totalReceiptsCents = 0;
    let totalPaymentsCents = 0;

    const receiptRows: (string | number)[][] = [];
    const paymentRows: (string | number)[][] = [];

    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') {
        totalReceiptsCents += tx.total_amount_cents;
        receiptRows.push([
          tx.transaction_date,
          lang === 'bn' ? 'প্রাপ্তি (Income)' : 'Receipt (Income)',
          getCatName(tx.category_id),
          tx.description,
          formatCurrency(tx.total_amount_cents, currencySymbol, lang),
        ]);
      } else if (tx.type === 'EXPENSE' || tx.type === 'ASSET_PURCHASE' || tx.type === 'LIABILITY_REPAYMENT') {
        totalPaymentsCents += tx.total_amount_cents;
        paymentRows.push([
          tx.transaction_date,
          lang === 'bn' ? 'প্রদান (Payment)' : 'Payment',
          getCatName(tx.category_id),
          tx.description,
          formatCurrency(tx.total_amount_cents, currencySymbol, lang),
        ]);
      }
    });

    const expectedClosing = openingCashBankCents + totalReceiptsCents - totalPaymentsCents;
    const isReconciled = expectedClosing === closingCashBankCents;

    const rows = [...receiptRows, ...paymentRows];

    return {
      reportType,
      titleEn: 'Statement of Receipts & Payments',
      titleBn: 'প্রাপ্তি ও প্রদান বিবরণী (Receipts & Payments)',
      periodLabel,
      headers: [
        lang === 'bn' ? 'তারিখ' : 'Date',
        lang === 'bn' ? 'ধরণ' : 'Type',
        lang === 'bn' ? 'ক্যাটাগরি' : 'Category',
        lang === 'bn' ? 'বিবরণ' : 'Description',
        lang === 'bn' ? 'পরিমাণ' : 'Amount',
      ],
      rows,
      summaryCards: [
        { label: lang === 'bn' ? 'প্রারম্ভিক ব্যালেন্স' : 'Opening Cash/Bank', value: formatCurrency(openingCashBankCents, currencySymbol, lang), color: 'indigo' },
        { label: lang === 'bn' ? 'মোট প্রাপ্তি (+)' : 'Total Receipts (+)', value: formatCurrency(totalReceiptsCents, currencySymbol, lang), color: 'emerald' },
        { label: lang === 'bn' ? 'মোট প্রদান (-)' : 'Total Payments (-)', value: formatCurrency(totalPaymentsCents, currencySymbol, lang), color: 'rose' },
        { label: lang === 'bn' ? 'সমাপনী ব্যালেন্স' : 'Closing Cash/Bank', value: formatCurrency(closingCashBankCents, currencySymbol, lang), color: 'amber' },
      ],
      validation: {
        isValid: isReconciled,
        errors: isReconciled
          ? []
          : [
              {
                code: 'INCORRECT_TRANSFER',
                message: `Receipts & Payments Reconciliation Error: Expected closing (${expectedClosing / 100}) does not match recorded current closing (${closingCashBankCents / 100}).`,
              },
            ],
      },
    };
  }

  // -------------------------------------------------------------
  // 5. Detailed Income & Expense Statement
  // -------------------------------------------------------------
  if (reportType === 'DETAILED_INCOME_EXPENSE') {
    let totalIncomeCents = 0;
    let totalExpenseCents = 0;

    const catMap = new Map<string, { type: string; total: number; count: number }>();

    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') {
        totalIncomeCents += tx.total_amount_cents;
        const cur = catMap.get(tx.category_id) || { type: 'INCOME', total: 0, count: 0 };
        cur.total += tx.total_amount_cents;
        cur.count += 1;
        catMap.set(tx.category_id, cur);
      } else if (tx.type === 'EXPENSE') {
        totalExpenseCents += tx.total_amount_cents;
        const cur = catMap.get(tx.category_id) || { type: 'EXPENSE', total: 0, count: 0 };
        cur.total += tx.total_amount_cents;
        cur.count += 1;
        catMap.set(tx.category_id, cur);
      }
    });

    const rows: (string | number)[][] = [];
    catMap.forEach((val, catId) => {
      const catObj = categories.find((c) => c.id === catId);
      const parentCat = catObj?.parent_id ? categories.find((c) => c.id === catObj.parent_id) : null;

      rows.push([
        getCatName(catId),
        parentCat ? (lang === 'bn' ? parentCat.name_bn : parentCat.name_en) : '-',
        val.type === 'INCOME' ? (lang === 'bn' ? 'আয়' : 'Income') : (lang === 'bn' ? 'ব্যয়' : 'Expense'),
        val.count,
        formatCurrency(val.total, currencySymbol, lang),
      ]);
    });

    return {
      reportType,
      titleEn: 'Detailed Income & Expense Statement',
      titleBn: 'বিস্তারিত আয় ও ব্যয়ের বিবরণী (Detailed Income & Expense Statement)',
      periodLabel,
      headers: [
        lang === 'bn' ? 'ক্যাটাগরি' : 'Category Name',
        lang === 'bn' ? 'মূল ক্যাটাগরি' : 'Parent Category',
        lang === 'bn' ? 'ধরন' : 'Type',
        lang === 'bn' ? 'লেনদেন সংখ্যা' : 'Tx Count',
        lang === 'bn' ? 'মোট পরিমাণ' : 'Total Amount',
      ],
      rows,
      summaryCards: [
        { label: lang === 'bn' ? 'মোট আয়' : 'Total Revenue Income', value: formatCurrency(totalIncomeCents, currencySymbol, lang), color: 'emerald' },
        { label: lang === 'bn' ? 'মোট ব্যয়' : 'Total Revenue Expense', value: formatCurrency(totalExpenseCents, currencySymbol, lang), color: 'rose' },
        { label: lang === 'bn' ? 'নিট পরিচালন উদ্বৃত্ত' : 'Net Surplus', value: formatCurrency(totalIncomeCents - totalExpenseCents, currencySymbol, lang), color: 'indigo' },
      ],
      validation: emptyValidation,
    };
  }

  // -------------------------------------------------------------
  // 6. Financial Position Statement (Balance Sheet)
  // -------------------------------------------------------------
  if (reportType === 'FINANCIAL_POSITION') {
    let openingLiquidAssetsCents = 0;
    let openingLiabilitiesCents = 0;
    let currentLiquidAssetsCents = 0;
    let currentLiabilityAccountsCents = 0;

    accounts.forEach((acc) => {
      if (acc.is_deleted || !acc.is_active) return;

      if (acc.account_type !== 'LIABILITY') {
        currentLiquidAssetsCents += acc.current_balance_cents;
        openingLiquidAssetsCents += acc.opening_balance_cents;
      } else {
        currentLiabilityAccountsCents += Math.abs(acc.current_balance_cents);
        openingLiabilitiesCents += acc.opening_balance_cents;
      }
    });

    const fixedAssetsValuation = assets
      .filter((a) => !a.is_deleted)
      .reduce((sum, a) => sum + a.valuation_cents, 0);

    const directLiabilitiesAmount = liabilities
      .filter((l) => !l.is_deleted)
      .reduce((sum, l) => sum + l.amount_cents, 0);

    const totalAssetsCents = currentLiquidAssetsCents + fixedAssetsValuation;
    const totalLiabilitiesCents = currentLiabilityAccountsCents + directLiabilitiesAmount;

    // Calculate Operating Net Surplus for the Period
    let periodIncomeCents = 0;
    let periodExpenseCents = 0;
    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') periodIncomeCents += tx.total_amount_cents;
      if (tx.type === 'EXPENSE') periodExpenseCents += tx.total_amount_cents;
    });

    const netSurplusCents = periodIncomeCents - periodExpenseCents;

    // Opening Family Fund = Opening Assets - Opening Liabilities
    const openingFamilyFundCents = openingLiquidAssetsCents - openingLiabilitiesCents;

    const totalFamilyFundAndEquityCents = openingFamilyFundCents + netSurplusCents;

    const discrepancyCents = totalAssetsCents - (totalLiabilitiesCents + totalFamilyFundAndEquityCents);
    const isBalanced = Math.abs(discrepancyCents) === 0;

    const rows: (string | number)[][] = [
      [lang === 'bn' ? '১. নগদ ও ব্যাংক জের' : '1. Liquid Cash & Bank Accounts', 'Asset', formatCurrency(currentLiquidAssetsCents, currencySymbol, lang)],
      [lang === 'bn' ? '২. স্থাবর ও বিনিয়োগ সম্পদ' : '2. Fixed & Investment Assets', 'Asset', formatCurrency(fixedAssetsValuation, currencySymbol, lang)],
      [lang === 'bn' ? 'মোট সম্পদ (Total Assets)' : 'TOTAL ASSETS', 'TOTAL', formatCurrency(totalAssetsCents, currencySymbol, lang)],
      ['---', '---', '---'],
      [lang === 'bn' ? '৩. ব্যাংক ঋণ ও দায়' : '3. Debts & Liability Accounts', 'Liability', formatCurrency(totalLiabilitiesCents, currencySymbol, lang)],
      [lang === 'bn' ? '৪. প্রারম্ভিক পারিবারিক তহবিল' : '4. Opening Family Fund', 'Equity', formatCurrency(openingFamilyFundCents, currencySymbol, lang)],
      [lang === 'bn' ? '৫. সঞ্চিত নিট উদ্বৃত্ত' : '5. Cumulative Operating Surplus', 'Equity', formatCurrency(netSurplusCents, currencySymbol, lang)],
      [lang === 'bn' ? 'মোট দায় ও তহবিল (Liabilities & Equity)' : 'TOTAL LIABILITIES & EQUITY', 'TOTAL', formatCurrency(totalLiabilitiesCents + totalFamilyFundAndEquityCents, currencySymbol, lang)],
    ];

    const reportObj: FinancialPositionReport = {
      as_of_date: new Date().toISOString().slice(0, 10),
      assets: { cash_and_bank_accounts: accounts, fixed_and_investment_assets: assets, total_assets_cents: totalAssetsCents },
      liabilities: { debts_and_loans: liabilities, liability_accounts: accounts, total_liabilities_cents: totalLiabilitiesCents },
      equity_and_fund: { family_fund_accounts: accounts, personal_savings_accounts: accounts, cumulative_retained_surplus_cents: netSurplusCents, total_family_fund_and_equity_cents: totalFamilyFundAndEquityCents },
      is_balanced: isBalanced,
      discrepancy_cents: discrepancyCents,
    };

    const validation = validateFinancialPositionBalance(reportObj);

    return {
      reportType,
      titleEn: 'Statement of Financial Position (Balance Sheet)',
      titleBn: 'আর্থিক অবস্থার বিবরণী / ব্যালেন্স শীট (Financial Position)',
      periodLabel,
      headers: [
        lang === 'bn' ? 'হিসাবের প্রধান খাত' : 'Financial Statement Line Item',
        lang === 'bn' ? 'শ্রেণীবিভাগ' : 'Classification',
        lang === 'bn' ? 'টাকার পরিমাণ' : 'Amount',
      ],
      rows,
      summaryCards: [
        { label: lang === 'bn' ? 'মোট সম্পদ (Assets)' : 'Total Assets', value: formatCurrency(totalAssetsCents, currencySymbol, lang), color: 'emerald' },
        { label: lang === 'bn' ? 'মোট দায় (Liabilities)' : 'Total Liabilities', value: formatCurrency(totalLiabilitiesCents, currencySymbol, lang), color: 'rose' },
        { label: lang === 'bn' ? 'পারিবারিক তহবিল ও ইক্যুইটি' : 'Family Fund & Equity', value: formatCurrency(totalFamilyFundAndEquityCents, currencySymbol, lang), color: 'indigo' },
      ],
      validation,
      notes: isBalanced
        ? '✓ Validation Passed: Assets = Liabilities + Family Fund'
        : `⚠️ Mismatch: Discrepancy of ${formatCurrency(discrepancyCents, currencySymbol, lang)} detected`,
    };
  }

  // -------------------------------------------------------------
  // 7. Member-wise Income
  // -------------------------------------------------------------
  if (reportType === 'MEMBER_INCOME') {
    const memberIncomeMap = new Map<string, number>();

    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') {
        const memberId = tx.created_by_member_id || tx.target_member_id || 'SHARED';
        const cur = memberIncomeMap.get(memberId) || 0;
        memberIncomeMap.set(memberId, cur + tx.total_amount_cents);
      }
    });

    let totalIncomeCents = 0;
    memberIncomeMap.forEach((val) => (totalIncomeCents += val));

    const rows: (string | number)[][] = [];
    members.forEach((mem) => {
      const inc = memberIncomeMap.get(mem.id) || 0;
      rows.push([
        mem.name,
        mem.relation,
        mem.is_active ? (lang === 'bn' ? 'সক্রিয়' : 'Active') : (lang === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'),
        formatCurrency(inc, currencySymbol, lang),
        totalIncomeCents > 0 ? `${((inc / totalIncomeCents) * 100).toFixed(1)}%` : '0.0%',
      ]);
    });

    const sharedInc = memberIncomeMap.get('SHARED') || 0;
    if (sharedInc > 0) {
      rows.push([
        lang === 'bn' ? 'পারিবারিক যৌথ আয়' : 'Shared Family Revenue',
        'Shared',
        'Active',
        formatCurrency(sharedInc, currencySymbol, lang),
        totalIncomeCents > 0 ? `${((sharedInc / totalIncomeCents) * 100).toFixed(1)}%` : '0.0%',
      ]);
    }

    return {
      reportType,
      titleEn: 'Member-wise Income Report',
      titleBn: 'সদস্যভিত্তিক আয় বিবরণী (Member-wise Income)',
      periodLabel,
      headers: [
        lang === 'bn' ? 'সদস্যের নাম' : 'Member Name',
        lang === 'bn' ? 'সম্পর্ক' : 'Relation',
        lang === 'bn' ? 'স্ট্যাটাস' : 'Status',
        lang === 'bn' ? 'মোট অর্জিত আয়' : 'Total Income Earned',
        lang === 'bn' ? 'শতকরা অংশ' : '% Share',
      ],
      rows,
      summaryCards: [
        { label: lang === 'bn' ? 'মোট অর্জিত আয়' : 'Total Income', value: formatCurrency(totalIncomeCents, currencySymbol, lang), color: 'emerald' },
        { label: lang === 'bn' ? 'মোট সদস্য' : 'Total Members', value: `${members.length}`, color: 'indigo' },
      ],
      validation: emptyValidation,
    };
  }

  // -------------------------------------------------------------
  // 8. Member-wise Expense
  // -------------------------------------------------------------
  if (reportType === 'MEMBER_EXPENSE') {
    const memberPersonalExp = new Map<string, number>();
    const memberFamilyShareExp = new Map<string, number>();

    journalEntries.forEach((je) => {
      if (je.is_deleted) return;
      const tx = transactions.find((t) => t.id === je.transaction_id);
      if (!tx || tx.type !== 'EXPENSE') return;

      if (je.member_id) {
        if (je.split_percentage) {
          const cur = memberFamilyShareExp.get(je.member_id) || 0;
          memberFamilyShareExp.set(je.member_id, cur + je.amount_cents);
        } else {
          const cur = memberPersonalExp.get(je.member_id) || 0;
          memberPersonalExp.set(je.member_id, cur + je.amount_cents);
        }
      }
    });

    let grandTotalExp = 0;
    const rows: (string | number)[][] = [];

    members.forEach((mem) => {
      const personal = memberPersonalExp.get(mem.id) || 0;
      const familyShare = memberFamilyShareExp.get(mem.id) || 0;
      const total = personal + familyShare;
      grandTotalExp += total;

      rows.push([
        mem.name,
        mem.relation,
        formatCurrency(personal, currencySymbol, lang),
        formatCurrency(familyShare, currencySymbol, lang),
        formatCurrency(total, currencySymbol, lang),
      ]);
    });

    return {
      reportType,
      titleEn: 'Member-wise Expense Report',
      titleBn: 'সদস্যভিত্তিক ব্যয় বিবরণী (Member-wise Expense)',
      periodLabel,
      headers: [
        lang === 'bn' ? 'সদস্যের নাম' : 'Member Name',
        lang === 'bn' ? 'সম্পর্ক' : 'Relation',
        lang === 'bn' ? 'ব্যক্তিগত ব্যয়' : 'Personal Expense',
        lang === 'bn' ? 'পারিবারিক খরচের অংশ' : 'Family Expense Share',
        lang === 'bn' ? 'মোট ব্যয়' : 'Total Member Expense',
      ],
      rows,
      summaryCards: [
        { label: lang === 'bn' ? 'মোট পরিবার ব্যয়' : 'Total Expenses', value: formatCurrency(grandTotalExp, currencySymbol, lang), color: 'rose' },
        { label: lang === 'bn' ? 'সদস্য সংখ্যা' : 'Family Members', value: `${members.length}`, color: 'indigo' },
      ],
      validation: emptyValidation,
    };
  }

  // -------------------------------------------------------------
  // 9. Member-wise Savings
  // -------------------------------------------------------------
  if (reportType === 'MEMBER_SAVINGS') {
    const rows: (string | number)[][] = [];
    let totalSavingsCents = 0;

    for (const mem of members) {
      if (mem.is_deleted) continue;

      let memberInc = 0;
      let memberExp = 0;

      transactions.forEach((tx) => {
        if (tx.created_by_member_id === mem.id || tx.target_member_id === mem.id) {
          if (tx.type === 'INCOME') memberInc += tx.total_amount_cents;
          if (tx.type === 'EXPENSE') memberExp += tx.total_amount_cents;
        }
      });

      const netSavings = memberInc - memberExp;
      totalSavingsCents += netSavings;

      const memAccounts = accounts.filter((a) => a.owner_member_id === mem.id && !a.is_deleted);
      const accBalance = memAccounts.reduce((sum, a) => sum + a.current_balance_cents, 0);

      rows.push([
        mem.name,
        mem.relation,
        formatCurrency(memberInc, currencySymbol, lang),
        formatCurrency(memberExp, currencySymbol, lang),
        formatCurrency(netSavings, currencySymbol, lang),
        formatCurrency(accBalance, currencySymbol, lang),
      ]);
    }

    return {
      reportType,
      titleEn: 'Member-wise Savings Statement',
      titleBn: 'সদস্যভিত্তিক নিট সঞ্চয় বিবরণী (Member-wise Savings)',
      periodLabel,
      headers: [
        lang === 'bn' ? 'সদস্যের নাম' : 'Member Name',
        lang === 'bn' ? 'সম্পর্ক' : 'Relation',
        lang === 'bn' ? 'অর্জিত আয়' : 'Earned Income',
        lang === 'bn' ? 'মোট খরচ' : 'Total Expense',
        lang === 'bn' ? 'নিট সঞ্চয়' : 'Net Savings',
        lang === 'bn' ? 'ব্যক্তিগত অ্যাকাউন্ট জের' : 'Owned Account Balances',
      ],
      rows,
      summaryCards: [
        { label: lang === 'bn' ? 'পারিবারিক মোট সঞ্চয়' : 'Total Net Savings', value: formatCurrency(totalSavingsCents, currencySymbol, lang), color: 'emerald' },
      ],
      validation: emptyValidation,
    };
  }

  // -------------------------------------------------------------
  // 10. Bank Statement
  // -------------------------------------------------------------
  if (reportType === 'BANK_STATEMENT') {
    const targetAcc = selectedAccountId
      ? accounts.find((a) => a.id === selectedAccountId)
      : accounts.find((a) => a.account_type === 'BANK' || a.account_type === 'CASH');

    const accName = targetAcc ? targetAcc.account_name : 'Bank Account';
    const openingBal = targetAcc ? targetAcc.opening_balance_cents : 0;
    let currentBal = openingBal;
    let totalDebits = 0;
    let totalCredits = 0;

    const rows: (string | number)[][] = [];

    if (targetAcc) {
      const accJournalEntries = journalEntries.filter((je) => je.account_id === targetAcc.id);

      accJournalEntries.forEach((je) => {
        const tx = transactions.find((t) => t.id === je.transaction_id);
        if (!tx) return;

        let dr = 0;
        let cr = 0;

        if (je.entry_type === 'DEBIT') {
          dr = je.amount_cents;
          totalDebits += dr;
          currentBal += dr;
        } else {
          cr = je.amount_cents;
          totalCredits += cr;
          currentBal -= cr;
        }

        rows.push([
          tx.transaction_date,
          tx.voucher_no,
          tx.description,
          dr > 0 ? formatCurrency(dr, currencySymbol, lang) : '-',
          cr > 0 ? formatCurrency(cr, currencySymbol, lang) : '-',
          formatCurrency(currentBal, currencySymbol, lang),
        ]);
      });
    }

    return {
      reportType,
      titleEn: `Bank Statement - ${accName}`,
      titleBn: `ব্যাংক স্টেটমেন্ট: ${accName}`,
      periodLabel,
      headers: [
        lang === 'bn' ? 'তারিখ' : 'Date',
        lang === 'bn' ? 'ভাউচার' : 'Voucher',
        lang === 'bn' ? 'বিবরণ' : 'Description',
        lang === 'bn' ? 'জমা (Debit)' : 'Debit (+)',
        lang === 'bn' ? 'উত্তোলন (Credit)' : 'Credit (-)',
        lang === 'bn' ? 'চলতি ব্যালেন্স' : 'Running Balance',
      ],
      rows,
      summaryCards: [
        { label: lang === 'bn' ? 'প্রারম্ভিক জমা' : 'Opening Balance', value: formatCurrency(openingBal, currencySymbol, lang), color: 'indigo' },
        { label: lang === 'bn' ? 'মোট জমা (+)' : 'Total Debits (+)', value: formatCurrency(totalDebits, currencySymbol, lang), color: 'emerald' },
        { label: lang === 'bn' ? 'মোট উত্তোলন (-)' : 'Total Credits (-)', value: formatCurrency(totalCredits, currencySymbol, lang), color: 'rose' },
        { label: lang === 'bn' ? 'সমাপনী ব্যালেন্স' : 'Closing Balance', value: formatCurrency(currentBal, currencySymbol, lang), color: 'amber' },
      ],
      validation: emptyValidation,
    };
  }

  // -------------------------------------------------------------
  // 11. Asset Statement
  // -------------------------------------------------------------
  if (reportType === 'ASSET_STATEMENT') {
    let totalAssetsValuation = 0;

    const rows: (string | number)[][] = [];

    // Liquid accounts
    accounts.forEach((acc) => {
      if (acc.is_deleted || !acc.is_active) return;
      if (acc.account_type === 'CASH' || acc.account_type === 'BANK' || acc.account_type === 'MOBILE_WALLET') {
        totalAssetsValuation += acc.current_balance_cents;
        rows.push([
          acc.account_name,
          lang === 'bn' ? 'নগদ ও ব্যাংক অ্যাকাউন্ট' : 'Liquid Cash/Bank',
          getMemberName(acc.owner_member_id),
          'Active',
          formatCurrency(acc.current_balance_cents, currencySymbol, lang),
        ]);
      }
    });

    // Fixed & Investment Assets
    assets.forEach((ast) => {
      if (ast.is_deleted) return;
      totalAssetsValuation += ast.valuation_cents;
      rows.push([
        ast.name,
        ast.type,
        getMemberName(ast.owner_member_id),
        ast.acquisition_date,
        formatCurrency(ast.valuation_cents, currencySymbol, lang),
      ]);
    });

    return {
      reportType,
      titleEn: 'Asset Statement Schedule',
      titleBn: 'সম্পদ বিবরণী ও তালিাক (Asset Statement)',
      periodLabel,
      headers: [
        lang === 'bn' ? 'সম্পদের নাম' : 'Asset Name',
        lang === 'bn' ? 'ধরন' : 'Category/Type',
        lang === 'bn' ? 'মালিক সদস্য' : 'Owner Member',
        lang === 'bn' ? 'তারিখ/স্ট্যাটাস' : 'Acquisition Date',
        lang === 'bn' ? 'বর্তমান মূল্য' : 'Current Valuation',
      ],
      rows,
      summaryCards: [
        { label: lang === 'bn' ? 'মোট অর্জিত সম্পদ' : 'Total Asset Valuation', value: formatCurrency(totalAssetsValuation, currencySymbol, lang), color: 'emerald' },
      ],
      validation: emptyValidation,
    };
  }

  // -------------------------------------------------------------
  // 12. Liability Statement
  // -------------------------------------------------------------
  let totalLiabilitiesAmount = 0;
  const rows: (string | number)[][] = [];

  // Liability accounts
  accounts.forEach((acc) => {
    if (acc.is_deleted || !acc.is_active) return;
    if (acc.account_type === 'LIABILITY') {
      const val = Math.abs(acc.current_balance_cents);
      totalLiabilitiesAmount += val;
      rows.push([
        acc.account_name,
        lang === 'bn' ? 'দায় অ্যাকাউন্ট' : 'Liability Account',
        getMemberName(acc.owner_member_id),
        '-',
        formatCurrency(val, currencySymbol, lang),
      ]);
    }
  });

  // Direct Debts & Loans
  liabilities.forEach((liab) => {
    if (liab.is_deleted) return;
    totalLiabilitiesAmount += liab.amount_cents;
    rows.push([
      liab.name,
      liab.type,
      getMemberName(liab.owner_member_id),
      liab.due_date || '-',
      formatCurrency(liab.amount_cents, currencySymbol, lang),
    ]);
  });

  return {
    reportType,
    titleEn: 'Liability Statement Schedule',
    titleBn: 'দায় বিবরণী ও তালিকা (Liability Statement)',
    periodLabel,
    headers: [
      lang === 'bn' ? 'দায়ের নাম' : 'Liability Name',
      lang === 'bn' ? 'ধরন' : 'Type',
      lang === 'bn' ? 'দায়বদ্ধ সদস্য' : 'Responsible Member',
      lang === 'bn' ? 'পরিশোধের তারিখ' : 'Due Date',
      lang === 'bn' ? 'বকেয়া পরিমাণ' : 'Outstanding Amount',
    ],
    rows,
    summaryCards: [
      { label: lang === 'bn' ? 'মোট দায়' : 'Total Liabilities', value: formatCurrency(totalLiabilitiesAmount, currencySymbol, lang), color: 'rose' },
    ],
    validation: emptyValidation,
  };
}
