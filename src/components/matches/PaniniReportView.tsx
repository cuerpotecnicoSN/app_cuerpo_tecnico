import { useState } from 'react';
import { 
  BarChart2, 
  Layers, 
  Crosshair, 
  Share2, 
  UserCheck, 
  Upload, 
  Activity,
  Shield
} from 'lucide-react';
import type { PaniniMatchReport } from '../../types/paniniReport';
import type { MatchDB } from '../types';
import SubNavTabs from '../common/SubNavTabs';
import PaniniMatchHeader from './panini/PaniniMatchHeader';
import PaniniLineupsView from './panini/PaniniLineupsView';
import PaniniGeneralStatsView from './panini/PaniniGeneralStatsView';
import PaniniTacticalDensityView from './panini/PaniniTacticalDensityView';
import PaniniDribblingCrossView from './panini/PaniniDribblingCrossView';
import PaniniFinishingView from './panini/PaniniFinishingView';
import PaniniPassingNetworkView from './panini/PaniniPassingNetworkView';
import PaniniIndividualStatsView from './panini/PaniniIndividualStatsView';
import PaniniImportModal from './panini/PaniniImportModal';
import PaniniMethodologyNotesModal from './panini/PaniniMethodologyNotesModal';
import { BookOpen } from 'lucide-react';

interface Props {
  matchId: string;
  match?: MatchDB;
  report: PaniniMatchReport;
  onRefresh?: () => void;
}

export default function PaniniReportView({ matchId, match, report, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<
    'alineaciones' | 'estadisticas' | 'densidad' | 'regates_centros' | 'finalizacion' | 'pases' | 'jugadores'
  >('alineaciones');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  const home = report.equipo_local;
  const away = report.equipo_visitante;

  const homeLogo = match?.home_logo || (home as any).logo || (home.nombre.toLowerCase().includes('milan') ? '/escudo.png' : undefined);
  const awayLogo = match?.away_logo || (away as any).logo || (away.nombre.toLowerCase().includes('milan') ? '/escudo.png' : undefined);

  return (
    <div className="space-y-6 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* 1. Header Card: Marcador, Logos, Goleadores, IVS, xPG y Tiempos */}
      <PaniniMatchHeader report={report} match={match} homeLogo={homeLogo} awayLogo={awayLogo} />

      {/* 2. Sub-Tabs de Navegación del Informe Oficial */}
      <SubNavTabs
        tabs={[
          { id: 'alineaciones', label: 'Alineaciones y Puntos Medios', icon: Shield },
          { id: 'estadisticas', label: 'Estadísticas Generales', icon: BarChart2 },
          { id: 'densidad', label: 'Disposición y Densidad', icon: Layers },
          { id: 'regates_centros', label: 'Regates y Centros', icon: Activity },
          { id: 'finalizacion', label: 'Finalización y ABP', icon: Crosshair },
          { id: 'pases', label: 'Flujo de Pases', icon: Share2 },
          { id: 'jugadores', label: 'Jugadores y Rankings', icon: UserCheck },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMethodologyOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 transition-all whitespace-nowrap shadow-sm cursor-pointer"
              title="Ver notas metodológicas y glosario oficial Panini (Pág. 20)"
            >
              <BookOpen size={14} className="text-indigo-500" />
              <span>Glosario y Notas</span>
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md transition-all whitespace-nowrap cursor-pointer"
            >
              <Upload size={15} /> Importar PDF / JSON
            </button>
          </div>
        }
      />

      {/* ======================================================== */}
      {/* TAB 1: ALINEACIONES Y POSICIONAMIENTO MEDIO              */}
      {/* ======================================================== */}
      {activeTab === 'alineaciones' && (
        <PaniniLineupsView homeTeam={home} awayTeam={away} homeLogo={homeLogo} awayLogo={awayLogo} />
      )}

      {/* ======================================================== */}
      {/* TAB 2: ESTADÍSTICAS GENERALES (BARRAS HORIZONTALES)      */}
      {/* ======================================================== */}
      {activeTab === 'estadisticas' && (
        <PaniniGeneralStatsView homeTeam={home} awayTeam={away} />
      )}

      {/* ======================================================== */}
      {/* TAB 3: DISPOSICIÓN TÁCTICA Y DENSIDAD (1T / 2T)          */}
      {/* ======================================================== */}
      {activeTab === 'densidad' && (
        <PaniniTacticalDensityView homeTeam={home} awayTeam={away} />
      )}

      {/* ======================================================== */}
      {/* TAB 4: REGATES Y CENTROS AL ÁREA                         */}
      {/* ======================================================== */}
      {activeTab === 'regates_centros' && (
        <PaniniDribblingCrossView homeTeam={home} awayTeam={away} />
      )}

      {/* ======================================================== */}
      {/* TAB 5: FINALIZACIÓN Y BALÓN PARADO (TIEMPOS, TIROS, ARCO)*/}
      {/* ======================================================== */}
      {activeTab === 'finalizacion' && (
        <PaniniFinishingView homeTeam={home} awayTeam={away} />
      )}

      {/* ======================================================== */}
      {/* TAB 6: FLUJO DE PASES Y MATRIZ CRUZADA                   */}
      {/* ======================================================== */}
      {activeTab === 'pases' && (
        <PaniniPassingNetworkView homeTeam={home} awayTeam={away} />
      )}

      {/* ======================================================== */}
      {/* TAB 7: ZOOM JUGADORES Y RANKINGS TOP 5                   */}
      {/* ======================================================== */}
      {activeTab === 'jugadores' && (
        <PaniniIndividualStatsView homeTeam={home} awayTeam={away} />
      )}

      {/* Modal de Importación Panini */}
      <PaniniImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentMatchId={matchId}
        onImportSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* Modal de Guía Metodológica y Glosario Oficial (Pág. 20) */}
      <PaniniMethodologyNotesModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

    </div>
  );
}

