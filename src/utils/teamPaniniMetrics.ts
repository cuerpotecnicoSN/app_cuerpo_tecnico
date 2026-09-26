import type { PaniniSpatialCategory } from '../types/paniniReport';
import type { SeasonPaniniEntry } from '../services/paniniReports';

export type Better = 'high' | 'low' | 'neutral';

export interface MetricDef {
  key: string;
  label: string;
  unit?: '%' | 'm' | "'";
  decimals?: number;
  better: Better;
  get: (e: SeasonPaniniEntry) => number | null;
}

export interface MetricBlock {
  key: string;
  label: string;
  metrics: MetricDef[];
}

// --- Parsers de los formatos que devuelve el extractor Panini ---

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** "10/23" → aciertos (10) o total (23) */
const frac = (v: unknown, part: 'ok' | 'total'): number | null => {
  if (typeof v === 'number') return part === 'ok' ? v : null;
  if (typeof v !== 'string' || !v.includes('/')) return num(v);
  const [ok, total] = v.split('/').map((x) => num(x.trim()));
  return part === 'ok' ? ok : total;
};

/** "10/23" → 43.5 (%) */
const fracPct = (v: unknown): number | null => {
  const ok = frac(v, 'ok');
  const total = frac(v, 'total');
  if (ok === null || !total) return null;
  return (ok / total) * 100;
};

/** "22':25\"" → 22.42 minutos */
export const minutes = (v: unknown): number | null => {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  const m = v.match(/(\d+)\s*'\s*:?\s*(\d+)?/);
  if (!m) return null;
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 60 : 0);
};

const tot = (e: SeasonPaniniEntry) => e.our.estadisticas?.total_partido;
const rivTot = (e: SeasonPaniniEntry) => e.rival.estadisticas?.total_partido;
const avg2 = (a: unknown, b: unknown) => {
  const x = num(a);
  const y = num(b);
  if (x === null) return y;
  if (y === null) return x;
  return (x + y) / 2;
};

export const METRIC_BLOCKS: MetricBlock[] = [
  {
    key: 'result',
    label: 'Resultado',
    metrics: [
      { key: 'gf', label: 'Goles a favor', better: 'high', get: (e) => num(e.our.goles) },
      { key: 'gc', label: 'Goles en contra', better: 'low', get: (e) => num(e.rival.goles) },
      { key: 'xgf', label: 'xG a favor', decimals: 2, better: 'high', get: (e) => num(e.our.xg) },
      { key: 'xgc', label: 'xG en contra', decimals: 2, better: 'low', get: (e) => num(e.rival.xg) },
      { key: 'ims', label: 'Índice IMS', better: 'high', get: (e) => num(e.our.ims) },
    ],
  },
  {
    key: 'possession',
    label: 'Posesión y construcción',
    metrics: [
      { key: 'pos', label: 'Posesión', unit: '%', better: 'high', get: (e) => num(tot(e)?.posesion_pct) },
      { key: 'pos_time', label: 'Tiempo de posesión', unit: "'", decimals: 1, better: 'high', get: (e) => minutes(tot(e)?.posesion_tiempo) },
      { key: 'balls', label: 'Balones jugados', better: 'high', get: (e) => num(tot(e)?.balones_jugados_total) },
      { key: 'passes', label: 'Pases acertados', better: 'high', get: (e) => num(tot(e)?.pases_acertados_total) },
      { key: 'pass_acc', label: 'Precisión de pase', unit: '%', decimals: 1, better: 'high', get: (e) => num(tot(e)?.precision_pases_pct) },
      { key: 'useful', label: 'Acciones útiles', better: 'high', get: (e) => num(tot(e)?.acciones_utiles_total) },
      { key: 'build', label: 'Elaboración desde atrás', unit: '%', decimals: 1, better: 'neutral', get: (e) => num(tot(e)?.elaboracion_desde_atras_pct) },
      { key: 'long_jump', label: 'Salto de línea en largo', unit: '%', decimals: 1, better: 'neutral', get: (e) => num(tot(e)?.salto_linea_largo_pct) },
      { key: 'long_ok', label: 'Pases largos útiles', better: 'high', get: (e) => frac(tot(e)?.pases_largos_utiles, 'ok') },
      { key: 'ground_opp', label: 'Pases rasos en campo rival', better: 'high', get: (e) => frac(tot(e)?.pases_rasos_campo_rival, 'ok') },
      { key: 'switches', label: 'Cambios de orientación', better: 'high', get: (e) => num(tot(e)?.cambios_orientacion) },
    ],
  },
  {
    key: 'territory',
    label: 'Territorio',
    metrics: [
      { key: 'barycenter', label: 'Baricentro (altura media)', unit: 'm', decimals: 1, better: 'high', get: (e) => num(tot(e)?.baricentro_altura_m) },
      { key: 'supremacy', label: 'Supremacía territorial', unit: '%', better: 'high', get: (e) => num(tot(e)?.supremacia_territorial_pct) },
      { key: 'box_balls', label: 'Balones en área rival', better: 'high', get: (e) => num(tot(e)?.balones_en_area_rival) },
      { key: 'goal_attack', label: 'Ataque a portería', unit: '%', decimals: 1, better: 'high', get: (e) => num(tot(e)?.ataque_porteria_pct) },
    ],
  },
  {
    key: 'defense',
    label: 'Defensa y presión',
    metrics: [
      { key: 'press_h', label: 'Altura de pressing', unit: 'm', decimals: 1, better: 'high', get: (e) => num(tot(e)?.altura_pressing_m) },
      { key: 'rec_eff', label: 'Recuperaciones efectivas', unit: '%', decimals: 1, better: 'high', get: (e) => num(tot(e)?.recuperaciones_efectivas_pct) },
      { key: 'rec_end', label: 'Recuperación fin acción rival', unit: '%', decimals: 1, better: 'high', get: (e) => num(tot(e)?.recuperacion_fin_accion_rival_pct) },
      { key: 'rec_temp', label: 'Recuperaciones temporales', unit: '%', decimals: 1, better: 'low', get: (e) => num(tot(e)?.recuperaciones_temporales_pct) },
      { key: 'box_prot', label: 'Protección de área', unit: '%', decimals: 1, better: 'high', get: (e) => num(tot(e)?.proteccion_area_pct) },
      { key: 'own_box', label: 'Balones rivales en nuestra área', better: 'low', get: (e) => num(tot(e)?.balones_area_propia_rival) },
      { key: 'fouls_box', label: 'Faltas cerca de área propia', better: 'low', get: (e) => frac(tot(e)?.faltas_cerca_area_propia, 'ok') },
      { key: 'offsides', label: 'Fueras de juego provocados', better: 'high', get: (e) => num(tot(e)?.fueras_juego_provocados) },
      { key: 'gk_saves', label: 'Paradas del portero', better: 'neutral', get: (e) => num(tot(e)?.paradas_portero) },
    ],
  },
  {
    key: 'attack',
    label: 'Ataque y finalización',
    metrics: [
      { key: 'shots', label: 'Tiros totales', better: 'high', get: (e) => num(e.our.finalizacion?.tiros_totales) ?? frac(tot(e)?.tiros_a_puerta, 'total') },
      { key: 'shots_on', label: 'Tiros a puerta', better: 'high', get: (e) => num(e.our.finalizacion?.tiros_a_puerta) ?? frac(tot(e)?.tiros_a_puerta, 'ok') },
      { key: 'chances', label: 'Ocasiones de gol', better: 'high', get: (e) => num(tot(e)?.ocasiones_gol) ?? num(e.our.finalizacion?.ocasiones) },
      { key: 'conv', label: 'Conversión (goles / tiros)', unit: '%', decimals: 1, better: 'high', get: (e) => {
        const g = num(e.our.goles);
        const s = num(e.our.finalizacion?.tiros_totales);
        return g !== null && s ? (g / s) * 100 : null;
      } },
      { key: 'crosses', label: 'Centros desde el fondo útiles', better: 'high', get: (e) => frac(tot(e)?.centros_desde_fondo, 'ok') },
      { key: 'dribbles', label: 'Regates útiles', better: 'high', get: (e) => frac(tot(e)?.regates_utiles, 'ok') },
      { key: 'dribbles_pct', label: 'Éxito en regate', unit: '%', decimals: 1, better: 'high', get: (e) => fracPct(tot(e)?.regates_utiles) },
      { key: 'accel', label: 'Aceleraciones', better: 'high', get: (e) => num(tot(e)?.aceleraciones) },
      { key: 'abp', label: 'Eficacia ABP ofensivo', unit: '%', decimals: 1, better: 'high', get: (e) => num(tot(e)?.eficacia_abp_ofensivo_pct) },
    ],
  },
  {
    key: 'rival',
    label: 'Rival (concedido)',
    metrics: [
      { key: 'r_shots', label: 'Tiros concedidos', better: 'low', get: (e) => num(e.rival.finalizacion?.tiros_totales) ?? frac(rivTot(e)?.tiros_a_puerta, 'total') },
      { key: 'r_shots_on', label: 'Tiros a puerta concedidos', better: 'low', get: (e) => num(e.rival.finalizacion?.tiros_a_puerta) ?? frac(rivTot(e)?.tiros_a_puerta, 'ok') },
      { key: 'r_chances', label: 'Ocasiones concedidas', better: 'low', get: (e) => num(rivTot(e)?.ocasiones_gol) ?? num(e.rival.finalizacion?.ocasiones) },
      { key: 'r_pass_acc', label: 'Precisión de pase rival', unit: '%', decimals: 1, better: 'low', get: (e) => num(rivTot(e)?.precision_pases_pct) },
      { key: 'r_supremacy', label: 'Supremacía territorial rival', unit: '%', better: 'low', get: (e) => num(rivTot(e)?.supremacia_territorial_pct) },
    ],
  },
  {
    key: 'block',
    label: 'Bloque táctico (media 1T/2T)',
    metrics: [
      { key: 'length', label: 'Longitud del bloque', unit: 'm', decimals: 1, better: 'low', get: (e) => avg2(e.our.bloque_tactico_1t?.longitud_m, e.our.bloque_tactico_2t?.longitud_m) },
      { key: 'width', label: 'Anchura del bloque', unit: 'm', decimals: 1, better: 'low', get: (e) => avg2(e.our.bloque_tactico_1t?.anchura_m, e.our.bloque_tactico_2t?.anchura_m) },
      { key: 'dens_att', label: 'Densidad en ataque', unit: '%', decimals: 1, better: 'high', get: (e) => avg2(e.our.bloque_tactico_1t?.densidad_ataque_pct, e.our.bloque_tactico_2t?.densidad_ataque_pct) },
      { key: 'dens_def', label: 'Densidad en defensa', unit: '%', decimals: 1, better: 'neutral', get: (e) => avg2(e.our.bloque_tactico_1t?.densidad_defensa_pct, e.our.bloque_tactico_2t?.densidad_defensa_pct) },
    ],
  },
];

export const ALL_METRICS: MetricDef[] = METRIC_BLOCKS.flatMap((b) => b.metrics);
export const metricByKey = (key: string) => ALL_METRICS.find((m) => m.key === key);

// --- Estadística ---

export interface Summary {
  mean: number | null;
  std: number;
  min: number | null;
  max: number | null;
}

export const mean = (values: (number | null)[]): number | null => {
  const v = values.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export const summarize = (values: (number | null)[]): Summary => {
  const v = values.filter((x): x is number => x !== null);
  const m = mean(v);
  if (m === null) return { mean: null, std: 0, min: null, max: null };
  const std = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
  return { mean: m, std, min: Math.min(...v), max: Math.max(...v) };
};

/**
 * Color de celda: verde si mejora la media, rojo si empeora.
 * La intensidad crece con la distancia a la media (en desviaciones típicas).
 */
export const deviationColor = (value: number | null, s: Summary, better: Better): string | undefined => {
  if (value === null || s.mean === null || better === 'neutral') return undefined;
  const spread = s.std || Math.abs(s.mean) * 0.1;
  if (!spread) return undefined;
  let z = (value - s.mean) / spread;
  if (better === 'low') z = -z;
  if (Math.abs(z) < 0.1) return undefined;
  const alpha = 0.1 + Math.min(Math.abs(z) / 2, 1) * 0.5;
  return z > 0 ? `rgba(16, 185, 129, ${alpha.toFixed(2)})` : `rgba(219, 0, 48, ${alpha.toFixed(2)})`;
};

export const formatValue = (value: number | null, def: MetricDef): string => {
  if (value === null) return '–';
  const d = def.decimals ?? (Number.isInteger(value) ? 0 : 1);
  return `${value.toFixed(d)}${def.unit === 'm' ? ' m' : def.unit ?? ''}`;
};

// --- Jornadas y tramos ---

/** true si el partido es de liga ("Liga - Serie D - Grupo B - Jornada 3") y no de copa u otra competición */
export const isLeagueMatch = (e: SeasonPaniniEntry): boolean => {
  const competition = e.match.competition?.trim();
  return !competition || /^liga\b|jornada/i.test(competition);
};

/** Siglas de una competición: "Premier League International Cup" → "PLIC" */
const competitionAcronym = (competition: string) =>
  competition
    .split(/[\s-]+/)
    .filter((w) => /^[A-ZÀ-Ú]/.test(w))
    .map((w) => w[0])
    .join('')
    .slice(0, 5);

/** Etiqueta de columna: jornada de liga (J3) o siglas de la competición (PLIC) */
export const matchdayLabel = (e: SeasonPaniniEntry, index: number): string => {
  if (!isLeagueMatch(e)) return competitionAcronym(e.match.competition!) || `P${index + 1}`;
  const n = e.match.competition?.match(/jornada\s*(\d+)/i)?.[1] ?? e.report.jornada?.match(/\d+/)?.[0];
  return n ? `J${parseInt(n, 10)}` : `P${index + 1}`;
};

export const opponentLogo = (e: SeasonPaniniEntry): string | undefined =>
  (e.isHome ? e.match.away_logo : e.match.home_logo) || undefined;

export const TRAMO_SIZE = 3;

export const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/** Media móvil de los últimos `size` partidos disponibles */
export const rollingMean = (values: (number | null)[], size = TRAMO_SIZE): (number | null)[] =>
  values.map((_, i) => mean(values.slice(Math.max(0, i - size + 1), i + 1)));

// --- Cobertura territorial acumulada ---

export type CoverageKey =
  | 'cobertura_recuperaciones'
  | 'cobertura_acciones_utiles'
  | 'cobertura_pases_largos'
  | 'cobertura_regates'
  | 'cobertura_centros'
  | 'cobertura_faltas'
  | 'bloque';

/**
 * Matriz 3x3 [carril][tercio] con el % medio de acciones en cada zona.
 * Panini da la distribución por tercios (X) y por carriles (Y) por separado,
 * así que cada zona se estima como producto de ambas distribuciones.
 */
export const accumulatedGrid = (entries: SeasonPaniniEntry[], key: CoverageKey, side: 'our' | 'rival'): number[][] => {
  const grids = entries
    .map((e) => {
      const team = e[side];
      let c: PaniniSpatialCategory | undefined;
      if (key === 'bloque') {
        const b1 = team.bloque_tactico_1t;
        const b2 = team.bloque_tactico_2t;
        if (!b1 && !b2) return null;
        c = {
          defensa_pct: avg2(b1?.densidad_defensa_pct, b2?.densidad_defensa_pct) ?? 0,
          medio_pct: avg2(b1?.densidad_medio_pct, b2?.densidad_medio_pct) ?? 0,
          ataque_pct: avg2(b1?.densidad_ataque_pct, b2?.densidad_ataque_pct) ?? 0,
          izquierda_pct: avg2(b1?.carril_izquierdo_pct, b2?.carril_izquierdo_pct) ?? 0,
          centro_pct: avg2(b1?.carril_central_pct, b2?.carril_central_pct) ?? 0,
          derecha_pct: avg2(b1?.carril_derecho_pct, b2?.carril_derecho_pct) ?? 0,
        };
      } else {
        c = team[key];
      }
      if (!c) return null;
      const xs = [num(c.defensa_pct) ?? 0, num(c.medio_pct) ?? 0, num(c.ataque_pct) ?? 0];
      const ys = [num(c.izquierda_pct) ?? 0, num(c.centro_pct) ?? 0, num(c.derecha_pct) ?? 0];
      const xSum = xs.reduce((a, b) => a + b, 0);
      const ySum = ys.reduce((a, b) => a + b, 0);
      if (!xSum || !ySum) return null;
      return ys.map((y) => xs.map((x) => (x / xSum) * (y / ySum) * 100));
    })
    .filter((g): g is number[][] => g !== null);

  if (!grids.length) return [];
  return [0, 1, 2].map((r) => [0, 1, 2].map((c) => grids.reduce((a, g) => a + g[r][c], 0) / grids.length));
};
