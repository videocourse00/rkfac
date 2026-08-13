import React, { useState } from 'react';
import { Lock, KeyRound } from 'lucide-react';

interface PinLockModalProps {
  correctPin: string;
  onUnlock: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({ correctPin, onUnlock }) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === correctPin) {
      onUnlock();
    } else {
      setError(true);
      setPinInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">
            Application Locked
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter security PIN passcode to access financial ledger.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            maxLength={6}
            autoFocus
            value={pinInput}
            onChange={(e) => {
              setError(false);
              setPinInput(e.target.value);
            }}
            placeholder="****"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xl font-mono tracking-widest text-center text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {error && <div className="text-xs font-bold text-rose-500">Incorrect PIN. Try again.</div>}

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30 transition-all"
          >
            Unlock System
          </button>
        </form>
      </div>
    </div>
  );
};
