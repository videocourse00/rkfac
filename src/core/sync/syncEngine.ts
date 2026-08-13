import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { dbFirestore } from '../../lib/firebase';
import { db } from '../../db/dexie';
import type { SyncQueueItem } from '../../types';

export type SyncStateStatus = 'Offline' | 'Pending Sync' | 'Syncing' | 'Synced' | 'Sync Error';

export interface SyncEngineStatus {
  status: SyncStateStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

type SyncStatusListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private listeners: Set<SyncStatusListener> = new Set();
  private isProcessing = false;
  private lastSyncedAt: string | null = null;
  private currentStatus: SyncStateStatus = navigator.onLine ? 'Synced' : 'Offline';
  private lastErrorMessage: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateStatus('Pending Sync');
        this.triggerSync();
      });
      window.addEventListener('offline', () => {
        this.updateStatus('Offline');
      });
    }
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    // Initial emission
    this.emitStatus();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async emitStatus(): Promise<void> {
    const queue = await db.syncQueue.toArray();
    const pendingCount = queue.length;

    let finalStatus = this.currentStatus;
    if (!navigator.onLine) {
      finalStatus = 'Offline';
    } else if (!this.isProcessing && pendingCount > 0 && this.currentStatus !== 'Sync Error') {
      finalStatus = 'Pending Sync';
    }

    const payload: SyncEngineStatus = {
      status: finalStatus,
      pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      errorMessage: this.lastErrorMessage,
    };

    for (const listener of this.listeners) {
      listener(payload);
    }
  }

  private updateStatus(newStatus: SyncStateStatus, errorMsg: string | null = null): void {
    this.currentStatus = newStatus;
    this.lastErrorMessage = errorMsg;
    this.emitStatus();
  }

  /**
   * Main Sync Trigger: Pushes local pending mutations & pulls remote changes
   */
  public async triggerSync(familyId?: string): Promise<void> {
    if (this.isProcessing) return;
    if (!navigator.onLine) {
      this.updateStatus('Offline');
      return;
    }

    this.isProcessing = true;
    this.updateStatus('Syncing');

    try {
      // 1. Resolve target familyId
      let activeFamilyId = familyId;
      if (!activeFamilyId) {
        const profiles = await db.familyProfile.toArray();
        if (profiles.length > 0) {
          activeFamilyId = profiles[0].id;
        }
      }

      if (activeFamilyId) {
        // 2. Push Local Pending Mutations to Cloud
        await this.pushLocalMutations(activeFamilyId);

        // 3. Pull Remote Cloud Records to Hydrate Local Dexie
        await this.pullRemoteRecords(activeFamilyId);
      }

      const remainingQueue = await db.syncQueue.toArray();
      if (remainingQueue.length === 0) {
        this.lastSyncedAt = new Date().toISOString();
        this.updateStatus('Synced');
      } else {
        this.updateStatus('Pending Sync');
      }
    } catch (err: any) {
      console.error('Cloud Sync Execution Error:', err);
      this.updateStatus('Sync Error', err?.message || 'Failed to complete cloud sync.');
    } finally {
      this.isProcessing = false;
      this.emitStatus();
    }
  }

  /**
   * Pushes Dexie syncQueue pending items to Firestore
   */
  private async pushLocalMutations(familyId: string): Promise<void> {
    const queueItems = await db.syncQueue.orderBy('timestamp').toArray();
    if (queueItems.length === 0) return;

    for (const item of queueItems) {
      try {
        const docRef = doc(dbFirestore, 'families', familyId, item.table_name, item.record_id);

        if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
          const payloadData = JSON.parse(item.payload);
          payloadData.sync_status = 'SYNCED';
          payloadData.synced_at = new Date().toISOString();

          await setDoc(docRef, payloadData, { merge: true });

          // Update local record to SYNCED
          await this.markLocalRecordSynced(item.table_name, item.record_id);
        } else if (item.operation === 'DELETE') {
          await deleteDoc(docRef);
        }

        // Remove item from local syncQueue
        await db.syncQueue.delete(item.id);
      } catch (err) {
        console.warn(`Failed to push sync item ${item.id}:`, err);
        throw err; // Stop push loop and preserve remaining queue
      }
    }
  }

  /**
   * Pulls all records from Firestore for a family and syncs into Dexie
   */
  public async pullRemoteRecords(familyId: string): Promise<void> {
    const tables = [
      'familyProfile',
      'familyMembers',
      'categories',
      'accounts',
      'allocationRules',
      'transactions',
      'journalEntries',
      'assets',
      'liabilities',
      'openingBalances',
      'appSettings',
    ];

    for (const tableName of tables) {
      try {
        const colRef = collection(dbFirestore, 'families', familyId, tableName);
        const querySnapshot = await getDocs(colRef);

        if (querySnapshot.empty) continue;

        const remoteRecords: any[] = [];
        querySnapshot.forEach((docSnap) => {
          remoteRecords.push(docSnap.data());
        });

        if (remoteRecords.length > 0) {
          const dexieTable = (db as any)[tableName];
          if (!dexieTable) continue;

          for (const remoteRecord of remoteRecords) {
            // Check if local record has pending unsynced changes
            const localRecord = await dexieTable.get(remoteRecord.id);
            if (localRecord && localRecord.sync_status === 'PENDING') {
              // Local mutation takes priority until pushed
              continue;
            }

            remoteRecord.sync_status = 'SYNCED';
            await dexieTable.put(remoteRecord);
          }
        }
      } catch (err) {
        console.warn(`Failed to pull remote records for ${tableName}:`, err);
      }
    }
  }

  /**
   * Helper to set sync_status = 'SYNCED' on Dexie table records
   */
  private async markLocalRecordSynced(tableName: string, recordId: string): Promise<void> {
    const table = (db as any)[tableName];
    if (table) {
      const record = await table.get(recordId);
      if (record) {
        await table.update(recordId, {
          sync_status: 'SYNCED',
          synced_at: new Date().toISOString(),
        });
      }
    }
  }
}

export const syncEngine = new SyncEngine();
