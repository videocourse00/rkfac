import React from 'react';
import { BentoCard } from '../bento/BentoCard';
import { downloadUserGuidePdf } from '../../core/pdf/userGuide';
import { translations } from '../../core/i18n/translations';
import { Language } from '../../types';
import { HelpCircle, Download, BookOpen, CheckCircle2 } from 'lucide-react';

interface UserGuideViewProps {
  lang: Language;
}

export const UserGuideView: React.FC<UserGuideViewProps> = ({ lang }) => {
  const t = translations[lang];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              System Manual & Operating Instructions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete documentation for double-entry accounting, rule customization, and multi-device sync.
            </p>
          </div>
        </div>

        <button
          onClick={downloadUserGuidePdf}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download User Guide PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BentoCard eyebrow="MODULE 01" title="1. Offline Operations & Local Store">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
            The app stores all data in client-side IndexedDB via Dexie.js. It operates autonomously without an internet connection. Every input is saved locally with zero network delay.
          </p>
        </BentoCard>

        <BentoCard eyebrow="MODULE 02" title="2. Dynamic Allocation Rules">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
            Rules automatically split income or expenses across multiple accounts or members based on configured percentage ratios (e.g. 60% Member A, 40% Member B). Rules strictly validate that splits total 100%.
          </p>
        </BentoCard>

        <BentoCard eyebrow="MODULE 03" title="3. Double-Entry Ledger Engine">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
            Every transaction posts balanced Debit and Credit journal lines in Paisa integers to eliminate rounding errors. Financial statements (Income & Expense, Balance Sheet) calculate live from journal records.
          </p>
        </BentoCard>

        <BentoCard eyebrow="MODULE 04" title="4. Bilingual & Hijri Calendar">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
            Supports English and Bangla interfaces with localized Bangla digit formatting. Features an integrated astronomical Gregorian to Islamic Bangla Hijri calendar converter with configurable lunar offset.
          </p>
        </BentoCard>
      </div>
    </div>
  );
};
