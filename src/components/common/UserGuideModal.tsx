import React from 'react';
import { BookOpen, Download, X, CheckCircle2, Shield, Calculator, Layers } from 'lucide-react';
import { downloadUserGuidePdf } from '../../core/pdf/userGuide';
import { Language } from '../../types';

interface UserGuideModalProps {
  lang: Language;
  onDismiss: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ lang, onDismiss }) => {
  const isBn = lang === 'bn';

  const handleDownload = () => {
    downloadUserGuidePdf();
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden p-6 md:p-8 space-y-6 relative">
        
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Icon */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 uppercase tracking-wider">
              {isBn ? 'স্বাগতম' : 'WELCOME'}
            </span>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
              📘 {isBn ? 'অ্যাপ ব্যবহারের নির্দেশিকা' : 'App Operating Guide'}
            </h2>
          </div>
        </div>

        {/* Summary points */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {isBn
              ? 'পারিবারিক হিসাব ব্যবস্থাপনা অ্যাপে আপনাকে স্বাগতম! অ্যাপটি ব্যবহারের সহজ নির্দেশিকা নিচে সংক্ষেপে দেওয়া হলো:'
              : 'Welcome to the Family Accounting Management System! Here is a summary of operating guidelines:'}
          </p>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                {isBn
                  ? '১০০% অফলাইন সুবিধা: সমস্ত তথ্য আপনার ডিভাইসে নিরাপদ IndexedDB-তে সংরক্ষিত থাকে।'
                  : '100% Offline-First: All family records are saved securely on your device IndexedDB.'}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Calculator className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                {isBn
                  ? 'স্বয়ংক্রিয় নিয়মাবলি: আয়-ব্যয়ের নিয়ম তৈরি করে শতাংশ অনুযায়ী ফান্ডের বিভাজন নির্ধারণ করুন।'
                  : 'Automatic Rules: Configure percentage splits to auto-allocate incoming or outgoing funds.'}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                {isBn
                  ? '১২টি সম্পূর্ণ আর্থিক রিপোর্ট: আয়-ব্যয় বিবরণী, উদ্বৃত্তপত্র এবং পিডিএফ ডাউনলোড অপশন।'
                  : '12 Financial Statements: Live Balance Sheet, Income Statements, and PDF exports.'}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>
                {isBn
                  ? 'ব্যাকআপ ও নিরাপত্তা: যেকোনো সময় JSON ব্যাকআপ ডাউনলোড এবং পিন লক সেট করুন।'
                  : 'Backup & Security: Export encrypted JSON backups anytime and enable passcode PIN.'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleDownload}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{isBn ? 'গাইড ডাউনলোড করুন' : 'Download Guide'}</span>
          </button>

          <button
            onClick={onDismiss}
            className="py-3 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-98 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center transition-all"
          >
            <span>{isBn ? 'পরে দেখুন' : 'Later'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
