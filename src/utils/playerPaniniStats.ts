/**
 * Estadísticas individuales a partir de los informes Panini de la temporada.
 *
 * Cada informe aporta una "línea" por jugador de nuestro equipo que jugó:
 * alineación (minutos, titular, tarjetas), goles, ficha individual del PDF
 * (páginas de zoom), red de pases y toques posicionados. Sobre esas líneas se
 * definen las métricas, sus totales, valores por 90' y rankings.
 */
import type { SeasonPaniniEntry } from '../services/paniniReports';
import type { PaniniMapEvent, PaniniPlayerLineup, PaniniPlayerStats } from '../types/paniniReport';
import { isLeagueMatch, matchdayLabel, minutes as parseMinutes } from './teamPaniniMetrics';

export type Role = 'P' | 'D' | 'C' | 'A';

export interface PlayerMatchLine {
  /** Identificador estable del jugador: id de BD o, si no está vinculado, su nombre */
  key: string;
  playerId?: string;
  name: string;
  dorsal: number;
  role: Role;
  entry: SeasonPaniniEntry;
  /** Índice del partido en la lista de la temporada (para etiquetas J1, J2…) */
  matchIndex: number;
  minutes: number;
  starter: boolean;
  subIn?: number;
  subOut?: number;
  yellow: number;
  red: number;
  goals: number;
  stats?: PaniniPlayerStats;
  passesGiven: number | null;
  passesReceived: number | null;
  passAccuracy: number | null;
  /** Pases a cada compañero (dorsal → nº) en este partido */
  passesTo: Record<number, number>;
  passesFrom: Record<number, number>;
  touches: PaniniMapEvent[];
  avgPosition?: { x: number; y: number };
}

// --- Parsers ---

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** "5/13" → 5 (ok) o 13 (total) */
const frac = (v: unknown, part: 'ok' | 'total'): number | null => {
  if (typeof v === 'number') return part === 'ok' ? v : null;
  if (typeof v !== 'string' || !v.includes('/')) return null;
  const [ok, total] = v.split('/').map((x) => num(x.trim()));
  return part === 'ok' ? ok : total;
};

export const normalize = (s?: string | null) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ROLE_FROM_TEXT: Record<string, Role> = { portero: 'P', defensa: 'D', centrocampista: 'C', delantero: 'A' };
const roleOf = (lineup?: PaniniPlayerLineup, stats?: PaniniPlayerStats): Role =>
  (lineup?.posicion as Role) || ROLE_FROM_TEXT[normalize(stats?.posicion)] || 'C';

/** "71' (45+26)" → 71 */
const statsMinutes = (s?: PaniniPlayerStats) => num(s?.minutos?.match(/\d+/)?.[0]);

// --- Construcción de líneas ---

export function buildPlayerLines(entries: SeasonPaniniEntry[]): PlayerMatchLine[] {
  const lines: PlayerMatchLine[] = [];

  entries.forEach((entry, matchIndex) => {
    const { our, isHome } = entry;
    const side = isHome ? 'home' : 'away';
    const statsByDorsal = new Map((our.jugadores_stats ?? []).map((s) => [s.dorsal, s]));
    const lineupByDorsal = new Map((our.alineacion ?? []).map((p) => [p.dorsal, p]));
    const mp = our.matriz_pases;
    const node = (d: number) => mp?.jugadores?.find((j) => j.dorsal === d);
    const ourGoals = (entry.report.goleadores ?? []).filter((g) => g.equipo === side);

    const dorsales = new Set([...lineupByDorsal.keys(), ...statsByDorsal.keys()]);
    for (const dorsal of dorsales) {
      const lu = lineupByDorsal.get(dorsal);
      const st = statsByDorsal.get(dorsal);
      const mins = lu?.minutos_jugados ?? statsMinutes(st) ?? 0;
      if (!mins && !st) continue;

      const name = lu?.nombre ?? st?.nombre ?? `#${dorsal}`;
      const playerId = lu?.player_id ?? st?.player_id;
      const n = normalize(name);
      const goals = ourGoals.filter((g) => {
        const scorer = normalize(g.jugador);
        return !!scorer && (n.startsWith(scorer) || n.split(' ').includes(scorer));
      }).length;

      const row = mp?.matriz?.[dorsal] ?? {};
      const passesTo: Record<number, number> = {};
      for (const [d, v] of Object.entries(row)) if (Number(v) > 0) passesTo[Number(d)] = Number(v);
      const passesFrom: Record<number, number> = {};
      for (const [from, targets] of Object.entries(mp?.matriz ?? {})) {
        const v = Number((targets as Record<number, number>)[dorsal] ?? 0);
        if (v > 0) passesFrom[Number(from)] = v;
      }

      const nd = node(dorsal);
      const x = st?.posicion_media_x ?? lu?.x ?? nd?.x;
      const y = st?.posicion_media_y ?? lu?.y ?? nd?.y;

      lines.push({
        key: playerId ?? `n:${normalize(st?.nombre ?? name)}`,
        playerId,
        name,
        dorsal,
        role: roleOf(lu, st),
        entry,
        matchIndex,
        minutes: mins,
        starter: lu?.es_titular ?? false,
        subIn: lu?.minuto_entrada,
        subOut: lu?.minuto_salida,
        yellow: lu?.tarjetas_amarillas?.length ?? 0,
        red: lu?.tarjetas_rojas?.length ?? 0,
        goals,
        stats: st,
        passesGiven: num(mp?.totales_dados?.[dorsal]) ?? num(nd?.pases_dados),
        passesReceived: num(mp?.totales_recibidos?.[dorsal]) ?? num(nd?.pases_recibidos),
        passAccuracy: num(mp?.precision_individual_pct?.[dorsal]) ?? num(nd?.precision_pct),
        passesTo,
        passesFrom,
        touches: [...(st?.toques_1t ?? []), ...(st?.toques_2t ?? [])],
        avgPosition: x !== undefined && y !== undefined ? { x, y } : undefined,
      });
    }
  });

  return lines;
}

export type CompetitionFilter = 'all' | 'league' | 'cup';
export const filterByCompetition = (lines: PlayerMatchLine[], f: CompetitionFilter) =>
  f === 'all' ? lines : lines.filter((l) => isLeagueMatch(l.entry) === (f === 'league'));

export const lineLabel = (l: PlayerMatchLine) => matchdayLabel(l.entry, l.matchIndex);

// --- Métricas ---

export type MetricGroup = 'participation' | 'passing' | 'defense' | 'attack' | 'finishing' | 'discipline' | 'goalkeeper';

export const METRIC_GROUPS: MetricGroup[] = ['participation', 'passing', 'defense', 'attack', 'finishing', 'discipline', 'goalkeeper'];

interface BaseMetric {
  key: string;
  group: MetricGroup;
  better: 'high' | 'low';
  /** Solo tiene sentido para porteros */
  gk?: boolean;
  decimals?: number;
}
/** Recuento: se suma y admite valor por 90' */
export interface CountMetric extends BaseMetric {
  kind: 'count';
  per90: boolean;
  unit?: "'";
  get: (l: PlayerMatchLine) => number | null;
}
/** Porcentaje de acierto: se agrega como Σ aciertos / Σ intentos */
export interface RatioMetric extends BaseMetric {
  kind: 'ratio';
  ok: (l: PlayerMatchLine) => number | null;
  total: (l: PlayerMatchLine) => number | null;
}
export type PlayerMetric = CountMetric | RatioMetric;

const s = (l: PlayerMatchLine) => l.stats;
const count = (key: string, group: MetricGroup, get: CountMetric['get'], opts: Partial<CountMetric> = {}): CountMetric => ({
  key,
  group,
  kind: 'count',
  per90: true,
  better: 'high',
  get,
  ...opts,
});
const ratio = (key: string, group: MetricGroup, field: keyof PaniniPlayerStats, opts: Partial<RatioMetric> = {}): RatioMetric => ({
  key,
  group,
  kind: 'ratio',
  better: 'high',
  decimals: 0,
  ok: (l) => frac(s(l)?.[field], 'ok'),
  total: (l) => frac(s(l)?.[field], 'total'),
  ...opts,
});

export const PLAYER_METRICS: PlayerMetric[] = [
  // Participación
  count('matches', 'participation', (l) => (l.minutes > 0 ? 1 : 0), { per90: false }),
  count('starts', 'participation', (l) => (l.starter ? 1 : 0), { per90: false }),
  count('minutes', 'participation', (l) => l.minutes, { per90: false, unit: "'" }),
  count('balls', 'participation', (l) => num(s(l)?.balones_jugados)),
  count('possession', 'participation', (l) => parseMinutes(s(l)?.posesion_tiempo), { unit: "'", decimals: 1 }),
  count('useful', 'participation', (l) => num(s(l)?.acciones_utiles)),
  count('losses', 'participation', (l) => num(s(l)?.perdidas_efectivas), { better: 'low' }),
  // Pase
  count('passes_ok', 'passing', (l) => num(s(l)?.pases_acertados)),
  count('passes_given', 'passing', (l) => l.passesGiven),
  count('passes_received', 'passing', (l) => l.passesReceived),
  {
    key: 'pass_acc',
    group: 'passing',
    kind: 'ratio',
    better: 'high',
    decimals: 0,
    ok: (l) => (l.passAccuracy !== null && l.passesGiven ? (l.passAccuracy * l.passesGiven) / 100 : null),
    total: (l) => (l.passAccuracy !== null ? l.passesGiven : null),
  },
  count('long_ok', 'passing', (l) => frac(s(l)?.pases_largos_utiles, 'ok')),
  ratio('long_pct', 'passing', 'pases_largos_utiles'),
  count('key_passes', 'passing', (l) => frac(s(l)?.asistencias_pases_clave, 'total')),
  count('assists', 'passing', (l) => frac(s(l)?.asistencias_pases_clave, 'ok')),
  // Defensa
  count('recoveries', 'defense', (l) => frac(s(l)?.recuperaciones_efectivas, 'ok')),
  ratio('recoveries_pct', 'defense', 'recuperaciones_efectivas'),
  count('rec_attack', 'defense', (l) => num(s(l)?.recuperaciones_ataque)),
  count('rec_box', 'defense', (l) => num(s(l)?.recuperaciones_area)),
  count('rec_air', 'defense', (l) => num(s(l)?.recuperaciones_aereas)),
  count('interceptions', 'defense', (l) => num(s(l)?.intercepciones)),
  count('anticipations', 'defense', (l) => frac(s(l)?.anticipaciones_efectivas, 'ok')),
  ratio('anticipations_pct', 'defense', 'anticipaciones_efectivas'),
  count('tackles', 'defense', (l) => frac(s(l)?.duelos_efectivos, 'ok')),
  ratio('tackles_pct', 'defense', 'duelos_efectivos'),
  // Ataque
  count('dribbles', 'attack', (l) => frac(s(l)?.regates_utiles, 'ok')),
  ratio('dribbles_pct', 'attack', 'regates_utiles'),
  count('crosses', 'attack', (l) => frac(s(l)?.centros_utiles, 'ok')),
  ratio('crosses_pct', 'attack', 'centros_utiles'),
  count('box_balls', 'attack', (l) => num(s(l)?.balones_jugados_en_area)),
  count('layoffs', 'attack', (l) => frac(s(l)?.descargas_primer_toque, 'ok')),
  count('fouls_won', 'attack', (l) => num(s(l)?.faltas_recibidas)),
  // Finalización
  count('goals', 'finishing', (l) => l.goals),
  count('shots', 'finishing', (l) => frac(s(l)?.tiros_a_puerta, 'total')),
  count('shots_on', 'finishing', (l) => frac(s(l)?.tiros_a_puerta, 'ok')),
  ratio('shots_on_pct', 'finishing', 'tiros_a_puerta'),
  count('shots_right', 'finishing', (l) => frac(s(l)?.tiros_derecha, 'total')),
  count('shots_left', 'finishing', (l) => frac(s(l)?.tiros_izquierda, 'total')),
  count('shots_head', 'finishing', (l) => frac(s(l)?.tiros_cabeza, 'total')),
  count('headers_off', 'finishing', (l) => num(s(l)?.cabezazos_ofensivos)),
  // Disciplina
  count('fouls', 'discipline', (l) => num(s(l)?.faltas_cometidas), { better: 'low' }),
  count('yellow', 'discipline', (l) => l.yellow, { better: 'low', per90: false }),
  count('red', 'discipline', (l) => l.red, { better: 'low', per90: false }),
  // Portero
  count('saves', 'goalkeeper', (l) => num(s(l)?.paradas), { gk: true }),
  count('saves_chance', 'goalkeeper', (l) => num(s(l)?.paradas_ocasion), { gk: true }),
  count('conceded', 'goalkeeper', (l) => num(s(l)?.goles_encajados), { gk: true, better: 'low' }),
  count('shots_faced', 'goalkeeper', (l) => frac(s(l)?.tiros_a_puerta_recibidos, 'total'), { gk: true, better: 'low' }),
  count('shots_on_faced', 'goalkeeper', (l) => frac(s(l)?.tiros_a_puerta_recibidos, 'ok'), { gk: true, better: 'low' }),
  count('high_claims', 'goalkeeper', (l) => num(s(l)?.salidas_altas), { gk: true }),
  count('low_exits', 'goalkeeper', (l) => num(s(l)?.salidas_bajas), { gk: true }),
  count('cross_claims', 'goalkeeper', (l) => num(s(l)?.salidas_centro_jugada), { gk: true }),
  count('setpiece_claims', 'goalkeeper', (l) => num(s(l)?.salidas_balon_parado), { gk: true }),
  count('long_kicks', 'goalkeeper', (l) => frac(s(l)?.saques_largos_utiles, 'ok'), { gk: true }),
  ratio('long_kicks_pct', 'goalkeeper', 'saques_largos_utiles', { gk: true }),
];

export const metricDef = (key: string) => PLAYER_METRICS.find((m) => m.key === key);

/** Métricas que se muestran en rankings y comparativas (sin recuentos de presencia) */
export const RANKABLE = PLAYER_METRICS.filter((m) => !['matches', 'starts'].includes(m.key));

/** Valor de una métrica en un partido */
export const lineValue = (m: PlayerMetric, l: PlayerMatchLine): number | null => {
  if (m.kind === 'count') return m.get(l);
  const ok = m.ok(l);
  const total = m.total(l);
  return ok !== null && total ? (ok / total) * 100 : null;
};

// --- Agregación por jugador ---

export interface PlayerAggregate {
  key: string;
  playerId?: string;
  name: string;
  dorsal: number;
  role: Role;
  lines: PlayerMatchLine[];
  minutes: number;
  matches: number;
  /** Total de temporada (o % de acierto en las métricas de ratio) */
  total: Record<string, number | null>;
  per90: Record<string, number | null>;
  /** Intentos que sostienen cada % (para mostrar "12/30") */
  attempts: Record<string, { ok: number; total: number }>;
}

const mode = <T,>(values: T[]): T => {
  const counts = new Map<T, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

export function aggregatePlayer(lines: PlayerMatchLine[]): PlayerAggregate {
  const minutes = lines.reduce((a, l) => a + l.minutes, 0);
  const total: Record<string, number | null> = {};
  const per90: Record<string, number | null> = {};
  const attempts: Record<string, { ok: number; total: number }> = {};

  for (const m of PLAYER_METRICS) {
    if (m.kind === 'count') {
      const vals = lines.map(m.get).filter((v): v is number => v !== null);
      const sum = vals.length ? vals.reduce((a, b) => a + b, 0) : null;
      total[m.key] = sum;
      per90[m.key] = m.per90 && sum !== null && minutes > 0 ? (sum / minutes) * 90 : null;
    } else {
      let ok = 0;
      let tot = 0;
      for (const l of lines) {
        const o = m.ok(l);
        const t = m.total(l);
        if (o === null || t === null) continue;
        ok += o;
        tot += t;
      }
      total[m.key] = tot ? (ok / tot) * 100 : null;
      per90[m.key] = total[m.key];
      attempts[m.key] = { ok, total: tot };
    }
  }

  // El nombre de la ficha individual suele venir como "Nombre Apellido"; el de la alineación como "Apellido Nombre"
  const last = lines[lines.length - 1];
  return {
    key: last.key,
    playerId: last.playerId,
    name: last.stats?.nombre ?? last.name,
    dorsal: mode(lines.map((l) => l.dorsal)),
    role: mode(lines.map((l) => l.role)),
    lines,
    minutes,
    matches: lines.filter((l) => l.minutes > 0).length,
    total,
    per90,
    attempts,
  };
}

export function aggregatePlayers(lines: PlayerMatchLine[]): PlayerAggregate[] {
  const byKey = new Map<string, PlayerMatchLine[]>();
  for (const l of lines) {
    const list = byKey.get(l.key);
    if (list) list.push(l);
    else byKey.set(l.key, [l]);
  }
  return [...byKey.values()].map(aggregatePlayer).sort((a, b) => b.minutes - a.minutes);
}

export type ValueMode = 'total' | 'per90';

/** Valor mostrado según el modo (los % no cambian) */
export const aggValue = (a: PlayerAggregate, m: PlayerMetric, vm: ValueMode) =>
  vm === 'per90' && m.kind === 'count' && m.per90 ? a.per90[m.key] : a.total[m.key];

export interface RankingRow {
  player: PlayerAggregate;
  value: number;
  rank: number;
}

/**
 * Ranking de una métrica. Por 90' y en % se exige un mínimo de minutos (y de
 * intentos en los %) para que un jugador con pocos minutos no lo distorsione.
 */
export function rankPlayers(players: PlayerAggregate[], m: PlayerMetric, vm: ValueMode, minMinutes: number): RankingRow[] {
  const needsSample = m.kind === 'ratio' || (vm === 'per90' && m.kind === 'count' && m.per90);
  const rows = players
    .filter((p) => (m.gk ? p.role === 'P' : true))
    .filter((p) => !needsSample || p.minutes >= minMinutes)
    .filter((p) => m.kind !== 'ratio' || (p.attempts[m.key]?.total ?? 0) >= 3)
    .map((p) => ({ player: p, value: aggValue(p, m, vm) }))
    .filter((r): r is { player: PlayerAggregate; value: number } => r.value !== null);
  rows.sort((a, b) => (m.better === 'high' ? b.value - a.value : a.value - b.value) || b.player.minutes - a.player.minutes);
  let rank = 0;
  let prev: number | null = null;
  return rows.map((r, i) => {
    if (prev === null || Math.abs(r.value - prev) > 1e-9) rank = i + 1;
    prev = r.value;
    return { ...r, rank };
  });
}

export const formatMetric = (v: number | null | undefined, m: PlayerMetric, vm: ValueMode = 'total') => {
  if (v === null || v === undefined) return '–';
  if (m.kind === 'ratio') return `${v.toFixed(m.decimals ?? 0)}%`;
  const per90 = vm === 'per90' && m.per90;
  const d = per90 ? 2 : m.decimals ?? (Number.isInteger(v) ? 0 : 1);
  return `${v.toFixed(d)}${m.unit ?? ''}`;
};

// --- Mapas de calor ---

export const HEAT_COLS = 30;
export const HEAT_ROWS = 20;

/**
 * Densidad de toques suavizada (kernel gaussiano) en una rejilla
 * HEAT_ROWS × HEAT_COLS, normalizada a 0-1. Coordenadas de ataque (→).
 */
export function touchDensity(touches: { x: number; y: number }[], sigma = 1.5): number[][] {
  const grid = Array.from({ length: HEAT_ROWS }, () => new Array<number>(HEAT_COLS).fill(0));
  const reach = Math.ceil(sigma * 3);
  for (const t of touches) {
    const cx = (t.x / 100) * HEAT_COLS - 0.5;
    const cy = (t.y / 100) * HEAT_ROWS - 0.5;
    for (let r = Math.max(0, Math.floor(cy - reach)); r <= Math.min(HEAT_ROWS - 1, Math.ceil(cy + reach)); r++) {
      for (let c = Math.max(0, Math.floor(cx - reach)); c <= Math.min(HEAT_COLS - 1, Math.ceil(cx + reach)); c++) {
        grid[r][c] += Math.exp(-((c - cx) ** 2 + (r - cy) ** 2) / (2 * sigma * sigma));
      }
    }
  }
  const max = Math.max(...grid.flat());
  return max > 0 ? grid.map((row) => row.map((v) => v / max)) : grid;
}

/** % de toques por tercio (defensa/medio/ataque) y carril (izq/centro/dcha) */
export function touchZones(touches: { x: number; y: number }[]) {
  const n = touches.length || 1;
  const third = (lo: number, hi: number) => (touches.filter((t) => t.x >= lo && t.x < hi).length / n) * 100;
  const lane = (lo: number, hi: number) => (touches.filter((t) => t.y >= lo && t.y < hi).length / n) * 100;
  return {
    thirds: [third(0, 100 / 3), third(100 / 3, 200 / 3), third(200 / 3, 101)],
    lanes: [lane(0, 100 / 3), lane(100 / 3, 200 / 3), lane(200 / 3, 101)],
  };
}

/** Posición media ponderada por minutos */
export function averagePosition(lines: PlayerMatchLine[]): { x: number; y: number } | null {
  const withPos = lines.filter((l) => l.avgPosition && l.minutes > 0);
  const w = withPos.reduce((a, l) => a + l.minutes, 0);
  if (!w) return null;
  return {
    x: withPos.reduce((a, l) => a + l.avgPosition!.x * l.minutes, 0) / w,
    y: withPos.reduce((a, l) => a + l.avgPosition!.y * l.minutes, 0) / w,
  };
}

/** Compañeros con los que más se asocia (por nombre, sumando todos los partidos) */
export function passPartners(lines: PlayerMatchLine[], dir: 'to' | 'from', limit = 6) {
  const totals = new Map<string, { name: string; passes: number }>();
  for (const l of lines) {
    const map = dir === 'to' ? l.passesTo : l.passesFrom;
    const lineup = l.entry.our.alineacion ?? [];
    for (const [d, v] of Object.entries(map)) {
      const mate = lineup.find((p) => p.dorsal === Number(d));
      const key = mate?.player_id ?? `#${d}:${mate?.nombre ?? d}`;
      const name = mate?.nombre ?? `#${d}`;
      const cur = totals.get(key) ?? { name, passes: 0 };
      cur.passes += v;
      totals.set(key, cur);
    }
  }
  return [...totals.values()].sort((a, b) => b.passes - a.passes).slice(0, limit);
}
