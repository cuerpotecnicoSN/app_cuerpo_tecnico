import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SubNavTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number | string;
  badge?: string | React.ReactNode;
  disabled?: boolean;
}

interface SubNavTabsProps {
  tabs: SubNavTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  rightSlot?: React.ReactNode;
  className?: string;
  variant?: 'pills' | 'segmented';
}

export const SubNavTabs: React.FC<SubNavTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  rightSlot,
  className = '',
}) => {
  return (
    <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-1 ${className}`}>
      {/* Scrollable container for tabs */}
      <div className="flex items-center gap-1 p-1 bg-white dark:bg-neutral-900/80 rounded-2xl ring-1 ring-gray-200/80 dark:ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] overflow-x-auto max-w-full no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              aria-pressed={isActive}
              className={`group relative flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-xl text-sm font-bold tracking-tight transition-all duration-200 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
                isActive
                  ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.8),inset_0_1px_0_rgba(255,255,255,0.2)]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]'
              } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {Icon && (
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500 group-hover:bg-white dark:group-hover:bg-white/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:shadow-sm group-hover:-rotate-6'
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2.2} />
                </span>
              )}
              <span>{tab.label}</span>

              {tab.count !== undefined && (
                <span
                  className={`min-w-[22px] text-center text-[11px] font-black tabular-nums px-1.5 py-0.5 rounded-full transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-500/15 dark:group-hover:text-indigo-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}

              {tab.badge && (
                <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md shadow-xs ${
                  isActive ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {rightSlot && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {rightSlot}
        </div>
      )}
    </div>
  );
};

export default SubNavTabs;
