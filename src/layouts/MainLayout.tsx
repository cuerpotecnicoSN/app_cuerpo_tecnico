import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, LogOut, Check, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { navigation, type NavSection, type NavChild } from '../config/navigation';
import EditProfileModal from '../components/auth/EditProfileModal';
import ErrorBoundary from '../components/ErrorBoundary';

const LANGS = [
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
];

const MainLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<string | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const isChildActive = (section: NavSection, child: NavChild) => {
    const childQuery = child.path.includes('?') ? child.path.split('?')[1] : '';
    const currentQuery = location.search.startsWith('?') ? location.search.substring(1) : location.search;
    const isCurrentSection = location.pathname === section.path;
    return isCurrentSection && (childQuery ? currentQuery === childQuery : !currentQuery);
  };

  const currentLang = LANGS.find((l) => i18n.language?.startsWith(l.code)) ?? LANGS[0];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setLangOpen(false);
  };

  const handleMouseEnter = (path: string, hasChildren?: boolean) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpenMenu(hasChildren ? path : null);
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 180);
  };

  // Close menus on route change
  useEffect(() => {
    setOpenMenu(null);
    setMobileSheet(null);
  }, [location.pathname, location.search]);

  // Close language menu on outside click
  useEffect(() => {
    if (!langOpen) return;
    const onClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [langOpen]);

  // Clean timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const renderChildLink = (section: NavSection, child: NavChild, variant: 'desktop' | 'mobile') => {
    const childActive = isChildActive(section, child);
    const IconComponent = child.icon;

    return (
      <li key={child.path}>
        <Link
          to={child.path}
          onClick={() => { setOpenMenu(null); setMobileSheet(null); }}
          className={`group/item relative w-full text-left flex items-center gap-3.5 rounded-2xl transition-all duration-200 ${
            variant === 'desktop' ? 'p-2.5' : 'p-3'
          } ${
            childActive
              ? 'bg-white/[0.07] ring-1 ring-[var(--color-primary,#db0030)]/50'
              : 'hover:bg-white/[0.05]'
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
            childActive
              ? 'bg-gradient-to-br from-[var(--color-primary,#db0030)] to-[#8a001e] text-white shadow-[0_6px_18px_-4px_rgba(219,0,48,0.7)]'
              : 'bg-white/[0.06] text-gray-300 ring-1 ring-white/10 group-hover/item:bg-gradient-to-br group-hover/item:from-[var(--color-primary,#db0030)] group-hover/item:to-[#8a001e] group-hover/item:text-white group-hover/item:ring-transparent group-hover/item:-rotate-6'
          }`}>
            {IconComponent && <IconComponent size={19} strokeWidth={2.2} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold tracking-tight transition-colors ${
              childActive ? 'text-white' : 'text-gray-200 group-hover/item:text-white'
            }`}>
              {t(child.labelKey)}
            </p>
            <p className="text-[11.5px] text-gray-500 group-hover/item:text-gray-400 truncate mt-0.5 transition-colors">
              {child.descKey ? t(child.descKey, child.defaultDesc || '') : (child.defaultDesc || '')}
            </p>
          </div>
          {childActive ? (
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary,#db0030)] shadow-[0_0_10px_var(--color-primary,#db0030)] shrink-0 mr-1" />
          ) : (
            <ArrowUpRight size={16} className="text-gray-600 opacity-0 -translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:text-gray-300 transition-all shrink-0" />
          )}
        </Link>
      </li>
    );
  };

  const renderDesktopNav = () => navigation.map((section) => {
    const active = isActive(section.path);
    const hasChildren = !!section.children?.length;
    const isOpen = openMenu === section.path;
    const Icon = section.icon;

    return (
      <li
        key={section.path}
        className="relative"
        onMouseEnter={() => handleMouseEnter(section.path, hasChildren)}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          to={section.path}
          aria-current={active ? 'page' : undefined}
          className={`group relative flex items-center gap-2 h-10 pl-2 pr-3 xl:pr-4 rounded-full text-[13px] font-bold tracking-wide transition-all duration-200 ${
            active
              ? '!text-white bg-gradient-to-b from-[var(--color-primary,#db0030)] to-[#a80025] shadow-[0_8px_24px_-8px_rgba(219,0,48,0.8),inset_0_1px_0_rgba(255,255,255,0.25)]'
              : `!text-gray-400 hover:!text-white hover:bg-white/[0.07] ${isOpen ? '!text-white bg-white/[0.07]' : ''}`
          }`}
        >
          <span className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${
            active ? 'bg-white/20' : 'bg-white/[0.06] group-hover:bg-white/10'
          }`}>
            <Icon size={15} strokeWidth={2.4} />
          </span>
          <span className="whitespace-nowrap">{t(section.labelKey)}</span>
          {hasChildren && (
            <ChevronDown
              size={14}
              strokeWidth={2.8}
              className={`-ml-0.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${active ? 'text-white/80' : 'text-gray-500'}`}
            />
          )}
        </Link>

        {hasChildren && (
          <div
            className={`absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[22rem] z-50 transition-all duration-200 origin-top ${
              isOpen ? 'opacity-100 translate-y-0 scale-100 visible' : 'opacity-0 -translate-y-1 scale-[0.98] invisible pointer-events-none'
            }`}
          >
            <div className="relative bg-[#101013]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.9)] p-2 overflow-hidden">
              <div className="absolute -top-px inset-x-10 h-px bg-gradient-to-r from-transparent via-[var(--color-primary,#db0030)] to-transparent" />
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-56 h-40 rounded-full bg-[var(--color-primary,#db0030)]/15 blur-3xl pointer-events-none" />

              <div className="relative flex items-center gap-2.5 px-3 pt-2 pb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.06] text-[var(--color-primary,#db0030)]">
                  <Icon size={13} strokeWidth={2.6} />
                </span>
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-300">{t(section.labelKey)}</span>
                <span className="ml-auto text-[10px] font-bold text-gray-500 bg-white/[0.05] px-2 py-0.5 rounded-full">
                  {section.children?.length}
                </span>
              </div>

              <ul className="relative flex flex-col gap-1">
                {section.children?.map((child) => renderChildLink(section, child, 'desktop'))}
              </ul>
            </div>
          </div>
        )}
      </li>
    );
  });

  const sheetSection = navigation.find((s) => s.path === mobileSheet);
  const displayName = profile?.full_name || 'Admin';

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* Top Navbar */}
      <header className="relative shrink-0 z-50 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_120%_at_0%_0%,rgba(219,0,48,0.18),transparent_60%)] pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-[var(--color-primary,#db0030)]/70 via-white/10 to-transparent" />

        <div className="relative flex items-center gap-4 px-4 lg:px-6 h-[68px]">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-3 shrink-0">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[var(--color-primary,#db0030)]/40 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src="/escudo.png" alt="Club Logo" className="relative w-10 h-10 lg:w-11 lg:h-11 object-contain transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="hidden sm:flex lg:hidden 2xl:flex items-center gap-2.5">
              <div className="h-8 w-px bg-white/10" />
              <div className="flex flex-col leading-none">
                <span className="font-black text-[17px] tracking-tight text-white uppercase">Staff<span className="text-[var(--color-primary,#db0030)]">Control</span></span>
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-500 mt-1">Cuerpo técnico</span>
              </div>
              <div className="bg-white p-1 rounded-xl ml-1 shadow-[0_4px_14px_-4px_rgba(255,255,255,0.25)]">
                <img src="/icono.png" alt="Icono" className="w-9 h-9 object-contain" />
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex flex-1 justify-center min-w-0">
            <ul className="flex items-center gap-1 p-1 rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] backdrop-blur">
              {renderDesktopNav()}
            </ul>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2 ml-auto lg:ml-0 shrink-0">

            {/* Language switcher */}
            <div ref={langRef} className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className={`flex items-center gap-1.5 h-10 pl-2.5 pr-2 rounded-full text-gray-300 hover:text-white ring-1 transition-all ${
                  langOpen ? 'bg-white/10 ring-white/20 text-white' : 'bg-white/[0.04] ring-white/[0.08] hover:bg-white/[0.08]'
                }`}
                title={currentLang.label}
              >
                <span className="text-lg leading-none">{currentLang.flag}</span>
                <span className="hidden sm:inline text-[11px] font-black uppercase tracking-wider">{currentLang.code}</span>
                <ChevronDown size={13} strokeWidth={2.8} className={`text-gray-500 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`absolute right-0 top-full mt-2 w-44 z-50 transition-all duration-200 origin-top-right ${
                langOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'
              }`}>
                <div className="bg-[#101013]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.9)] p-1.5">
                  {LANGS.map((lang) => {
                    const selected = currentLang.code === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => changeLanguage(lang.code)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          selected ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <span className="text-lg leading-none">{lang.flag}</span>
                        <span className="flex-1 text-left">{lang.label}</span>
                        {selected && <Check size={15} strokeWidth={3} className="text-[var(--color-primary,#db0030)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Profile chip */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="group flex items-center gap-2.5 h-10 pl-1 pr-1 xl:pr-4 rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:ring-white/20 transition-all"
            >
              <div className="relative w-8 h-8 rounded-full p-[2px] bg-gradient-to-br from-[var(--color-primary,#db0030)] to-gray-700 shrink-0">
                <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-white font-black text-xs overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
              </div>
              <div className="hidden xl:flex flex-col items-start leading-tight">
                <span className="text-[13px] font-bold text-white max-w-[140px] truncate">{displayName}</span>
                <span className="text-[9.5px] font-black uppercase tracking-[0.15em] text-[var(--color-primary,#db0030)]">{profile?.role || 'Entrenador'}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={signOut}
              className="flex items-center justify-center w-10 h-10 rounded-full text-gray-400 bg-white/[0.04] ring-1 ring-white/[0.08] hover:text-white hover:bg-[var(--color-primary,#db0030)] hover:ring-transparent hover:shadow-[0_6px_18px_-6px_rgba(219,0,48,0.9)] transition-all"
              title={t('auth.logout')}
            >
              <LogOut size={17} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sub-menu sheet */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          sheetSection ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileSheet(null)}
      />
      <div
        className={`lg:hidden fixed left-3 right-3 bottom-[88px] z-50 transition-all duration-300 ${
          sheetSection ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        {sheetSection && (
          <div className="bg-[#101013]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.9)] p-2">
            <div className="flex items-center gap-2.5 px-3 pt-2 pb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.06] text-[var(--color-primary,#db0030)]">
                <sheetSection.icon size={13} strokeWidth={2.6} />
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-300">{t(sheetSection.labelKey)}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {sheetSection.children?.map((child) => renderChildLink(sheetSection, child, 'mobile'))}
            </ul>
          </div>
        )}
      </div>

      {/* Mobile Bottom Dock */}
      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-50">
        <ul className="flex items-stretch justify-between gap-1 p-1.5 rounded-[26px] bg-black/90 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]">
          {navigation.map((section) => {
            const active = isActive(section.path);
            const hasChildren = !!section.children?.length;
            const sheetOpen = mobileSheet === section.path;
            const Icon = section.icon;
            return (
              <li key={section.path} className="flex-1 min-w-0">
                <Link
                  to={section.path}
                  onClick={(e) => {
                    if (hasChildren && section.children!.length > 1) {
                      e.preventDefault();
                      setMobileSheet(sheetOpen ? null : section.path);
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-1 h-14 rounded-[20px] transition-all duration-200 ${
                    active
                      ? '!text-white bg-gradient-to-b from-[var(--color-primary,#db0030)] to-[#a80025] shadow-[0_8px_20px_-8px_rgba(219,0,48,0.9)]'
                      : sheetOpen
                        ? '!text-white bg-white/10'
                        : '!text-gray-500 active:bg-white/10'
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[9.5px] font-bold tracking-wide truncate max-w-full px-1">{t(section.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0 min-h-0 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-[#0a0a0a] px-4 sm:px-5 lg:px-10 pb-28 lg:pb-0">
        <div className="w-full py-4 lg:py-6">
          <ErrorBoundary resetKey={location.pathname + location.search}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      <EditProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
};

export default MainLayout;
