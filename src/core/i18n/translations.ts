import { Language } from '../../types';
import { toBanglaDigits } from '../calendar/hijri';

export const translations = {
  en: {
    app_title: 'Family Accounting System',
    app_subtitle: 'Production-Ready Offline-First Financial Management',
    dashboard: 'Home',
    income: 'Income',
    expense: 'Expense',
    assets: 'Assets',
    liabilities: 'Liabilities',
    bank: 'Bank & Cash',
    members_accounts: 'Members',
    categories: 'Categories',
    allocation_rules: 'Accounting Rules',
    reports: 'Reports',
    backup_sync: 'Backup & Restore',
    settings: 'Settings',
    user_guide: 'Help',
    transactions: 'Transactions',
    menu: 'Menu',
    share_app: 'Share',
    share_success: 'Link copied to clipboard!',
    print_pdf: 'PDF / Print',

    // Onboarding
    welcome_title: 'Family Accounting Setup',
    welcome_subtitle: 'The database is completely empty. Let\'s set up your family account profile.',
    family_name: 'Family Name',
    currency_symbol: 'Currency Symbol',
    family_members: 'Family Members',
    add_member: 'Add Member',
    member_name: 'Member Name',
    relation: 'Relation',
    accounts_setup: 'Initial Accounts',
    add_account: 'Add Account',
    account_name: 'Account Name',
    account_type: 'Account Type',
    opening_balance: 'Opening Balance',
    finish_setup: 'Initialize Family Database',

    // Dashboard cards
    total_assets: 'Total Assets',
    total_liabilities: 'Total Liabilities',
    family_fund: 'Family Fund',
    personal_savings: 'Personal Savings',
    net_worth: 'Net Financial Position',
    recent_activity: 'Recent Transactions',
    quick_new_transaction: 'New Transaction',
    active_rules: 'Active Accounting Rules',
    sync_status_title: 'Local Sync Engine',
    offline_ready: 'Offline Operational',
    cloud_connected: 'Cloud Synchronized',
    pending_queue: 'Pending Queue',

    // Forms
    date: 'Date',
    category: 'Category',
    amount: 'Amount',
    description: 'Description',
    rule_applied: 'Allocation Rule Applied',
    no_rule: 'Direct Transaction (No Rule)',
    source_account: 'Source Account',
    destination_account: 'Destination Account',
    receipt_attachment: 'Receipt Photo/Document',
    save: 'Save Record',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    active: 'Active',
    inactive: 'Inactive',

    // Reports
    income_statement: 'Income & Expense Statement',
    balance_sheet: 'Statement of Financial Position',
    receipts_payments: 'Receipts & Payments Statement',
    total_income: 'Total Income',
    total_expense: 'Total Expense',
    net_surplus: 'Net Surplus / Deficit',
    export_pdf: 'Export PDF Report',
    print_report: 'Print Report',

    // Types
    INCOME: 'Income',
    EXPENSE: 'Expense',
    ASSET: 'Asset',
    LIABILITY: 'Liability',
    CASH: 'Cash',
    BANK: 'Bank Account',
    FAMILY_FUND: 'Family Fund',
    PERSONAL_SAVINGS: 'Personal Savings',

    // Settings & Security
    language: 'Language',
    theme: 'Theme Mode',
    hijri_offset: 'Hijri Lunar Offset (Days)',
    app_lock: 'PIN Security Lock',
    set_pin: 'Set Security PIN',
    enter_pin: 'Enter Security PIN to unlock',
    backup_download: 'Download Backup JSON',
    restore_upload: 'Restore Data from File',
    clear_data: 'Wipe Database & Reset',
    
    // Status
    synced: 'Synced',
    pending: 'Pending Sync',
    failed: 'Sync Failed',
  },
  bn: {
    app_title: 'পারিবারিক হিসাব ব্যবস্থাপনা',
    app_subtitle: 'উৎপাদন-প্রস্তুত অফলাইন-ফার্স্ট আর্থিক ব্যবস্থাপনা',
    dashboard: 'হোম',
    income: 'আয়',
    expense: 'ব্যয়',
    assets: 'সম্পদ',
    liabilities: 'দায়',
    bank: 'ব্যাংক ও ক্যাশ',
    members_accounts: 'সদস্যবৃন্দ',
    categories: 'ক্যাটাগরি সমূহ',
    allocation_rules: 'হিসাব নিয়মাবলী',
    reports: 'প্রতিবেদন',
    backup_sync: 'ব্যাকআপ ও রিস্টোর',
    settings: 'সেটিংস',
    user_guide: 'সাহায্য',
    transactions: 'লেনদেনসমূহ',
    menu: 'মেনু',
    share_app: 'শেয়ার',
    share_success: 'লিংক কপি করা হয়েছে!',
    print_pdf: 'পিডিএফ / প্রিন্ট',

    // Onboarding
    welcome_title: 'পারিবারিক হিসাব প্রারম্ভিক সেটআপ',
    welcome_subtitle: 'ডাটাবেসটি সম্পূর্ণ খালি। চলুন আপনার পারিবারিক তথ্য দিয়ে শুরু করি।',
    family_name: 'পরিবারের নাম',
    currency_symbol: 'মুদ্রার প্রতীক',
    family_members: 'পারিবারিক সদস্যবৃন্দ',
    add_member: 'সদস্য যোগ করুন',
    member_name: 'সদস্যের নাম',
    relation: 'সম্পর্ক',
    accounts_setup: 'প্রারম্ভিক অ্যাকাউন্টসমূহ',
    add_account: 'অ্যাকাউন্ট যোগ করুন',
    account_name: 'অ্যাকাউন্টের নাম',
    account_type: 'অ্যাকাউন্টের ধরন',
    opening_balance: 'প্রারম্ভিক জের',
    finish_setup: 'ডাটাবেস তৈরি সম্পন্ন করুন',

    // Dashboard cards
    total_assets: 'মোট সম্পদ (Assets)',
    total_liabilities: 'মোট দায় (Liabilities)',
    family_fund: 'পারিবারিক তহবিল (Family Fund)',
    personal_savings: 'ব্যক্তিগত সঞ্চয় (Savings)',
    net_worth: 'মোট নিট আর্থিক অবস্থা',
    recent_activity: 'সাম্প্রতিক লেনদেন',
    quick_new_transaction: 'নতুন লেনদেন',
    active_rules: 'সক্রিয় হিসাব নিয়মাবলী',
    sync_status_title: 'লোকাল সিঙ্ক ইঞ্জিন',
    offline_ready: 'অফলাইনে প্রস্তুত',
    cloud_connected: 'ক্লাউডে যুক্ত',
    pending_queue: 'অপেক্ষমাণ সিঙ্ক',

    // Forms
    date: 'তারিখ',
    category: 'ক্যাটাগরি',
    amount: 'টাকার পরিমাণ',
    description: 'বিবরণ',
    rule_applied: 'প্রযোজ্য বণ্টন নিয়ম',
    no_rule: 'সরাসরি লেনদেন (নিয়ম ছাড়া)',
    source_account: 'উৎস অ্যাকাউন্ট',
    destination_account: 'গ্রহীতা অ্যাকাউন্ট',
    receipt_attachment: 'রসিদ বা রিসিটের ছবি/ডকুমেন্ট',
    save: 'সংরক্ষণ করুন',
    cancel: 'বাতিল',
    delete: 'মুছে ফেলুন',
    edit: 'সম্পাদনা',
    active: 'সক্রিয়',
    inactive: 'নিষ্ক্রিয়',

    // Reports
    income_statement: 'আয় ও ব্যয়ের বিবরণী (Income & Expense Statement)',
    balance_sheet: 'আর্থিক অবস্থার বিবরণী (Financial Position)',
    receipts_payments: 'প্রাপ্তি ও প্রদান বিবরণী (Receipts & Payments)',
    total_income: 'মোট আয়',
    total_expense: 'মোট ব্যয়',
    net_surplus: 'নিট উদ্বৃত্ত / ঘাটতি',
    export_pdf: 'PDF রিপোর্ট ডাউনলোড',
    print_report: 'প্রিন্ট করুন',

    // Types
    INCOME: 'আয়',
    EXPENSE: 'ব্যয়',
    ASSET: 'সম্পদ',
    LIABILITY: 'দায়',
    CASH: 'ক্যাশ টাকা',
    BANK: 'ব্যাংক হিসাব',
    FAMILY_FUND: 'পারিবারিক ফান্ড',
    PERSONAL_SAVINGS: 'ব্যক্তিগত সঞ্চয়',

    // Settings & Security
    language: 'ভাষা (Language)',
    theme: 'থিম মোড',
    hijri_offset: 'হিজরী চাঁদের দিন অ্যাডজাস্টমেন্ট',
    app_lock: 'পিন সিকিউরিটি লক',
    set_pin: 'সিকিউরিটি পিন সেট করুন',
    enter_pin: 'আনলক করতে সিকিউরিটি পিন লিখুন',
    backup_download: 'ব্যাকআপ ফাইল (JSON) ডাউনলোড',
    restore_upload: 'ফাইল থেকে ডাটা রিস্টোর',
    clear_data: 'ডাটাবেস সম্পূর্ণ মুছে ফেলুন',

    // Status
    synced: 'সিঙ্ক হয়েছে',
    pending: 'অপেক্ষমাণ',
    failed: 'সিঙ্ক ব্যর্থ',
  },
};

/**
 * Format currency paisa/cents into human readable string with commas and localized digits
 */
export function formatCurrency(
  amountCents: number,
  currencySymbol: string = '৳',
  lang: Language = 'bn'
): string {
  const absolute = Math.abs(amountCents) / 100;
  const formattedNumber = absolute.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = amountCents < 0 ? '-' : '';
  if (lang === 'bn') {
    return `${sign}${currencySymbol} ${toBanglaDigits(formattedNumber)}`;
  }
  return `${sign}${currencySymbol} ${formattedNumber}`;
}
