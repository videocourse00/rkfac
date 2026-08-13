import type { AllocationRule, Transaction, Category } from '../../types';
import type { ResolvedRuleResult, AccountingValidationError } from './types';

/**
 * Validates that an allocation rule's splits total exactly 100%.
 */
export function validateAllocationRule(rule: Partial<AllocationRule>): AccountingValidationError | null {
  if (!rule.allocations || rule.allocations.length === 0) {
    return {
      code: 'INVALID_RULE',
      message: 'Allocation rule must contain at least one allocation split.',
      field: 'allocations',
    };
  }

  const sum = rule.allocations.reduce((acc, alloc) => acc + (alloc.percentage || 0), 0);
  // Allow a tiny floating point tolerance (e.g. 99.999 to 100.001)
  if (Math.abs(sum - 100) > 0.001) {
    return {
      code: 'INVALID_PERCENTAGE',
      message: `Total allocation percentage must equal 100%. Current total is ${sum.toFixed(2)}%.`,
      field: 'allocations',
    };
  }

  for (let i = 0; i < rule.allocations.length; i++) {
    const alloc = rule.allocations[i];
    if (!alloc.target_account_id) {
      return {
        code: 'INVALID_RULE',
        message: `Allocation split ${i + 1} is missing a target account.`,
        field: `allocations[${i}].target_account_id`,
      };
    }
    if (alloc.percentage <= 0) {
      return {
        code: 'INVALID_PERCENTAGE',
        message: `Allocation percentage for split ${i + 1} must be greater than 0%.`,
        field: `allocations[${i}].percentage`,
      };
    }
  }

  return null;
}

/**
 * Resolves the appropriate Allocation Rule for a given transaction date, category, and type.
 * Specific category rules OVERRIDE general transaction type rules.
 */
export function resolveAllocationRule(
  transactionDate: string,
  categoryId: string | undefined,
  transactionType: string,
  category: Category | undefined,
  availableRules: AllocationRule[]
): ResolvedRuleResult {
  if (!availableRules || availableRules.length === 0) {
    return { overrideType: 'NONE' };
  }

  // Filter rules by active status and effective date range
  const validDateRules = availableRules.filter((rule) => {
    if (!rule.is_active || rule.is_deleted) return false;

    if (rule.effective_from && rule.effective_from > transactionDate) {
      return false;
    }
    if (rule.effective_to && rule.effective_to < transactionDate) {
      return false;
    }
    return true;
  });

  if (validDateRules.length === 0) {
    return { overrideType: 'NONE' };
  }

  // 1. Level 1: Category Specific Rules (Highest Precedence)
  if (categoryId) {
    const categorySpecificRules = validDateRules.filter(
      (r) => r.source_category_id === categoryId
    );

    if (categorySpecificRules.length > 0) {
      // Sort by priority descending, then effective_from descending
      categorySpecificRules.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return (b.effective_from || '').localeCompare(a.effective_from || '');
      });

      return {
        rule: categorySpecificRules[0],
        overrideType: 'CATEGORY_SPECIFIC',
      };
    }
  }

  // 2. Level 2: General Transaction Type Rules (Fallback)
  // Matching category type (e.g. INCOME or EXPENSE rule)
  const categoryType = category?.type || transactionType;
  const generalTypeRules = validDateRules.filter((r) => {
    if (!r.source_category_id) return true;
    // Check if source_category_id equals transaction type string (e.g. 'INCOME', 'EXPENSE')
    return r.source_category_id === categoryType;
  });

  if (generalTypeRules.length > 0) {
    generalTypeRules.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return (b.effective_from || '').localeCompare(a.effective_from || '');
    });

    return {
      rule: generalTypeRules[0],
      overrideType: 'GENERAL_TYPE',
    };
  }

  return { overrideType: 'NONE' };
}
