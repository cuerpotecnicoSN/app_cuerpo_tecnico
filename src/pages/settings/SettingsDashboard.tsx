import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Database, Shield, Sliders } from 'lucide-react';
import FormBuilder from './FormBuilder';

const SettingsDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'forms' | 'general' | 'roles'>('forms');

  return (
    <div className="animate-fade-in p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="h1 flex items-center gap-3">
          <Settings className="text-primary" size={32} />
          {t('settings.title') || 'Configuración y Administración'}
        </h1>
        <p className="text-muted mt-1">Gestiona los permisos, plantillas y estructura de la base de datos.</p>
      </div>

      {/* Tabs */}
      <div className="tabs-list mb-6">
        <button 
          className="tab-trigger flex items-center gap-2" 
          data-state={activeTab === 'forms' ? 'active' : 'inactive'}
          onClick={() => setActiveTab('forms')}
        >
          <Database size={18} />
          {t('settings.tabs.forms') || 'Constructor de Formularios'}
        </button>
        <button 
          className="tab-trigger flex items-center gap-2" 
          data-state={activeTab === 'general' ? 'active' : 'inactive'}
          onClick={() => setActiveTab('general')}
        >
          <Sliders size={18} />
          {t('settings.tabs.general') || 'General'}
        </button>
        <button 
          className="tab-trigger flex items-center gap-2" 
          data-state={activeTab === 'roles' ? 'active' : 'inactive'}
          onClick={() => setActiveTab('roles')}
        >
          <Shield size={18} />
          {t('settings.tabs.roles') || 'Roles y Accesos'}
        </button>
      </div>

      {/* Content Area */}
      <div className="w-full">
        {activeTab === 'forms' && <FormBuilder />}
        {activeTab === 'general' && (
          <div className="card text-center p-12 text-muted">Configuración general del club (En desarrollo)</div>
        )}
        {activeTab === 'roles' && (
          <div className="card text-center p-12 text-muted">Gestión de Roles y Permisos (En desarrollo)</div>
        )}
      </div>
    </div>
  );
};

export default SettingsDashboard;
