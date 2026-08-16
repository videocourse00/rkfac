import React, { useState, useEffect } from 'react';
import {
  Globe,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Lock,
  Calendar,
  Layers,
  User,
  LogOut,
  KeyRound,
  PhoneCall,
  LogIn,
  Printer,
  Share2,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Check,
} from 'lucide-react';
import { getHijriDate, getThreeFormattedDates } from '../../core/calendar/hijri';
import { translations } from '../../core/i18n/translations';
import { Language, ThemeMode, AppSettings } from '../../types';
import { SyncStatusBar } from '../sync/SyncStatusBar';
import { AuthSession } from '../../core/auth/authService';
import { TabView } from './SlideMenu';

interface HeaderProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  familyName?: string;
  onLockApp: () => void;
  pendingSyncCount: number;
  familyId?: string;
  authSession: AuthSession | null;
  onOpenAuthModal: (mode?: 'LOGIN' | 'SIGNUP' | 'CHANGE_PASSWORD' | 'CHANGE_MOBILE') => void;
  onLogout: () => void;
  onRefreshApp?: () => void;
  onOpenMenu: () => void;
  onNavigateTab: (tab: TabView) => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  familyName = 'FAMILY ACCOUNTING',
  onLockApp,
  pendingSyncCount,
  familyId,
  authSession,
  onOpenAuthModal,
  onLogout,
  onRefreshApp,
  onOpenMenu,
  onNavigateTab,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentHijri, setCurrentHijri] = useState(() =>
    getHijriDate(new Date(), settings.hijri_offset)
  );
  const [showAuthMenu, setShowAuthMenu] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const t = translations[settings.language];

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setCurrentHijri(getHijriDate(new Date(), settings.hijri_offset));
  }, [settings.hijri_offset]);

  const toggleLanguage = () => {
    const nextLang: Language = settings.language === 'en' ? 'bn' : 'en';
    onUpdateSettings({ language: nextLang });
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdateSettings({ theme: nextTheme });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: familyName || 'Family Accounting System',
          text: 'Family Accounting System - Offline-first ledger',
          url: window.location.href,
        });
        return;
      } catch (e) {
        // Fallback to copy
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  return (
    <header className="flex flex-col gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        
        {/* App Logo & Title */}
        <div className="flex items-center gap-3">
          <img
            src={settings.custom_logo_uri || '/logo.png'}
            alt="RK Educare Logo"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-2xl object-cover shadow-md shadow-indigo-600/20 shrink-0 border border-slate-200 dark:border-slate-700 bg-white"
          />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 uppercase">
                {settings.app_name || familyName}
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 uppercase tracking-wider">
                V2.0
              </span>
            </div>

            {/* Multi-Calendar Date Display (English, Bangla Gregorian, Bangla Hijri) */}
            {(() => {
              const threeDates = getThreeFormattedDates(new Date(), settings.hijri_offset);
              return (
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] font-semibold">
                  {/* English Date */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span>{threeDates.englishDate}</span>
                  </span>

                  {/* Bangla Gregorian Date */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Globe className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{threeDates.banglaGregorianDate}</span>
                  </span>

                  {/* Bangla Hijri Islamic Date */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/80 font-bold">
                    <Moon className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{threeDates.banglaHijriDate}</span>
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Top Bar Actions Cluster */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Online / Offline Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              }`}
              title={isOnline ? 'Network Connected' : 'Working Offline'}
            >
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              )}
              <span className="hidden sm:inline uppercase tracking-wider">
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {pendingSyncCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full font-mono text-[9px] font-bold">
                  {pendingSyncCount}
                </span>
              )}
            </div>

            {/* Bangla / English Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
              title="Switch Language (Bangla / English)"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>{settings.language === 'en' ? 'BN' : 'EN'}</span>
            </button>

            {/* Light / Dark Theme Mode */}
            <button
              onClick={toggleTheme}
              className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
              title="Toggle Light/Dark Theme"
            >
              {settings.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* PDF / Print Action */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
              title="Print / Save PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{t.print_pdf}</span>
            </button>

            {/* Share Action */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs relative"
              title="Share App"
            >
              {copiedToast ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span className="hidden sm:inline">{copiedToast ? 'Copied!' : t.share_app}</span>
            </button>

            {/* Settings Quick Access Button */}
            <button
              onClick={() => onNavigateTab('settings')}
              className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
              title={t.settings}
            >
              <SettingsIcon className="w-4 h-4 text-slate-500" />
            </button>

            {/* PIN Lock */}
            {settings.is_pin_enabled && (
              <button
                onClick={onLockApp}
                className="p-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-full text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-all shadow-xs"
                title="Lock Application"
              >
                <Lock className="w-4 h-4 text-rose-500" />
              </button>
            )}
          </div>

          {/* User Account / Auth & Hamburger Menu Trigger */}
          <div className="flex items-center gap-2">
            
            {/* User Account Button */}
            <div className="relative">
              {authSession ? (
                <button
                  onClick={() => setShowAuthMenu(!showAuthMenu)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-mono text-[11px]">{authSession.phoneNumber}</span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenAuthModal('LOGIN')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              )}

              {/* User Dropdown Menu */}
              {showAuthMenu && authSession && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 text-xs font-medium space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-slate-800 dark:text-slate-100">{authSession.fullName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{authSession.phoneNumber}</div>
                  </div>

                  <button
                    onClick={() => {
                      setShowAuthMenu(false);
                      onOpenAuthModal('CHANGE_PASSWORD');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAuthMenu(false);
                      onOpenAuthModal('CHANGE_MOBILE');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Change Phone</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAuthMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger Menu Trigger Button (☰ Menu) */}
            <button
              onClick={onOpenMenu}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-full text-xs font-extrabold tracking-wide uppercase shadow-md shadow-indigo-600/20 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 transition-all"
            >
              <MenuIcon className="w-4 h-4" />
              <span>{t.menu || 'Menu'}</span>
            </button>

          </div>

        </div>

      </div>

      {/* Sync Status Banner */}
      <SyncStatusBar familyId={familyId} onRefreshApp={onRefreshApp} />
    </header>
  );
};

