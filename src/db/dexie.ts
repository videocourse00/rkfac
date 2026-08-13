import Dexie, { type Table } from 'dexie';
import type {
  User,
  FamilyProfile,
  FamilyMember,
  Category,
  Account,
  AllocationRule,
  Transaction,
  JournalEntry,
  Asset,
  Liability,
  BankTransaction,
  OpeningBalance,
  MonthlyClosing,
  ReportPreset,
  SyncQueueItem,
  BackupRecord,
  AuditLog,
  AppSettings,
} from '../types';

export class FamilyAccountingDatabase extends Dexie {
  users!: Table<User, string>;
  familyProfile!: Table<FamilyProfile, string>;
  familyMembers!: Table<FamilyMember, string>;
  categories!: Table<Category, string>;
  accounts!: Table<Account, string>;
  allocationRules!: Table<AllocationRule, string>;
  transactions!: Table<Transaction, string>;
  journalEntries!: Table<JournalEntry, string>;
  assets!: Table<Asset, string>;
  liabilities!: Table<Liability, string>;
  bankTransactions!: Table<BankTransaction, string>;
  openingBalances!: Table<OpeningBalance, string>;
  monthlyClosings!: Table<MonthlyClosing, string>;
  reportPresets!: Table<ReportPreset, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  backupRecords!: Table<BackupRecord, string>;
  auditLogs!: Table<AuditLog, string>;
  appSettings!: Table<AppSettings, string>;

  constructor() {
    super('FamilyAccountingDB');

    this.version(1).stores({
      users: 'id, email, sync_status, is_deleted',
      familyProfile: 'id, family_name',
      familyMembers: 'id, family_id, user_id, name, is_active, sync_status, [family_id+is_active]',
      categories: 'id, family_id, type, parent_id, is_active, sync_status, [family_id+type]',
      accounts: 'id, family_id, account_type, owner_member_id, is_active, sync_status, [family_id+account_type]',
      allocationRules: 'id, family_id, source_category_id, is_active, sync_status, [family_id+is_active]',
      transactions: 'id, family_id, transaction_date, voucher_no, category_id, type, sync_status, [family_id+transaction_date]',
      journalEntries: 'id, transaction_id, family_id, account_id, member_id, entry_type, [transaction_id+entry_type]',
      assets: 'id, family_id, owner_member_id, type, sync_status',
      liabilities: 'id, family_id, owner_member_id, type, sync_status',
      bankTransactions: 'id, bank_account_id, matched_transaction_id, statement_date',
      openingBalances: 'id, account_id',
      monthlyClosings: 'id, family_id, [family_id+closing_year+closing_month]',
      reportPresets: 'id, family_id, report_type',
      syncQueue: 'id, table_name, record_id, operation, timestamp',
      backupRecords: 'id, family_id, backup_timestamp',
      auditLogs: 'id, family_id, entity_name, timestamp',
      appSettings: 'id',
    });
  }
}

export const db = new FamilyAccountingDatabase();

export const DEFAULT_AUTHORSHIP = {
  name: 'MD Ibrahim Khalil',
  spouse: 'Roksana Khalil',
  contact: '01345322366',
  website: 'www.jewelscare.weebly.com',
  owner_teacher: 'RK Educare',
};

export async function getOrCreateAppSettings(): Promise<AppSettings> {
  const existing = await db.appSettings.get('default');
  if (existing) {
    if (!existing.authorship) {
      existing.authorship = DEFAULT_AUTHORSHIP;
      await db.appSettings.put(existing);
    }
    return existing;
  }

  const initialSettings: AppSettings = {
    id: 'default',
    app_name: 'Family Accounting',
    language: 'bn',
    theme: 'system',
    hijri_offset: 0,
    is_pin_enabled: false,
    auto_sync: true,
    has_dismissed_guide_popup: false,
    authorship: DEFAULT_AUTHORSHIP,
  };

  await db.appSettings.put(initialSettings);
  return initialSettings;
}

export async function clearAllDatabaseTables(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
}
