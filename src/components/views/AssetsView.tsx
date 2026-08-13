import React, { useState } from 'react';
import { BentoCard } from '../bento/BentoCard';
import { translations } from '../../core/i18n/translations';
import { formatCurrency } from '../../core/i18n/translations';
import { Language, Account } from '../../types';
import { db } from '../../db/dexie';
import { ShieldCheck, Plus, Landmark, Wallet, PiggyBank, Coins } from 'lucide-react';

interface AssetsViewProps {
  accounts: Account[];
  familyId: string;
  currencySymbol: string;
  lang: Language;
  onRefresh: () => void;
}

export const AssetsView: React.FC<AssetsViewProps> = ({
  accounts,
  familyId,
  currencySymbol,
  lang,
  onRefresh,
}) => {
  const t = translations[lang];
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter asset accounts (CASH, BANK, FAMILY_FUND, PERSONAL_SAVINGS)
  const assetAccounts = accounts.filter((a) =>
    ['CASH', 'BANK', 'FAMILY_FUND', 'PERSONAL_SAVINGS'].includes(a.account_type)
  );

  const totalAssetsCents = assetAccounts.reduce((acc, a) => acc + a.current_balance_cents, 0);

  // Form state
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<'CASH' | 'BANK' | 'FAMILY_FUND' | 'PERSONAL_SAVINGS'>('BANK');
  const [openingBalance, setOpeningBalance] = useState('');

  const handleAddAssetAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName) return;

    setIsSubmitting(true);
    try {
      const balanceCents = Math.round((parseFloat(openingBalance) || 0) * 100);
      const newAcc: Account = {
        id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        family_id: familyId,
        account_name: accountName,
        account_type: accountType,
        opening_balance_cents: balanceCents,
        current_balance_cents: balanceCents,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'PENDING',
      };

      await db.accounts.put(newAcc);
      await db.syncQueue.put({
        id: `sync_${Date.now()}`,
        table_name: 'accounts',
        operation: 'INSERT',
        record_id: newAcc.id,
        payload: JSON.stringify(newAcc),
        timestamp: new Date().toISOString(),
        retry_count: 0,
      });

      setShowAddModal(false);
      setAccountName('');
      setOpeningBalance('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CASH':
        return <Wallet className="w-5 h-5 text-emerald-500" />;
      case 'BANK':
        return <Landmark className="w-5 h-5 text-indigo-500" />;
      case 'FAMILY_FUND':
        return <Coins className="w-5 h-5 text-purple-500" />;
      case 'PERSONAL_SAVINGS':
        return <PiggyBank className="w-5 h-5 text-amber-500" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
              <ShieldCheck className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-100">
              {t.total_assets}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {formatCurrency(totalAssetsCents, currencySymbol, lang)}
          </h2>
          <p className="text-indigo-100 text-xs md:text-sm mt-1">
            Total liquid assets, bank deposits, and family funds
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-800 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-indigo-50 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Asset Account</span>
        </button>
      </div>

      {/* Asset Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assetAccounts.map((acc) => (
          <div
            key={acc.id}
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                {getAccountIcon(acc.account_type)}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{acc.account_name}</h4>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                  {acc.account_type}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                {formatCurrency(acc.current_balance_cents, currencySymbol, lang)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Opening: {formatCurrency(acc.opening_balance_cents, currencySymbol, lang)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Asset Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>Add New Asset Account</span>
            </h3>

            <form onSubmit={handleAddAssetAccount} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. City Bank Savings, Cash Locker"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Account Type *</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="BANK">Bank Account</option>
                  <option value="CASH">Cash in Hand</option>
                  <option value="FAMILY_FUND">Family Fund Reserve</option>
                  <option value="PERSONAL_SAVINGS">Personal Savings Account</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Opening Balance ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
                >
                  {isSubmitting ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
