import React, { useState } from 'react';
import { BentoCard } from '../bento/BentoCard';
import { translations } from '../../core/i18n/translations';
import { formatCurrency } from '../../core/i18n/translations';
import { Language, Transaction, Category, Account, FamilyMember } from '../../types';
import { postTransaction } from '../../core/accounting/engine';
import { TrendingDown, Plus, Tag, User, CreditCard } from 'lucide-react';

interface ExpenseViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  members: FamilyMember[];
  familyId: string;
  currencySymbol: string;
  lang: Language;
  onRefresh: () => void;
}

export const ExpenseView: React.FC<ExpenseViewProps> = ({
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

  // Filter expense transactions
  const expenseTransactions = transactions.filter((tx) => tx.type === 'EXPENSE');
  const totalExpenseCents = expenseTransactions.reduce((acc, tx) => acc + tx.total_amount_cents, 0);

  // Expense categories
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE' || c.type === 'BOTH');

  // Form State
  const [amountTaka, setAmountTaka] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [targetMemberId, setTargetMemberId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountTaka || parseFloat(amountTaka) <= 0 || !sourceAccountId) return;

    setIsSubmitting(true);
    try {
      const amountCents = Math.round(parseFloat(amountTaka) * 100);
      await postTransaction({
        family_id: familyId,
        transaction_date: date,
        type: 'EXPENSE',
        description: description || 'Expense Record',
        total_amount_cents: amountCents,
        category_id: categoryId || undefined,
        source_account_id: sourceAccountId,
        target_member_id: targetMemberId || undefined,
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-rose-600 to-pink-700 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
              <TrendingDown className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-rose-100">
              {t.expense} Management
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {formatCurrency(totalExpenseCents, currencySymbol, lang)}
          </h2>
          <p className="text-rose-100 text-xs md:text-sm mt-1">
            Total recorded family and personal household expenses
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white text-rose-800 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-rose-50 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Expense Records List */}
      <BentoCard title={t.expense} subtitle={`${expenseTransactions.length} Total Expense Records`}>
        {expenseTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No expense transactions recorded yet. Click "Record Expense" to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Description</th>
                  <th className="pb-3 px-2">Category</th>
                  <th className="pb-3 px-2">Paid From</th>
                  <th className="pb-3 px-2">For Member</th>
                  <th className="pb-3 px-2 text-right">Amount ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {expenseTransactions.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.category_id);
                  const acc = accounts.find((a) => a.id === tx.source_account_id);
                  const mbr = members.find((m) => m.id === tx.target_member_id);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-2 font-mono text-slate-500 whitespace-nowrap">
                        {tx.transaction_date}
                      </td>
                      <td className="py-3.5 px-2 font-bold text-slate-800 dark:text-slate-200">
                        {tx.description}
                      </td>
                      <td className="py-3.5 px-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-md text-[10px] font-bold">
                          <Tag className="w-3 h-3" />
                          {cat ? (lang === 'bn' ? cat.name_bn : cat.name_en) : 'General Expense'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 font-mono text-slate-600 dark:text-slate-400">
                        {acc?.account_name || 'Cash/Bank'}
                      </td>
                      <td className="py-3.5 px-2 font-medium text-slate-500">
                        {mbr ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">
                            <User className="w-3 h-3 text-slate-400" />
                            {mbr.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">Entire Family</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                        -{formatCurrency(tx.total_amount_cents, currencySymbol, lang)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </BentoCard>

      {/* Record Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-600" />
              <span>Record Household Expense</span>
            </h3>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Amount ({currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountTaka}
                  onChange={(e) => setAmountTaka(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Grocery Shopping, Electricity Bill"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Select Category</option>
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>{lang === 'bn' ? c.name_bn : c.name_en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Pay From Account *</label>
                  <select
                    required
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_name} ({a.account_type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">For Family Member</label>
                  <select
                    value={targetMemberId}
                    onChange={(e) => setTargetMemberId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Entire Family (General)</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
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
                  className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20"
                >
                  {isSubmitting ? 'Posting...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
