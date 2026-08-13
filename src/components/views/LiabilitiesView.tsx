import React, { useState } from 'react';
import { BentoCard } from '../bento/BentoCard';
import { translations } from '../../core/i18n/translations';
import { formatCurrency } from '../../core/i18n/translations';
import { Language, Account } from '../../types';
import { db } from '../../db/dexie';
import { CreditCard, Plus, Scale, AlertCircle } from 'lucide-react';

interface LiabilitiesViewProps {
  accounts: Account[];
  familyId: string;
  currencySymbol: string;
  lang: Language;
  onRefresh: () => void;
}

export const LiabilitiesView: React.FC<LiabilitiesViewProps> = ({
  accounts,
  familyId,
  currencySymbol,
  lang,
  onRefresh,
}) => {
  const t = translations[lang];
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter liability accounts
  const liabilityAccounts = accounts.filter((a) =>
    ['LIABILITY', 'LOAN', 'CREDIT_CARD'].includes(a.account_type)
  );

  const totalLiabilitiesCents = liabilityAccounts.reduce((acc, a) => acc + a.current_balance_cents, 0);

  // Form state
  const [accountName, setAccountName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  const handleAddLiabilityAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName) return;

    setIsSubmitting(true);
    try {
      const balanceCents = Math.round((parseFloat(openingBalance) || 0) * 100);
      const newAcc: Account = {
        id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        family_id: familyId,
        account_name: accountName,
        account_type: 'LIABILITY',
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

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-amber-600 to-orange-700 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
              <CreditCard className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-100">
              {t.total_liabilities}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {formatCurrency(totalLiabilitiesCents, currencySymbol, lang)}
          </h2>
          <p className="text-amber-100 text-xs md:text-sm mt-1">
            Total outstanding loans, debts, and liability obligations
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white text-amber-800 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-amber-50 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Liability Record</span>
        </button>
      </div>

      {/* Liability Accounts Grid */}
      {liabilityAccounts.length === 0 ? (
        <BentoCard title={t.total_liabilities} subtitle="No active loans or liability debts recorded">
          <div className="py-12 text-center text-slate-400 text-xs">
            🎉 Great job! Your family currently has zero recorded liabilities.
          </div>
        </BentoCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liabilityAccounts.map((acc) => (
            <div
              key={acc.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{acc.account_name}</h4>
                  <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                    LIABILITY / LOAN
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-extrabold font-mono text-amber-600 dark:text-amber-400">
                  {formatCurrency(acc.current_balance_cents, currencySymbol, lang)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Initial: {formatCurrency(acc.opening_balance_cents, currencySymbol, lang)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Liability Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <span>Add Liability / Loan Debt</span>
            </h3>

            <form onSubmit={handleAddLiabilityAccount} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Loan / Debt Name *</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Home Loan, Credit Card Debt"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Total Outstanding Debt ({currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="e.g. 100000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-md shadow-amber-600/20"
                >
                  {isSubmitting ? 'Saving...' : 'Save Debt Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
