import React, { useState } from 'react';
import { BentoCard } from '../bento/BentoCard';
import { translations, formatCurrency } from '../../core/i18n/translations';
import { postTransaction, deleteTransaction, takaToPaisa, classifyTransaction } from '../../core/accounting/engine';
import { syncEngine } from '../../core/sync/syncEngine';
import {
  Transaction,
  Category,
  AllocationRule,
  Account,
  FamilyMember,
  Language,
  TransactionType,
} from '../../types';
import {
  Plus,
  Receipt,
  Search,
  Filter,
  Paperclip,
  Check,
  X,
  FileImage,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  rules: AllocationRule[];
  accounts: Account[];
  members: FamilyMember[];
  familyId: string;
  currencySymbol: string;
  lang: Language;
  onRefresh: () => void;
  isOpenNewModal?: boolean;
  onCloseModal?: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  rules,
  accounts,
  members,
  familyId,
  currencySymbol,
  lang,
  onRefresh,
  isOpenNewModal = false,
  onCloseModal,
}) => {
  const t = translations[lang];

  const [showModal, setShowModal] = useState(isOpenNewModal);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Form State
  const [type, setType] = useState<TransactionType>('INCOME');
  const [description, setDescription] = useState('');
  const [amountTaka, setAmountTaka] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [ruleId, setRuleId] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destAccountId, setDestAccountId] = useState('');
  const [targetMemberId, setTargetMemberId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [receiptImageUri, setReceiptImageUri] = useState<string | undefined>(undefined);
  const [createdByMemberId, setCreatedByMemberId] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);

  const handleOpenModal = () => {
    setShowModal(true);
    setDuplicateWarning(null);
    const matching = categories.find((c) => c.type === (type === 'INCOME' ? 'INCOME' : 'EXPENSE'));
    if (matching) setCategoryId(matching.id);
  };

  const handleClose = () => {
    setShowModal(false);
    setDuplicateWarning(null);
    if (onCloseModal) onCloseModal();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImageUri(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const checkForDuplicate = (
    txDate: string,
    txAmountCents: number,
    txCatId: string,
    txType: TransactionType,
    txDesc: string
  ): boolean => {
    const normDesc = txDesc.trim().toLowerCase();
    const existing = transactions.find(
      (tx) =>
        !tx.is_deleted &&
        tx.transaction_date === txDate &&
        tx.total_amount_cents === txAmountCents &&
        tx.category_id === txCatId &&
        tx.type === txType &&
        tx.description.trim().toLowerCase() === normDesc
    );
    return !!existing;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amountTaka) return;

    const amountCents = takaToPaisa(amountTaka);
    if (amountCents <= 0) return;

    // One transaction must be entered only once check
    if (!duplicateWarning) {
      const isDuplicate = checkForDuplicate(date, amountCents, categoryId, type, description);
      if (isDuplicate) {
        setDuplicateWarning(
          lang === 'bn'
            ? 'সতর্কতা: একই তারিখ, ক্যাটাগরি, বিবরণ ও পরিমাণের একটি লেনদেন ডাটাবেসে ইতোমধ্যে সংরক্ষিত আছে। আপনি কি নিশ্চিত যে এটি অন্য নতুন লেনদেন?'
            : 'Warning: An identical transaction (same date, category, description, and amount) already exists in the ledger. One transaction must be entered only once. Click "Save Record" again if you are sure.'
        );
        return;
      }
    }

    const accountingNature = classifyTransaction(type, targetMemberId || createdByMemberId);

    try {
      await postTransaction({
        family_id: familyId,
        transaction_date: date,
        type,
        description: description.trim(),
        total_amount_cents: amountCents,
        category_id: categoryId || categories[0]?.id || '',
        allocation_rule_id: ruleId || undefined,
        source_account_id: sourceAccountId || undefined,
        destination_account_id: destAccountId || undefined,
        target_member_id: targetMemberId || undefined,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
        accounting_nature: accountingNature,
        receipt_image_uri: receiptImageUri,
        created_by_member_id: createdByMemberId || undefined,
      });

      syncEngine.triggerSync(familyId);

      // Reset Form
      setDescription('');
      setAmountTaka('');
      setNotes('');
      setReceiptImageUri(undefined);
      setRuleId('');
      setDuplicateWarning(null);
      handleClose();
      onRefresh();
    } catch (err: any) {
      alert(`Transaction posting failed: ${err?.message || err}`);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction? Local account balances will be adjusted automatically.')) {
      await deleteTransaction(txId);
      syncEngine.triggerSync(familyId);
      onRefresh();
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.voucher_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by voucher or description..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
            <option value="ASSET_PURCHASE">Asset Purchase</option>
            <option value="LIABILITY_REPAYMENT">Liability Repayment</option>
          </select>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all shrink-0 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>{t.quick_new_transaction}</span>
        </button>
      </div>

      {/* Transactions Table Card */}
      <BentoCard
        eyebrow="LEDGER RECORDS"
        title={t.transactions}
        badgeText={`${filteredTransactions.length} TOTAL`}
        badgeType="indigo"
      >
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No transaction records match your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <th className="pb-3 px-2">Voucher & Date</th>
                  <th className="pb-3 px-2">Type & Nature</th>
                  <th className="pb-3 px-2">Description & Category</th>
                  <th className="pb-3 px-2">Member / Account</th>
                  <th className="pb-3 px-2 text-right">Amount ({currencySymbol})</th>
                  <th className="pb-3 px-2 text-center">Sync</th>
                  <th className="pb-3 px-2 text-center">Receipt</th>
                  <th className="pb-3 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredTransactions.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.category_id);
                  const isPending = tx.sync_status === 'PENDING';
                  const mem = members.find((m) => m.id === (tx.target_member_id || tx.created_by_member_id));
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-2">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                          {tx.voucher_no}
                        </span>
                        <span className="text-[10px] text-slate-400">{tx.transaction_date}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase block w-fit ${
                            tx.type === 'INCOME'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : tx.type === 'EXPENSE'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          {tx.type}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                          {tx.accounting_nature || 'REGULAR'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-bold text-slate-800 dark:text-slate-100 block">
                          {tx.description}
                        </span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                          {cat ? (lang === 'bn' ? cat.name_bn : cat.name_en) : 'General'}
                        </span>
                        {tx.notes && <span className="text-[10px] text-slate-400 block italic">{tx.notes}</span>}
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-medium text-slate-700 dark:text-slate-300 block">
                          {mem ? mem.name : 'Shared Family'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {tx.payment_method || 'CASH'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold">
                        <span
                          className={
                            tx.type === 'INCOME'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : tx.type === 'EXPENSE'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }
                        >
                          {formatCurrency(tx.total_amount_cents, currencySymbol, lang)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded text-[9px] font-bold uppercase">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded text-[9px] font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Synced
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {tx.receipt_image_uri ? (
                          <button
                            onClick={() => setSelectedTxForReceipt(tx)}
                            className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100"
                            title="View Receipt Image"
                          >
                            <FileImage className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => handleDeleteTx(tx.id)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </BentoCard>

      {/* New Transaction Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                {t.quick_new_transaction}
              </h3>
              <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {duplicateWarning && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {(['INCOME', 'EXPENSE', 'TRANSFER', 'ASSET_PURCHASE', 'LIABILITY_REPAYMENT'] as TransactionType[]).map((tType) => (
                  <button
                    key={tType}
                    type="button"
                    onClick={() => {
                      setType(tType);
                      setDuplicateWarning(null);
                      const matching = categories.find(
                        (c) => c.type === (tType === 'INCOME' ? 'INCOME' : tType === 'EXPENSE' ? 'EXPENSE' : 'ASSET')
                      );
                      if (matching) setCategoryId(matching.id);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold uppercase tracking-tight text-center ${
                      type === tType
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tType.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Description & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.description}
                  </label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setDuplicateWarning(null);
                    }}
                    placeholder="e.g. Salary / Grocery Shop"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.amount} ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountTaka}
                    onChange={(e) => {
                      setAmountTaka(e.target.value);
                      setDuplicateWarning(null);
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Date & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.date}
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setDuplicateWarning(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.category}
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setDuplicateWarning(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'bn' ? c.name_bn : c.name_en} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Member & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {lang === 'bn' ? 'সংশ্লিষ্ট সদস্য (Member)' : 'Target Member'}
                  </label>
                  <select
                    value={targetMemberId}
                    onChange={(e) => setTargetMemberId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="">{lang === 'bn' ? 'পারিবারিক ফান্ড (Shared Family)' : 'Shared Family'}</option>
                    {members
                      .filter((m) => m.is_active)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.relation})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {lang === 'bn' ? 'পেমেন্ট পদ্ধতি' : 'Payment Method'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="MOBILE_WALLET">Mobile Banking (bKash/Nagad)</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                    <option value="CHECK">Check</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Allocation Rule selector */}
              {type !== 'TRANSFER' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    {t.rule_applied}
                  </label>
                  <select
                    value={ruleId}
                    onChange={(e) => setRuleId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="">{t.no_rule}</option>
                    {rules
                      .filter((r) => r.is_active)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.rule_name} (
                          {r.allocations.map((a) => `${a.percentage}%`).join('/')})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Direct Accounts fallback if no rule selected or if Transfer/Asset/Liability */}
              {(!ruleId || type === 'TRANSFER' || type === 'ASSET_PURCHASE' || type === 'LIABILITY_REPAYMENT') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(type === 'EXPENSE' || type === 'TRANSFER' || type === 'ASSET_PURCHASE' || type === 'LIABILITY_REPAYMENT') && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        {t.source_account}
                      </label>
                      <select
                        value={sourceAccountId}
                        onChange={(e) => setSourceAccountId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                      >
                        <option value="">Select Account</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.account_name} ({a.account_type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(type === 'INCOME' || type === 'TRANSFER' || type === 'ASSET_PURCHASE' || type === 'LIABILITY_REPAYMENT') && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        {t.destination_account}
                      </label>
                      <select
                        value={destAccountId}
                        onChange={(e) => setDestAccountId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                      >
                        <option value="">Select Account</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.account_name} ({a.account_type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  {lang === 'bn' ? 'অতিরিক্ত মন্তব্য / নোট' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional accounting notes..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                />
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  {t.receipt_attachment}
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {receiptImageUri && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Attached
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview Lightbox Modal */}
      {selectedTxForReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Voucher Receipt: {selectedTxForReceipt.voucher_no}
              </h4>
              <button
                onClick={() => setSelectedTxForReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-950 max-h-96 flex items-center justify-center">
              <img
                src={selectedTxForReceipt.receipt_image_uri}
                alt="Receipt Voucher"
                className="max-h-96 object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
