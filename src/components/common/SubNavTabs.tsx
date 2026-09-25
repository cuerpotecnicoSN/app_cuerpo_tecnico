import React, { useEffect, useRef } from 'react';
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
  const scrollerRef = useRef<HTMLDivElement>(null);

  // En móvil las pestañas pueden desbordar: mantenemos visible la activa
  useEffect(() => {
    const el = scrollerRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-1 ${className}`}>
      {/* Scrollable container for tabs */}
      <div ref={scrollerRef} className="flex items-center gap-1 p-1 w-full lg:w-auto bg-white dark:bg-neutral-900/80 rounded-2xl ring-1 ring-gray-200/80 dark:ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] overflow-x-auto max-w-full no-scrollbar">
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
              className={`group relative flex flex-1 lg:flex-none shrink-0 justify-center lg:justify-start items-center gap-2 sm:gap-2.5 pl-1.5 pr-3 sm:pl-2 sm:pr-4 py-1.5 sm:py-2 rounded-xl text-[13px] sm:text-sm font-bold tracking-tight transition-all duration-200 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
                isActive
                  ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.8),inset_0_1px_0_rgba(255,255,255,0.2)]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]'
              } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {Icon && (
                <span
                  className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg transition-all duration-200 ${
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
