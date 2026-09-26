import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileDown,
  LayoutDashboard,
  Table2,
  Map as MapIcon,
  Users2,
  CalendarDays,
  X,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import type { PlayerAggregate, PlayerMatchLine, CompetitionFilter, ValueMode } from '../../../utils/playerPaniniStats';
import type { Player } from '../../types';
import {
  PLAYER_REPORT_SECTIONS,
  exportPlayerReportPdf,
  type PlayerReportSection,
} from '../../../utils/playerReportPdf';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerAggregate;
  playerDbInfo?: Player;
  lines: PlayerMatchLine[];
  competitionFilter?: CompetitionFilter;
  valueMode?: ValueMode;
}

const ICONS: Record<PlayerReportSection, LucideIcon> = {
  summary: LayoutDashboard,
  metrics: Table2,
  heatmap: MapIcon,
  passing: Users2,
  matches: CalendarDays,
};

export default function PlayerReportPdfModal({
  isOpen,
  onClose,
  player,
  playerDbInfo,
  lines,
  competitionFilter = 'all',
  valueMode = 'total',
}: Props) {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<PlayerReportSection[]>(PLAYER_REPORT_SECTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const labels: Record<PlayerReportSection, { title: string; subtitle: string }> = {
    summary: {
      title: t('playerStats.pdfModal.sections.summary', 'Resumen y KPIs Principales'),
      subtitle: t('playerStats.pdfModal.sections.summarySub', 'Partidos, titularidades, minutos, goles, asistencias y rendimiento'),
    },
    metrics: {
      title: t('playerStats.pdfModal.sections.metrics', 'Estadísticas Detalladas por Bloques'),
      subtitle: t('playerStats.pdfModal.sections.metricsSub', 'Participación, Pase, Creación, Ataque, Defensa y Portería (Total y Por 90 min)'),
    },
    heatmap: {
      title: t('playerStats.pdfModal.sections.heatmap', 'Campograma y Mapa de Calor'),
      subtitle: t('playerStats.pdfModal.sections.heatmapSub', 'Densidad térmica de toques, posición media y distribución por tercios y carriles'),
    },
    passing: {
      title: t('playerStats.pdfModal.sections.passing', 'Socios y Red de Pases'),
      subtitle: t('playerStats.pdfModal.sections.passingSub', 'Principales receptores de pases y pasadores del jugador'),
    },
    matches: {
      title: t('playerStats.pdfModal.sections.matches', 'Historial Partido a Partido'),
      subtitle: t('playerStats.pdfModal.sections.matchesSub', 'Desglose detallado de todos los encuentros disputados'),
    },
  };

  const toggle = (s: PlayerReportSection) =>
    setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const handleExport = async () => {
    if (!selected.length) return;
    setBusy(true);
    setError(null);
    try {
      await exportPlayerReportPdf({
        player,
        playerDbInfo,
        lines,
        sections: selected,
        t,
        locale: i18n.language,
        competitionFilter,
        valueMode,
      });
      onClose();
    } catch (err) {
      console.error('Error generando el informe PDF del jugador:', err);
      setError('No se pudo generar el informe en PDF.');
    } finally {
      setBusy(false);
    }
  };

  const validMatchesCount = lines.filter((l) => l.minutes > 0).length;

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
                {t('playerStats.pdfModal.individualTitle', 'Informe Individual en PDF (A4 Vertical)')}
              </span>
              <h3 className="text-lg font-black tracking-tight text-white">
                #{player.dorsal} {player.name}
              </h3>
              <p className="text-xs text-gray-400">
                {t('playerStats.pdfModal.individualSub', { count: validMatchesCount })}
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
                onClick={() => setSelected(PLAYER_REPORT_SECTIONS)}
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

          {PLAYER_REPORT_SECTIONS.map((s) => {
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
                <span>{t('playerStats.pdfModal.downloadVertical', 'Descargar PDF (Vertical)')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
