import React, { useState } from 'react';
import type { SeasonPaniniEntry } from '../../services/paniniReports';
import { accumulatedGrid, type CoverageKey } from '../../utils/teamPaniniMetrics';

interface Props {
  entries: SeasonPaniniEntry[];
}

const ACTIONS: { key: CoverageKey; label: string }[] = [
  { key: 'bloque', label: 'Ocupación del bloque' },
  { key: 'cobertura_recuperaciones', label: 'Recuperaciones' },
  { key: 'cobertura_acciones_utiles', label: 'Acciones útiles' },
  { key: 'cobertura_pases_largos', label: 'Pases largos' },
  { key: 'cobertura_regates', label: 'Regates' },
  { key: 'cobertura_centros', label: 'Centros' },
  { key: 'cobertura_faltas', label: 'Faltas' },
];

const COLS = ['Defensa', 'Medio', 'Ataque'];
const ROWS = ['Izq', 'Centro', 'Dcha'];

// Campo horizontal 105x68, atacando hacia la derecha
const W = 105;
const H = 68;

const PitchLines: React.FC = () => (
  <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={0.35}>
    <rect x={0.5} y={0.5} width={W - 1} height={H - 1} />
    <line x1={W / 2} y1={0.5} x2={W / 2} y2={H - 0.5} />
    <circle cx={W / 2} cy={H / 2} r={9.15} />
    <circle cx={W / 2} cy={H / 2} r={0.5} fill="rgba(255,255,255,0.55)" />
    <rect x={0.5} y={H / 2 - 20.16} width={16.5} height={40.32} />
    <rect x={0.5} y={H / 2 - 9.16} width={5.5} height={18.32} />
    <rect x={W - 17} y={H / 2 - 20.16} width={16.5} height={40.32} />
    <rect x={W - 6} y={H / 2 - 9.16} width={5.5} height={18.32} />
    <path d={`M 17 ${H / 2 - 7.3} A 9.15 9.15 0 0 1 17 ${H / 2 + 7.3}`} />
    <path d={`M ${W - 17} ${H / 2 - 7.3} A 9.15 9.15 0 0 0 ${W - 17} ${H / 2 + 7.3}`} />
  </g>
);

const HeatPitch: React.FC<{ grid: number[][]; side: 'our' | 'rival'; label: string; matches: number }> = ({ grid, side, label, matches }) => {
  const max = Math.max(...grid.flat(), 1);
  const rgb = side === 'our' ? '219, 0, 48' : '250, 204, 21';
  const cw = W / 3;
  const ch = H / 3;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl ring-1 ring-gray-200/80 dark:ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.15)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{label}</span>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{matches} PJ</span>
      </div>
      {grid.length ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl overflow-hidden block">
          <defs>
            <linearGradient id="grass" x1="0" x2="1">
              <stop offset="0" stopColor="#14532d" />
              <stop offset="1" stopColor="#166534" />
            </linearGradient>
            <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          </defs>
          <rect width={W} height={H} fill="url(#grass)" />
          {[...Array(10)].map((_, i) => (
            <rect key={i} x={(W / 10) * i} y={0} width={W / 10} height={H} fill={i % 2 ? 'rgba(255,255,255,0.03)' : 'transparent'} />
          ))}
          <g filter="url(#blur)">
            {grid.map((row, r) =>
              row.map((v, c) => (
                <rect key={`${r}-${c}`} x={c * cw} y={r * ch} width={cw} height={ch} fill={`rgba(${rgb}, ${(0.08 + (v / max) * 0.8).toFixed(2)})`} />
              )),
            )}
          </g>
          {[1, 2].map((i) => (
            <React.Fragment key={i}>
              <line x1={cw * i} y1={0} x2={cw * i} y2={H} stroke="rgba(255,255,255,0.25)" strokeWidth={0.3} strokeDasharray="1.5 1.5" />
              <line x1={0} y1={ch * i} x2={W} y2={ch * i} stroke="rgba(255,255,255,0.25)" strokeWidth={0.3} strokeDasharray="1.5 1.5" />
            </React.Fragment>
          ))}
          <PitchLines />
          {grid.map((row, r) =>
            row.map((v, c) => (
              <text
                key={`t-${r}-${c}`}
                x={c * cw + cw / 2}
                y={r * ch + ch / 2 + 2}
                textAnchor="middle"
                fontSize={v === max ? 6.5 : 5.5}
                fontWeight={900}
                fill="#fff"
                style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.45)', strokeWidth: 1 }}
              >
                {v.toFixed(0)}%
              </text>
            )),
          )}
          <path d={`M ${W - 14} ${H - 4} L ${W - 5} ${H - 4}`} stroke="#fff" strokeWidth={0.6} />
          <path d={`M ${W - 7} ${H - 5.5} L ${W - 5} ${H - 4} L ${W - 7} ${H - 2.5}`} fill="none" stroke="#fff" strokeWidth={0.6} />
        </svg>
      ) : (
        <div className="aspect-[105/68] rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-gray-400">Sin datos</div>
      )}
      <div className="grid grid-cols-3 mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">
        {COLS.map((c) => <span key={c}>{c}</span>)}
      </div>
    </div>
  );
};

const AccumulatedHeatmaps: React.FC<Props> = ({ entries }) => {
  const [side, setSide] = useState<'our' | 'rival'>('our');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Campogramas acumulados</h2>
          <p className="text-xs text-gray-500">
            % medio de acciones por zona ({ROWS.join(' / ')} × {COLS.join(' / ')}). Ataque hacia la derecha.
          </p>
        </div>
        <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-white/5 ring-1 ring-gray-200/80 dark:ring-white/10">
          {([['our', 'Nuestro equipo'], ['rival', 'Rivales']] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSide(k)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                side === k ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {ACTIONS.map((a) => (
          <HeatPitch key={a.key} grid={accumulatedGrid(entries, a.key, side)} side={side} label={a.label} matches={entries.length} />
        ))}
      </div>
    </div>
  );
};

export default AccumulatedHeatmaps;
