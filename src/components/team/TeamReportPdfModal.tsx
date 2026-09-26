import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Check, FileDown, LayoutDashboard, Loader2, Map as MapIcon, Table2, X, type LucideIcon } from 'lucide-react';
import type { SeasonPaniniEntry } from '../../services/paniniReports';
import { TEAM_REPORT_SECTIONS, exportTeamReportPdf, type TeamReportSection } from '../../utils/teamReportPdf';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: SeasonPaniniEntry[];
  /** Filtros activos ya traducidos, p. ej. "Todos · Temporada" */
  filterLabel: string;
}

const ICONS: Record<TeamReportSection, LucideIcon> = {
  summary: LayoutDashboard,
  table: Table2,
  evolution: BarChart3,
  heatmapsOur: MapIcon,
  heatmapsRival: MapIcon,
};

export default function TeamReportPdfModal({ isOpen, onClose, entries, filterLabel }: Props) {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<TeamReportSection[]>(TEAM_REPORT_SECTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggle = (s: TeamReportSection) =>
    setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    try {
      await exportTeamReportPdf({ entries, sections: selected, t, locale: i18n.language, filterLabel });
      onClose();
    } catch (err) {
      console.error('Error generando el informe PDF del equipo:', err);
      setError(t('teamReport.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={busy ? undefined : onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera rossonera */}
        <div className="relative bg-gray-950 text-white px-6 py-5">
          <div className="absolute right-0 top-0 h-full w-16 bg-[repeating-linear-gradient(90deg,#db0030_0_8px,#111114_8px_16px)] opacity-90" />
          <div className="relative flex items-center gap-3 pr-16">
            <img src="/escudo.png" alt="" className="w-11 h-11 rounded-xl bg-white p-1 object-contain" />
            <div>
              <h3 className="text-lg font-black tracking-tight">{t('teamReport.modalTitle')}</h3>
              <p className="text-xs text-white/60">{t('teamReport.modalSubtitle', { filter: filterLabel })}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 text-white/80 hover:text-white"
            aria-label={t('teamReport.cancel')}
          >
            <X size={18} />
          </button>
        </div>
        <div className="h-1 bg-[#db0030]" />

        <div className="p-6 space-y-3 overflow-y-auto">
          <div className="flex justify-end gap-3 text-[11px] font-black uppercase tracking-wider">
            <button type="button" className="text-[#db0030] hover:underline" onClick={() => setSelected(TEAM_REPORT_SECTIONS)}>
              {t('teamReport.selectAll')}
            </button>
            <button type="button" className="text-gray-400 hover:underline" onClick={() => setSelected([])}>
              {t('teamReport.selectNone')}
            </button>
          </div>

          {TEAM_REPORT_SECTIONS.map((s) => {
            const Icon = ICONS[s];
            const on = selected.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left ring-1 transition-all ${
                  on
                    ? 'ring-2 ring-[#db0030] bg-red-50/60 dark:bg-red-950/20'
                    : 'ring-gray-200 dark:ring-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${on ? 'bg-[#db0030] text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                  <Icon size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-black text-gray-900 dark:text-white">{t(`teamReport.sections.${s}.title`)}</span>
                  <span className="block text-xs text-gray-500">{t(`teamReport.sections.${s}.description`)}</span>
                </span>
                <span className={`w-5 h-5 shrink-0 rounded-md flex items-center justify-center border ${on ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-300 dark:border-white/20'}`}>
                  {on && <Check size={13} strokeWidth={3.5} />}
                </span>
              </button>
            );
          })}

          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
          {!selected.length && <p className="text-xs font-semibold text-gray-400">{t('teamReport.pickOne')}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            {t('teamReport.cancel')}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={busy || !selected.length}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#db0030] hover:bg-[#b00026] text-white text-xs font-black shadow-lg disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
            {busy ? t('teamReport.generating') : t('teamReport.download')}
          </button>
        </div>
      </div>
    </div>
  );
}
