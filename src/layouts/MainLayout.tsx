import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { navigation } from '../config/navigation';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(true);

  const isSectionActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const [openSections, setOpenSections] = useState<string[]>(
    navigation.filter((s) => s.children && isSectionActive(s.path)).map((s) => s.label)
  );

  const toggleSection = (label: string) => {
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  return (
    <div className="layout-wrapper">
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''} ${!isDesktopMenuOpen ? 'desktop-hidden' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/icono.png" alt="StaffControl" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <span className="logo-text">StaffControl</span>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={22} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navigation.map((section) => {
              const active = isSectionActive(section.path);
              const hasChildren = !!section.children?.length;
              const isOpen = openSections.includes(section.label);

              return (
                <li key={section.label}>
                  {hasChildren ? (
                    <button
                      type="button"
                      className={`nav-link nav-group-toggle ${active ? 'active' : ''}`}
                      onClick={() => toggleSection(section.label)}
                    >
                      <section.icon size={18} className="nav-icon" />
                      <span>{section.label}</span>
                      <ChevronDown size={16} className={`nav-chevron ${isOpen ? 'open' : ''}`} />
                    </button>
                  ) : (
                    <Link
                      to={section.path}
                      className={`nav-link ${active ? 'active' : ''}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <section.icon size={18} className="nav-icon" />
                      <span>{section.label}</span>
                    </Link>
                  )}

                  {hasChildren && (
                    <ul className={`nav-subgroup ${isOpen ? 'open' : ''}`}>
                      {section.children!.map((child) => {
                        const childActive = location.pathname === child.path;
                        return (
                          <li key={child.path}>
                            <Link
                              to={child.path}
                              className={`nav-sublink ${childActive ? 'active' : ''}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <span>{child.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="btn logout-btn" onClick={signOut}>
            <LogOut size={18} />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="flex items-center gap-4">
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={22} />
            </button>
            <button className="desktop-menu-btn" onClick={() => setIsDesktopMenuOpen(!isDesktopMenuOpen)}>
              <Menu size={20} />
            </button>
          </div>

          <div className="header-right">
            <div className="lang-selector">
              {[
                { code: 'es', flag: '🇪🇸', label: 'Español' },
                { code: 'en', flag: '🇬🇧', label: 'English' },
                { code: 'it', flag: '🇮🇹', label: 'Italiano' }
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  title={lang.label}
                  className={`lang-flag-btn ${i18n.language === lang.code ? 'active' : ''}`}
                  onClick={() => changeLanguage(lang.code)}
                >
                  <span>{lang.flag}</span>
                </button>
              ))}
            </div>

            <div className="user-profile">
              <div className="flex flex-col items-end user-name-block">
                <span className="text-sm" style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{profile?.full_name || 'Admin'}</span>
                <span className="text-xs" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{profile?.role || 'Entrenador'}</span>
              </div>
              <img
                src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'Admin'}&background=db0030&color=fff`}
                alt="Profile"
                className="avatar"
              />
            </div>
          </div>
        </header>

        <div className="content-container">
          <Outlet />
        </div>
      </main>

      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
    </div>
  );
};

export default MainLayout;
