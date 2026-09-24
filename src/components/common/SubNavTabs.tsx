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
      <div className="flex items-center gap-1.5 p-1.5 bg-gray-100 dark:bg-neutral-900/90 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-inner overflow-x-auto max-w-full no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-black tracking-wide transition-all duration-200 whitespace-nowrap outline-none ${
                isActive
                  ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white shadow-md shadow-black/5 ring-1 ring-black/5 dark:ring-white/10 scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
              } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {Icon && (
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--color-primary,#db0030)] text-white shadow-sm shadow-[var(--color-primary,#db0030)]/30'
                      : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 group-hover:scale-110'
                  }`}
                >
                  <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                </span>
              )}
              <span>{tab.label}</span>

              {tab.count !== undefined && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                    isActive
                      ? 'bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-200'
                      : 'bg-gray-200/70 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-neutral-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}

              {tab.badge && (
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-[var(--color-primary,#db0030)] text-white shadow-xs">
                  {tab.badge}
                </span>
              )}

              {isActive && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[var(--color-primary,#db0030)]" />
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
