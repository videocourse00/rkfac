export type Language = 'en' | 'bn';
export type ThemeMode = 'light' | 'dark' | 'system';
export type CategoryType = 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY';
export type AccountType = 'CASH' | 'BANK' | 'MOBILE_WALLET' | 'FAMILY_FUND' | 'PERSONAL_SAVINGS' | 'ASSET' | 'LIABILITY';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ASSET_PURCHASE' | 'LIABILITY_REPAYMENT';
export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  auth_provider: 'EMAIL' | 'GOOGLE' | 'LOCAL';
  sync_status: SyncStatus;
  synced_at?: string;
  version: number;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface FamilyProfile {
  id: string;
  family_name: string;
  currency_symbol: string;
  currency_code: string;
  owner_user_id?: string;
  version?: number;
  sync_status?: SyncStatus;
  synced_at?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id?: string;
  name: string;
  relation: string; // e.g. "Self", "Spouse", "Child", "Parent", "Other"
  is_active: boolean;
  phone?: string;
  email?: string;
  photo_uri?: string; // Profile photo URL or base64
  version?: number;
  sync_status?: SyncStatus;
  synced_at?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface Category {
  id: string;
  family_id: string;
  type: CategoryType;
  name_en: string;
  name_bn: string;
  code?: string;
  parent_id?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  version?: number;
  sync_status?: SyncStatus;
  synced_at?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface Account {
  id: string;
  family_id: string;
  category_id?: string;
  account_name: string;
  account_type: AccountType;
  owner_member_id?: string; // If undefined, shared family account
  account_number?: string;
  bank_name?: string;
  currency_code?: string;
  opening_balance_cents: number; // Stored as integer paisa/cents
  current_balance_cents: number;
  is_active?: boolean;
  version?: number;
  sync_status?: SyncStatus;
  synced_at?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface AllocationSplit {
  target_account_id: string;
  target_member_id?: string;
  percentage: number; // e.g. 60.0 for 60%
}

export interface RuleCondition {
  field: string;
  operator: 'EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';
  value: string;
}

export interface RuleAction {
  target_account_id: string;
  target_member_id?: string;
  percentage: number;
}

export interface AllocationRule {
  id: string;
  family_id: string;
  rule_name: string;
  description?: string;
  rule_type?: 'PERCENTAGE_SPLIT' | 'FIXED_ALLOCATION' | 'INCOME_DISTRIBUTION' | 'EXPENSE_SHARING';
  source_category_id: string; // Dynamic Income/Expense Category ID
  effective_from?: string; // YYYY-MM-DD
  effective_to?: string;
  priority?: number;
  conditions?: RuleCondition[];
  allocations: AllocationSplit[]; // Must sum to 100%
  is_active: boolean;
  version?: number;
  sync_status?: SyncStatus;
  synced_at?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface Transaction {
  id: string;
  family_id: string;
  transaction_date: string; // YYYY-MM-DD
  voucher_no: string;
  type: TransactionType;
  description: string;
  total_amount_cents: number;
  category_id: string;
  allocation_rule_id?: string;
  source_account_id?: string; // For expense/transfer source
  destination_account_id?: string; // For income/transfer destination
  receipt_image_uri?: string; // Base64 or Data URL
  created_by_member_id?: string;
  target_member_id?: string;
  payment_method?: string;
  notes?: string;
  accounting_nature?: string;
  version?: number;
  sync_status: SyncStatus;
  synced_at?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface JournalEntry {
  id: string;
  transaction_id: string;
  family_id: string;
  account_id: string;
  member_id?: string;
  entry_type: 'DEBIT' | 'CREDIT';
  split_percentage?: number;
  amount_cents: number;
  description: string;
  created_at: string;
  is_deleted?: boolean;
}

export interface Asset {
  id: string;
  family_id: string;
  owner_member_id?: string;
  name: string;
  type: 'REAL_ESTATE' | 'VEHICLE' | 'INVESTMENT' | 'GOLD' | 'OTHER';
  valuation_cents: number;
  acquisition_date: string;
  sync_status: SyncStatus;
  synced_at?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export interface Liability {
  id: string;
  family_id: string;
  owner_member_id?: string;
  name: string;
  type: 'BANK_LOAN' | 'PERSONAL_DEBT' | 'CREDIT_CARD' | 'OTHER';
  amount_cents: number;
  due_date?: string;
  sync_status: SyncStatus;
  synced_at?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  statement_date: string;
  reference_no: string;
  amount_cents: number;
  matched_transaction_id?: string;
  is_reconciled: boolean;
  created_at: string;
}

export interface OpeningBalance {
  id: string;
  account_id: string;
  as_of_date: string;
  balance_cents: number;
  created_at: string;
}

export interface MonthlyClosing {
  id: string;
  family_id: string;
  closing_year: number;
  closing_month: number;
  total_income_cents: number;
  total_expense_cents: number;
  closing_balance_cents: number;
  is_closed: boolean;
  closed_at: string;
  closed_by_user_id?: string;
}

export interface ReportPreset {
  id: string;
  family_id: string;
  report_type: 'INCOME_EXPENSE' | 'BALANCE_SHEET' | 'RECEIPTS_PAYMENTS';
  title: string;
  filter_config: string;
  created_at: string;
}

export interface SyncQueueItem {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  payload: string;
  timestamp: string;
  retry_count: number;
}

export interface BackupRecord {
  id: string;
  family_id: string;
  backup_timestamp: string;
  file_name: string;
  hmac_sha256: string;
  record_count: number;
  file_size_bytes: number;
}

export interface AuditLog {
  id: string;
  family_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'BACKUP' | 'RESTORE' | 'LOCK_PIN';
  entity_name: string;
  entity_id: string;
  performed_by_id?: string;
  changes_json?: string;
  timestamp: string;
}

export interface AuthorshipInfo {
  name: string;
  spouse?: string;
  contact?: string;
  website?: string;
  owner_teacher?: string;
  notes?: string;
}

export interface AppSettings {
  id: string;
  app_name?: string;
  custom_logo_uri?: string;
  language: Language;
  theme: ThemeMode;
  hijri_offset: number; // Days adjustment: -2 to +2
  security_pin_hash?: string;
  is_pin_enabled: boolean;
  auto_sync: boolean;
  last_synced_at?: string;
  has_dismissed_guide_popup?: boolean;
  authorship?: AuthorshipInfo;
}

export interface FinancialSummary {
  total_assets_cents: number;
  total_liabilities_cents: number;
  total_family_fund_cents: number;
  total_personal_savings_cents: number;
  period_income_cents: number;
  period_expense_cents: number;
  net_surplus_cents: number;
}
