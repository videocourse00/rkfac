import { db } from '../../db/dexie';
import type {
  Transaction,
  JournalEntry,
  AllocationRule,
  Category,
  Account,
  FamilyMember,
  Asset,
  Liability,
  OpeningBalance,
  FinancialSummary,
} from '../../types';
import type {
  TransactionClassification,
  IncomeExpenseReport,
  FinancialPositionReport,
  ReceiptsAndPaymentsReport,
  MemberFinancialBreakdown,
  DetailedCategorySummary,
} from './types';
import { resolveAllocationRule } from './rules';
import { validateTransactionPayload } from './validation';

export function takaToPaisa(amountTaka: number | string): number {
  const num = typeof amountTaka === 'string' ? parseFloat(amountTaka) : amountTaka;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function paisaToTaka(amountPaisa: number): number {
  return amountPaisa / 100;
}

export function generateVoucherNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `VCH-${dateStr}-${randomSuffix}`;
}

export interface PostTransactionPayload {
  family_id: string;
  transaction_date: string; // YYYY-MM-DD
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ASSET_PURCHASE' | 'LIABILITY_REPAYMENT';
  description: string;
  total_amount_cents: number;
  category_id?: string;
  allocation_rule_id?: string;
  source_account_id?: string;
  destination_account_id?: string;
  target_member_id?: string;
  payment_method?: string;
  notes?: string;
  accounting_nature?: string;
  receipt_image_uri?: string;
  created_by_member_id?: string;
  voucher_no?: string;
  skip_validation?: boolean;
}

/**
 * 7 - 11: Transaction Classification Helper
 */
export function classifyTransaction(
  type: PostTransactionPayload['type'],
  targetMemberId?: string
): TransactionClassification {
  switch (type) {
    case 'INCOME':
      return 'REVENUE_INCOME';
    case 'EXPENSE':
      return targetMemberId ? 'REVENUE_EXPENSE_PERSONAL' : 'REVENUE_EXPENSE_FAMILY';
    case 'ASSET_PURCHASE':
      return 'CAPITAL_ASSET_PURCHASE';
    case 'LIABILITY_REPAYMENT':
      return 'CAPITAL_LIABILITY_REPAYMENT';
    case 'TRANSFER':
      return 'CAPITAL_BANK_TRANSFER';
    default:
      return 'REVENUE_EXPENSE_FAMILY';
  }
}

/**
 * Core Double-Entry Engine for posting transactions with dynamic rule resolution and double-entry journal creation.
 */
export async function postTransaction(payload: PostTransactionPayload): Promise<Transaction> {
  const voucher_no = payload.voucher_no || generateVoucherNumber();
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Load existing records for validation
  if (!payload.skip_validation) {
    const existingTx = await db.transactions.where('family_id').equals(payload.family_id).toArray();
    const categories = await db.categories.where('family_id').equals(payload.family_id).toArray();
    const accounts = await db.accounts.where('family_id').equals(payload.family_id).toArray();
    const rules = await db.allocationRules.where('family_id').equals(payload.family_id).toArray();

    const validation = validateTransactionPayload(
      { ...payload, voucher_no },
      existingTx,
      categories,
      accounts,
      rules
    );

    if (!validation.isValid) {
      const errMsgs = validation.errors.map((e) => e.message).join('; ');
      throw new Error(`Transaction Validation Failed: ${errMsgs}`);
    }
  }

  // Fetch Category
  let category: Category | undefined;
  if (payload.category_id) {
    category = await db.categories.get(payload.category_id);
  }

  // Resolve Allocation Rule
  let rule: AllocationRule | undefined;
  if (payload.allocation_rule_id) {
    rule = await db.allocationRules.get(payload.allocation_rule_id);
  } else {
    const availableRules = await db.allocationRules
      .where('family_id')
      .equals(payload.family_id)
      .toArray();

    const resolved = resolveAllocationRule(
      payload.transaction_date,
      payload.category_id,
      payload.type,
      category,
      availableRules
    );
    rule = resolved.rule;
  }

  const classification = payload.accounting_nature || classifyTransaction(payload.type, payload.target_member_id);

  const newTransaction: Transaction = {
    id: transactionId,
    family_id: payload.family_id,
    transaction_date: payload.transaction_date,
    voucher_no,
    type: payload.type,
    description: payload.description,
    total_amount_cents: payload.total_amount_cents,
    category_id: payload.category_id || '',
    allocation_rule_id: rule?.id,
    source_account_id: payload.source_account_id,
    destination_account_id: payload.destination_account_id,
    target_member_id: payload.target_member_id,
    payment_method: payload.payment_method || 'CASH',
    notes: payload.notes,
    accounting_nature: classification,
    receipt_image_uri: payload.receipt_image_uri,
    created_by_member_id: payload.created_by_member_id,
    version: 1,
    created_at: now,
    updated_at: now,
    sync_status: 'PENDING',
  };

  const journalEntries: JournalEntry[] = [];

  // 1. Income Allocation
  if (payload.type === 'INCOME') {
    if (rule && rule.allocations && rule.allocations.length > 0) {
      let remainingCents = payload.total_amount_cents;

      for (let i = 0; i < rule.allocations.length; i++) {
        const alloc = rule.allocations[i];
        let splitCents: number;

        if (i === rule.allocations.length - 1) {
          splitCents = remainingCents;
        } else {
          splitCents = Math.round((payload.total_amount_cents * alloc.percentage) / 100);
          remainingCents -= splitCents;
        }

        if (splitCents <= 0) continue;

        // Debit Target Account (Asset/Bank/Cash increases)
        journalEntries.push({
          id: `je_${Date.now()}_${i}_dr`,
          transaction_id: transactionId,
          family_id: payload.family_id,
          account_id: alloc.target_account_id,
          member_id: alloc.target_member_id || payload.target_member_id,
          entry_type: 'DEBIT',
          split_percentage: alloc.percentage,
          amount_cents: splitCents,
          description: `${payload.description} (${alloc.percentage}%)`,
          created_at: now,
        });
      }
    } else if (payload.destination_account_id) {
      journalEntries.push({
        id: `je_${Date.now()}_dest_dr`,
        transaction_id: transactionId,
        family_id: payload.family_id,
        account_id: payload.destination_account_id,
        member_id: payload.target_member_id || payload.created_by_member_id,
        entry_type: 'DEBIT',
        amount_cents: payload.total_amount_cents,
        description: payload.description,
        created_at: now,
      });
    }
  }

  // 2 & 3. Family & Personal Expense Allocation
  else if (payload.type === 'EXPENSE') {
    if (rule && rule.allocations && rule.allocations.length > 0) {
      let remainingCents = payload.total_amount_cents;

      for (let i = 0; i < rule.allocations.length; i++) {
        const alloc = rule.allocations[i];
        let splitCents: number;

        if (i === rule.allocations.length - 1) {
          splitCents = remainingCents;
        } else {
          splitCents = Math.round((payload.total_amount_cents * alloc.percentage) / 100);
          remainingCents -= splitCents;
        }

        if (splitCents <= 0) continue;

        // Credit Source Account (Bank/Cash decreases)
        journalEntries.push({
          id: `je_${Date.now()}_${i}_cr`,
          transaction_id: transactionId,
          family_id: payload.family_id,
          account_id: alloc.target_account_id,
          member_id: alloc.target_member_id || payload.target_member_id,
          entry_type: 'CREDIT',
          split_percentage: alloc.percentage,
          amount_cents: splitCents,
          description: `${payload.description} (${alloc.percentage}%)`,
          created_at: now,
        });
      }
    } else if (payload.source_account_id) {
      journalEntries.push({
        id: `je_${Date.now()}_src_cr`,
        transaction_id: transactionId,
        family_id: payload.family_id,
        account_id: payload.source_account_id,
        member_id: payload.target_member_id || payload.created_by_member_id,
        entry_type: 'CREDIT',
        amount_cents: payload.total_amount_cents,
        description: payload.description,
        created_at: now,
      });
    }
  }

  // 9. Asset Recognition
  else if (payload.type === 'ASSET_PURCHASE') {
    if (payload.source_account_id) {
      // Credit Cash/Bank
      journalEntries.push({
        id: `je_${Date.now()}_asset_cr`,
        transaction_id: transactionId,
        family_id: payload.family_id,
        account_id: payload.source_account_id,
        member_id: payload.target_member_id,
        entry_type: 'CREDIT',
        amount_cents: payload.total_amount_cents,
        description: `Asset Purchase Outflow: ${payload.description}`,
        created_at: now,
      });
    }
    if (payload.destination_account_id) {
      // Debit Asset Account
      journalEntries.push({
        id: `je_${Date.now()}_asset_dr`,
        transaction_id: transactionId,
        family_id: payload.family_id,
        account_id: payload.destination_account_id,
        member_id: payload.target_member_id,
        entry_type: 'DEBIT',
        amount_cents: payload.total_amount_cents,
        description: `Asset Recognition: ${payload.description}`,
        created_at: now,
      });
    }
  }

  // 10. Liability Recognition / Repayment
  else if (payload.type === 'LIABILITY_REPAYMENT') {
    if (payload.source_account_id) {
      // Credit Cash/Bank
      journalEntries.push({
        id: `je_${Date.now()}_liab_cr`,
        transaction_id: transactionId,
        family_id: payload.family_id,
        account_id: payload.source_account_id,
        member_id: payload.target_member_id,
        entry_type: 'CREDIT',
        amount_cents: payload.total_amount_cents,
        description: `Liability Repayment: ${payload.description}`,
        created_at: now,
      });
    }
    if (payload.destination_account_id) {
      // Debit Liability Account (reduces liability)
      journalEntries.push({
        id: `je_${Date.now()}_liab_dr`,
        transaction_id: transactionId,
        family_id: payload.family_id,
        account_id: payload.destination_account_id,
        member_id: payload.target_member_id,
        entry_type: 'DEBIT',
        amount_cents: payload.total_amount_cents,
        description: `Liability Account Offset: ${payload.description}`,
        created_at: now,
      });
    }
  }

  // 11. Bank Transfer Classification
  else if (payload.type === 'TRANSFER' && payload.source_account_id && payload.destination_account_id) {
    // Credit Source Account
    journalEntries.push({
      id: `je_${Date.now()}_tr_cr`,
      transaction_id: transactionId,
      family_id: payload.family_id,
      account_id: payload.source_account_id,
      entry_type: 'CREDIT',
      amount_cents: payload.total_amount_cents,
      description: `Transfer Out: ${payload.description}`,
      created_at: now,
    });

    // Debit Destination Account
    journalEntries.push({
      id: `je_${Date.now()}_tr_dr`,
      transaction_id: transactionId,
      family_id: payload.family_id,
      account_id: payload.destination_account_id,
      entry_type: 'DEBIT',
      amount_cents: payload.total_amount_cents,
      description: `Transfer In: ${payload.description}`,
      created_at: now,
    });
  }

  // Execute Atomic Database Write Transaction
  await db.transaction('rw', [db.transactions, db.journalEntries, db.accounts, db.syncQueue], async () => {
    await db.transactions.put(newTransaction);

    for (const entry of journalEntries) {
      await db.journalEntries.put(entry);

      const account = await db.accounts.get(entry.account_id);
      if (account) {
        let delta = 0;
        if (entry.entry_type === 'DEBIT') {
          delta = entry.amount_cents;
        } else {
          delta = -entry.amount_cents;
        }

        const updatedBalance = account.current_balance_cents + delta;
        await db.accounts.update(account.id, {
          current_balance_cents: updatedBalance,
          updated_at: now,
        });
      }
    }

    await db.syncQueue.put({
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      table_name: 'transactions',
      operation: 'INSERT',
      record_id: newTransaction.id,
      payload: JSON.stringify(newTransaction),
      timestamp: now,
      retry_count: 0,
    });
  });

  return newTransaction;
}

/**
 * Delete transaction locally, revert account balance adjustments, and queue for cloud deletion
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
  const tx = await db.transactions.get(transactionId);
  if (!tx) return;

  const now = new Date().toISOString();

  await db.transaction('rw', [db.transactions, db.journalEntries, db.accounts, db.syncQueue], async () => {
    // Reverse journal entry effects
    const entries = await db.journalEntries.where('transaction_id').equals(transactionId).toArray();
    for (const entry of entries) {
      const account = await db.accounts.get(entry.account_id);
      if (account) {
        let reverseDelta = 0;
        if (entry.entry_type === 'DEBIT') {
          reverseDelta = -entry.amount_cents;
        } else {
          reverseDelta = entry.amount_cents;
        }
        await db.accounts.update(account.id, {
          current_balance_cents: account.current_balance_cents + reverseDelta,
          updated_at: now,
        });
      }
      await db.journalEntries.delete(entry.id);
    }

    await db.transactions.delete(transactionId);

    await db.syncQueue.put({
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      table_name: 'transactions',
      operation: 'DELETE',
      record_id: transactionId,
      payload: JSON.stringify({ id: transactionId }),
      timestamp: now,
      retry_count: 0,
    });
  });
}

/**
 * 12 & 13: Initialize Opening Balances for Assets & Liabilities
 */
export async function initializeOpeningBalance(
  accountId: string,
  asOfDate: string,
  balanceCents: number
): Promise<OpeningBalance> {
  const account = await db.accounts.get(accountId);
  if (!account) {
    throw new Error(`Account '${accountId}' not found.`);
  }

  const obRecord: OpeningBalance = {
    id: `ob_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    account_id: accountId,
    as_of_date: asOfDate,
    balance_cents: balanceCents,
    created_at: new Date().toISOString(),
  };

  await db.transaction('rw', [db.accounts, db.openingBalances], async () => {
    await db.openingBalances.put(obRecord);
    await db.accounts.update(accountId, {
      opening_balance_cents: balanceCents,
      current_balance_cents: balanceCents,
      updated_at: new Date().toISOString(),
    });
  });

  return obRecord;
}

/**
 * 4, 5, 6: Member-Wise Income, Expense, and Savings Calculation
 */
export async function calculateMemberFinancials(
  familyId: string
): Promise<MemberFinancialBreakdown[]> {
  const members = await db.familyMembers.where('family_id').equals(familyId).toArray();
  const journalEntries = await db.journalEntries.where('family_id').equals(familyId).toArray();
  const transactions = await db.transactions.where('family_id').equals(familyId).toArray();

  const breakdowns: MemberFinancialBreakdown[] = [];

  for (const member of members) {
    if (member.is_deleted) continue;

    let total_income_cents = 0;
    let total_personal_expense_cents = 0;
    let total_family_expense_share_cents = 0;

    // Process Journal Entries tagged to this member
    for (const je of journalEntries) {
      if (je.is_deleted) continue;
      const tx = transactions.find((t) => t.id === je.transaction_id);
      if (!tx || tx.is_deleted) continue;

      if (je.member_id === member.id) {
        if (tx.type === 'INCOME' && je.entry_type === 'DEBIT') {
          total_income_cents += je.amount_cents;
        } else if (tx.type === 'EXPENSE' && je.entry_type === 'CREDIT') {
          if (tx.created_by_member_id === member.id && !je.split_percentage) {
            total_personal_expense_cents += je.amount_cents;
          } else {
            total_family_expense_share_cents += je.amount_cents;
          }
        }
      }
    }

    const total_expense_cents = total_personal_expense_cents + total_family_expense_share_cents;
    const net_savings_cents = total_income_cents - total_expense_cents;

    // Calculate sum of balances in accounts owned by this member
    const memberAccounts = await db.accounts
      .where('family_id')
      .equals(familyId)
      .filter((a) => a.owner_member_id === member.id && !a.is_deleted)
      .toArray();

    const allocated_accounts_balance_cents = memberAccounts.reduce(
      (sum, acc) => sum + acc.current_balance_cents,
      0
    );

    breakdowns.push({
      member_id: member.id,
      member_name: member.name,
      total_income_cents,
      total_personal_expense_cents,
      total_family_expense_share_cents,
      total_expense_cents,
      net_savings_cents,
      allocated_accounts_balance_cents,
    });
  }

  return breakdowns;
}

/**
 * 17: Detailed Income & Expense Statement Calculation
 */
export async function calculateDetailedIncomeExpense(
  familyId: string,
  periodLabel = 'All-Time'
): Promise<IncomeExpenseReport> {
  const categories = await db.categories.where('family_id').equals(familyId).toArray();
  const transactions = await db.transactions.where('family_id').equals(familyId).toArray();

  const incomeMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();

  let total_income_cents = 0;
  let total_expense_cents = 0;

  for (const tx of transactions) {
    if (tx.is_deleted) continue;

    if (tx.type === 'INCOME') {
      total_income_cents += tx.total_amount_cents;
      const current = incomeMap.get(tx.category_id) || 0;
      incomeMap.set(tx.category_id, current + tx.total_amount_cents);
    } else if (tx.type === 'EXPENSE') {
      total_expense_cents += tx.total_amount_cents;
      const current = expenseMap.get(tx.category_id) || 0;
      expenseMap.set(tx.category_id, current + tx.total_amount_cents);
    }
  }

  const income_categories: DetailedCategorySummary[] = [];
  const expense_categories: DetailedCategorySummary[] = [];

  for (const cat of categories) {
    if (cat.type === 'INCOME' && incomeMap.has(cat.id)) {
      income_categories.push({
        category_id: cat.id,
        category_name_en: cat.name_en,
        category_name_bn: cat.name_bn,
        category_type: cat.type,
        total_cents: incomeMap.get(cat.id) || 0,
      });
    } else if (cat.type === 'EXPENSE' && expenseMap.has(cat.id)) {
      expense_categories.push({
        category_id: cat.id,
        category_name_en: cat.name_en,
        category_name_bn: cat.name_bn,
        category_type: cat.type,
        total_cents: expenseMap.get(cat.id) || 0,
      });
    }
  }

  const member_breakdowns = await calculateMemberFinancials(familyId);

  return {
    period_label: periodLabel,
    income_categories,
    expense_categories,
    total_income_cents,
    total_expense_cents,
    net_surplus_cents: total_income_cents - total_expense_cents,
    member_breakdowns,
  };
}

/**
 * 15: Financial Position (Balance Sheet) Calculation
 */
export async function calculateFinancialPosition(
  familyId: string,
  asOfDate = new Date().toISOString().slice(0, 10)
): Promise<FinancialPositionReport> {
  const accounts = await db.accounts.where('family_id').equals(familyId).toArray();
  const assets = await db.assets.where('family_id').equals(familyId).toArray();
  const liabilities = await db.liabilities.where('family_id').equals(familyId).toArray();
  const ieReport = await calculateDetailedIncomeExpense(familyId);

  const cash_and_bank_accounts: Account[] = [];
  const family_fund_accounts: Account[] = [];
  const personal_savings_accounts: Account[] = [];
  const liability_accounts: Account[] = [];

  let total_liquid_assets_cents = 0;
  let total_family_fund_cents = 0;
  let total_personal_savings_cents = 0;
  let total_account_liabilities_cents = 0;
  let opening_baseline_equity_cents = 0;

  for (const acc of accounts) {
    if (acc.is_deleted || !acc.is_active) continue;

    if (acc.account_type !== 'LIABILITY') {
      cash_and_bank_accounts.push(acc);
      total_liquid_assets_cents += acc.current_balance_cents;
      opening_baseline_equity_cents += acc.opening_balance_cents;
      if (acc.account_type === 'FAMILY_FUND') {
        family_fund_accounts.push(acc);
        total_family_fund_cents += acc.current_balance_cents;
      } else if (acc.account_type === 'PERSONAL_SAVINGS') {
        personal_savings_accounts.push(acc);
        total_personal_savings_cents += acc.current_balance_cents;
      }
    } else {
      liability_accounts.push(acc);
      total_account_liabilities_cents += Math.abs(acc.current_balance_cents);
      opening_baseline_equity_cents -= acc.opening_balance_cents;
    }
  }

  const fixed_and_investment_assets = assets.filter((a) => !a.is_deleted);
  const total_fixed_assets_cents = fixed_and_investment_assets.reduce(
    (sum, a) => sum + a.valuation_cents,
    0
  );

  const debts_and_loans = liabilities.filter((l) => !l.is_deleted);
  const total_direct_liabilities_cents = debts_and_loans.reduce(
    (sum, l) => sum + l.amount_cents,
    0
  );

  const total_assets_cents = total_liquid_assets_cents + total_fixed_assets_cents;
  const total_liabilities_cents = total_account_liabilities_cents + total_direct_liabilities_cents;

  const cumulative_retained_surplus_cents = ieReport.net_surplus_cents;
  const total_family_fund_and_equity_cents =
    opening_baseline_equity_cents + cumulative_retained_surplus_cents;

  const discrepancy_cents =
    total_assets_cents - (total_liabilities_cents + total_family_fund_and_equity_cents);

  return {
    as_of_date: asOfDate,
    assets: {
      cash_and_bank_accounts,
      fixed_and_investment_assets,
      total_assets_cents,
    },
    liabilities: {
      debts_and_loans,
      liability_accounts,
      total_liabilities_cents,
    },
    equity_and_fund: {
      family_fund_accounts,
      personal_savings_accounts,
      cumulative_retained_surplus_cents,
      total_family_fund_and_equity_cents,
    },
    is_balanced: Math.abs(discrepancy_cents) === 0,
    discrepancy_cents,
  };
}

/**
 * 16: Statement of Receipts & Payments Calculation
 */
export async function calculateReceiptsAndPayments(
  familyId: string,
  periodLabel = 'All-Time'
): Promise<ReceiptsAndPaymentsReport> {
  const accounts = await db.accounts.where('family_id').equals(familyId).toArray();
  const transactions = await db.transactions.where('family_id').equals(familyId).toArray();
  const categories = await db.categories.where('family_id').equals(familyId).toArray();

  let opening_cash_bank_cents = 0;
  let closing_cash_bank_cents = 0;

  for (const acc of accounts) {
    if (acc.is_deleted) continue;
    if (acc.account_type === 'CASH' || acc.account_type === 'BANK' || acc.account_type === 'MOBILE_WALLET') {
      opening_cash_bank_cents += acc.opening_balance_cents;
      closing_cash_bank_cents += acc.current_balance_cents;
    }
  }

  const receiptsMap = new Map<string, number>();
  const paymentsMap = new Map<string, number>();

  let total_receipts_cents = 0;
  let total_payments_cents = 0;

  for (const tx of transactions) {
    if (tx.is_deleted) continue;

    if (tx.type === 'INCOME') {
      total_receipts_cents += tx.total_amount_cents;
      const current = receiptsMap.get(tx.category_id) || 0;
      receiptsMap.set(tx.category_id, current + tx.total_amount_cents);
    } else if (tx.type === 'EXPENSE' || tx.type === 'ASSET_PURCHASE' || tx.type === 'LIABILITY_REPAYMENT') {
      total_payments_cents += tx.total_amount_cents;
      const current = paymentsMap.get(tx.category_id) || 0;
      paymentsMap.set(tx.category_id, current + tx.total_amount_cents);
    }
  }

  const receipts: DetailedCategorySummary[] = [];
  const payments: DetailedCategorySummary[] = [];

  for (const cat of categories) {
    if (receiptsMap.has(cat.id)) {
      receipts.push({
        category_id: cat.id,
        category_name_en: cat.name_en,
        category_name_bn: cat.name_bn,
        category_type: cat.type,
        total_cents: receiptsMap.get(cat.id) || 0,
      });
    }
    if (paymentsMap.has(cat.id)) {
      payments.push({
        category_id: cat.id,
        category_name_en: cat.name_en,
        category_name_bn: cat.name_bn,
        category_type: cat.type,
        total_cents: paymentsMap.get(cat.id) || 0,
      });
    }
  }

  const expectedClosing = opening_cash_bank_cents + total_receipts_cents - total_payments_cents;
  const is_reconciled = expectedClosing === closing_cash_bank_cents;

  return {
    period_label: periodLabel,
    opening_cash_bank_cents,
    receipts,
    total_receipts_cents,
    payments,
    total_payments_cents,
    closing_cash_bank_cents,
    is_reconciled,
  };
}

/**
 * 14: Calculates Family Fund Summary
 */
export async function calculateFinancialSummary(familyId: string): Promise<FinancialSummary> {
  const fpReport = await calculateFinancialPosition(familyId);
  const ieReport = await calculateDetailedIncomeExpense(familyId);

  return {
    total_assets_cents: fpReport.assets.total_assets_cents,
    total_liabilities_cents: fpReport.liabilities.total_liabilities_cents,
    total_family_fund_cents: fpReport.equity_and_fund.family_fund_accounts.reduce(
      (s, a) => s + a.current_balance_cents,
      0
    ),
    total_personal_savings_cents: fpReport.equity_and_fund.personal_savings_accounts.reduce(
      (s, a) => s + a.current_balance_cents,
      0
    ),
    period_income_cents: ieReport.total_income_cents,
    period_expense_cents: ieReport.total_expense_cents,
    net_surplus_cents: ieReport.net_surplus_cents,
  };
}
