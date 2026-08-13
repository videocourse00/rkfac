import type {
  Transaction,
  JournalEntry,
  AllocationRule,
  Category,
  Account,
  FamilyMember,
  Asset,
  Liability,
  TransactionType,
} from '../../types';

export type TransactionClassification =
  | 'REVENUE_INCOME'
  | 'REVENUE_EXPENSE_FAMILY'
  | 'REVENUE_EXPENSE_PERSONAL'
  | 'CAPITAL_ASSET_PURCHASE'
  | 'CAPITAL_LIABILITY_REPAYMENT'
  | 'CAPITAL_BANK_TRANSFER'
  | 'OPENING_BALANCE';

export interface AccountingValidationError {
  code:
    | 'INVALID_PERCENTAGE'
    | 'DUPLICATE_TRANSACTION'
    | 'MISSING_CATEGORY'
    | 'MISSING_ACCOUNT'
    | 'INVALID_AMOUNT'
    | 'INCORRECT_TRANSFER'
    | 'FINANCIAL_POSITION_MISMATCH'
    | 'INVALID_RULE'
    | 'MISSING_OPENING_BALANCE';
  message: string;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: AccountingValidationError[];
}

export interface ResolvedRuleResult {
  rule?: AllocationRule;
  overrideType: 'CATEGORY_SPECIFIC' | 'GENERAL_TYPE' | 'NONE';
}

export interface DetailedCategorySummary {
  category_id: string;
  category_name_en: string;
  category_name_bn: string;
  category_type: string;
  total_cents: number;
}

export interface MemberFinancialBreakdown {
  member_id: string;
  member_name: string;
  total_income_cents: number;
  total_personal_expense_cents: number;
  total_family_expense_share_cents: number;
  total_expense_cents: number;
  net_savings_cents: number;
  allocated_accounts_balance_cents: number;
}

export interface IncomeExpenseReport {
  period_label: string;
  income_categories: DetailedCategorySummary[];
  expense_categories: DetailedCategorySummary[];
  total_income_cents: number;
  total_expense_cents: number;
  net_surplus_cents: number;
  member_breakdowns: MemberFinancialBreakdown[];
}

export interface FinancialPositionReport {
  as_of_date: string;
  assets: {
    cash_and_bank_accounts: Account[];
    fixed_and_investment_assets: Asset[];
    total_assets_cents: number;
  };
  liabilities: {
    debts_and_loans: Liability[];
    liability_accounts: Account[];
    total_liabilities_cents: number;
  };
  equity_and_fund: {
    family_fund_accounts: Account[];
    personal_savings_accounts: Account[];
    cumulative_retained_surplus_cents: number;
    total_family_fund_and_equity_cents: number;
  };
  is_balanced: boolean;
  discrepancy_cents: number;
}

export interface ReceiptsAndPaymentsReport {
  period_label: string;
  opening_cash_bank_cents: number;
  receipts: DetailedCategorySummary[];
  total_receipts_cents: number;
  payments: DetailedCategorySummary[];
  total_payments_cents: number;
  closing_cash_bank_cents: number;
  is_reconciled: boolean;
}
