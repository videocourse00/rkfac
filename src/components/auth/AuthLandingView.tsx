import React, { useState } from 'react';
import {
  Layers,
  ShieldCheck,
  UserPlus,
  LogIn,
  CheckCircle2,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Wifi,
} from 'lucide-react';
import { signUpWithMobile, loginWithMobile, AuthSession } from '../../core/auth/authService';

interface AuthLandingViewProps {
  onSuccess: (session: AuthSession) => void;
  onContinueAsGuest?: () => void;
}

export const AuthLandingView: React.FC<AuthLandingViewProps> = ({
  onSuccess,
  onContinueAsGuest,
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Form Fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!phoneNumber.trim() || !password.trim()) {
      setErrorMessage('Please enter your mobile number and password.');
      return;
    }

    setIsLoading(true);

    try {
      if (activeTab === 'SIGNUP') {
        if (!fullName.trim()) {
          setErrorMessage('Please enter your full name.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters long.');
          setIsLoading(false);
          return;
        }

        const session = await signUpWithMobile(phoneNumber, password, fullName);
        onSuccess(session);
      } else {
        const session = await loginWithMobile(phoneNumber, password);
        onSuccess(session);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Top Brand Bar */}
      <div className="max-w-6xl mx-auto w-full flex justify-between items-center py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="RK Educare"
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-2xl object-cover shadow-lg shadow-indigo-600/30 shrink-0 border border-slate-700 bg-white"
          />
          <div>
            <h1 className="font-extrabold text-base md:text-lg tracking-tight uppercase text-white">
              RK Educare BD
            </h1>
            <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">
              Family Accounting & Ledger System
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 border border-emerald-800 text-emerald-400 rounded-full text-[10px] font-mono font-bold uppercase">
            <Wifi className="w-3 h-3" /> Offline Ready
          </span>
        </div>
      </div>

      {/* Center Auth Card Container */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">
              {activeTab === 'LOGIN' ? 'Welcome Back' : 'Create Family Account'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {activeTab === 'LOGIN'
                ? 'Sign in to access your offline ledger and cloud sync'
                : 'Register your mobile number to create your secure family accounting profile'}
            </p>
          </div>

          {/* SIGN UP / LOGIN Segmented Switcher */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 font-bold text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('LOGIN');
                setErrorMessage(null);
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'LOGIN'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>LOGIN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('SIGNUP');
                setErrorMessage(null);
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'SIGNUP'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>SIGN UP</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
            
            {/* Mobile Number */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">
                Mobile Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Smartphone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="01712345678"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Full Name for Sign Up */}
            {activeTab === 'SIGNUP' && (
              <div className="animate-in fade-in">
                <label className="block text-slate-400 font-bold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Md. Rahman"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password for Sign Up */}
            {activeTab === 'SIGNUP' && (
              <div className="animate-in fade-in">
                <label className="block text-slate-400 font-bold mb-1">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : activeTab === 'LOGIN' ? (
                <>
                  <span>LOGIN TO DASHBOARD</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>CREATE ACCOUNT</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Continue as Guest option */}
          {onContinueAsGuest && (
            <div className="pt-2 border-t border-slate-800 text-center">
              <button
                onClick={onContinueAsGuest}
                className="text-xs text-slate-400 hover:text-indigo-400 font-bold transition-colors"
              >
                Continue to Offline Dashboard as Guest →
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Footer feature callouts */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 text-slate-400 text-xs">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-200">100% Offline-First</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Works completely without internet using local IndexedDB storage.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-200">Double-Entry Accuracy</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Automated debits, credits, balance sheets, and receipts statements.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-200">Cloud Sync & Backup</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seamlessly syncs to cloud storage when internet connection returns.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
