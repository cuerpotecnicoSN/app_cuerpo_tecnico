import React, { useId, useMemo } from 'react';
import type { PaniniMapEvent } from '../../../types/paniniReport';
import { HEAT_COLS, HEAT_ROWS, touchDensity } from '../../../utils/playerPaniniStats';

// Campo horizontal 105x68, atacando hacia la derecha
export const PITCH_W = 105;
export const PITCH_H = 68;

export const PitchLines: React.FC<{ stroke?: string }> = ({ stroke = 'rgba(255,255,255,0.75)' }) => (
  <g fill="none" stroke={stroke} strokeWidth={0.4}>
    {/* Borde exterior del campo */}
    <rect x={0.6} y={0.6} width={PITCH_W - 1.2} height={PITCH_H - 1.2} rx={0.8} />
    
    {/* Línea de medio campo */}
    <line x1={PITCH_W / 2} y1={0.6} x2={PITCH_W / 2} y2={PITCH_H - 0.6} />
    
    {/* Círculo central y punto central */}
    <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r={9.15} />
    <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r={0.6} fill={stroke} />

    {/* Áreas grandes */}
    <rect x={0.6} y={PITCH_H / 2 - 20.16} width={16.5} height={40.32} />
    <rect x={PITCH_W - 17.1} y={PITCH_H / 2 - 20.16} width={16.5} height={40.32} />

    {/* Áreas pequeñas */}
    <rect x={0.6} y={PITCH_H / 2 - 9.16} width={5.5} height={18.32} />
    <rect x={PITCH_W - 6.1} y={PITCH_H / 2 - 9.16} width={5.5} height={18.32} />

    {/* Puntos de penalti */}
    <circle cx={11} cy={PITCH_H / 2} r={0.5} fill={stroke} />
    <circle cx={PITCH_W - 11} cy={PITCH_H / 2} r={0.5} fill={stroke} />

    {/* Arcos de área de penalti */}
    <path d={`M 17.1 ${PITCH_H / 2 - 7.3} A 9.15 9.15 0 0 1 17.1 ${PITCH_H / 2 + 7.3}`} />
    <path d={`M ${PITCH_W - 17.1} ${PITCH_H / 2 - 7.3} A 9.15 9.15 0 0 0 ${PITCH_W - 17.1} ${PITCH_H / 2 + 7.3}`} />

    {/* Córners */}
    <path d="M 0.6 2.5 A 1.8 1.8 0 0 0 2.5 0.6" />
    <path d={`M 0.6 ${PITCH_H - 2.5} A 1.8 1.8 0 0 1 2.5 ${PITCH_H - 0.6}`} />
    <path d={`M ${PITCH_W - 2.5} 0.6 A 1.8 1.8 0 0 0 ${PITCH_W - 0.6} 2.5`} />
    <path d={`M ${PITCH_W - 2.5} ${PITCH_H - 0.6} A 1.8 1.8 0 0 1 ${PITCH_W - 0.6} ${PITCH_H - 2.5}`} />
  </g>
);

/** Césped táctico moderno con franjas sutiles */
export const Grass: React.FC<{ id: string }> = ({ id }) => (
  <>
    <defs>
      <linearGradient id={`${id}-grass`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0b2c1b" />
        <stop offset="50%" stopColor="#0e3822" />
        <stop offset="100%" stopColor="#0b2c1b" />
      </linearGradient>
    </defs>
    <rect width={PITCH_W} height={PITCH_H} fill={`url(#${id}-grass)`} />
    {[...Array(12)].map((_, i) => (
      <rect
        key={i}
        x={(PITCH_W / 12) * i}
        y={0}
        width={PITCH_W / 12}
        height={PITCH_H}
        fill={i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent'}
      />
    ))}
  </>
);

/** Escala de calor vibrante y visible: Verde lima → Amarillo solar → Naranja fuego → Rojo escarlata → Carmesí */
const heatColor = (v: number): string => {
  const stops: [number, [number, number, number]][] = [
    [0.0, [34, 197, 94]],   // #22c55e (Verde lima brillante)
    [0.25, [250, 204, 21]], // #facc15 (Amarillo solar)
    [0.55, [249, 115, 22]], // #f97316 (Naranja fuego)
    [0.80, [239, 68, 68]],  // #ef4444 (Rojo intenso)
    [1.0, [219, 0, 48]],    // #db0030 (Carmesí Milan)
  ];

  let i = 0;
  while (i < stops.length - 2 && v > stops[i + 1][0]) {
    i++;
  }
  const [p0, c0] = stops[i];
  const [p1, c1] = stops[i + 1];
  const k = Math.max(0, Math.min(1, (v - p0) / (p1 - p0)));
  const r = Math.round(c0[0] + (c1[0] - c0[0]) * k);
  const g = Math.round(c0[1] + (c1[1] - c0[1]) * k);
  const b = Math.round(c0[2] + (c1[2] - c0[2]) * k);
  return `rgb(${r}, ${g}, ${b})`;
};

export const HEAT_GRADIENT_CSS = 'linear-gradient(90deg, #22c55e 0%, #facc15 25%, #f97316 55%, #ef4444 80%, #db0030 100%)';

interface Props {
  touches: PaniniMapEvent[];
  avgPosition?: { x: number; y: number } | null;
  showTouches?: boolean;
  label?: string;
  className?: string;
}

const PitchHeatmap: React.FC<Props> = ({ touches, avgPosition, showTouches = false, label, className = '' }) => {
  const id = useId().replace(/:/g, '');
  const grid = useMemo(() => touchDensity(touches), [touches]);
  const cw = PITCH_W / HEAT_COLS;
  const ch = PITCH_H / HEAT_ROWS;
  const px = (x: number) => (x / 100) * PITCH_W;
  const py = (y: number) => (y / 100) * PITCH_H;

  return (
    <svg
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      className={`w-full block rounded-2xl overflow-hidden shadow-md ring-1 ring-black/10 dark:ring-white/10 ${className}`}
      role="img"
      aria-label={label}
    >
      <defs>
        <filter id={`${id}-heat-filter`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.7" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 1.5 -0.05"
          />
        </filter>
      </defs>

      {/* Fondo césped táctico */}
      <Grass id={id} />

      {/* Capa de calor con gradiente térmico de alta visibilidad */}
      <g filter={`url(#${id}-heat-filter)`}>
        {grid.map((row, r) =>
          row.map((v, c) =>
            v < 0.04 ? null : (
              <rect
                key={`${r}-${c}`}
                x={c * cw}
                y={r * ch}
                width={cw + 0.15}
                height={ch + 0.15}
                fill={heatColor(v)}
                fillOpacity={Math.min(0.96, 0.35 + v * 0.65)}
              />
            ),
          ),
        )}
      </g>

      {/* Líneas de campo de alto contraste */}
      <PitchLines />

      {/* Toques individuales opcionales */}
      {showTouches &&
        touches.map((t, i) =>
          t.periodo === '2T' ? (
            <rect
              key={i}
              x={px(t.x) - 0.7}
              y={py(t.y) - 0.7}
              width={1.4}
              height={1.4}
              fill={t.balon_parado ? '#fde68a' : '#ffffff'}
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={0.2}
            />
          ) : (
            <circle
              key={i}
              cx={px(t.x)}
              cy={py(t.y)}
              r={0.75}
              fill={t.balon_parado ? '#fde68a' : '#ffffff'}
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={0.2}
            />
          ),
        )}

      {/* Posición media ponderada del jugador */}
      {avgPosition && (
        <g>
          <circle cx={px(avgPosition.x)} cy={py(avgPosition.y)} r={3.2} fill="rgba(219,0,48,0.3)" />
          <circle cx={px(avgPosition.x)} cy={py(avgPosition.y)} r={2.2} fill="#ffffff" stroke="#111827" strokeWidth={0.5} />
          <circle cx={px(avgPosition.x)} cy={py(avgPosition.y)} r={1.1} fill="#db0030" />
        </g>
      )}

      {/* Indicador de sentido de ataque */}
      <g opacity={0.85}>
        <path d={`M ${PITCH_W - 14} ${PITCH_H - 3.2} L ${PITCH_W - 4.5} ${PITCH_H - 3.2}`} stroke="#ffffff" strokeWidth={0.6} />
        <path
          d={`M ${PITCH_W - 7} ${PITCH_H - 4.8} L ${PITCH_W - 4.5} ${PITCH_H - 3.2} L ${PITCH_W - 7} ${PITCH_H - 1.6}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth={0.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default PitchHeatmap;
