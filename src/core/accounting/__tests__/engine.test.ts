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
  classifyTransaction,
  calculateMemberFinancials,
  calculateDetailedIncomeExpense,
  calculateFinancialPosition,
  calculateReceiptsAndPayments,
} from '../engine';
import type { AllocationRule, Category, Account, FamilyMember } from '../../../types';

describe('Core Accounting Engine Unit Tests', () => {
  beforeEach(async () => {
    // Clear in-memory database before each test
    await db.delete();
    await db.open();
  });

  describe('1. Rule Percentage & Precedence Validation', () => {
    it('rejects allocation rules where total split percentage != 100%', () => {
      const invalidRule: Partial<AllocationRule> = {
        rule_name: 'Invalid 90% Rule',
        allocations: [
          { target_account_id: 'acc_1', percentage: 60 },
          { target_account_id: 'acc_2', percentage: 30 },
        ],
      };

      const result = validateAllocationRule(invalidRule);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_PERCENTAGE');
      expect(result?.message).toContain('Current total is 90.00%');
    });

    it('accepts allocation rules where total split percentage equals exactly 100%', () => {
      const validRule: Partial<AllocationRule> = {
        rule_name: 'Valid 100% Rule',
        allocations: [
          { target_account_id: 'acc_1', percentage: 60 },
          { target_account_id: 'acc_2', percentage: 40 },
        ],
      };

      const result = validateAllocationRule(validRule);
      expect(result).toBeNull();
    });

    it('ensures specific category rules OVERRIDE general rules', () => {
      const generalRule: AllocationRule = {
        id: 'rule_general_exp',
        family_id: 'fam_1',
        rule_name: 'General Family Expense Split (60/40)',
        source_category_id: 'EXPENSE',
        effective_from: '2026-01-01',
        priority: 1,
        allocations: [
          { target_account_id: 'acc_member_a', percentage: 60 },
          { target_account_id: 'acc_member_b', percentage: 40 },
        ],
        is_active: true,
        version: 1,
        sync_status: 'SYNCED',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      const specificEducationRule: AllocationRule = {
        id: 'rule_specific_edu',
        family_id: 'fam_1',
        rule_name: 'Education Specific Split (50/50)',
        source_category_id: 'cat_education',
        effective_from: '2026-01-01',
        priority: 1,
        allocations: [
          { target_account_id: 'acc_member_a', percentage: 50 },
          { target_account_id: 'acc_member_b', percentage: 50 },
        ],
        is_active: true,
        version: 1,
        sync_status: 'SYNCED',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      const rules = [generalRule, specificEducationRule];

      const eduCategory: Category = {
        id: 'cat_education',
        family_id: 'fam_1',
        type: 'EXPENSE',
        name_en: 'Education',
        name_bn: 'শিক্ষা',
        is_active: true,
        version: 1,
        sync_status: 'SYNCED',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      // Query for an Education Expense transaction
      const resolved = resolveAllocationRule(
        '2026-08-13',
        'cat_education',
        'EXPENSE',
        eduCategory,
        rules
      );

      expect(resolved.overrideType).toBe('CATEGORY_SPECIFIC');
      expect(resolved.rule?.id).toBe('rule_specific_edu');
      expect(resolved.rule?.allocations[0].percentage).toBe(50);
      expect(resolved.rule?.allocations[1].percentage).toBe(50);
    });
  });

  describe('2. Transaction Payload & Error Validation', () => {
    it('detects negative or non-integer amounts', () => {
      const val = validateTransactionPayload(
        {
          family_id: 'fam_1',
          transaction_date: '2026-08-13',
          type: 'EXPENSE',
          total_amount_cents: -500,
          category_id: 'cat_1',
          description: 'Invalid negative test',
        },
        [],
        [],
        [],
        []
      );

      expect(val.isValid).toBe(false);
      expect(val.errors[0].code).toBe('INVALID_AMOUNT');
    });

    it('detects missing category for expense transaction', () => {
      const val = validateTransactionPayload(
        {
          family_id: 'fam_1',
          transaction_date: '2026-08-13',
          type: 'EXPENSE',
          total_amount_cents: 1000,
          category_id: '',
          description: 'No category test',
        },
        [],
        [],
        [],
        []
      );

      expect(val.isValid).toBe(false);
      expect(val.errors[0].code).toBe('MISSING_CATEGORY');
    });

    it('detects invalid transfer where source and destination accounts are identical', () => {
      const val = validateTransactionPayload(
        {
          family_id: 'fam_1',
          transaction_date: '2026-08-13',
          type: 'TRANSFER',
          total_amount_cents: 5000,
          source_account_id: 'acc_bank_1',
          destination_account_id: 'acc_bank_1',
          description: 'Self transfer test',
        },
        [],
        [],
        [],
        []
      );

      expect(val.isValid).toBe(false);
      expect(val.errors[0].code).toBe('INCORRECT_TRANSFER');
      expect(val.errors[0].message).toContain('cannot be identical');
    });
  });

  describe('3. Transaction Classification', () => {
    it('correctly classifies revenue vs capital vs transfer transactions', () => {
      expect(classifyTransaction('INCOME')).toBe('REVENUE_INCOME');
      expect(classifyTransaction('EXPENSE')).toBe('REVENUE_EXPENSE_FAMILY');
      expect(classifyTransaction('EXPENSE', 'mem_1')).toBe('REVENUE_EXPENSE_PERSONAL');
      expect(classifyTransaction('ASSET_PURCHASE')).toBe('CAPITAL_ASSET_PURCHASE');
      expect(classifyTransaction('LIABILITY_REPAYMENT')).toBe('CAPITAL_LIABILITY_REPAYMENT');
      expect(classifyTransaction('TRANSFER')).toBe('CAPITAL_BANK_TRANSFER');
    });
  });

  describe('4. Full Double-Entry Accounting & Statement Calculations', () => {
    it('executes balanced transactions and generates accurate financial statements', async () => {
      const familyId = 'fam_test_100';

      // 1. Setup Family Profile
      await db.familyProfile.put({
        id: familyId,
        family_name: 'Test Family',
        currency_symbol: '৳',
        currency_code: 'BDT',
        version: 1,
        sync_status: 'SYNCED',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      });

      // 2. Setup Members (Member 1 & Member 2)
      const mem1: FamilyMember = {
        id: 'mem_1',
        family_id: familyId,
        name: 'Member One',
        relation: 'Self',
        is_active: true,
        version: 1,
        sync_status: 'SYNCED',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      const mem2: FamilyMember = {
        id: 'mem_2',
        family_id: familyId,
        name: 'Member Two',
        relation: 'Spouse',
        is_active: true,
        version: 1,
        sync_status: 'SYNCED',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      await db.familyMembers.bulkPut([mem1, mem2]);

      // 3. Setup Categories
      const catSalary: Category = {
        id: 'cat_salary',
        family_id: familyId,
        type: 'INCOME',
        name_en: 'Salary Income',
        name_bn: 'বেতন আয়',
        is_active: true,
        version: 1,
        sync_status: 'SYNCED',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      const catGroceries: Category = {
        id: 'cat_groceries',
        family_id: familyId,
        type: 'EXPENSE',
        name_en: 'Household Groceries',
        name_bn: 'গৃহস্থালি বাজার',
        is_active: true,
        version: 1,
        sync_status: 'SYNCED',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      await db.categories.bulkPut([catSalary, catGroceries]);

      // 4. Setup Bank/Cash Accounts
      const accCash: Account = {
        id: 'acc_cash',
        family_id: familyId,
        account_name: 'Main Cash Wallet',
        account_type: 'CASH',
        currency_code: 'BDT',
        opening_balance_cents: 1000000, // ৳10,000.00
        current_balance_cents: 1000000,
        is_active: true,
        version: 1,
        sync_status: 'SYNCED',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      await db.accounts.put(accCash);

      // 5. Post Income Transaction (৳50,000.00 = 5,000,000 cents)
      await postTransaction({
        family_id: familyId,
        transaction_date: '2026-08-01',
        type: 'INCOME',
        total_amount_cents: 5000000,
        category_id: 'cat_salary',
        destination_account_id: 'acc_cash',
        target_member_id: 'mem_1',
        description: 'Monthly Salary Deposit',
        skip_validation: true,
      });

      // 6. Post Expense Transaction (৳12,000.00 = 1,200,000 cents)
      await postTransaction({
        family_id: familyId,
        transaction_date: '2026-08-05',
        type: 'EXPENSE',
        total_amount_cents: 1200000,
        category_id: 'cat_groceries',
        source_account_id: 'acc_cash',
        target_member_id: 'mem_1',
        description: 'Supermarket Groceries',
        skip_validation: true,
      });

      // Verify Account Balance: Opening 10,000 + 50,000 - 12,000 = 48,000 (4,800,000 cents)
      const updatedAcc = await db.accounts.get('acc_cash');
      expect(updatedAcc?.current_balance_cents).toBe(4800000);

      // Verify Income & Expense Calculation
      const ieReport = await calculateDetailedIncomeExpense(familyId);
      expect(ieReport.total_income_cents).toBe(5000000);
      expect(ieReport.total_expense_cents).toBe(1200000);
      expect(ieReport.net_surplus_cents).toBe(3800000); // ৳38,000.00

      // Verify Balance Sheet Financial Position
      const fpReport = await calculateFinancialPosition(familyId);
      expect(fpReport.assets.total_assets_cents).toBe(4800000);
      expect(fpReport.equity_and_fund.cumulative_retained_surplus_cents).toBe(3800000);
      expect(fpReport.is_balanced).toBe(true);
      expect(validateFinancialPositionBalance(fpReport).isValid).toBe(true);

      // Verify Statement of Receipts & Payments
      const rpReport = await calculateReceiptsAndPayments(familyId);
      expect(rpReport.opening_cash_bank_cents).toBe(1000000);
      expect(rpReport.total_receipts_cents).toBe(5000000);
      expect(rpReport.total_payments_cents).toBe(1200000);
      expect(rpReport.closing_cash_bank_cents).toBe(4800000);
      expect(rpReport.is_reconciled).toBe(true);

      // Verify Member-Wise Financials
      const memberFinancials = await calculateMemberFinancials(familyId);
      const mem1Data = memberFinancials.find((m) => m.member_id === 'mem_1');
      expect(mem1Data).toBeDefined();
      expect(mem1Data?.total_income_cents).toBe(5000000);
      expect(mem1Data?.net_savings_cents).toBe(3800000);
    });
  });
});
