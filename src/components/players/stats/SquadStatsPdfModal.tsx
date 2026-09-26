import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileDown,
  Trophy,
  Table2,
  Map as MapIcon,
  Users2,
  X,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import type { PlayerAggregate, PlayerMatchLine, CompetitionFilter, ValueMode } from '../../../utils/playerPaniniStats';
import type { Player } from '../../types';
import {
  SQUAD_STATS_PDF_SECTIONS,
  exportSquadStatsPdf,
  type SquadStatsPdfSection,
} from '../../../utils/squadStatsPdf';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  squad: PlayerAggregate[];
  lines: PlayerMatchLine[];
  playerDbInfoMap?: Map<string, Player>;
  competitionFilter?: CompetitionFilter;
  valueMode?: ValueMode;
  minMinutes?: number;
}

const ICONS: Record<SquadStatsPdfSection, LucideIcon> = {
  rankings: Trophy,
  table: Table2,
  positions: MapIcon,
  participation: Users2,
};

export default function SquadStatsPdfModal({
  isOpen,
  onClose,
  squad,
  lines,
  playerDbInfoMap,
  competitionFilter = 'all',
  valueMode = 'total',
  minMinutes = 90,
}: Props) {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<SquadStatsPdfSection[]>(SQUAD_STATS_PDF_SECTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const labels: Record<SquadStatsPdfSection, { title: string; subtitle: string }> = {
    rankings: {
      title: t('playerStats.pdfModal.sections.rankings', 'Rankings por Métrica Destacada'),
      subtitle: t('playerStats.pdfModal.sections.rankingsSub', 'Top jugadores en minutos, goles, asistencias, acciones útiles, pases y duelos'),
    },
    table: {
      title: t('playerStats.pdfModal.sections.table', 'Tabla Comparativa de la Plantilla'),
      subtitle: t('playerStats.pdfModal.sections.tableSub', 'Comparativa completa de todos los futbolistas con estadísticas de partido completo'),
    },
    positions: {
      title: t('playerStats.pdfModal.sections.positions', 'Posiciones Medias Tácticas'),
      subtitle: t('playerStats.pdfModal.sections.positionsSub', 'Campograma horizontal completo con la colocación media de cada jugador'),
    },
    participation: {
      title: t('playerStats.pdfModal.sections.participation', 'Minutos y Participación'),
      subtitle: t('playerStats.pdfModal.sections.participationSub', 'Distribución de titularidades, suplencias y tiempo de juego'),
    },
  };

  const toggle = (s: SquadStatsPdfSection) =>
    setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const handleExport = async () => {
    if (!selected.length) return;
    setBusy(true);
    setError(null);
    try {
      await exportSquadStatsPdf({
        squad,
        lines,
        playerDbInfoMap,
        sections: selected,
        t,
        locale: i18n.language,
        competitionFilter,
        valueMode,
        minMinutes,
      });
      onClose();
    } catch (err) {
      console.error('Error generando el informe PDF de la plantilla:', err);
      setError('No se pudo generar el informe en PDF.');
    } finally {
      setBusy(false);
    }
  };

  const modeString = valueMode === 'per90' ? t('playerStats.mode.per90') : t('playerStats.mode.total');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Rossonera Oficial */}
        <div className="relative bg-gray-950 text-white px-6 py-5">
          <div className="absolute right-0 top-0 h-full w-20 bg-[repeating-linear-gradient(90deg,#db0030_0_8px,#111114_8px_16px)] opacity-90" />
          <div className="relative flex items-center gap-3.5 pr-14">
            <img src="/escudo.png" alt="AC Milan" className="w-11 h-11 rounded-xl bg-white p-1 object-contain shrink-0" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#db0030] block">
                {t('playerStats.pdfModal.squadTitle', 'Informe de Plantilla en PDF (A4 Horizontal)')}
              </span>
              <h3 className="text-lg font-black tracking-tight text-white">
                {t('playerStats.pdfModal.squadSub', 'Estadísticas de la Plantilla')}
              </h3>
              <p className="text-xs text-gray-400">
                {t('playerStats.pdfModal.squadSubDetails', { count: squad.length, mode: modeString })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="absolute top-3 right-3 p-1.5 rounded-xl bg-black/40 text-white/80 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="h-1 bg-[#db0030]" />

        {/* Cuerpo del Modal: Selector de Secciones */}
        <div className="p-6 space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">{t('playerStats.pdfModal.selectSections', 'Selecciona qué secciones incluir en el PDF:')}</span>
            <div className="flex gap-3 text-[11px] font-black uppercase tracking-wider">
              <button
                type="button"
                className="text-[#db0030] hover:underline"
                onClick={() => setSelected(SQUAD_STATS_PDF_SECTIONS)}
              >
                {t('playerStats.pdfModal.all', 'Todas')}
              </button>
              <button
                type="button"
                className="text-gray-400 hover:underline"
                onClick={() => setSelected([])}
              >
                {t('playerStats.pdfModal.none', 'Ninguna')}
              </button>
            </div>
          </div>

          {SQUAD_STATS_PDF_SECTIONS.map((s) => {
            const Icon = ICONS[s];
            const on = selected.includes(s);
            const { title, subtitle } = labels[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={`w-full flex items-center gap-3.5 p-3 rounded-2xl text-left ring-1 transition-all ${
                  on
                    ? 'ring-2 ring-[#db0030] bg-red-50/60 dark:bg-red-950/20'
                    : 'ring-gray-200 dark:ring-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <span
                  className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                    on ? 'bg-[#db0030] text-white shadow-sm' : 'bg-gray-100 dark:bg-white/5 text-gray-500'
                  }`}
                >
                  <Icon size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">{title}</span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        on ? 'bg-[#db0030] text-white' : 'bg-gray-200 dark:bg-neutral-800 text-gray-400'
                      }`}
                    >
                      {on ? '✓' : ''}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 line-clamp-1">{subtitle}</span>
                </div>
              </button>
            );
          })}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-xs font-semibold text-red-700 border border-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-4 bg-gray-50 dark:bg-neutral-900 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
          >
            {t('playerStats.pdfModal.cancel', 'Cancelar')}
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={busy || !selected.length}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#db0030] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-red-600/30 transition-all"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('playerStats.pdfModal.generating', 'Generando PDF...')}</span>
              </>
            ) : (
              <>
                <FileDown size={16} />
                <span>{t('playerStats.pdfModal.downloadHorizontal', 'Descargar PDF (Horizontal)')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
