import React from 'react';
import { BentoCard } from '../bento/BentoCard';
import { translations, formatCurrency } from '../../core/i18n/translations';
import {
  FinancialSummary,
  Transaction,
  AllocationRule,
  Account,
  FamilyMember,
  Language,
} from '../../types';
import {
  Wallet,
  Building2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  GitFork,
  CheckCircle2,
  Users,
  PlusCircle,
  Database,
} from 'lucide-react';

interface DashboardViewProps {
  summary: FinancialSummary;
  recentTransactions: Transaction[];
  activeRules: AllocationRule[];
  accounts: Account[];
  members: FamilyMember[];
  currencySymbol: string;
  lang: Language;
  onOpenNewTransaction: () => void;
  onNavigateTab: (tab: any) => void;
  pendingSyncCount: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  recentTransactions,
  activeRules,
  accounts,
  members,
  currencySymbol,
  lang,
  onOpenNewTransaction,
  onNavigateTab,
  pendingSyncCount,
}) => {
  const t = translations[lang];

  return (
    <div className="space-y-6">
      {/* Top Quick Actions Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold uppercase tracking-wider">
              REAL-TIME LEDGER
            </span>
            <span className="text-slate-400 text-xs">• Zero Hardcoded Rules</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            {t.net_worth}: {formatCurrency(summary.total_assets_cents - summary.total_liabilities_cents, currencySymbol, lang)}
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            {t.total_income}: {formatCurrency(summary.period_income_cents, currencySymbol, lang)} |{' '}
            {t.total_expense}: {formatCurrency(summary.period_expense_cents, currencySymbol, lang)}
          </p>
        </div>

        <button
          onClick={onOpenNewTransaction}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all hover:scale-[1.02] shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.quick_new_transaction}</span>
        </button>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Assets */}
        <BentoCard
          eyebrow="METRIC 01"
          title={t.total_assets}
          badgeText="ASSET"
          badgeType="emerald"
          icon={<Wallet className="w-4 h-4 text-emerald-600" />}
        >
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {formatCurrency(summary.total_assets_cents, currencySymbol, lang)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cash, Bank & Investments</span>
            </p>
          </div>
        </BentoCard>

        {/* Total Liabilities */}
        <BentoCard
          eyebrow="METRIC 02"
          title={t.total_liabilities}
          badgeText="LIABILITY"
          badgeType="rose"
          icon={<Building2 className="w-4 h-4 text-rose-500" />}
        >
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {formatCurrency(summary.total_liabilities_cents, currencySymbol, lang)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
              <span>Loans & Outstanding Debts</span>
            </p>
          </div>
        </BentoCard>

        {/* Family Fund */}
        <BentoCard
          eyebrow="METRIC 03"
          title={t.family_fund}
          badgeText="SHARED"
          badgeType="indigo"
          icon={<PieChart className="w-4 h-4 text-indigo-500" />}
        >
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {formatCurrency(summary.total_family_fund_cents, currencySymbol, lang)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Shared household reserve pool
            </p>
          </div>
        </BentoCard>

        {/* Personal Savings */}
        <BentoCard
          eyebrow="METRIC 04"
          title={t.personal_savings}
          badgeText="MEMBER SAVINGS"
          badgeType="amber"
          icon={<Users className="w-4 h-4 text-amber-500" />}
        >
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {formatCurrency(summary.total_personal_savings_cents, currencySymbol, lang)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sum of member personal funds
            </p>
          </div>
        </BentoCard>
      </div>

      {/* Middle Row Bento Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Active Rules Card (Span 7) */}
        <div className="lg:col-span-7">
          <BentoCard
            eyebrow="RULE ENGINE"
            title={t.active_rules}
            badgeText={`${activeRules.length} CONFIGURED`}
            badgeType="indigo"
            icon={<GitFork className="w-4 h-4 text-indigo-500" />}
            action={
              <button
                onClick={() => onNavigateTab('rules')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Manage
              </button>
            }
          >
            {activeRules.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-2">
                <GitFork className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No allocation rules configured yet. Rules auto-split income/expenses across members!
                </p>
                <button
                  onClick={() => onNavigateTab('rules')}
                  className="mt-3 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-bold"
                >
                  Create First Rule
                </button>
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {activeRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-2"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {rule.rule_name}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {rule.allocations.map((a) => `${a.percentage}%`).join(' / ')} Split Ratio
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rule.allocations.map((a, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300"
                        >
                          {a.percentage}%
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BentoCard>
        </div>

        {/* Sync Status & Offline Storage Card (Span 5) */}
        <div className="lg:col-span-5">
          <BentoCard
            eyebrow="INFRASTRUCTURE"
            title={t.sync_status_title}
            badgeText={pendingSyncCount > 0 ? `${pendingSyncCount} QUEUED` : 'ALL SYNCED'}
            badgeType={pendingSyncCount > 0 ? 'amber' : 'emerald'}
            icon={<Database className="w-4 h-4 text-emerald-500" />}
          >
            <div className="space-y-3 mt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Storage Engine
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded">
                  Dexie.js IndexedDB
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Offline Readiness
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 100% Autonomous
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Delta Sync Queue
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {pendingSyncCount} pending mutation(s)
                </span>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>

      {/* Recent Activity Section */}
      <BentoCard
        eyebrow="LEDGER JOURNAL"
        title={t.recent_activity}
        action={
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View All
          </button>
        }
      >
        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No transactions recorded yet. Click "{t.quick_new_transaction}" to post your first record.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {recentTransactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="py-3 flex justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                        tx.type === 'INCOME'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : tx.type === 'EXPENSE'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {tx.type}
                    </span>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      {tx.description}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                    {tx.voucher_no} • {tx.transaction_date}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono font-bold text-sm ${
                      tx.type === 'INCOME'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : tx.type === 'EXPENSE'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                    {formatCurrency(tx.total_amount_cents, currencySymbol, lang)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </BentoCard>
    </div>
  );
};
