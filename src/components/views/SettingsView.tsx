import React, { useState } from 'react';
import { BentoCard } from '../bento/BentoCard';
import { translations } from '../../core/i18n/translations';
import { AppSettings, Language, ThemeMode, AuthorshipInfo } from '../../types';
import { downloadUserGuidePdf } from '../../core/pdf/userGuide';
import { db, clearAllDatabaseTables } from '../../db/dexie';
import { syncEngine } from '../../core/sync/syncEngine';
import {
  Settings,
  Lock,
  Globe,
  Sun,
  Moon,
  Upload,
  Download,
  KeyRound,
  PhoneCall,
  LogOut,
  BookOpen,
  UserCheck,
  Building,
  Globe2,
  Trash2,
  Check,
  RefreshCw,
  Image as ImageIcon,
  ShieldCheck,
  Layers,
  Edit3,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  lang: Language;
  familyName?: string;
  onUpdateFamilyName?: (newName: string) => Promise<void>;
  onOpenAuthModal?: (mode: 'LOGIN' | 'SIGNUP' | 'CHANGE_PASSWORD' | 'CHANGE_MOBILE') => void;
  onLogout?: () => void;
  onNavigateTab?: (tab: any) => void;
  pendingSyncCount?: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  lang,
  familyName = 'Family Accounting',
  onUpdateFamilyName,
  onOpenAuthModal,
  onLogout,
  onNavigateTab,
  pendingSyncCount = 0,
}) => {
  const t = translations[lang];
  const isBn = lang === 'bn';

  // State
  const [appNameInput, setAppNameInput] = useState(settings.app_name || familyName);
  const [appNameSaved, setAppNameSaved] = useState(false);

  const [pinInput, setPinInput] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  const [authorship, setAuthorship] = useState<AuthorshipInfo>(
    settings.authorship || {
      name: 'MD Ibrahim Khalil',
      spouse: 'Roksana Khalil',
      contact: '01345322366',
      website: 'www.jewelscare.weebly.com',
      owner_teacher: 'RK Educare',
    }
  );
  const [authorshipSaved, setAuthorshipSaved] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Logo Upload Handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(isBn ? 'লোগোর সাইজ ২ মেগাবাইটের কম হতে হবে।' : 'Logo image must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onUpdateSettings({ custom_logo_uri: result });
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    onUpdateSettings({ custom_logo_uri: undefined });
  };

  // App Name Save Handler
  const handleSaveAppName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appNameInput.trim()) return;

    onUpdateSettings({ app_name: appNameInput.trim() });
    if (onUpdateFamilyName) {
      await onUpdateFamilyName(appNameInput.trim());
    }
    setAppNameSaved(true);
    setTimeout(() => setAppNameSaved(false), 2500);
  };

  // Authorship Save Handler
  const handleSaveAuthorship = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ authorship });
    setAuthorshipSaved(true);
    setTimeout(() => setAuthorshipSaved(false), 2500);
  };

  // PIN Setup Handlers
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setPinMessage(isBn ? 'পিন অবশ্যই ৪ থেকে ৬ ডিজিটের হতে হবে।' : 'PIN must be 4-6 digits.');
      return;
    }

    onUpdateSettings({
      security_pin_hash: pinInput,
      is_pin_enabled: true,
    });

    setPinMessage(isBn ? 'সিকিউরিটি পিন সফলভাবে সক্রিয় হয়েছে!' : 'Security PIN enabled successfully!');
    setPinInput('');
  };

  const handleDisablePin = () => {
    onUpdateSettings({
      security_pin_hash: undefined,
      is_pin_enabled: false,
    });
    setPinMessage(isBn ? 'সিকিউরিটি পিন নিষ্ক্রিয় করা হয়েছে।' : 'Security PIN disabled.');
  };

  // Local Export Backup
  const handleExportBackup = async () => {
    const familyProfile = await db.familyProfile.toArray();
    const familyMembers = await db.familyMembers.toArray();
    const categories = await db.categories.toArray();
    const accounts = await db.accounts.toArray();
    const allocationRules = await db.allocationRules.toArray();
    const transactions = await db.transactions.toArray();
    const journalEntries = await db.journalEntries.toArray();

    const backupData = {
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      familyProfile,
      familyMembers,
      categories,
      accounts,
      allocationRules,
      transactions,
      journalEntries,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `Family_Accounting_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Local Restore File
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.familyProfile) {
          setRestoreStatus(isBn ? 'অকার্যকর ব্যাকআপ ফাইল ফর্মেট।' : 'Invalid backup JSON format.');
          return;
        }

        await clearAllDatabaseTables();

        if (data.familyProfile) await db.familyProfile.bulkPut(data.familyProfile);
        if (data.familyMembers) await db.familyMembers.bulkPut(data.familyMembers);
        if (data.categories) await db.categories.bulkPut(data.categories);
        if (data.accounts) await db.accounts.bulkPut(data.accounts);
        if (data.allocationRules) await db.allocationRules.bulkPut(data.allocationRules);
        if (data.transactions) await db.transactions.bulkPut(data.transactions);
        if (data.journalEntries) await db.journalEntries.bulkPut(data.journalEntries);

        setRestoreStatus(isBn ? 'ডাটাবেস সফলভাবে রিস্টোর হয়েছে!' : 'Database successfully restored!');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        setRestoreStatus(isBn ? 'ব্যাকআপ ফাইল রিস্টোর করতে ব্যর্থ।' : 'Failed to restore backup file.');
      }
    };
    reader.readAsText(file);
  };

  // Cloud Sync Manual Trigger
  const handleTriggerCloudSync = async () => {
    setIsSyncing(true);
    try {
      await syncEngine.triggerSync();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Branding & Preferences (Span 6) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* 1. App Identity & Logo Management */}
          <BentoCard
            eyebrow="BRANDING & LOGO"
            title={isBn ? 'অ্যাপের লোগো ও নাম' : 'App Identity & Logo'}
            icon={<ImageIcon className="w-4 h-4 text-indigo-500" />}
          >
            <div className="space-y-4 mt-2">
              
              {/* Logo Preview & Upload */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="shrink-0">
                  {settings.custom_logo_uri ? (
                    <img
                      src={settings.custom_logo_uri}
                      alt="Custom App Logo"
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
                      <Layers className="w-7 h-7 text-indigo-100" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {settings.custom_logo_uri
                        ? isBn
                          ? 'কাস্টম লোগো সক্রিয়'
                          : 'Custom Logo Active'
                        : isBn
                        ? 'ডিফল্ট সিস্টেম লোগো'
                        : 'System Default Logo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isBn ? 'লোগো আপলোড' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {settings.custom_logo_uri && (
                      <button
                        onClick={handleResetLogo}
                        className="py-1.5 px-3 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-all"
                      >
                        {isBn ? 'ডিফল্ট করুন' : 'Reset'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Editable App Name Form */}
              <form onSubmit={handleSaveAppName} className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">
                  {isBn ? 'অ্যাপের নাম (App Name)' : 'App Name'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={appNameInput}
                    onChange={(e) => setAppNameInput(e.target.value)}
                    placeholder="e.g. Family Accounting"
                    className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                  >
                    {appNameSaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Edit3 className="w-3.5 h-3.5" />}
                    <span>{appNameSaved ? (isBn ? 'সেভ হয়েছে!' : 'Saved!') : (isBn ? 'পরিবর্তন করুন' : 'Save Name')}</span>
                  </button>
                </div>
              </form>

            </div>
          </BentoCard>

          {/* 2. Theme & Localization */}
          <BentoCard
            eyebrow="PREFERENCES"
            title={isBn ? 'ইন্টারফেস ও ভাষা সেটিংস' : 'Theme & Localization'}
            icon={<Globe className="w-4 h-4 text-indigo-500" />}
          >
            <div className="space-y-4 mt-2">
              
              {/* Language Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {t.language}
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => onUpdateSettings({ language: e.target.value as Language })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="bn">বাংলা (Bangla)</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Theme Selector (Light Mode & Dark Mode) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {t.theme}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ theme: 'light' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      settings.theme === 'light'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ theme: 'dark' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      settings.theme === 'dark'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dark</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ theme: 'system' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      settings.theme === 'system'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              {/* Hijri Calendar Offset */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {t.hijri_offset}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="-2"
                    max="2"
                    value={settings.hijri_offset}
                    onChange={(e) =>
                      onUpdateSettings({ hijri_offset: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-20 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-center focus:outline-none"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {isBn ? 'চাঁদের দিন সমন্বয় (-২ থেকে +২)' : 'Islamic lunar day adjustment (-2 to +2)'}
                  </span>
                </div>
              </div>

            </div>
          </BentoCard>

          {/* 3. Account Security, PIN, Password & Mobile */}
          <BentoCard
            eyebrow="SECURITY & ACCESS"
            title={isBn ? 'নিরাপত্তা পিন, পাসওয়ার্ড ও মোবাইল' : 'Security, Password & Phone'}
            badgeText={settings.is_pin_enabled ? 'PIN ACTIVE' : 'UNLOCKED'}
            badgeType={settings.is_pin_enabled ? 'emerald' : 'slate'}
            icon={<Lock className="w-4 h-4 text-rose-500" />}
          >
            <div className="space-y-4 mt-2">
              
              {/* Passcode PIN Setup */}
              <form onSubmit={handleSavePin} className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase">
                  {isBn ? 'অ্যাপ লক পিন কোড (৪-৬ ডিজিট)' : 'Passcode PIN (4-6 digits)'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="****"
                    className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-center tracking-widest focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    {t.set_pin}
                  </button>
                  {settings.is_pin_enabled && (
                    <button
                      type="button"
                      onClick={handleDisablePin}
                      className="py-2 px-3 bg-slate-100 dark:bg-slate-800 text-rose-600 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    >
                      Disable
                    </button>
                  )}
                </div>
                {pinMessage && (
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{pinMessage}</p>
                )}
              </form>

              {/* Password & Phone Number Actions */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuthModal && onOpenAuthModal('CHANGE_PASSWORD')}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isBn ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAuthModal && onOpenAuthModal('CHANGE_MOBILE')}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isBn ? 'মোবাইল নম্বর পরিবর্তন' : 'Change Mobile'}</span>
                </button>
              </div>

            </div>
          </BentoCard>

        </div>

        {/* Right Column: Backup/Restore, Authorship, User Guide & Logout (Span 6) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* 4. Backup & Restore Section */}
          <BentoCard
            eyebrow="DATA INTEGRITY"
            title={isBn ? 'ব্যাকআপ ও রিস্টোর' : 'Backup & Restore'}
            badgeText={pendingSyncCount > 0 ? `${pendingSyncCount} PENDING` : 'SYNCED'}
            badgeType={pendingSyncCount > 0 ? 'amber' : 'emerald'}
            icon={<Download className="w-4 h-4 text-emerald-500" />}
          >
            <div className="space-y-4 mt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'আপনার সমস্ত হিসাবের তথ্য লোকাল JSON ফাইলে ব্যাকআপ নিন অথবা ক্লাউড সেন্টারে সিঙ্ক করুন।'
                  : 'Export local JSON ledger backup or perform cloud synchronization for multi-device data access.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleExportBackup}
                  className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.backup_download}</span>
                </button>

                <label className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t.restore_upload}</span>
                  <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
                </label>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleTriggerCloudSync}
                  disabled={isSyncing}
                  className="py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isBn ? 'ক্লাউড সিঙ্ক করুন' : 'Sync to Cloud Now'}</span>
                </button>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('backup_sync')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {isBn ? 'বিস্তারিত সিঙ্ক মনিটর' : 'Full Sync Monitor →'}
                  </button>
                )}
              </div>

              {restoreStatus && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{restoreStatus}</span>
                </div>
              )}
            </div>
          </BentoCard>

          {/* 5. Editable Authorship Information */}
          <BentoCard
            eyebrow="AUTHORSHIP INFORMATION"
            title={isBn ? 'রচয়িতা ও মালিকানার তথ্য' : 'Authorship & Copyright Info'}
            icon={<UserCheck className="w-4 h-4 text-amber-500" />}
          >
            <form onSubmit={handleSaveAuthorship} className="space-y-3 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {isBn ? 'নাম (Name)' : 'Name'}
                  </label>
                  <input
                    type="text"
                    value={authorship.name}
                    onChange={(e) => setAuthorship({ ...authorship, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {isBn ? 'স্ত্রী/স্বামী (Spouse)' : 'Spouse'}
                  </label>
                  <input
                    type="text"
                    value={authorship.spouse || ''}
                    onChange={(e) => setAuthorship({ ...authorship, spouse: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {isBn ? 'যোগাযোগ (Contact)' : 'Contact Phone'}
                  </label>
                  <input
                    type="text"
                    value={authorship.contact || ''}
                    onChange={(e) => setAuthorship({ ...authorship, contact: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {isBn ? 'ওয়েবসাইট (Website)' : 'Website'}
                  </label>
                  <input
                    type="text"
                    value={authorship.website || ''}
                    onChange={(e) => setAuthorship({ ...authorship, website: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {isBn ? 'মালিক ও শিক্ষক (Owner & Teacher)' : 'Owner & Teacher'}
                  </label>
                  <input
                    type="text"
                    value={authorship.owner_teacher || ''}
                    onChange={(e) => setAuthorship({ ...authorship, owner_teacher: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] text-slate-400">
                  {isBn ? 'ব্যক্তিগত তথ্য সুরক্ষিত থাকে' : 'Private information is securely stored locally'}
                </span>

                <button
                  type="submit"
                  className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  {authorshipSaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Edit3 className="w-3.5 h-3.5" />}
                  <span>{authorshipSaved ? (isBn ? 'সেভ হয়েছে!' : 'Saved!') : (isBn ? 'সংরক্ষণ করুন' : 'Save Info')}</span>
                </button>
              </div>
            </form>
          </BentoCard>

          {/* 6. User Guide & System Manual */}
          <BentoCard
            eyebrow="DOCUMENTATION"
            title={isBn ? 'ব্যবহারকারীর নির্দেশিকা (User Guide)' : 'User Guide & Operating Manual'}
            icon={<BookOpen className="w-4 h-4 text-indigo-500" />}
          >
            <div className="space-y-3 mt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'ডাবল-এন্ট্রি একাউন্টিং, অটোমেটিক অ্যালোকেশন রুলস এবং আর্থিক রিপোর্ট ব্যবহারের দিকনির্দেশনা সম্বলিত পিডিএফ।'
                  : 'Complete operating manual for double-entry bookkeeping, dynamic percentage allocation rules, and 12 financial statements.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={downloadUserGuidePdf}
                  className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ইউজার গাইড পিডিএফ ডাউনলোড' : 'Download User Guide PDF'}</span>
                </button>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('user_guide')}
                    className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{isBn ? 'ম্যানুয়াল ড্যাশবোর্ড' : 'View Online Guide'}</span>
                  </button>
                )}
              </div>
            </div>
          </BentoCard>

          {/* 7. Logout Card */}
          {onLogout && (
            <div className="p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-rose-800 dark:text-rose-200 text-xs">
                  {isBn ? 'অ্যাকাউন্ট সাইন আউট' : 'Sign Out Account'}
                </h4>
                <p className="text-[11px] text-rose-600/80 dark:text-rose-300/70">
                  {isBn ? 'বর্তমান সেশন থেকে লগআউট করতে বোতামে চাপুন।' : 'Log out of your current session on this device.'}
                </p>
              </div>

              <button
                onClick={() => {
                  if (window.confirm(isBn ? 'আপনি কি লগআউট করতে চান?' : 'Are you sure you want to log out?')) {
                    onLogout();
                  }
                }}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isBn ? 'লগআউট' : 'Logout'}</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
