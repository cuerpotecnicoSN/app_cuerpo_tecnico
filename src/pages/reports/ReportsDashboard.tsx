import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Filter, Download } from 'lucide-react';
import GlobalTimeline from '../../components/reports/GlobalTimeline';
import PlayersAnalytics from '../../components/reports/PlayersAnalytics';
import TrainingAnalytics from '../../components/reports/TrainingAnalytics';
import MatchesAnalytics from '../../components/reports/MatchesAnalytics';

const ReportsDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'timeline' | 'players' | 'training' | 'matches'>('timeline');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in p-6 w-full print:p-0 print:m-0">
      <div className="flex justify-between items-start mb-6 print:hidden">
        <div>
          <h1 className="h1">{t('reports.title') || 'Análisis e Informes'}</h1>
          <p className="text-muted mt-1">{t('reports.subtitle') || 'Estadísticas globales, evolución y exportación PDF'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline flex items-center gap-2">
            <Filter size={18} />
            {t('reports.filters') || 'Filtros'}
          </button>
          <button className="btn btn-primary flex items-center gap-2" onClick={handlePrint}>
            <Download size={18} />
            {t('reports.exportPdf') || 'Exportar a PDF'}
          </button>
        </div>
      </div>

      {/* Global Filters (mock) */}
      <div className="card mb-6 flex gap-4 print:hidden">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-semibold">{t('reports.season') || 'Temporada'}</label>
          <select className="p-2 border rounded">
            <option>2026-2027</option>
            <option>2025-2026</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-semibold">{t('reports.team') || 'Equipo'}</label>
          <select className="p-2 border rounded">
            <option>Primer Equipo</option>
            <option>Filial</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-semibold">{t('reports.dateRange') || 'Rango de Fechas'}</label>
          <div className="flex items-center gap-2 border rounded p-2 bg-white">
            <Calendar size={16} className="text-muted" />
            <span className="text-sm">Últimos 30 días</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-list mb-6 print:hidden">
        <button 
          className="tab-trigger flex items-center gap-2" 
          data-state={activeTab === 'timeline' ? 'active' : 'inactive'}
          onClick={() => setActiveTab('timeline')}
        >
          {t('reports.tabs.timeline') || 'Historial Global'}
        </button>
        <button 
          className="tab-trigger flex items-center gap-2" 
          data-state={activeTab === 'players' ? 'active' : 'inactive'}
          onClick={() => setActiveTab('players')}
        >
          {t('reports.tabs.players') || 'Jugadores'}
        </button>
        <button 
          className="tab-trigger flex items-center gap-2" 
          data-state={activeTab === 'training' ? 'active' : 'inactive'}
          onClick={() => setActiveTab('training')}
        >
          {t('reports.tabs.training') || 'Entrenamientos'}
        </button>
        <button 
          className="tab-trigger flex items-center gap-2" 
          data-state={activeTab === 'matches' ? 'active' : 'inactive'}
          onClick={() => setActiveTab('matches')}
        >
          {t('reports.tabs.matches') || 'Partidos'}
        </button>
      </div>

      {/* Content Area */}
      <div className="print:block print:w-full">
        {/* En modo impresión mostramos un título si estamos imprimiendo */}
        <div className="hidden print:block mb-8 border-b-2 border-primary pb-4">
          <h1 className="text-3xl font-bold">Reporte Analítico</h1>
          <p className="text-gray-500">Temporada 2026-2027 • Últimos 30 días</p>
        </div>

        {activeTab === 'timeline' && <GlobalTimeline />}
        {activeTab === 'players' && <PlayersAnalytics />}
        {activeTab === 'training' && <TrainingAnalytics />}
        {activeTab === 'matches' && <MatchesAnalytics />}
        
        {/* Footer para impresión */}
        <div className="hidden print:block mt-12 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
          Generado automáticamente por StaffControl - {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
