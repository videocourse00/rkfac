import React, { useState } from 'react';
import {
  Phone,
  Lock,
  User,
  LogIn,
  UserPlus,
  KeyRound,
  PhoneCall,
  X,
  AlertCircle,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import {
  signUpWithMobile,
  loginWithMobile,
  changeUserPassword,
  changeUserMobileNumber,
  getLocalAuthSession,
  AuthSession,
} from '../../core/auth/authService';
import { syncEngine } from '../../core/sync/syncEngine';

interface AuthModalProps {
  currentSession: AuthSession | null;
  onAuthSuccess: (session: AuthSession) => void;
  onClose?: () => void;
  initialMode?: 'LOGIN' | 'SIGNUP' | 'CHANGE_PASSWORD' | 'CHANGE_MOBILE';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentSession,
  onAuthSuccess,
  onClose,
  initialMode = 'LOGIN',
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'CHANGE_PASSWORD' | 'CHANGE_MOBILE'>(
    initialMode
  );

  // Form States
  const [phone, setPhone] = useState(currentSession?.phoneNumber || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(currentSession?.fullName || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isOnline = navigator.onLine;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (mode === 'SIGNUP') {
        const session = await signUpWithMobile(phone, password, fullName);
        setSuccessMsg('Account created successfully!');
        onAuthSuccess(session);
        if (isOnline) {
          await syncEngine.triggerSync(session.familyId);
        }
      } else if (mode === 'LOGIN') {
        const session = await loginWithMobile(phone, password);
        setSuccessMsg('Logged in successfully!');
        onAuthSuccess(session);
        if (isOnline) {
          await syncEngine.triggerSync(session.familyId);
        }
      } else if (mode === 'CHANGE_PASSWORD') {
        await changeUserPassword(phone, currentPass, newPassword);
        setSuccessMsg('Password updated successfully!');
        setCurrentPass('');
        setNewPassword('');
      } else if (mode === 'CHANGE_MOBILE') {
        if (!currentSession) {
          throw new Error('No active user session found.');
        }
        const updated = await changeUserMobileNumber(currentSession, currentPass, newPhone);
        setSuccessMsg('Mobile number updated successfully!');
        onAuthSuccess(updated);
        setCurrentPass('');
        setNewPhone('');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex justify-between items-start">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full font-bold">
              {mode === 'LOGIN' && 'Sign In'}
              {mode === 'SIGNUP' && 'Sign Up'}
              {mode === 'CHANGE_PASSWORD' && 'Security Settings'}
              {mode === 'CHANGE_MOBILE' && 'Account Settings'}
            </span>
            <h2 className="text-xl font-bold tracking-tight mt-2">
              {mode === 'LOGIN' && 'Welcome Back'}
              {mode === 'SIGNUP' && 'Create Family Account'}
              {mode === 'CHANGE_PASSWORD' && 'Change Password'}
              {mode === 'CHANGE_MOBILE' && 'Change Mobile Number'}
            </h2>
            <p className="text-xs text-indigo-100 mt-1">
              {mode === 'LOGIN' && 'Enter your mobile number and password to access your family ledger.'}
              {mode === 'SIGNUP' && 'Register your mobile number to begin secure cloud-synced family accounting.'}
              {mode === 'CHANGE_PASSWORD' && 'Update your security credentials for device authentication.'}
              {mode === 'CHANGE_MOBILE' && 'Update the primary mobile number tied to your cloud account.'}
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-medium text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode: SIGNUP -> Full Name */}
          {mode === 'SIGNUP' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Tanvir Hossain"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Mode: LOGIN or SIGNUP -> Phone Number */}
          {(mode === 'LOGIN' || mode === 'SIGNUP') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 01712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Mode: LOGIN or SIGNUP -> Password */}
          {(mode === 'LOGIN' || mode === 'SIGNUP') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Mode: CHANGE_PASSWORD -> Current Pass & New Pass */}
          {mode === 'CHANGE_PASSWORD' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {/* Mode: CHANGE_MOBILE -> Current Pass & New Mobile */}
          {mode === 'CHANGE_MOBILE' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Current Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Mobile Number
                </label>
                <div className="relative">
                  <PhoneCall className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 01800000000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'LOGIN' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            ) : mode === 'SIGNUP' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            ) : mode === 'CHANGE_PASSWORD' ? (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Update Password</span>
              </>
            ) : (
              <>
                <PhoneCall className="w-4 h-4" />
                <span>Update Mobile Number</span>
              </>
            )}
          </button>

          {/* Mode Switchers */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-between text-xs text-slate-500 font-medium gap-2">
            {mode === 'LOGIN' ? (
              <button
                type="button"
                onClick={() => setMode('SIGNUP')}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
              >
                Need an account? Sign Up
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
              >
                Already registered? Sign In
              </button>
            )}

            {currentSession && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('CHANGE_PASSWORD')}
                  className="text-slate-600 dark:text-slate-400 hover:underline"
                >
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => setMode('CHANGE_MOBILE')}
                  className="text-slate-600 dark:text-slate-400 hover:underline"
                >
                  Change Phone
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
