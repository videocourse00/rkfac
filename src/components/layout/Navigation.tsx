import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  GitFork,
  Users,
  FolderTree,
  FileSpreadsheet,
  Database,
  HelpCircle,
  Settings,
} from 'lucide-react';
import { translations } from '../../core/i18n/translations';
import { Language } from '../../types';

export type TabView =
  | 'dashboard'
  | 'transactions'
  | 'rules'
  | 'members_accounts'
  | 'categories'
  | 'reports'
  | 'backup_sync'
  | 'user_guide'
  | 'settings';

interface NavigationProps {
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
  lang: Language;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onChangeTab, lang }) => {
  const t = translations[lang];

  const navItems: { id: TabView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'transactions', label: t.transactions, icon: <Receipt className="w-4 h-4" /> },
    { id: 'rules', label: t.allocation_rules, icon: <GitFork className="w-4 h-4" /> },
    { id: 'members_accounts', label: t.members_accounts, icon: <Users className="w-4 h-4" /> },
    { id: 'categories', label: t.categories, icon: <FolderTree className="w-4 h-4" /> },
    { id: 'reports', label: t.reports, icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'backup_sync', label: t.backup_sync, icon: <Database className="w-4 h-4" /> },
    { id: 'user_guide', label: t.user_guide, icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'settings', label: t.settings, icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChangeTab(item.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
