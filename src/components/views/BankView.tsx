import React, { useState } from 'react';
import { BentoCard } from '../bento/BentoCard';
import { translations } from '../../core/i18n/translations';
import { formatCurrency } from '../../core/i18n/translations';
import { Language, Account } from '../../types';
import { postTransaction } from '../../core/accounting/engine';
import { Building2, ArrowLeftRight, Wallet, Landmark, PiggyBank, Plus, ArrowRight } from 'lucide-react';

interface BankViewProps {
  accounts: Account[];
  familyId: string;
  currencySymbol: string;
  lang: Language;
  onRefresh: () => void;
}

export const BankView: React.FC<BankViewProps> = ({
  accounts,
  familyId,
  currencySymbol,
  lang,
  onRefresh,
}) => {
  const t = translations[lang];
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bank & Cash accounts
  const bankAndCashAccounts = accounts.filter((a) =>
    ['BANK', 'CASH', 'FAMILY_FUND', 'PERSONAL_SAVINGS'].includes(a.account_type)
  );

  const totalLiquidityCents = bankAndCashAccounts.reduce((acc, a) => acc + a.current_balance_cents, 0);

  // Transfer Form State
  const [amountTaka, setAmountTaka] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountTaka || parseFloat(amountTaka) <= 0 || !fromAccountId || !toAccountId) return;
    if (fromAccountId === toAccountId) return;

    setIsSubmitting(true);
    try {
      const amountCents = Math.round(parseFloat(amountTaka) * 100);
      await postTransaction({
        family_id: familyId,
        transaction_date: date,
        type: 'TRANSFER',
        description: description || 'Bank / Cash Transfer',
        total_amount_cents: amountCents,
        source_account_id: fromAccountId,
        destination_account_id: toAccountId,
      });

      setShowTransferModal(false);
      setAmountTaka('');
      setDescription('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-sky-600 to-indigo-700 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
              <Building2 className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-sky-100">
              {t.bank} & Liquid Reserves
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {formatCurrency(totalLiquidityCents, currencySymbol, lang)}
          </h2>
          <p className="text-sky-100 text-xs md:text-sm mt-1">
            Total liquid balance across bank accounts, cash wallets, and savings
          </p>
        </div>

        <button
          onClick={() => setShowTransferModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white text-sky-800 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-sky-50 active:scale-95 transition-all"
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Transfer Funds</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAndCashAccounts.map((acc) => (
          <div
            key={acc.id}
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                {acc.account_type === 'CASH' ? (
                  <Wallet className="w-5 h-5 text-emerald-500" />
                ) : acc.account_type === 'BANK' ? (
                  <Landmark className="w-5 h-5 text-sky-500" />
                ) : (
                  <PiggyBank className="w-5 h-5 text-indigo-500" />
                )}
              </div>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                {acc.account_type}
              </span>
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{acc.account_name}</h4>
              <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(acc.current_balance_cents, currencySymbol, lang)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-sky-600" />
              <span>Fund Transfer Between Accounts</span>
            </h3>

            <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">From Account *</label>
                  <select
                    required
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Select Source</option>
                    {bankAndCashAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_name} ({formatCurrency(a.current_balance_cents, currencySymbol, lang)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">To Account *</label>
                  <select
                    required
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Select Destination</option>
                    {bankAndCashAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_name} ({formatCurrency(a.current_balance_cents, currencySymbol, lang)})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Amount ({currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountTaka}
                  onChange={(e) => setAmountTaka(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Transfer Note / Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. ATM Cash Withdrawal, Bank Deposit"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-colors shadow-md shadow-sky-600/20"
                >
                  {isSubmitting ? 'Posting...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
