import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, Heart, GraduationCap, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface FarewellSceneProps {
  onComplete: () => void;
  lang?: 'bn' | 'en';
}

export const FarewellScene: React.FC<FarewellSceneProps> = ({ onComplete, lang = 'bn' }) => {
  const isBn = lang === 'bn';
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 3.5 seconds progress timer
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2.5; // 40 steps = 3.5s approx
      });
    }, 85);

    const timer = setTimeout(() => {
      onComplete();
    }, 3600);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-hidden">
      
      {/* Background Decorative Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.15, scale: 1.2 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500 to-amber-400 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.12, scale: 1.3 }}
          transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse', delay: 1 }}
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-500 to-indigo-600 blur-3xl"
        />
      </div>

      {/* Main Farewell Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative bg-slate-900 border border-slate-800/80 rounded-3xl p-8 md:p-10 max-w-md w-full text-center shadow-2xl shadow-indigo-950/50 space-y-6 overflow-hidden"
      >
        {/* Animated Educational & Family Icons Cluster */}
        <div className="relative flex items-center justify-center py-4">
          
          {/* Pulsing Outer Ring */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-500/20 to-amber-500/20 border border-indigo-500/30"
          />

          {/* Central Animated Badge */}
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
            className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-amber-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 border border-white/20"
          >
            <BookOpen className="w-10 h-10 text-white" />
          </motion.div>

          {/* Orbiting Educational Caps / Hearts / Stars */}
          <motion.div
            animate={{ y: [-4, 4, -4], x: [2, -2, 2] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 p-2 rounded-xl shadow-lg border border-amber-300"
          >
            <GraduationCap className="w-4 h-4" />
          </motion.div>

          <motion.div
            animate={{ y: [4, -4, 4] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-2 -left-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border border-emerald-300/40"
          >
            <Heart className="w-4 h-4 fill-white" />
          </motion.div>

          <motion.div
            animate={{ scale: [0.9, 1.2, 0.9] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-3 -left-3 text-amber-400"
          >
            <Sparkles className="w-5 h-5" />
          </motion.div>
        </div>

        {/* Brand Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 text-xs font-extrabold uppercase tracking-widest"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>RK Educare</span>
        </motion.div>

        {/* Main Farewell Display Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h2 className="text-xl md:text-2xl font-black text-slate-100 leading-snug tracking-tight">
            "RK Educare-এ আবার আসার জন্য আমন্ত্রণ রইলো।"
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {isBn
              ? 'আপনার পরিবারে শিক্ষা, সমৃদ্ধি ও সঠিক আর্থিক শৃঙ্খলা বজায় থাকুক।'
              : 'Wishing your family knowledge, prosperity, and sound financial wisdom.'}
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-2 pt-2"
        >
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{isBn ? 'নিরাপদে সাইন আউট হয়েছে' : 'Signed out safely'}</span>
            </span>
            <span>{isBn ? 'লগইন স্ক্রিনে নেওয়া হচ্ছে...' : 'Redirecting to login...'}</span>
          </div>
        </motion.div>

        {/* Immediate Return Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onComplete}
          className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 rounded-xl font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <span>{isBn ? 'লগইন স্ক্রিনে ফিরে যান' : 'Return to Login Now'}</span>
          <ArrowRight className="w-4 h-4 text-indigo-400" />
        </motion.button>

      </motion.div>
    </div>
  );
};
