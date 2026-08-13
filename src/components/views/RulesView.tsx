import React, { useState } from 'react';
import { db } from '../../db/dexie';
import { BentoCard } from '../bento/BentoCard';
import { translations } from '../../core/i18n/translations';
import {
  AllocationRule,
  Category,
  Account,
  FamilyMember,
  Language,
  RuleCondition,
  AllocationSplit,
} from '../../types';
import {
  GitFork,
  Plus,
  Trash2,
  Edit2,
  Power,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Percent,
  Sliders,
  X,
  User,
  Building2,
  ArrowRight,
} from 'lucide-react';

interface RulesViewProps {
  rules: AllocationRule[];
  categories: Category[];
  accounts: Account[];
  members: FamilyMember[];
  familyId: string;
  lang: Language;
  onRefresh: () => void;
}

export const RulesView: React.FC<RulesViewProps> = ({
  rules,
  categories,
  accounts,
  members,
  familyId,
  lang,
  onRefresh,
}) => {
  const t = translations[lang];

  // Form State
  const [ruleName, setRuleName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState<
    'PERCENTAGE_SPLIT' | 'FIXED_ALLOCATION' | 'INCOME_DISTRIBUTION' | 'EXPENSE_SHARING'
  >('PERCENTAGE_SPLIT');
  const [sourceCategoryId, setSourceCategoryId] = useState('');
  const [priority, setPriority] = useState<number>(1);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Conditions list
  const [conditions, setConditions] = useState<RuleCondition[]>([]);

  // Allocation splits list
  const [allocations, setAllocations] = useState<
    { target_account_id: string; target_member_id?: string; percentage: number }[]
  >([
    { target_account_id: accounts[0]?.id || '', target_member_id: members[0]?.id || '', percentage: 60 },
    { target_account_id: accounts[1]?.id || accounts[0]?.id || '', target_member_id: members[1]?.id || members[0]?.id || '', percentage: 40 },
  ]);

  // Edit Modal State
  const [editingRule, setEditingRule] = useState<AllocationRule | null>(null);

  // Validation message
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate Percentage Total
  const currentTotalPercentage = allocations.reduce(
    (sum, a) => sum + (parseFloat(a.percentage as any) || 0),
    0
  );

  const isPercentageValid = Math.abs(currentTotalPercentage - 100) < 0.01;

  const handleAddSplit = () => {
    setAllocations([
      ...allocations,
      {
        target_account_id: accounts[0]?.id || '',
        target_member_id: members[0]?.id || '',
        percentage: 0,
      },
    ]);
  };

  const handleRemoveSplit = (idx: number) => {
    setAllocations(allocations.filter((_, i) => i !== idx));
  };

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { field: 'amount', operator: 'GREATER_THAN', value: '1000' },
    ]);
  };

  const handleRemoveCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ruleName.trim()) {
      setErrorMsg('Please specify a rule name.');
      return;
    }

    if (!isPercentageValid) {
      setErrorMsg(
        `Invalid Percentage Total: Total allocation must equal exactly 100% (Current total is ${currentTotalPercentage}%). Saving blocked.`
      );
      return;
    }

    const missingAccount = allocations.some((a) => !a.target_account_id);
    if (missingAccount) {
      setErrorMsg('Please select a target account for every split line.');
      return;
    }

    setErrorMsg('');
    const now = new Date().toISOString();

    const newRule: AllocationRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      family_id: familyId,
      rule_name: ruleName.trim(),
      description: description.trim() || undefined,
      rule_type: ruleType,
      source_category_id: sourceCategoryId || categories[0]?.id || '',
      priority,
      effective_from: effectiveFrom || undefined,
      effective_to: effectiveTo || undefined,
      conditions: conditions.length > 0 ? conditions : undefined,
      allocations,
      is_active: isActive,
      created_at: now,
      updated_at: now,
    };

    await db.allocationRules.put(newRule);

    // Reset Form
    setRuleName('');
    setDescription('');
    setConditions([]);
    setEffectiveFrom('');
    setEffectiveTo('');
    setPriority(1);
    setAllocations([
      { target_account_id: accounts[0]?.id || '', target_member_id: members[0]?.id || '', percentage: 60 },
      { target_account_id: accounts[1]?.id || accounts[0]?.id || '', target_member_id: members[1]?.id || members[0]?.id || '', percentage: 40 },
    ]);

    onRefresh();
  };

  const handleUpdateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    const total = editingRule.allocations.reduce(
      (sum, a) => sum + (parseFloat(a.percentage as any) || 0),
      0
    );

    if (Math.abs(total - 100) >= 0.01) {
      alert(`Total percentage must equal 100% (Current total: ${total}%). Update blocked.`);
      return;
    }

    await db.allocationRules.put({
      ...editingRule,
      updated_at: new Date().toISOString(),
    });

    setEditingRule(null);
    onRefresh();
  };

  const handleToggleActivate = async (rule: AllocationRule) => {
    await db.allocationRules.put({
      ...rule,
      is_active: !rule.is_active,
      updated_at: new Date().toISOString(),
    });
    onRefresh();
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm('Are you sure you want to delete this allocation rule?')) {
      await db.allocationRules.delete(id);
      onRefresh();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Rule Designer Form (Span 5) */}
      <div className="lg:col-span-5 space-y-6">
        <BentoCard
          eyebrow="AUTOMATION DESIGNER"
          title="Create Accounting Rule"
          badgeText={isPercentageValid ? 'TOTAL = 100% ✓' : `TOTAL = ${currentTotalPercentage}% ✗`}
          badgeType={isPercentageValid ? 'emerald' : 'rose'}
          icon={<GitFork className="w-4 h-4 text-indigo-500" />}
        >
          <form onSubmit={handleSaveRule} className="space-y-4 mt-2">
            {/* Error Message Alert */}
            {!isPercentageValid ? (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs flex items-center gap-2.5 font-medium animate-pulse">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold block">Percentage Total Error</span>
                  Allocation percentages sum to <strong>{currentTotalPercentage}%</strong> instead of 100%. Please adjust before saving.
                </div>
              </div>
            ) : errorMsg ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-2xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : null}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Rule Name
              </label>
              <input
                type="text"
                required
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. Salary Auto-Split (60/40) or Business Expense Distribution"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Rule Type
                </label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="PERCENTAGE_SPLIT">Percentage Split (60/40)</option>
                  <option value="INCOME_DISTRIBUTION">Income Distribution</option>
                  <option value="EXPENSE_SHARING">Expense Sharing</option>
                  <option value="FIXED_ALLOCATION">Fixed Allocation</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Priority Order
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Source Category
              </label>
              <select
                value={sourceCategoryId}
                onChange={(e) => setSourceCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="">All Categories (General Allocation Rule)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'bn' ? c.name_bn : c.name_en} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Effective Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Effective From
                </label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Effective To
                </label>
                <input
                  type="date"
                  value={effectiveTo}
                  onChange={(e) => setEffectiveTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Rule Conditions */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Trigger Conditions ({conditions.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Condition
                </button>
              </div>

              {conditions.length === 0 ? (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-[10px] text-slate-400 text-center">
                  Applies to all transactions under source category unconditionally.
                </div>
              ) : (
                <div className="space-y-2">
                  {conditions.map((cond, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs"
                    >
                      <select
                        value={cond.field}
                        onChange={(e) => {
                          const next = [...conditions];
                          next[idx].field = e.target.value;
                          setConditions(next);
                        }}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                      >
                        <option value="amount">Amount</option>
                        <option value="description">Description</option>
                        <option value="voucher_no">Voucher No</option>
                      </select>

                      <select
                        value={cond.operator}
                        onChange={(e) => {
                          const next = [...conditions];
                          next[idx].operator = e.target.value as any;
                          setConditions(next);
                        }}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg text-xs font-mono"
                      >
                        <option value="GREATER_THAN">{'>'}</option>
                        <option value="LESS_THAN">{'<'}</option>
                        <option value="EQUALS">{'='}</option>
                        <option value="CONTAINS">Contains</option>
                      </select>

                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => {
                          const next = [...conditions];
                          next[idx].value = e.target.value;
                          setConditions(next);
                        }}
                        placeholder="Value"
                        className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg text-xs font-mono"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Percentage Allocation Builder */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  Target Allocations & % Split
                </label>
                <button
                  type="button"
                  onClick={handleAddSplit}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Split Line
                </button>
              </div>

              {/* Total Percentage Indicator Box */}
              <div
                className={`p-3 rounded-2xl border mb-3 flex items-center justify-between transition-all ${
                  isPercentageValid
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  {isPercentageValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>Allocation Total:</span>
                </div>
                <div className="text-sm font-mono font-extrabold flex items-center gap-1">
                  <span>Total = {currentTotalPercentage}%</span>
                  <span>{isPercentageValid ? '✓' : '✗'}</span>
                </div>
              </div>

              {/* Allocation Lines */}
              <div className="space-y-2.5">
                {allocations.map((a, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                          Target Account
                        </span>
                        <select
                          required
                          value={a.target_account_id}
                          onChange={(e) => {
                            const next = [...allocations];
                            next[idx].target_account_id = e.target.value;
                            setAllocations(next);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                        >
                          <option value="">Select Account</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.account_name} ({acc.account_type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                          Beneficiary Member
                        </span>
                        <select
                          value={a.target_member_id || ''}
                          onChange={(e) => {
                            const next = [...allocations];
                            next[idx].target_member_id = e.target.value || undefined;
                            setAllocations(next);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                        >
                          <option value="">Shared Family</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              Member: {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        Percentage:
                      </span>
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          required
                          value={a.percentage}
                          onChange={(e) => {
                            const next = [...allocations];
                            next[idx].percentage = parseFloat(e.target.value) || 0;
                            setAllocations(next);
                          }}
                          className="w-24 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-extrabold text-center focus:outline-none"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>

                      {allocations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSplit(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!isPercentageValid}
              className={`w-full py-3 rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 ${
                isPercentageValid
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <GitFork className="w-4 h-4" />
              <span>Save Allocation Rule</span>
            </button>
          </form>
        </BentoCard>
      </div>

      {/* Rules List View (Span 7) */}
      <div className="lg:col-span-7 space-y-6">
        <BentoCard
          eyebrow="AUTOMATION RULES"
          title="Active Allocation Engine Rules"
          badgeText={`${rules.length} RULES`}
          badgeType="indigo"
          icon={<GitFork className="w-4 h-4 text-indigo-500" />}
        >
          {rules.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No allocation rules defined yet. Build your first rule on the left panel!
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              {rules.map((rule) => {
                const sourceCat = categories.find((c) => c.id === rule.source_category_id);

                return (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      rule.is_active
                        ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-100/60 dark:bg-slate-900/60 border-slate-200/40 dark:border-slate-800 opacity-75'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-700/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            {rule.rule_name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              rule.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {rule.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 text-[9px] font-mono font-bold rounded-md">
                            Priority #{rule.priority || 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium mt-1">
                          <span>
                            Type:{' '}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {rule.rule_type || 'PERCENTAGE_SPLIT'}
                            </strong>
                          </span>
                          <span>
                            Source Category:{' '}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {sourceCat
                                ? lang === 'bn'
                                  ? sourceCat.name_bn
                                  : sourceCat.name_en
                                : 'All Categories'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleActivate(rule)}
                          title={rule.is_active ? 'Deactivate Rule' : 'Activate Rule'}
                          className={`p-1.5 rounded-lg text-xs font-bold ${
                            rule.is_active
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingRule({ ...rule })}
                          title="Edit Rule"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          title="Delete Rule"
                          className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Effective Dates & Conditions */}
                    {(rule.effective_from || rule.effective_to || (rule.conditions && rule.conditions.length > 0)) && (
                      <div className="py-2 flex flex-wrap gap-2 text-[10px] font-mono border-b border-slate-100 dark:border-slate-700/60">
                        {rule.effective_from && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                            From: {rule.effective_from}
                          </span>
                        )}
                        {rule.effective_to && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                            To: {rule.effective_to}
                          </span>
                        )}
                        {rule.conditions &&
                          rule.conditions.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded border border-amber-200/60"
                            >
                              If {c.field} {c.operator} "{c.value}"
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Allocations Breakdown */}
                    <div className="pt-3 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                        <span>Allocation Split Breakdown</span>
                        <span className="text-emerald-600 font-mono">Total = 100% ✓</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {rule.allocations.map((alloc, idx) => {
                          const targetAcc = accounts.find((a) => a.id === alloc.target_account_id);
                          const targetMbr = members.find((m) => m.id === alloc.target_member_id);

                          return (
                            <div
                              key={idx}
                              className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                  <Building2 className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                                    {targetAcc ? targetAcc.account_name : 'Account'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono block">
                                    {targetMbr ? `Member: ${targetMbr.name}` : 'Shared Family'}
                                  </span>
                                </div>
                              </div>

                              <div className="px-2.5 py-1 bg-indigo-600 text-white font-mono font-extrabold text-xs rounded-lg shadow-2xs">
                                {alloc.percentage}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </BentoCard>
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-500" />
                Edit Allocation Rule
              </h3>
              <button
                onClick={() => setEditingRule(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRule} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  value={editingRule.rule_name}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, rule_name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Rule Type
                  </label>
                  <select
                    value={editingRule.rule_type || 'PERCENTAGE_SPLIT'}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, rule_type: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="PERCENTAGE_SPLIT">Percentage Split (60/40)</option>
                    <option value="INCOME_DISTRIBUTION">Income Distribution</option>
                    <option value="EXPENSE_SHARING">Expense Sharing</option>
                    <option value="FIXED_ALLOCATION">Fixed Allocation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Priority Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingRule.priority || 1}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        priority: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Edit Allocations */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                  Edit Percentage Allocations
                </label>
                <div className="space-y-2">
                  {editingRule.allocations.map((a, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2"
                    >
                      <select
                        value={a.target_account_id}
                        onChange={(e) => {
                          const next = [...editingRule.allocations];
                          next[idx].target_account_id = e.target.value;
                          setEditingRule({ ...editingRule, allocations: next });
                        }}
                        className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.account_name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.1"
                        value={a.percentage}
                        onChange={(e) => {
                          const next = [...editingRule.allocations];
                          next[idx].percentage = parseFloat(e.target.value) || 0;
                          setEditingRule({ ...editingRule, allocations: next });
                        }}
                        className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg text-xs font-mono font-bold text-center"
                      />
                      <span className="text-xs font-bold">%</span>
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-right text-xs font-mono font-bold">
                  Total ={' '}
                  {editingRule.allocations.reduce(
                    (s, a) => s + (parseFloat(a.percentage as any) || 0),
                    0
                  )}
                  %
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
