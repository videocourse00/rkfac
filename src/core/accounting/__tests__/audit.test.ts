import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../../db/dexie';
import { validateAllocationRule, resolveAllocationRule } from '../rules';
import {
  validateTransactionPayload,
  validateFinancialPositionBalance,
} from '../validation';
import {
  postTransaction,
  calculateMemberFinancials,
  calculateDetailedIncomeExpense,
  calculateFinancialPosition,
  calculateReceiptsAndPayments,
} from '../engine';
import type { AllocationRule, Category, Account, FamilyMember, Transaction } from '../../../types';

describe('Production Audit - Complete Accounting Test Cases (A - O)', () => {
  const familyId = 'fam_audit_test';

  beforeEach(async () => {
    await db.delete();
    await db.open();

    // Seed Family Profile
    await db.familyProfile.put({
      id: familyId,
      family_name: 'Audit Family',
      currency_symbol: '৳',
      currency_code: 'BDT',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
  });

  it('Test Case A & B: Income = 100,000, Family Expense = 20,000', async () => {
    const accCash: Account = {
      id: 'acc_cash_1',
      family_id: familyId,
      account_name: 'Main Cash',
      account_type: 'CASH',
      opening_balance_cents: 0,
      current_balance_cents: 0,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    await db.accounts.put(accCash);

    const catSalary: Category = {
      id: 'cat_salary',
      family_id: familyId,
      type: 'INCOME',
      name_en: 'Salary',
      name_bn: 'বেতন',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const catGroceries: Category = {
      id: 'cat_groceries',
      family_id: familyId,
      type: 'EXPENSE',
      name_en: 'Groceries',
      name_bn: 'বাজার',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    await db.categories.bulkPut([catSalary, catGroceries]);

    // Test Case A: Income = 100,000 (10,000,000 cents)
    await postTransaction({
      family_id: familyId,
      transaction_date: '2026-08-01',
      type: 'INCOME',
      total_amount_cents: 10000000,
      category_id: 'cat_salary',
      destination_account_id: 'acc_cash_1',
      description: 'Monthly Income',
      skip_validation: true,
    });

    // Test Case B: Family Expense = 20,000 (2,000,000 cents)
    await postTransaction({
      family_id: familyId,
      transaction_date: '2026-08-05',
      type: 'EXPENSE',
      total_amount_cents: 2000000,
      category_id: 'cat_groceries',
      source_account_id: 'acc_cash_1',
      description: 'Family Groceries',
      skip_validation: true,
    });

    const ieReport = await calculateDetailedIncomeExpense(familyId);
    expect(ieReport.total_income_cents).toBe(10000000); // ৳100,000
    expect(ieReport.total_expense_cents).toBe(2000000);  // ৳20,000
    expect(ieReport.net_surplus_cents).toBe(8000000);    // ৳80,000 Net Surplus
  });

  it('Test Case C: Allocation = 60/40 Split of Income across 2 Accounts', async () => {
    const accFamFund: Account = {
      id: 'acc_fam_fund',
      family_id: familyId,
      account_name: 'Family Fund Account',
      account_type: 'FAMILY_FUND',
      opening_balance_cents: 0,
      current_balance_cents: 0,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const accMemSavings: Account = {
      id: 'acc_mem_savings',
      family_id: familyId,
      account_name: 'Member Savings Account',
      account_type: 'PERSONAL_SAVINGS',
      opening_balance_cents: 0,
      current_balance_cents: 0,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    await db.accounts.bulkPut([accFamFund, accMemSavings]);

    const catIncome: Category = {
      id: 'cat_income_split',
      family_id: familyId,
      type: 'INCOME',
      name_en: 'General Income',
      name_bn: 'সাধারণ আয়',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    await db.categories.put(catIncome);

    const rule6040: AllocationRule = {
      id: 'rule_60_40',
      family_id: familyId,
      rule_name: '60/40 Split Rule',
      source_category_id: 'cat_income_split',
      effective_from: '2026-01-01',
      allocations: [
        { target_account_id: 'acc_fam_fund', percentage: 60 },
        { target_account_id: 'acc_mem_savings', percentage: 40 },
      ],
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    await db.allocationRules.put(rule6040);

    // Income 100,000 (10,000,000 cents)
    await postTransaction({
      family_id: familyId,
      transaction_date: '2026-08-01',
      type: 'INCOME',
      total_amount_cents: 10000000,
      category_id: 'cat_income_split',
      allocation_rule_id: 'rule_60_40',
      description: 'Allocated Income 100k',
      skip_validation: true,
    });

    const updatedFamAcc = await db.accounts.get('acc_fam_fund');
    const updatedMemAcc = await db.accounts.get('acc_mem_savings');

    expect(updatedFamAcc?.current_balance_cents).toBe(6000000); // ৳60,000
    expect(updatedMemAcc?.current_balance_cents).toBe(4000000); // ৳40,000
  });

  it('Test Case D: Personal Expense targeting Member 1', async () => {
    const mem1: FamilyMember = {
      id: 'mem_1',
      family_id: familyId,
      name: 'Ibrahim',
      relation: 'Self',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    await db.familyMembers.put(mem1);

    const accCash: Account = {
      id: 'acc_cash_personal',
      family_id: familyId,
      account_name: 'Cash',
      account_type: 'CASH',
      opening_balance_cents: 5000000, // ৳50,000
      current_balance_cents: 5000000,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    await db.accounts.put(accCash);

    const catPersonal: Category = {
      id: 'cat_personal',
      family_id: familyId,
      type: 'EXPENSE',
      name_en: 'Personal Expense',
      name_bn: 'ব্যক্তিগত খরচ',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    await db.categories.put(catPersonal);

    // Post personal expense 5,000 (500,000 cents) for mem_1
    await postTransaction({
      family_id: familyId,
      transaction_date: '2026-08-02',
      type: 'EXPENSE',
      total_amount_cents: 500000,
      category_id: 'cat_personal',
      source_account_id: 'acc_cash_personal',
      target_member_id: 'mem_1',
      description: 'Personal Book Purchase',
      skip_validation: true,
    });

    const memberFinancials = await calculateMemberFinancials(familyId);
    const m1Data = memberFinancials.find((m) => m.member_id === 'mem_1');

    expect(m1Data).toBeDefined();
    expect(m1Data?.total_expense_cents).toBe(500000); // ৳5,000
  });

  it('Test Case E: Bank Transfer - Ensures NO Double Counting', async () => {
    const accBank1: Account = {
      id: 'acc_bank_1',
      family_id: familyId,
      account_name: 'Dutch Bangla Bank',
      account_type: 'BANK',
      opening_balance_cents: 10000000, // ৳100,000
      current_balance_cents: 10000000,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const accBank2: Account = {
      id: 'acc_bank_2',
      family_id: familyId,
      account_name: 'Islami Bank',
      account_type: 'BANK',
      opening_balance_cents: 2000000, // ৳20,000
      current_balance_cents: 2000000,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    await db.accounts.bulkPut([accBank1, accBank2]);

    // Transfer 10,000 (1,000,000 cents) from Bank 1 to Bank 2
    await postTransaction({
      family_id: familyId,
      transaction_date: '2026-08-03',
      type: 'TRANSFER',
      total_amount_cents: 1000000,
      source_account_id: 'acc_bank_1',
      destination_account_id: 'acc_bank_2',
      description: 'Inter-bank fund transfer',
      skip_validation: true,
    });

    const b1 = await db.accounts.get('acc_bank_1');
    const b2 = await db.accounts.get('acc_bank_2');

    expect(b1?.current_balance_cents).toBe(9000000); // ৳90,000
    expect(b2?.current_balance_cents).toBe(3000000); // ৳30,000

    // Net assets = 90,000 + 30,000 = 120,000 (Unchanged!)
    const ieReport = await calculateDetailedIncomeExpense(familyId);
    expect(ieReport.total_income_cents).toBe(0);
    expect(ieReport.total_expense_cents).toBe(0);
  });

  it('Test Case F, G, H, I: Opening Assets, Liabilities, Family Fund & Financial Position Equation', async () => {
    // Opening Assets: Bank 50,000 (5,000,000 cents)
    const accBank: Account = {
      id: 'acc_bank_init',
      family_id: familyId,
      account_name: 'City Bank',
      account_type: 'BANK',
      opening_balance_cents: 5000000,
      current_balance_cents: 5000000,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    // Opening Liabilities: Loan 10,000 (1,000,000 cents)
    const accLoan: Account = {
      id: 'acc_loan_init',
      family_id: familyId,
      account_name: 'Personal Loan',
      account_type: 'LIABILITY',
      opening_balance_cents: 1000000,
      current_balance_cents: 1000000,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    await db.accounts.bulkPut([accBank, accLoan]);

    // Financial Position Balance Check
    const fpReport = await calculateFinancialPosition(familyId);

    // Assets = 50,000
    expect(fpReport.assets.total_assets_cents).toBe(5000000);
    // Liabilities = 10,000
    expect(fpReport.liabilities.total_liabilities_cents).toBe(1000000);
    // Opening Family Fund Equity = 50,000 - 10,000 = 40,000
    expect(fpReport.equity_and_fund.total_family_fund_and_equity_cents).toBe(4000000);

    // Check Balance Sheet Equation: Assets (50,000) === Liabilities (10,000) + Equity (40,000)
    expect(fpReport.is_balanced).toBe(true);
    expect(fpReport.discrepancy_cents).toBe(0);
    expect(validateFinancialPositionBalance(fpReport).isValid).toBe(true);
  });

  it('Test Case J: Historical Rule Precedence & Effective From Dates', async () => {
    const generalCat: Category = {
      id: 'cat_gen',
      family_id: familyId,
      type: 'INCOME',
      name_en: 'General Income',
      name_bn: 'সাধারণ আয়',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const ruleJan: AllocationRule = {
      id: 'rule_jan',
      family_id: familyId,
      rule_name: 'January Rule (60/40)',
      source_category_id: 'cat_gen',
      effective_from: '2026-01-01',
      allocations: [
        { target_account_id: 'acc_1', percentage: 60 },
        { target_account_id: 'acc_2', percentage: 40 },
      ],
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const ruleJun: AllocationRule = {
      id: 'rule_jun',
      family_id: familyId,
      rule_name: 'June Rule (50/50)',
      source_category_id: 'cat_gen',
      effective_from: '2026-06-01',
      allocations: [
        { target_account_id: 'acc_1', percentage: 50 },
        { target_account_id: 'acc_2', percentage: 50 },
      ],
      is_active: true,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    };

    const rules = [ruleJan, ruleJun];

    // March transaction -> Should pick Jan rule (60/40)
    const resolvedMar = resolveAllocationRule('2026-03-15', 'cat_gen', 'INCOME', generalCat, rules);
    expect(resolvedMar.rule?.id).toBe('rule_jan');
    expect(resolvedMar.rule?.allocations[0].percentage).toBe(60);

    // July transaction -> Should pick Jun rule (50/50)
    const resolvedJul = resolveAllocationRule('2026-07-15', 'cat_gen', 'INCOME', generalCat, rules);
    expect(resolvedJul.rule?.id).toBe('rule_jun');
    expect(resolvedJul.rule?.allocations[0].percentage).toBe(50);
  });

  it('Test Case K: 3 Family Members Allocation Rule (50% / 30% / 20%)', async () => {
    const rule3Members: Partial<AllocationRule> = {
      rule_name: '3 Member Split Rule',
      allocations: [
        { target_account_id: 'acc_m1', percentage: 50 },
        { target_account_id: 'acc_m2', percentage: 30 },
        { target_account_id: 'acc_m3', percentage: 20 },
      ],
    };

    const err = validateAllocationRule(rule3Members);
    expect(err).toBeNull(); // Valid!
  });

  it('Test Case L: 5 Family Members Allocation Rule (20% x 5)', async () => {
    const rule5Members: Partial<AllocationRule> = {
      rule_name: '5 Member Split Rule',
      allocations: [
        { target_account_id: 'acc_m1', percentage: 20 },
        { target_account_id: 'acc_m2', percentage: 20 },
        { target_account_id: 'acc_m3', percentage: 20 },
        { target_account_id: 'acc_m4', percentage: 20 },
        { target_account_id: 'acc_m5', percentage: 20 },
      ],
    };

    const err = validateAllocationRule(rule5Members);
    expect(err).toBeNull(); // Valid!
  });

  it('Test Case M & N: Invalid Percentage Allocations (90% and 110%)', () => {
    const rule90: Partial<AllocationRule> = {
      rule_name: '90% Rule',
      allocations: [
        { target_account_id: 'acc_1', percentage: 50 },
        { target_account_id: 'acc_2', percentage: 40 },
      ],
    };
    const err90 = validateAllocationRule(rule90);
    expect(err90).not.toBeNull();
    expect(err90?.code).toBe('INVALID_PERCENTAGE');

    const rule110: Partial<AllocationRule> = {
      rule_name: '110% Rule',
      allocations: [
        { target_account_id: 'acc_1', percentage: 60 },
        { target_account_id: 'acc_2', percentage: 50 },
      ],
    };
    const err110 = validateAllocationRule(rule110);
    expect(err110).not.toBeNull();
    expect(err110?.code).toBe('INVALID_PERCENTAGE');
  });

  it('Test Case O: Offline Transaction Queuing and Local DB Sync Status', async () => {
    const accCash: Account = {
      id: 'acc_cash_offline',
      family_id: familyId,
      account_name: 'Cash Box',
      account_type: 'CASH',
      opening_balance_cents: 0,
      current_balance_cents: 0,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    await db.accounts.put(accCash);

    const catInc: Category = {
      id: 'cat_offline_inc',
      family_id: familyId,
      type: 'INCOME',
      name_en: 'Offline Income',
      name_bn: 'অফলাইন আয়',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    await db.categories.put(catInc);

    // Post transaction while offline
    const tx = await postTransaction({
      family_id: familyId,
      transaction_date: '2026-08-10',
      type: 'INCOME',
      total_amount_cents: 1500000, // ৳15,000
      category_id: 'cat_offline_inc',
      destination_account_id: 'acc_cash_offline',
      description: 'Offline Payment Received',
      skip_validation: true,
    });

    // Verify transaction in Dexie has sync_status = 'PENDING'
    const storedTx = await db.transactions.get(tx.id);
    expect(storedTx?.sync_status).toBe('PENDING');

    // Verify syncQueue item created
    const queueItems = await db.syncQueue.where('record_id').equals(tx.id).toArray();
    expect(queueItems.length).toBeGreaterThan(0);
    expect(queueItems[0].table_name).toBe('transactions');
  });
});
