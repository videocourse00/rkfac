import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { syncEngine, SyncEngineStatus } from '../../core/sync/syncEngine';

interface SyncStatusBarProps {
  familyId?: string;
  onRefreshApp?: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ familyId, onRefreshApp }) => {
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>({
    status: navigator.onLine ? 'Synced' : 'Offline',
    pendingCount: 0,
    lastSyncedAt: null,
    errorMessage: null,
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setSyncStatus(newStatus);
      if (newStatus.status === 'Synced' && onRefreshApp) {
        onRefreshApp();
      }
    });

    return unsubscribe;
  }, [onRefreshApp]);

  const handleManualSync = () => {
    syncEngine.triggerSync(familyId);
  };

  const getStatusBadge = () => {
    switch (syncStatus.status) {
      case 'Offline':
        return {
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          icon: <WifiOff className="w-3.5 h-3.5 text-slate-500" />,
          label: 'Offline',
          subtext: 'Normal operations working locally in Dexie',
        };
      case 'Pending Sync':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: <CloudUpload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          label: 'Pending Sync',
          subtext: `${syncStatus.pendingCount} local modification${syncStatus.pendingCount > 1 ? 's' : ''} queued`,
        };
      case 'Syncing':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          icon: <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />,
          label: 'Syncing',
          subtext: 'Transmitting mutations & fetching cloud updates',
        };
      case 'Synced':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          label: 'Synced',
          subtext: syncStatus.lastSyncedAt
            ? `Cloud synchronized ${new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}`
            : 'All records synchronized',
        };
      case 'Sync Error':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
          label: 'Sync Error',
          subtext: syncStatus.errorMessage || 'Synchronization interrupted. Local data safe.',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div
      className={`px-3 py-1.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${badge.bg}`}
    >
      <div className="flex items-center gap-2">
        {badge.icon}
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wide uppercase text-[11px]">{badge.label}</span>
          <span className="hidden sm:inline text-[11px] opacity-80 font-medium">• {badge.subtext}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {syncStatus.pendingCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
            {syncStatus.pendingCount}
          </span>
        )}

        {navigator.onLine && syncStatus.status !== 'Syncing' && (
          <button
            onClick={handleManualSync}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors font-bold text-[10px] flex items-center gap-1 uppercase tracking-wider"
            title="Trigger Immediate Cloud Sync"
          >
            <RotateCw className="w-3 h-3" />
            <span className="hidden md:inline">Sync</span>
          </button>
        )}
      </div>
    </div>
  );
};
