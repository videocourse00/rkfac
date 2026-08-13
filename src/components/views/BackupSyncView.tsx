import React, { useState } from 'react';
import { db, clearAllDatabaseTables } from '../../db/dexie';
import { syncEngine } from '../../core/sync/syncEngine';
import { BentoCard } from '../bento/BentoCard';
import { translations } from '../../core/i18n/translations';
import { SyncQueueItem, Language } from '../../types';
import { Database, Download, Upload, Trash2, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

interface BackupSyncViewProps {
  syncQueue: SyncQueueItem[];
  lang: Language;
  onRefresh: () => void;
  pendingSyncCount: number;
}

export const BackupSyncView: React.FC<BackupSyncViewProps> = ({
  syncQueue,
  lang,
  onRefresh,
  pendingSyncCount,
}) => {
  const t = translations[lang];

  const [restoreStatus, setRestoreStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleExportBackup = async () => {
    const familyProfile = await db.familyProfile.toArray();
    const familyMembers = await db.familyMembers.toArray();
    const categories = await db.categories.toArray();
    const accounts = await db.accounts.toArray();
    const allocationRules = await db.allocationRules.toArray();
    const transactions = await db.transactions.toArray();
    const journalEntries = await db.journalEntries.toArray();

    const backupData = {
      version: '1.0.0',
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

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.familyProfile) {
          setRestoreStatus('Invalid backup JSON format.');
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

        setRestoreStatus('Database successfully restored!');
        onRefresh();
      } catch (err) {
        setRestoreStatus('Failed to restore backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleTriggerManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncEngine.triggerSync();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
      onRefresh();
    }
  };

  const handleClearDatabase = async () => {
    if (window.confirm('Are you sure you want to wipe all local data? This cannot be undone.')) {
      await clearAllDatabaseTables();
      onRefresh();
      window.location.reload();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Backup & Restore (Span 6) */}
      <div className="lg:col-span-6 space-y-6">
        <BentoCard
          eyebrow="DATA PERSISTENCE"
          title="JSON Backup & Restore"
          badgeText="AES-256 COMPATIBLE"
          badgeType="indigo"
          icon={<Database className="w-4 h-4 text-indigo-500" />}
        >
          <div className="space-y-4 mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Export an offline backup JSON file to safeguard your family ledger records or transfer them to another device.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExportBackup}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{t.backup_download}</span>
              </button>

              <label className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
                <Upload className="w-4 h-4" />
                <span>{t.restore_upload}</span>
                <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
              </label>
            </div>

            {restoreStatus && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>{restoreStatus}</span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleClearDatabase}
                className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.clear_data}</span>
              </button>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* Sync Queue Monitor (Span 6) */}
      <div className="lg:col-span-6 space-y-6">
        <BentoCard
          eyebrow="SYNCHRONIZATION"
          title="Local Mutation Sync Queue"
          badgeText={pendingSyncCount > 0 ? `${pendingSyncCount} PENDING` : 'SYNCED'}
          badgeType={pendingSyncCount > 0 ? 'amber' : 'emerald'}
          action={
            <button
              onClick={handleTriggerManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Now</span>
            </button>
          }
        >
          <div className="space-y-3 mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When offline, mutations are recorded in IndexedDB sync queue. Reconnecting automatically transmits pending records to the cloud store.
            </p>

            {syncQueue.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Queue is clear! All local mutations synchronized.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {syncQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-100 block">
                        {item.operation} on {item.table_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      PENDING
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </BentoCard>
      </div>
    </div>
  );
};
