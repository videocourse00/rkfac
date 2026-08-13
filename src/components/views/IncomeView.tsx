import React, { useState } from 'react';
import { BentoCard } from '../bento/BentoCard';
import { translations } from '../../core/i18n/translations';
import { formatCurrency } from '../../core/i18n/translations';
import { Language, Transaction, Category, Account, FamilyMember } from '../../types';
import { postTransaction } from '../../core/accounting/engine';
import { TrendingUp, Plus, Calendar, ArrowDownLeft, Tag, Layers } from 'lucide-react';

interface IncomeViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  members: FamilyMember[];
  familyId: string;
  currencySymbol: string;
  lang: Language;
  onRefresh: () => void;
}

export const IncomeView: React.FC<IncomeViewProps> = ({
  transactions,
  categories,
  accounts,
  members,
  familyId,
  currencySymbol,
  lang,
  onRefresh,
}) => {
  const t = translations[lang];
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter income transactions
  const incomeTransactions = transactions.filter((tx) => tx.type === 'INCOME');
  const totalIncomeCents = incomeTransactions.reduce((acc, tx) => acc + tx.total_amount_cents, 0);

  // Income categories
  const incomeCategories = categories.filter((c) => c.type === 'INCOME' || c.type === 'BOTH');

  // Form State
  const [amountTaka, setAmountTaka] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [destAccountId, setDestAccountId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountTaka || parseFloat(amountTaka) <= 0 || !destAccountId) return;

    setIsSubmitting(true);
    try {
      const amountCents = Math.round(parseFloat(amountTaka) * 100);
      await postTransaction({
        family_id: familyId,
        transaction_date: date,
        type: 'INCOME',
        description: description || 'Income Record',
        total_amount_cents: amountCents,
        category_id: categoryId || undefined,
        destination_account_id: destAccountId,
      });

      setShowAddModal(false);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
              <TrendingUp className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">
              {t.income} Management
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {formatCurrency(totalIncomeCents, currencySymbol, lang)}
          </h2>
          <p className="text-emerald-100 text-xs md:text-sm mt-1">
            Total recorded family revenue and earned income
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-800 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-emerald-50 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Record Income</span>
        </button>
      </div>

      {/* Income Records List */}
      <BentoCard title={t.income} subtitle={`${incomeTransactions.length} Total Income Records`}>
        {incomeTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No income transactions recorded yet. Click "Record Income" to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Description</th>
                  <th className="pb-3 px-2">Category</th>
                  <th className="pb-3 px-2">Deposited To</th>
                  <th className="pb-3 px-2 text-right">Amount ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {incomeTransactions.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.category_id);
                  const acc = accounts.find((a) => a.id === tx.destination_account_id);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-2 font-mono text-slate-500 whitespace-nowrap">
                        {tx.transaction_date}
                      </td>
                      <td className="py-3.5 px-2 font-bold text-slate-800 dark:text-slate-200">
                        {tx.description}
                      </td>
                      <td className="py-3.5 px-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md text-[10px] font-bold">
                          <Tag className="w-3 h-3" />
                          {cat ? (lang === 'bn' ? cat.name_bn : cat.name_en) : 'General Income'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 font-mono text-slate-600 dark:text-slate-400">
                        {acc?.account_name || 'Cash/Bank Account'}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        +{formatCurrency(tx.total_amount_cents, currencySymbol, lang)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </BentoCard>

      {/* Record Income Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Record Family Income</span>
            </h3>

            <form onSubmit={handleAddIncome} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Amount ({currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountTaka}
                  onChange={(e) => setAmountTaka(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly Salary, Business Profit"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {incomeCategories.map((c) => (
                      <option key={c.id} value={c.id}>{lang === 'bn' ? c.name_bn : c.name_en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Deposit To Account *</label>
                  <select
                    required
                    value={destAccountId}
                    onChange={(e) => setDestAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_name} ({a.account_type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
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
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
                >
                  {isSubmitting ? 'Posting...' : 'Save Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
