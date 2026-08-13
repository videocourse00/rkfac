import React, { useState } from 'react';
import { db } from '../../db/dexie';
import { BentoCard } from '../bento/BentoCard';
import { translations } from '../../core/i18n/translations';
import { Language, AccountType } from '../../types';
import { Users, Building2, Plus, Trash2, CheckCircle2, Sparkles } from 'lucide-react';

interface OnboardingWizardProps {
  lang: Language;
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ lang, onComplete }) => {
  const t = translations[lang];

  const [familyName, setFamilyName] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('৳');

  const [members, setMembers] = useState<{ name: string; relation: string }[]>([
    { name: '', relation: 'Self' },
  ]);

  const [accounts, setAccounts] = useState<
    { name: string; type: AccountType; openingTaka: string }[]
  >([
    { name: 'Cash in Hand', type: 'CASH', openingTaka: '0' },
    { name: 'Family Fund', type: 'FAMILY_FUND', openingTaka: '0' },
  ]);

  const handleAddMember = () => {
    setMembers([...members, { name: '', relation: 'Member' }]);
  };

  const handleRemoveMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const handleAddAccount = () => {
    setAccounts([...accounts, { name: '', type: 'BANK', openingTaka: '0' }]);
  };

  const handleRemoveAccount = (idx: number) => {
    setAccounts(accounts.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;

    const familyId = `family_${Date.now()}`;
    const now = new Date().toISOString();

    await db.transaction(
      'rw',
      [db.familyProfile, db.familyMembers, db.categories, db.accounts],
      async () => {
        // 1. Profile
        await db.familyProfile.put({
          id: familyId,
          family_name: familyName,
          currency_symbol: currencySymbol || '৳',
          currency_code: 'BDT',
          created_at: now,
          updated_at: now,
        });

        // 2. Members
        const createdMemberIds: string[] = [];
        for (const m of members) {
          if (!m.name.trim()) continue;
          const memberId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          createdMemberIds.push(memberId);
          await db.familyMembers.put({
            id: memberId,
            family_id: familyId,
            name: m.name.trim(),
            relation: m.relation,
            is_active: true,
            created_at: now,
            updated_at: now,
          });
        }

        // 3. Default Core Categories (Bilingual placeholders)
        const defaultCategories = [
          { name_en: 'Salary & Business Income', name_bn: 'বেতন ও ব্যবসায়িক আয়', type: 'INCOME' },
          { name_en: 'Household Expenses', name_bn: 'পারিবারিক গৃহস্থালি খরচ', type: 'EXPENSE' },
          { name_en: 'Education & Medical', name_bn: 'শিক্ষা ও চিকিৎসা', type: 'EXPENSE' },
          { name_en: 'Investment Asset', name_bn: 'বিনিয়োগ সম্পদ', type: 'ASSET' },
          { name_en: 'Bank Loan & Payable', name_bn: 'ব্যাংক ঋণ ও দায়', type: 'LIABILITY' },
        ];

        for (const cat of defaultCategories) {
          await db.categories.put({
            id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            family_id: familyId,
            type: cat.type as any,
            name_en: cat.name_en,
            name_bn: cat.name_bn,
            is_active: true,
            created_at: now,
            updated_at: now,
          });
        }

        // 4. Accounts
        for (const acc of accounts) {
          if (!acc.name.trim()) continue;
          const taka = parseFloat(acc.openingTaka) || 0;
          const paisa = Math.round(taka * 100);

          await db.accounts.put({
            id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            family_id: familyId,
            account_name: acc.name.trim(),
            account_type: acc.type,
            opening_balance_cents: paisa,
            current_balance_cents: paisa,
            created_at: now,
            updated_at: now,
          });
        }
      }
    );

    onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-widest mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>DATABASE IS EMPTY</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          {t.welcome_title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xl mx-auto">
          {t.welcome_subtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Family Basic Details */}
        <BentoCard
          eyebrow="STEP 01"
          title={t.family_name}
          badgeText="REQUIRED"
          badgeType="indigo"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t.family_name}
              </label>
              <input
                type="text"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="e.g. Rahman Family / চৌধুরী পরিবার"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t.currency_symbol}
              </label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
              />
            </div>
          </div>
        </BentoCard>

        {/* Dynamic Family Members */}
        <BentoCard
          eyebrow="STEP 02"
          title={t.family_members}
          icon={<Users className="w-4 h-4 text-indigo-500" />}
          action={
            <button
              type="button"
              onClick={handleAddMember}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.add_member}</span>
            </button>
          }
        >
          <div className="space-y-3 mt-2">
            {members.map((m, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <input
                  type="text"
                  required
                  value={m.name}
                  onChange={(e) => {
                    const next = [...members];
                    next[idx].name = e.target.value;
                    setMembers(next);
                  }}
                  placeholder={`${t.member_name} ${idx + 1}`}
                  className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={m.relation}
                  onChange={(e) => {
                    const next = [...members];
                    next[idx].relation = e.target.value;
                    setMembers(next);
                  }}
                  className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="Self">Self (নিজ)</option>
                  <option value="Spouse">Spouse (স্বামী/স্ত্রী)</option>
                  <option value="Parent">Parent (পিতা/মাতা)</option>
                  <option value="Child">Child (সন্তান)</option>
                  <option value="Relative">Relative (আত্মীয়)</option>
                </select>
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(idx)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Dynamic Accounts Setup */}
        <BentoCard
          eyebrow="STEP 03"
          title={t.accounts_setup}
          icon={<Building2 className="w-4 h-4 text-emerald-500" />}
          action={
            <button
              type="button"
              onClick={handleAddAccount}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.add_account}</span>
            </button>
          }
        >
          <div className="space-y-3 mt-2">
            {accounts.map((acc, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <input
                  type="text"
                  required
                  value={acc.name}
                  onChange={(e) => {
                    const next = [...accounts];
                    next[idx].name = e.target.value;
                    setAccounts(next);
                  }}
                  placeholder={t.account_name}
                  className="md:col-span-5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                />
                <select
                  value={acc.type}
                  onChange={(e) => {
                    const next = [...accounts];
                    next[idx].type = e.target.value as AccountType;
                    setAccounts(next);
                  }}
                  className="md:col-span-4 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="CASH">Cash (ক্যাশ)</option>
                  <option value="BANK">Bank Account (ব্যাংক হিসাব)</option>
                  <option value="FAMILY_FUND">Family Fund (পারিবারিক ফান্ড)</option>
                  <option value="PERSONAL_SAVINGS">Personal Savings (ব্যক্তিগত সঞ্চয়)</option>
                </select>
                <div className="md:col-span-3 flex items-center gap-2">
                  <input
                    type="number"
                    value={acc.openingTaka}
                    onChange={(e) => {
                      const next = [...accounts];
                      next[idx].openingTaka = e.target.value;
                      setAccounts(next);
                    }}
                    placeholder={t.opening_balance}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none"
                  />
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAccount(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Submit Button */}
        <div className="pt-4 flex justify-center">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01]"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{t.finish_setup}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
