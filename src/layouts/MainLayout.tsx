import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { navigation } from '../config/navigation';
import EditProfileModal from '../components/auth/EditProfileModal';

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
  const navigate = useNavigate();

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const renderNavItems = () => navigation.map((section) => {
    const active = isActive(section.path);
    const hasChildren = section.children && section.children.length > 0;
    const isOpen = openMenu === section.path;

    return (
      <li 
        key={section.path} 
        className="relative group lg:h-full"
        onMouseEnter={() => window.innerWidth >= 1024 && hasChildren && setOpenMenu(section.path)}
        onMouseLeave={() => window.innerWidth >= 1024 && hasChildren && setOpenMenu(null)}
      >
        <Link
          to={section.path}
          onClick={(e) => {
            if (window.innerWidth < 1024) {
              if (hasChildren && active) {
                e.preventDefault();
                setOpenMenu(isOpen ? null : section.path);
              } else {
                setOpenMenu(section.path);
              }
            }
          }}
          className={`flex items-center justify-between lg:justify-start gap-3 px-4 py-4 lg:py-0 lg:h-full text-lg font-black uppercase tracking-wider transition-colors ${
            active 
              ? '!text-white lg:border-b-4 lg:border-[var(--color-primary,#db0030)]' 
              : '!text-gray-300 hover:!text-white lg:border-b-4 lg:border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="lg:hidden"><section.icon size={20} /></span>
            <span>{t(section.labelKey)}</span>
          </div>
          {hasChildren && (
            <ChevronDown size={16} strokeWidth={3} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${active ? 'text-[var(--color-primary,#db0030)] lg:text-white' : ''}`} />
          )}
        </Link>

        {/* Dropdown for Desktop & Accordion for Mobile */}
        {hasChildren && (
          <div className={`
            lg:absolute lg:top-full lg:left-0 lg:w-64 lg:bg-[#111] lg:border-t-2 lg:border-[var(--color-primary,#db0030)] lg:shadow-xl
            transition-all duration-200 overflow-hidden z-50
            ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 lg:hidden'}
          `}>
            <ul className="flex flex-col py-2 lg:py-4 px-8 lg:px-0 bg-gray-900 lg:bg-transparent">
              {section.children?.map((child) => {
                const childActive = location.search === child.path.split('?')[1] || (location.search === '' && child.path === section.path);
                return (
                  <li key={child.path}>
                    <button
                      onClick={() => {
                        navigate(child.path);
                        setOpenMenu(null);
                      }}
                      className={`w-full text-left px-6 py-3 text-[0.95rem] font-bold uppercase tracking-widest transition-colors ${
                        childActive 
                          ? '!text-white bg-[var(--color-primary,#db0030)]' 
                          : '!text-gray-300 hover:!text-white hover:bg-gray-800'
                      }`}
                    >
                      {t(child.labelKey)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </li>
    );
  });

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-gray-950 overflow-hidden">
      
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-4 lg:px-6 h-[72px] bg-black border-b border-gray-900 shrink-0 z-50 relative">
        
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-4 h-full">
          <img src="/escudo.png" alt="Club Logo" className="w-10 h-10 lg:w-12 lg:h-12 object-contain" />
          <div className="hidden sm:flex items-center gap-3">
            <span className="font-black text-xl tracking-tighter text-white uppercase leading-none">STAFFCONTROL</span>
            <div className="bg-white p-1.5 rounded-xl">
              <img src="/icono.png" alt="Icono" className="w-14 h-14 object-contain" />
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex h-full ml-12">
          <ul className="flex items-center h-full gap-8 xl:gap-20">
            {renderNavItems()}
          </ul>
        </nav>

        {/* Right Section (Lang, Profile, Hamburger) */}
        <div className="flex items-center gap-3 lg:gap-6 ml-auto h-full">
          
          <div className="hidden sm:flex items-center gap-1">
            {LANGS.map((lang) => (
              <button
                key={lang.code}
                type="button"
                title={lang.label}
                onClick={() => changeLanguage(lang.code)}
                className={`rounded px-1.5 py-1 text-lg leading-none transition-opacity ${
                  i18n.language === lang.code ? 'opacity-100 border-b-2 border-[var(--color-primary,#db0030)]' : 'opacity-50 hover:opacity-100 grayscale hover:grayscale-0'
                }`}
              >
                {lang.flag}
              </button>
            ))}
          </div>

          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-white">{profile?.full_name || 'Admin'}</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary,#db0030)]">{profile?.role || 'Entrenador'}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0) || 'A'
              )}
            </div>
          </div>

          <button
            onClick={signOut}
            className="hidden sm:flex p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors ml-2"
            title={t('auth.logout')}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-gray-900 z-50">
        <ul className="flex items-center justify-around h-full">
          {navigation.map((section) => {
            const active = isActive(section.path);
            return (
              <li key={section.path} className="h-full flex-1">
                <Link
                  to={section.path}
                  className={`flex flex-col items-center justify-center h-full w-full transition-colors ${
                    active ? 'text-[var(--color-primary,#db0030)]' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <section.icon size={26} strokeWidth={active ? 2.5 : 2} />
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary,#db0030)] mt-1 absolute bottom-1.5" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-gray-50 dark:bg-[#0a0a0a] pb-16 lg:pb-0">
        <Outlet />
      </main>

      <EditProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
};

export default MainLayout;
