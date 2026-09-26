import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, FileDown, FileUp, Loader2, Map as MapIcon, Table2 } from 'lucide-react';
import SubNavTabs from '../../components/common/SubNavTabs';
import TeamMetricsTable from '../../components/team/TeamMetricsTable';
import TeamEvolutionCharts from '../../components/team/TeamEvolutionCharts';
import AccumulatedHeatmaps from '../../components/team/AccumulatedHeatmaps';
import TeamReportPdfModal from '../../components/team/TeamReportPdfModal';
import { getSeasonPaniniReports, type SeasonPaniniEntry } from '../../services/paniniReports';
import { mean } from '../../utils/teamPaniniMetrics';

type View = 'table' | 'charts' | 'heatmaps';
type Venue = 'all' | 'home' | 'away';
type Range = 'all' | 'last3' | 'last5';

const Segmented = <T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) => (
  <div className="flex p-1 rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-gray-200/80 dark:ring-white/10 shadow-sm">
    {options.map(([k, l]) => (
      <button
        key={k}
        type="button"
        onClick={() => onChange(k)}
        className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${
          value === k ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        {l}
      </button>
    ))}
  </div>
);

const Kpi = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) => (
  <div className={`relative overflow-hidden rounded-2xl p-4 ring-1 ${
    accent
      ? 'bg-gradient-to-br from-[#db0030] to-[#8a001e] text-white ring-transparent shadow-[0_12px_28px_-12px_rgba(219,0,48,0.7)]'
      : 'bg-white dark:bg-neutral-900 ring-gray-200/80 dark:ring-white/10 shadow-sm'
  }`}>
    <div className={`text-[10px] font-black uppercase tracking-[0.14em] ${accent ? 'text-white/70' : 'text-gray-400'}`}>{label}</div>
    <div className={`mt-1 text-2xl font-black tabular-nums tracking-tight ${accent ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{value}</div>
    {sub && <div className={`text-[11px] font-semibold ${accent ? 'text-white/70' : 'text-gray-500'}`}>{sub}</div>}
  </div>
);

export default function TeamPage() {
  const { t } = useTranslation();
  const [all, setAll] = useState<SeasonPaniniEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('table');
  const [venue, setVenue] = useState<Venue>('all');
  const [range, setRange] = useState<Range>('all');
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    getSeasonPaniniReports()
      .then(setAll)
      .catch((err) => {
        console.error('Error cargando informes Panini de la temporada:', err);
        setError('No se pudieron cargar los informes de la temporada.');
        setAll([]);
      });
  }, []);

  const entries = useMemo(() => {
    let list = (all ?? []).filter((e) => venue === 'all' || (venue === 'home' ? e.isHome : !e.isHome));
    if (range === 'last3') list = list.slice(-3);
    if (range === 'last5') list = list.slice(-5);
    return list;
  }, [all, venue, range]);

  const kpis = useMemo(() => {
    const w = entries.filter((e) => e.our.goles > e.rival.goles).length;
    const d = entries.filter((e) => e.our.goles === e.rival.goles).length;
    const l = entries.length - w - d;
    const gf = entries.reduce((a, e) => a + (e.our.goles || 0), 0);
    const gc = entries.reduce((a, e) => a + (e.rival.goles || 0), 0);
    return {
      record: `${w}-${d}-${l}`,
      points: w * 3 + d,
      gf,
      gc,
      xgf: mean(entries.map((e) => e.our.xg ?? null)),
      xgc: mean(entries.map((e) => e.rival.xg ?? null)),
      pos: mean(entries.map((e) => e.our.estadisticas?.total_partido?.posesion_pct ?? null)),
    };
  }, [entries]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              {t('nav.team', 'Equipo')}
            </h1>
            <span className="px-3 py-1 bg-red-50 dark:bg-red-950/40 text-[var(--color-primary,#db0030)] text-xs font-black uppercase tracking-wider rounded-full border border-red-200/60 dark:border-red-800/40">
              {all?.length ?? 0} informes Panini
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Acumulado de temporada a partir de los informes Panini Digital Match Analysis importados
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Venue> value={venue} onChange={setVenue} options={[['all', 'Todos'], ['home', 'Local'], ['away', 'Visitante']]} />
          <Segmented<Range> value={range} onChange={setRange} options={[['all', 'Temporada'], ['last5', 'Últimos 5'], ['last3', 'Últimos 3']]} />
          <button
            type="button"
            onClick={() => setPdfOpen(true)}
            disabled={!entries.length}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-black shadow-sm disabled:opacity-40 transition-colors"
          >
            <FileDown size={15} className="text-[#ff4d6d]" />
            {t('teamReport.exportButton')}
          </button>
        </div>
      </div>

      {all === null ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Cargando informes…
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-6 text-sm font-semibold text-red-700 dark:text-red-300">{error}</div>
      ) : !all.length ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center mb-4">
            <FileUp size={24} />
          </div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Aún no hay informes Panini</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">Importa el PDF de Panini en cada partido para construir el acumulado del equipo.</p>
          <Link to="/matches" className="btn btn-primary">Ir a Partidos</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi accent label="Balance V-E-D" value={kpis.record} sub={`${kpis.points} pts · ${entries.length} PJ`} />
            <Kpi label="Goles" value={`${kpis.gf} – ${kpis.gc}`} sub={`Dif. ${kpis.gf - kpis.gc >= 0 ? '+' : ''}${kpis.gf - kpis.gc}`} />
            <Kpi label="xG a favor / PJ" value={kpis.xgf !== null ? kpis.xgf.toFixed(2) : '–'} />
            <Kpi label="xG en contra / PJ" value={kpis.xgc !== null ? kpis.xgc.toFixed(2) : '–'} />
            <Kpi label="Posesión media" value={kpis.pos !== null ? `${kpis.pos.toFixed(0)}%` : '–'} />
            <Kpi label="Goles / PJ" value={entries.length ? (kpis.gf / entries.length).toFixed(2) : '–'} sub={entries.length ? `${(kpis.gc / entries.length).toFixed(2)} en contra` : undefined} />
          </div>

          <SubNavTabs
            tabs={[
              { id: 'table', label: 'Tabla acumulada', icon: Table2, count: entries.length },
              { id: 'charts', label: 'Evolución', icon: BarChart3 },
              { id: 'heatmaps', label: 'Campogramas', icon: MapIcon },
            ]}
            activeTab={view}
            onChange={(v) => setView(v as View)}
          />

          {!entries.length ? (
            <div className="rounded-2xl bg-gray-100 dark:bg-white/5 p-8 text-center text-sm font-semibold text-gray-500">
              No hay partidos con este filtro.
            </div>
          ) : view === 'table' ? (
            <TeamMetricsTable entries={entries} />
          ) : view === 'charts' ? (
            <TeamEvolutionCharts entries={entries} />
          ) : (
            <AccumulatedHeatmaps entries={entries} />
          )}
        </>
      )}

      <TeamReportPdfModal
        isOpen={pdfOpen}
        onClose={() => setPdfOpen(false)}
        entries={entries}
        filterLabel={`${t(`teamReport.filters.${venue}`)} · ${t(`teamReport.filters.${range === 'all' ? 'season' : range}`)}`}
      />
    </div>
  );
}
