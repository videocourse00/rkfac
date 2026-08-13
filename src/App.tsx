import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getOrCreateAppSettings } from './db/dexie';
import { calculateFinancialSummary } from './core/accounting/engine';
import { Header } from './components/layout/Header';
import { SlideMenu, TabView } from './components/layout/SlideMenu';
import { OnboardingWizard } from './components/views/OnboardingWizard';
import { DashboardView } from './components/views/DashboardView';
import { IncomeView } from './components/views/IncomeView';
import { ExpenseView } from './components/views/ExpenseView';
import { AssetsView } from './components/views/AssetsView';
import { LiabilitiesView } from './components/views/LiabilitiesView';
import { BankView } from './components/views/BankView';
import { TransactionsView } from './components/views/TransactionsView';
import { RulesView } from './components/views/RulesView';
import { MembersAccountsView } from './components/views/MembersAccountsView';
import { CategoriesView } from './components/views/CategoriesView';
import { ReportsView } from './components/views/ReportsView';
import { BackupSyncView } from './components/views/BackupSyncView';
import { UserGuideView } from './components/views/UserGuideView';
import { SettingsView } from './components/views/SettingsView';
import { PinLockModal } from './components/common/PinLockModal';
import { UserGuideModal } from './components/common/UserGuideModal';
import { AuthModal } from './components/auth/AuthModal';
import { AuthLandingView } from './components/auth/AuthLandingView';
import { FarewellScene } from './components/auth/FarewellScene';
import { getLocalAuthSession, logoutUser, AuthSession } from './core/auth/authService';
import { syncEngine } from './core/sync/syncEngine';
import { AppSettings, FinancialSummary } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showNewTxModal, setShowNewTxModal] = useState(false);

  // Auth State
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getLocalAuthSession());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<
    'LOGIN' | 'SIGNUP' | 'CHANGE_PASSWORD' | 'CHANGE_MOBILE'
  >('LOGIN');

  // Dexie Reactive Live Queries
  const profiles = useLiveQuery(() => db.familyProfile.toArray(), [refreshTrigger]);
  const members = useLiveQuery(() => db.familyMembers.toArray(), [refreshTrigger]);
  const categories = useLiveQuery(() => db.categories.toArray(), [refreshTrigger]);
  const accounts = useLiveQuery(() => db.accounts.toArray(), [refreshTrigger]);
  const rules = useLiveQuery(() => db.allocationRules.toArray(), [refreshTrigger]);
  const transactions = useLiveQuery(
    () => db.transactions.orderBy('transaction_date').reverse().toArray(),
    [refreshTrigger]
  );
  const syncQueue = useLiveQuery(() => db.syncQueue.toArray(), [refreshTrigger]);

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [summary, setSummary] = useState<FinancialSummary>({
    total_assets_cents: 0,
    total_liabilities_cents: 0,
    total_family_fund_cents: 0,
    total_personal_savings_cents: 0,
    period_income_cents: 0,
    period_expense_cents: 0,
    net_surplus_cents: 0,
  });

  // Load Settings
  useEffect(() => {
    getOrCreateAppSettings().then((loaded) => {
      setSettings(loaded);
      if (loaded.is_pin_enabled && loaded.security_pin_hash) {
        setIsLocked(true);
      }
    });
  }, []);

  // Trigger initial cloud sync if profile exists
  const profile = profiles && profiles.length > 0 ? profiles[0] : null;

  useEffect(() => {
    if (profile) {
      syncEngine.triggerSync(profile.id);
    }
  }, [profile?.id]);

  // Update HTML Dark Class
  useEffect(() => {
    if (!settings) return;
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings?.theme]);

  // Recalculate Financial Summary
  useEffect(() => {
    if (profile) {
      calculateFinancialSummary(profile.id).then(setSummary);
    }
  }, [profile, transactions, accounts]);

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await db.appSettings.put(updated);
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleOpenAuthModal = (
    mode: 'LOGIN' | 'SIGNUP' | 'CHANGE_PASSWORD' | 'CHANGE_MOBILE' = 'LOGIN'
  ) => {
    setAuthModalInitialMode(mode);
    setShowAuthModal(true);
  };

  const [isFarewellVisible, setIsFarewellVisible] = useState(false);

  const handleLogout = () => {
    setIsFarewellVisible(true);
  };

  const handleFarewellComplete = async () => {
    await logoutUser();
    setAuthSession(null);
    setGuestMode(false);
    setIsFarewellVisible(false);
  };

  if (!settings || profiles === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 text-xs font-mono">
        Initializing Offline-First Engine...
      </div>
    );
  }

  // Show Animated Farewell Scene on Logout
  if (isFarewellVisible) {
    return (
      <FarewellScene
        lang={settings.language}
        onComplete={handleFarewellComplete}
      />
    );
  }

  // Initial Auth Landing Screen (SIGN UP / LOGIN) if not authenticated & not in guest mode
  if (!authSession && !guestMode) {
    return (
      <AuthLandingView
        onSuccess={(session) => {
          setAuthSession(session);
          handleRefresh();
        }}
        onContinueAsGuest={() => setGuestMode(true)}
      />
    );
  }

  // If App is Locked
  if (isLocked && settings.security_pin_hash) {
    return (
      <PinLockModal
        correctPin={settings.security_pin_hash}
        onUnlock={() => setIsLocked(false)}
      />
    );
  }

  // If Database is Completely Empty -> Onboarding Setup Wizard
  if (!profiles || profiles.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 font-sans">
        <OnboardingWizard lang={settings.language} onComplete={handleRefresh} />
      </div>
    );
  }

  const currencySymbol = profile.currency_symbol || '৳';
  const pendingSyncCount = syncQueue ? syncQueue.length : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <div>
        {/* Top Header */}
        <Header
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          familyName={profile.family_name}
          onLockApp={() => setIsLocked(true)}
          pendingSyncCount={pendingSyncCount}
          familyId={profile.id}
          authSession={authSession}
          onOpenAuthModal={handleOpenAuthModal}
          onLogout={handleLogout}
          onRefreshApp={handleRefresh}
          onOpenMenu={() => setIsMenuOpen(true)}
          onNavigateTab={setActiveTab}
        />

        {/* Slide Menu Drawer */}
        <SlideMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          lang={settings.language}
        />

        {/* Auth Modal Overlay */}
        {showAuthModal && (
          <AuthModal
            currentSession={authSession}
            initialMode={authModalInitialMode}
            onAuthSuccess={(session) => {
              setAuthSession(session);
              setShowAuthModal(false);
              handleRefresh();
            }}
            onClose={() => setShowAuthModal(false)}
          />
        )}

        {/* First Login User Guide Popup */}
        {!settings.has_dismissed_guide_popup && (
          <UserGuideModal
            lang={settings.language}
            onDismiss={() => handleUpdateSettings({ has_dismissed_guide_popup: true })}
          />
        )}

        {/* Dynamic View Container */}
        <main className="mb-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              recentTransactions={transactions || []}
              activeRules={rules || []}
              accounts={accounts || []}
              members={members || []}
              currencySymbol={currencySymbol}
              lang={settings.language}
              onOpenNewTransaction={() => {
                setActiveTab('transactions');
                setShowNewTxModal(true);
              }}
              onNavigateTab={setActiveTab}
              pendingSyncCount={pendingSyncCount}
            />
          )}

          {activeTab === 'income' && (
            <IncomeView
              transactions={transactions || []}
              categories={categories || []}
              accounts={accounts || []}
              members={members || []}
              familyId={profile.id}
              currencySymbol={currencySymbol}
              lang={settings.language}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'expense' && (
            <ExpenseView
              transactions={transactions || []}
              categories={categories || []}
              accounts={accounts || []}
              members={members || []}
              familyId={profile.id}
              currencySymbol={currencySymbol}
              lang={settings.language}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'assets' && (
            <AssetsView
              accounts={accounts || []}
              familyId={profile.id}
              currencySymbol={currencySymbol}
              lang={settings.language}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'liabilities' && (
            <LiabilitiesView
              accounts={accounts || []}
              familyId={profile.id}
              currencySymbol={currencySymbol}
              lang={settings.language}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'bank' && (
            <BankView
              accounts={accounts || []}
              familyId={profile.id}
              currencySymbol={currencySymbol}
              lang={settings.language}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions || []}
              categories={categories || []}
              rules={rules || []}
              accounts={accounts || []}
              members={members || []}
              familyId={profile.id}
              currencySymbol={currencySymbol}
              lang={settings.language}
              onRefresh={handleRefresh}
              isOpenNewModal={showNewTxModal}
              onCloseModal={() => setShowNewTxModal(false)}
            />
          )}

          {activeTab === 'rules' && (
            <RulesView
              rules={rules || []}
              categories={categories || []}
              accounts={accounts || []}
              members={members || []}
              familyId={profile.id}
              lang={settings.language}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'members_accounts' && (
            <MembersAccountsView
              members={members || []}
              accounts={accounts || []}
              familyId={profile.id}
              currencySymbol={currencySymbol}
              lang={settings.language}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesView
              categories={categories || []}
              familyId={profile.id}
              lang={settings.language}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              summary={summary}
              transactions={transactions || []}
              categories={categories || []}
              accounts={accounts || []}
              familyName={profile.family_name}
              currencySymbol={currencySymbol}
              lang={settings.language}
            />
          )}

          {activeTab === 'backup_sync' && (
            <BackupSyncView
              syncQueue={syncQueue || []}
              lang={settings.language}
              onRefresh={handleRefresh}
              pendingSyncCount={pendingSyncCount}
            />
          )}

          {activeTab === 'user_guide' && <UserGuideView lang={settings.language} />}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              lang={settings.language}
              familyName={profile.family_name}
              onUpdateFamilyName={async (newName) => {
                if (profile) {
                  await db.familyProfile.update(profile.id, {
                    family_name: newName,
                    updated_at: new Date().toISOString(),
                  });
                  handleRefresh();
                }
              }}
              onOpenAuthModal={handleOpenAuthModal}
              onLogout={handleLogout}
              onNavigateTab={setActiveTab}
              pendingSyncCount={pendingSyncCount}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center text-slate-400 text-[10px] font-medium tracking-widest uppercase gap-2">
        <div>{profile.family_name} • Production Offline-First Architecture</div>
        <div className="flex gap-4 font-mono">
          <span>Local Storage: Dexie.js</span>
          <span>Double-Entry: Active</span>
          <span>Status: 200 OK</span>
        </div>
      </footer>
    </div>
  );
}

