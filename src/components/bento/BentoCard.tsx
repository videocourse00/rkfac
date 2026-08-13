import React from 'react';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
  badgeText?: string;
  badgeType?: 'emerald' | 'indigo' | 'slate' | 'amber' | 'rose';
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  className = '',
  eyebrow,
  title,
  badgeText,
  badgeType = 'indigo',
  icon,
  action,
}) => {
  const badgeColors = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
    slate: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
    amber: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 md:p-6 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700 ${className}`}
    >
      {(eyebrow || title || badgeText || action) && (
        <div className="flex justify-between items-start mb-4 gap-2">
          <div>
            {eyebrow && (
              <span className="font-bold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest block mb-0.5">
                {eyebrow}
              </span>
            )}
            {title && (
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base tracking-tight flex items-center gap-2">
                {icon}
                {title}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            {badgeText && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${badgeColors[badgeType]}`}
              >
                {badgeText}
              </span>
            )}
            {action}
          </div>
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
};
