import type {
  Transaction,
  Category,
  Account,
  AllocationRule,
  OpeningBalance,
} from '../../types';
import type { ValidationResult, AccountingValidationError, FinancialPositionReport } from './types';
import { validateAllocationRule } from './rules';

export interface ValidateTransactionInput {
  family_id: string;
  transaction_date: string;
  voucher_no?: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ASSET_PURCHASE' | 'LIABILITY_REPAYMENT';
  total_amount_cents: number;
  category_id?: string;
  allocation_rule_id?: string;
  source_account_id?: string;
  destination_account_id?: string;
  description: string;
}

/**
 * Validates a transaction payload before posting.
 */
export function validateTransactionPayload(
  payload: ValidateTransactionInput,
  existingTransactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  rules: AllocationRule[]
): ValidationResult {
  const errors: AccountingValidationError[] = [];

  // 1. Invalid Amount Check
  if (
    !payload.total_amount_cents ||
    typeof payload.total_amount_cents !== 'number' ||
    !Number.isInteger(payload.total_amount_cents) ||
    payload.total_amount_cents <= 0
  ) {
    errors.push({
      code: 'INVALID_AMOUNT',
      message: 'Transaction total amount must be a positive integer in paisa/cents.',
      field: 'total_amount_cents',
    });
  }

  // 2. Missing Category Check (Required for Income, Expense, Asset Purchase, Liability Repayment)
  if (payload.type !== 'TRANSFER') {
    if (!payload.category_id || payload.category_id.trim() === '') {
      errors.push({
        code: 'MISSING_CATEGORY',
        message: `Category is required for ${payload.type} transactions.`,
        field: 'category_id',
      });
    } else {
      const cat = categories.find((c) => c.id === payload.category_id);
      if (!cat) {
        errors.push({
          code: 'MISSING_CATEGORY',
          message: `Category with ID '${payload.category_id}' does not exist.`,
          field: 'category_id',
        });
      }
    }
  }

  // 3. Account & Transfer Validation
  if (payload.type === 'TRANSFER') {
    if (!payload.source_account_id) {
      errors.push({
        code: 'INCORRECT_TRANSFER',
        message: 'Source account is required for bank transfer.',
        field: 'source_account_id',
      });
    }
    if (!payload.destination_account_id) {
      errors.push({
        code: 'INCORRECT_TRANSFER',
        message: 'Destination account is required for bank transfer.',
        field: 'destination_account_id',
      });
    }
    if (
      payload.source_account_id &&
      payload.destination_account_id &&
      payload.source_account_id === payload.destination_account_id
    ) {
      errors.push({
        code: 'INCORRECT_TRANSFER',
        message: 'Source and destination accounts cannot be identical for transfers.',
        field: 'destination_account_id',
      });
    }
  } else if (!payload.allocation_rule_id) {
    // If no explicit allocation rule is specified, check if a dynamic rule matches
    const matchedRule = rules.find((r) => r.is_active && !r.is_deleted && (r.source_category_id === payload.category_id || r.source_category_id === payload.type));
    
    if (!matchedRule) {
      if (payload.type === 'EXPENSE' || payload.type === 'ASSET_PURCHASE' || payload.type === 'LIABILITY_REPAYMENT') {
        if (!payload.source_account_id) {
          errors.push({
            code: 'MISSING_ACCOUNT',
            message: `Source account is required for ${payload.type} transaction when no allocation rule applies.`,
            field: 'source_account_id',
          });
        }
      } else if (payload.type === 'INCOME') {
        if (!payload.destination_account_id) {
          errors.push({
            code: 'MISSING_ACCOUNT',
            message: `Destination account is required for INCOME transaction when no allocation rule applies.`,
            field: 'destination_account_id',
          });
        }
      }
    }
  }

  // 4. Duplicate Transaction Detection
  if (payload.voucher_no) {
    const duplicateVoucher = existingTransactions.find(
      (tx) => !tx.is_deleted && tx.voucher_no === payload.voucher_no
    );
    if (duplicateVoucher) {
      errors.push({
        code: 'DUPLICATE_TRANSACTION',
        message: `Transaction with voucher number '${payload.voucher_no}' already exists.`,
        field: 'voucher_no',
      });
    }
  }

  // Check for duplicate transaction content (identical date, amount, category, type, and description)
  const duplicateContent = existingTransactions.find(
    (tx) =>
      !tx.is_deleted &&
      tx.family_id === payload.family_id &&
      tx.transaction_date === payload.transaction_date &&
      tx.total_amount_cents === payload.total_amount_cents &&
      tx.type === payload.type &&
      tx.category_id === payload.category_id &&
      tx.description.trim().toLowerCase() === payload.description.trim().toLowerCase()
  );

  if (duplicateContent) {
    errors.push({
      code: 'DUPLICATE_TRANSACTION',
      message: `Identical transaction already posted on ${payload.transaction_date} for amount ${payload.total_amount_cents / 100} (${payload.description}).`,
      field: 'description',
    });
  }

  // 5. Allocation Rule Check (If specified)
  if (payload.allocation_rule_id) {
    const rule = rules.find((r) => r.id === payload.allocation_rule_id);
    if (!rule) {
      errors.push({
        code: 'INVALID_RULE',
        message: `Allocation rule '${payload.allocation_rule_id}' not found.`,
        field: 'allocation_rule_id',
      });
    } else {
      const ruleErr = validateAllocationRule(rule);
      if (ruleErr) {
        errors.push(ruleErr);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates balance sheet financial position balance equation:
 * Total Assets === Total Liabilities + Total Family Fund & Equity
 */
export function validateFinancialPositionBalance(
  report: FinancialPositionReport
): ValidationResult {
  const errors: AccountingValidationError[] = [];

  if (!report.is_balanced) {
    errors.push({
      code: 'FINANCIAL_POSITION_MISMATCH',
      message: `Financial position balance mismatch detected! Assets (${report.assets.total_assets_cents / 100}) do not equal Liabilities + Equity (${(report.liabilities.total_liabilities_cents + report.equity_and_fund.total_family_fund_and_equity_cents) / 100}). Discrepancy: ${report.discrepancy_cents / 100}.`,
      field: 'discrepancy_cents',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that all active bank/cash accounts have opening balance records recorded.
 */
export function validateOpeningBalances(
  accounts: Account[],
  openingBalances: OpeningBalance[]
): ValidationResult {
  const errors: AccountingValidationError[] = [];

  for (const acc of accounts) {
    if (acc.is_deleted || !acc.is_active) continue;

    const hasOB = openingBalances.some((ob) => ob.account_id === acc.id);
    if (!hasOB && acc.opening_balance_cents > 0) {
      errors.push({
        code: 'MISSING_OPENING_BALANCE',
        message: `Account '${acc.account_name}' has an opening balance of ${acc.opening_balance_cents / 100} but lacks a formal opening_balance record.`,
        field: `account[${acc.id}]`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
