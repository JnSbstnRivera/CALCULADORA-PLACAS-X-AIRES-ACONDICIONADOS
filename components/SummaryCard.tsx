import React from 'react';

interface Props {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  colorClass: string;
}

export const SummaryCard: React.FC<Props> = ({ title, value, subValue, icon, colorClass }) => {
  return (
    <div className="bg-white dark:bg-[#161b22] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/[0.08] flex items-center space-x-4">
      <div className={`p-3 rounded-lg ${colorClass} text-white shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-[#a0a4ad] uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">{value}</p>
        {subValue && <p className="text-xs text-gray-400 dark:text-[#6b7280] mt-1">{subValue}</p>}
      </div>
    </div>
  );
};
