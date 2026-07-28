import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Activity,
  BarChart2,
  Settings,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: t('dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('myTeam'), href: '/team', icon: Users },
    { name: t('planning'), href: '/planning', icon: Calendar },
    { name: t('matches'), href: '/matches', icon: Activity },
    { name: t('reports'), href: '/reports', icon: BarChart2 },
    { name: t('settings'), href: '/settings', icon: Settings },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="layout-wrapper">
      {/* Sidebar for Desktop */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">SC</div>
            <span className="logo-text">StaffControl</span>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link 
                    to={item.href} 
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="nav-icon" size={20} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link logout-btn">
            <LogOut size={20} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
          
          <div className="header-right">
            <div className="lang-selector">
              <select 
                value={i18n.language} 
                onChange={(e) => changeLanguage(e.target.value)}
              >
                <option value="es">ES</option>
                <option value="en">EN</option>
                <option value="it">IT</option>
              </select>
            </div>
            <div className="user-profile">
              <img 
                src="https://ui-avatars.com/api/?name=Admin+User&background=2563eb&color=fff" 
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

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
    </div>
  );
};

export default MainLayout;
