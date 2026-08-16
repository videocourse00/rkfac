import React, { useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CreditCard,
  Building2,
  Users,
  FolderTree,
  GitFork,
  FileSpreadsheet,
  Database,
  Settings,
  HelpCircle,
  Receipt,
  User,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { translations } from '../../core/i18n/translations';
import { Language } from '../../types';
import { AuthSession } from '../../core/auth/authService';

export type TabView =
  | 'dashboard'
  | 'income'
  | 'expense'
  | 'assets'
  | 'liabilities'
  | 'bank'
  | 'members_accounts'
  | 'categories'
  | 'rules'
  | 'reports'
  | 'backup_sync'
  | 'settings'
  | 'user_guide'
  | 'transactions';

interface SlideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
  lang: Language;
  authSession: AuthSession | null;
  familyName?: string;
  onOpenAuthModal?: (mode?: 'LOGIN' | 'SIGNUP' | 'CHANGE_PASSWORD' | 'CHANGE_MOBILE') => void;
  onLogout?: () => void;
}

export const SlideMenu: React.FC<SlideMenuProps> = ({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
  lang,
  authSession,
  familyName = 'Family Accounting',
  onOpenAuthModal,
  onLogout,
}) => {
  const t = translations[lang];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems: { id: TabView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'income', label: t.income, icon: <TrendingUp className="w-4 h-4 text-emerald-500" /> },
    { id: 'expense', label: t.expense, icon: <TrendingDown className="w-4 h-4 text-rose-500" /> },
    { id: 'assets', label: t.assets, icon: <ShieldCheck className="w-4 h-4 text-indigo-500" /> },
    { id: 'liabilities', label: t.liabilities, icon: <CreditCard className="w-4 h-4 text-amber-500" /> },
    { id: 'bank', label: t.bank, icon: <Building2 className="w-4 h-4 text-sky-500" /> },
    { id: 'members_accounts', label: t.members_accounts, icon: <Users className="w-4 h-4 text-violet-500" /> },
    { id: 'categories', label: t.categories, icon: <FolderTree className="w-4 h-4 text-teal-500" /> },
    { id: 'rules', label: t.allocation_rules, icon: <GitFork className="w-4 h-4 text-blue-500" /> },
    { id: 'reports', label: t.reports, icon: <FileSpreadsheet className="w-4 h-4 text-purple-500" /> },
    { id: 'backup_sync', label: t.backup_sync, icon: <Database className="w-4 h-4 text-cyan-500" /> },
    { id: 'settings', label: t.settings, icon: <Settings className="w-4 h-4 text-slate-500" /> },
    { id: 'user_guide', label: t.user_guide, icon: <HelpCircle className="w-4 h-4 text-emerald-600" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between transform transition-transform duration-300 ease-out animate-in slide-in-from-right">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="RK Educare"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-cover shadow-md shadow-indigo-600/20 shrink-0 border border-slate-200 dark:border-slate-700 bg-white"
              />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                  {familyName}
                </h3>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                  Offline-First Ledger
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-all"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between">
            {authSession ? (
              <div className="flex items-center gap-3 w-full justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {authSession.fullName}
                    </div>
                    <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                      {authSession.phoneNumber}
                    </div>
                  </div>
                </div>

                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Guest Mode
                </span>
                {onOpenAuthModal && (
                  <button
                    onClick={() => {
                      onOpenAuthModal('LOGIN');
                      onClose();
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    Login / Sign Up
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-none">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onChangeTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : ''}>{item.icon}</span>
                    <span className="tracking-wide">{item.label}</span>
                  </div>

                  <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isActive ? 'text-white' : ''}`} />
                </button>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] text-slate-400 font-medium flex items-center justify-between">
            <span>Family Accounting v2.0</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">● Offline Ready</span>
          </div>

        </div>
      </div>
    </div>
  );
};
