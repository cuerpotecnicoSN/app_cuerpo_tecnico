/**
 * Parser determinista de informes "Panini Digital Match Analysis" (PDF vectorial).
 *
 * Lee cada página a partir de sus figuras (círculos, cuadrados, celdas, flechas)
 * y de su texto posicionado, sin IA: las coordenadas y colores son los que el
 * propio PDF dibuja. Las páginas se identifican por sus títulos, no por número,
 * para tolerar informes con más o menos páginas de fichas de jugadores.
 *
 * Convención de salida: ver PaniniPitchPoint en types/paniniReport.ts.
 */
import type {
  PaniniDensityMap,
  PaniniEventMaps,
  PaniniFinishingStats,
  PaniniGoalMarker,
  PaniniMapEvent,
  PaniniMatchReport,
  PaniniPassNetwork,
  PaniniPassingMatrix,
  PaniniPeriodStats,
  PaniniPeriodo,
  PaniniPlayerLineup,
  PaniniPlayerStats,
  PaniniSetPieceEfficacy,
  PaniniShotMarker,
  PaniniSpatialCategory,
  PaniniTacticalBlock,
  PaniniTeamData,
  PaniniTimelineEvent,
} from '../../../types/paniniReport';
import {
  colorDistance,
  hexToRgb,
  insideRect,
  parseItNumber,
  rectCenter,
  rectHeight,
  rectInside,
  rectWidth,
  wordCenter,
  type PdfPageContent,
  type PdfShape,
  type PdfWord,
  type Rect,
} from './pdfPrimitives';

export const PANINI_PARSER_VERSION = 1;

// ---------------------------------------------------------------------------
// Colores de la plantilla Panini
// ---------------------------------------------------------------------------
const COLOR = {
  home: '#ee0000',
  homeLight: '#fbbfbf',
  away: '#000099',
  awayLight: '#bfbfe6',
  goalkeeper: '#aaaaaa',
  pitch: '#abdda4',
  /** Extremos del degradado de densidad (16 tonos): mínimo → máximo */
  densityMin: '#e2ffdf',
  densityMax: '#076000',
};

type Side = 'home' | 'away';

interface TeamColor {
  side: Side;
  light: boolean;
}

const teamColor = (hex: string | null): TeamColor | null => {
  if (!hex) return null;
  if (colorDistance(hex, COLOR.home) < 30) return { side: 'home', light: false };
  if (colorDistance(hex, COLOR.homeLight) < 30) return { side: 'home', light: true };
  if (colorDistance(hex, COLOR.away) < 30) return { side: 'away', light: false };
  if (colorDistance(hex, COLOR.awayLight) < 30) return { side: 'away', light: true };
  return null;
};

// ---------------------------------------------------------------------------
// Utilidades de texto
// ---------------------------------------------------------------------------
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Limpia ligaduras tipográficas del texto que se muestra al usuario */
const clean = (s: string) => s.replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/\s+/g, ' ').trim();

const hasWord = (page: PdfPageContent, text: string) => page.words.some((w) => norm(w.str).includes(norm(text)));
/** Título de sección: coincidencia exacta y en mayúsculas, como aparece en la plantilla */
const hasTitle = (page: PdfPageContent, title: string) => page.words.some((w) => w.str.trim() === title);
const findWord = (page: PdfPageContent, text: string, filter: (w: PdfWord) => boolean = () => true) =>
  page.words.find((w) => norm(w.str) === norm(text) && filter(w));

/** "3 7" (dígitos espaciados de las etiquetas de zona) → 37 */
const spacedNumber = (s: string) => parseItNumber(s.replace(/\s+/g, ''));

/** Agrupa palabras en filas por su línea base */
const rows = (words: PdfWord[], tolerance = 4) => {
  const sorted = [...words].sort((a, b) => a.y - b.y || a.x - b.x);
  const out: PdfWord[][] = [];
  for (const w of sorted) {
    const row = out.find((r) => Math.abs(r[0].y - w.y) <= tolerance);
    if (row) row.push(w);
    else out.push([w]);
  }
  return out.map((r) => r.sort((a, b) => a.x - b.x));
};

const toInt = (s: string | undefined, fallback = 0) => {
  if (s === undefined) return fallback;
  const n = parseItNumber(s);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const toNum = (s: string | undefined, fallback = 0) => {
  if (s === undefined) return fallback;
  const n = parseItNumber(s);
  return Number.isFinite(n) ? n : fallback;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Geometría de campos
// ---------------------------------------------------------------------------

/** Rectángulos de césped (#abdda4) de la página, opcionalmente dentro de una región */
const findPitches = (page: PdfPageContent, region?: Rect, minWidth = 60) =>
  page.shapes
    .filter((s) => s.fill && colorDistance(s.fill, COLOR.pitch) < 12 && rectWidth(s.rect) >= minWidth)
    .filter((s) => !region || rectInside(s.rect, region, 2))
    .map((s) => s.rect);

/**
 * Líneas del campo: el rectángulo blanco trazado más grande dentro del césped.
 * Es el contorno real del terreno de juego (el césped tiene algo de margen).
 */
const pitchLines = (page: PdfPageContent, grass: Rect): Rect => {
  const candidates = page.shapes.filter(
    (s) => s.stroke === '#ffffff' && !s.hasCurves && s.points.length >= 4 && rectInside(s.rect, grass, 1.5) && rectWidth(s.rect) > rectWidth(grass) * 0.8,
  );
  if (!candidates.length) return grass;
  return candidates.reduce((a, b) => (rectWidth(b.rect) * rectHeight(b.rect) > rectWidth(a.rect) * rectHeight(a.rect) ? b : a)).rect;
};

/** Punto de página → coordenadas de ataque en un campo horizontal. */
const horizontalToAttack = (p: { x: number; y: number }, pitch: Rect, attacksRight: boolean) => {
  let x = ((p.x - pitch.x0) / rectWidth(pitch)) * 100;
  let y = ((p.y - pitch.y0) / rectHeight(pitch)) * 100;
  if (!attacksRight) {
    // Rotación de 180º: el equipo ataca hacia la izquierda en el dibujo
    x = 100 - x;
    y = 100 - y;
  }
  return { x: round1(clamp(x)), y: round1(clamp(y)) };
};

/** Campo vertical atacando hacia arriba → coordenadas de ataque */
const verticalToAttack = (p: { x: number; y: number }, pitch: Rect) => ({
  x: round1(clamp(((pitch.y1 - p.y) / rectHeight(pitch)) * 100)),
  y: round1(clamp(((p.x - pitch.x0) / rectWidth(pitch)) * 100)),
});

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Marcadores (círculos = 1T, cuadrados = 2T, cuadrado redondeado = prórroga) con
 * color de equipo dentro de una región. Cada marcador suele dibujarse como
 * relleno + contorno: nos quedamos con el relleno.
 */
const markersIn = (page: PdfPageContent, region: Rect, minSize: number, maxSize: number) => {
  const out: { center: { x: number; y: number }; periodo: PaniniPeriodo; team: TeamColor; shape: PdfShape }[] = [];
  for (const s of page.shapes) {
    if (!s.fill) continue;
    const team = teamColor(s.fill);
    if (!team) continue;
    const w = rectWidth(s.rect);
    const h = rectHeight(s.rect);
    if (Math.max(w, h) < minSize || Math.max(w, h) > maxSize) continue;
    const center = rectCenter(s.rect);
    if (!insideRect(center, region)) continue;
    let periodo: PaniniPeriodo = '2T';
    if (s.hasCurves) periodo = s.points.length > 8 ? 'PR' : '1T';
    out.push({ center, periodo, team, shape: s });
  }
  return out;
};

// ---------------------------------------------------------------------------
// Identificación de páginas
// ---------------------------------------------------------------------------
type PageKind =
  | 'cover'
  | 'lineups'
  | 'score'
  | 'density'
  | 'coverageA'
  | 'coverageB'
  | 'finishing'
  | 'flows'
  | 'zoom'
  | 'rankings'
  | 'other';

const classifyPage = (page: PdfPageContent): PageKind => {
  if (hasWord(page, 'Incontro della')) return 'cover';
  if (hasTitle(page, 'FORMAZIONI E DISPOSIZIONI TATTICHE')) return 'lineups';
  if (hasTitle(page, 'SCORE') && hasTitle(page, 'DATI GENERALI')) return 'score';
  if (hasTitle(page, 'Centrocampista') && hasTitle(page, 'Attaccante') && page.words.some((w) => /^mt /.test(w.str))) return 'density';
  if (hasTitle(page, 'PALLE RECUPERATE') && hasTitle(page, 'GIOCATE UTILI')) return 'coverageA';
  if (hasTitle(page, 'PASSAGGI LUNGHI') && hasTitle(page, 'DRIBBLING')) return 'coverageB';
  if (hasTitle(page, 'STUDIO FINALIZZAZIONI') || (hasTitle(page, 'COME SI ARRIVA AL TIRO') && hasTitle(page, 'ESITO DEI TIRI'))) return 'finishing';
  if (findWord(page, 'TOTALI') && findWord(page, 'DA')) return 'flows';
  if (page.words.some((w) => /^\d+ - .+ - [\d+']/.test(w.str))) return 'zoom';
  if (findWord(page, 'Palle giocate') && findWord(page, 'Palle perse') && findWord(page, 'Falli commessi') && !page.words.some((w) => /^\d+ - /.test(w.str))) return 'rankings';
  return 'other';
};

// ---------------------------------------------------------------------------
// Página 1 · Portada
// ---------------------------------------------------------------------------
interface CoverData {
  fecha: string;
  competicion: string;
  jornada: string;
  local: string;
  visitante: string;
  golesLocal: number;
  golesVisitante: number;
  goleadores: PaniniMatchReport['goleadores'];
  imsLocal: number;
  imsVisitante: number;
  xgLocal: number;
  xgVisitante: number;
  estadio: string;
  arbitro: string;
  duracion: string;
  tiempoEfectivo: string;
}

const parseCover = (page: PdfPageContent, warnings: string[]): CoverData => {
  const mid = page.width / 2;
  const dateWord = page.words.find((w) => /^\d{2}-\d{2}-\d{4}$/.test(w.str));
  const [dd, mm, yyyy] = (dateWord?.str ?? '').split('-');
  const fecha = dateWord ? `${yyyy}-${mm}-${dd}` : '';
  if (!fecha) warnings.push('Portada: no se encontró la fecha del partido');

  const jornadaWord = page.words.find((w) => /Incontro della/i.test(w.str));
  const jornada = jornadaWord?.str.match(/(\d+)\s*\^?\s*giornata/i)?.[1] ?? '';

  // La competición es el texto centrado sobre la línea de la jornada
  const competicion = jornadaWord
    ? clean(page.words.filter((w) => w.y < jornadaWord.y - 5 && w.y > jornadaWord.y - 60).sort((a, b) => b.y - a.y)[0]?.str ?? '')
    : '';

  // Nombres de los equipos: la línea "LOCAL - VISITANTE" bajo la fecha
  const teamRow = rows(page.words.filter((w) => dateWord && w.y > dateWord.y + 10 && w.y < dateWord.y + 70)).find((r) => r.some((w) => w.str === '-'));
  const dash = teamRow?.find((w) => w.str === '-');
  const local = clean(teamRow?.filter((w) => dash && w.x < dash.x).map((w) => w.str).join(' ') ?? '');
  const visitante = clean(teamRow?.filter((w) => dash && w.x > dash.x).map((w) => w.str).join(' ') ?? '');

  // Marcador: los dos números grandes bajo los nombres
  const scoreRow = teamRow ? rows(page.words.filter((w) => w.y > teamRow[0].y + 10 && w.y < teamRow[0].y + 80 && /^\d+$/.test(w.str)))[0] ?? [] : [];
  const golesLocal = toInt(scoreRow[0]?.str);
  const golesVisitante = toInt(scoreRow[1]?.str);

  const goleadores: PaniniMatchReport['goleadores'] = [];
  const scoreY = scoreRow[0]?.y ?? 0;
  for (const w of page.words) {
    const m = w.str.match(/^(\d+(?:\+\d+)?')\s+(.+)$/);
    if (!m || w.y < scoreY || w.y > scoreY + 120) continue;
    goleadores.push({ minuto: m[1], jugador: clean(m[2]), equipo: w.x < mid ? 'home' : 'away' });
  }

  // IMS y xPG: fila con 4 números (IMS local, IMS visitante, xPG local, xPG visitante)
  const metricRow = rows(page.words.filter((w) => /^\d+(,\d+)?$/.test(w.str) && w.y > page.height * 0.6 && w.y < page.height * 0.85)).find((r) => r.length === 4);
  if (!metricRow) warnings.push('Portada: no se encontraron IMS / xPG');

  const infoRows = rows(page.words.filter((w) => w.y > (metricRow?.[0].y ?? page.height * 0.75) + 20));
  const stadiumRow = infoRows[0] ?? [];
  const durationRow = infoRows[1] ?? [];

  return {
    fecha,
    competicion,
    jornada,
    local,
    visitante,
    golesLocal,
    golesVisitante,
    goleadores,
    imsLocal: toInt(metricRow?.[0]?.str),
    imsVisitante: toInt(metricRow?.[1]?.str),
    xgLocal: toNum(metricRow?.[2]?.str),
    xgVisitante: toNum(metricRow?.[3]?.str),
    estadio: clean(stadiumRow.filter((w) => w.x < mid).map((w) => w.str).join(' ')),
    arbitro: clean(stadiumRow.filter((w) => w.x >= mid).map((w) => w.str).join(' ')),
    duracion: clean(durationRow.filter((w) => w.x < mid).map((w) => w.str).join(' ')),
    tiempoEfectivo: clean(durationRow.filter((w) => w.x >= mid).map((w) => w.str).join(' ')),
  };
};

// ---------------------------------------------------------------------------
// Página 2 · Alineaciones y posición media
// ---------------------------------------------------------------------------
interface LineupData {
  alineacion: PaniniPlayerLineup[];
  suplentes: { dorsal: number; nombre: string; posicion: string }[];
  entrenador: string;
  timeline: PaniniTimelineEvent[];
}

const POSITION_DESC: Record<string, string> = { P: 'Portero', D: 'Defensa', C: 'Centrocampista', A: 'Delantero' };
const minuteOf = (s: string) => {
  const m = s.match(/^(\d+)(?:\+(\d+))?'/);
  return m ? Number(m[1]) + (m[2] ? Number(m[2]) : 0) : NaN;
};

/** Color de la celda que hay detrás de un texto (tarjetas amarillas/rojas, cambios) */
const backgroundOf = (page: PdfPageContent, w: PdfWord) => {
  const c = wordCenter(w);
  const bg = page.shapes.filter((s) => s.fill && rectWidth(s.rect) < 40 && rectHeight(s.rect) < 20 && insideRect(c, s.rect, 1));
  return bg.length ? bg[bg.length - 1].fill : null;
};

const isYellow = (hex: string | null) => !!hex && hex !== 'pattern' && colorDistance(hex, '#ffff00') < 120;
const isRedCard = (hex: string | null) => !!hex && hex !== 'pattern' && colorDistance(hex, '#ff0000') < 90;

const parseLineups = (page: PdfPageContent, warnings: string[]): { home: LineupData; away: LineupData } => {
  const mid = page.width / 2;
  const coachLabels = page.words.filter((w) => norm(w.str) === 'allenatore');
  const tableBottom = coachLabels.length ? Math.min(...coachLabels.map((w) => w.y)) - 5 : page.height * 0.5;
  const header = page.words.find((w) => /^[A-Z]/.test(w.str) && w.y < 130 && w.y > 90);
  const tableTop = (header?.y ?? 110) + 5;
  const tableRows = rows(page.words.filter((w) => w.y > tableTop && w.y < tableBottom));

  const coaches = rows(page.words.filter((w) => coachLabels.length && w.y > coachLabels[0].y + 5 && w.y < coachLabels[0].y + 30))[0] ?? [];

  const build = (side: Side): LineupData => {
    const alineacion: PaniniPlayerLineup[] = [];
    const suplentes: LineupData['suplentes'] = [];
    const timeline: PaniniTimelineEvent[] = [];

    for (const row of tableRows) {
      const cells = row.filter((w) => (side === 'home' ? w.x < mid - 20 : w.x >= mid - 20));
      if (!cells.length) continue;

      // Rol (P/D/C/A) y nombre + dorsal
      const role = cells.find((w) => /^[PDCA]$/.test(w.str));
      if (!role) continue;
      let dorsal = NaN;
      let nombre = '';
      if (side === 'home') {
        const name = cells.find((w) => w.x > role.x && /[A-Za-zÀ-ú]/.test(w.str));
        const num = cells.find((w) => name && w.x > name.x && /^\d+$/.test(w.str));
        dorsal = toInt(num?.str, NaN);
        nombre = clean(name?.str ?? '');
      } else {
        const nameCell = cells.find((w) => w.x < role.x && /[A-Za-zÀ-ú]/.test(w.str));
        const merged = nameCell?.str.match(/^(\d+)\s+(.+)$/);
        if (merged) {
          dorsal = Number(merged[1]);
          nombre = clean(merged[2]);
        } else {
          const num = cells.filter((w) => nameCell && w.x < nameCell.x && /^\d+$/.test(w.str)).pop();
          dorsal = toInt(num?.str, NaN);
          nombre = clean(nameCell?.str ?? '');
        }
      }
      if (!Number.isFinite(dorsal) || !nombre) continue;

      // Minutos jugados + tarjetas (a la izquierda del rol en local, a la derecha en visitante)
      const minuteCells = cells.filter((w) => /^\d+(\+\d+)?'/.test(w.str));
      const outer = side === 'home' ? minuteCells.filter((w) => w.x < role.x) : minuteCells.filter((w) => w.x > role.x);
      const inner = side === 'home' ? minuteCells.filter((w) => w.x > role.x) : minuteCells.filter((w) => w.x < role.x);

      // En la columna exterior: minutos jugados (celda sin fondo) y tarjetas (fondo amarillo/rojo).
      // pdf.js puede unir "18' 84'" en una sola cadena: la separamos.
      const outerTokens = outer.flatMap((w) =>
        w.str.split(/\s+/).map((str, i) => ({ str, bg: backgroundOf(page, w), order: side === 'home' ? -w.x : w.x, i })),
      );
      const minutesToken = side === 'home' ? outerTokens.sort((a, b) => a.order - b.order)[0] : outerTokens[0];
      const cardTokens = outerTokens.filter((t) => t !== minutesToken);
      const minutos = minutesToken ? minuteOf(minutesToken.str) : 0;

      const amarillas: string[] = [];
      const rojas: string[] = [];
      for (const t of cardTokens) {
        if (isRedCard(t.bg) && !isYellow(t.bg)) rojas.push(t.str);
        else amarillas.push(t.str);
      }

      if (!minutesToken) {
        suplentes.push({ dorsal, nombre, posicion: role.str });
        continue;
      }

      const isStarter = alineacion.filter((p) => p.es_titular).length < 11;
      const player: PaniniPlayerLineup = {
        dorsal,
        nombre,
        posicion: role.str as PaniniPlayerLineup['posicion'],
        posicion_desc: POSITION_DESC[role.str] ?? role.str,
        minutos_jugados: Number.isFinite(minutos) ? minutos : 0,
        es_titular: isStarter,
      };
      // Distintivos de cambio junto al dorsal: titular → minuto de salida; suplente → entrada (y salida si la hay)
      const subMinutes = inner.map((w) => w.str).sort((a, b) => minuteOf(a) - minuteOf(b));
      if (isStarter && subMinutes[0]) player.minuto_salida = minuteOf(subMinutes[0]);
      if (!isStarter) {
        if (subMinutes[0]) player.minuto_entrada = minuteOf(subMinutes[0]);
        if (subMinutes[1]) player.minuto_salida = minuteOf(subMinutes[1]);
      }
      if (amarillas.length) player.tarjetas_amarillas = amarillas;
      if (rojas.length) player.tarjetas_rojas = rojas;
      alineacion.push(player);

      for (const m of amarillas) timeline.push({ minute: m, type: 'yellow_card', team: side, player: nombre });
      for (const m of rojas) timeline.push({ minute: m, type: 'red_card', team: side, player: nombre });
      if (player.minuto_entrada !== undefined) timeline.push({ minute: `${player.minuto_entrada}'`, type: 'substitution_in', team: side, player: nombre });
      if (player.minuto_salida !== undefined) timeline.push({ minute: `${player.minuto_salida}'`, type: 'substitution_out', team: side, player: nombre });
    }

    const entrenador = clean(coaches.filter((w) => (side === 'home' ? w.x < mid : w.x >= mid)).map((w) => w.str).join(' '));
    return { alineacion, suplentes, entrenador, timeline };
  };

  const home = build('home');
  const away = build('away');

  // Posición media en el campograma: círculos de color con el dorsal dentro
  const grass = findPitches(page, { x0: 0, y0: tableBottom, x1: page.width, y1: page.height }, 200)[0];
  if (!grass) {
    warnings.push('Alineaciones: no se encontró el campograma de posición media');
  } else {
    const pitch = pitchLines(page, grass);
    for (const s of page.shapes) {
      const w = rectWidth(s.rect);
      if (!s.hasCurves || w < 15 || w > 30 || !rectInside(s.rect, pitch, 5)) continue;
      // Jugador de campo: relleno del color del equipo. Portero: relleno gris y borde del color.
      let side: Side | null = null;
      const fillTeam = teamColor(s.fill);
      if (fillTeam && !fillTeam.light) side = fillTeam.side;
      else if (s.fill && colorDistance(s.fill, COLOR.goalkeeper) < 20) {
        const border = page.shapes.find((b) => b.stroke && teamColor(b.stroke) && Math.abs(rectCenter(b.rect).x - rectCenter(s.rect).x) < 2 && Math.abs(rectCenter(b.rect).y - rectCenter(s.rect).y) < 2);
        side = border ? teamColor(border.stroke)!.side : null;
      }
      if (!side) continue;
      // Los círculos pueden solaparse: el dorsal es el número más cercano al centro, no el primero que cae dentro
      const center = rectCenter(s.rect);
      const dist = (wd: PdfWord) => Math.hypot(wordCenter(wd).x - center.x, wordCenter(wd).y - center.y);
      const num = page.words
        .filter((wd) => /^\d+$/.test(wd.str) && insideRect(wordCenter(wd), s.rect, 1))
        .sort((a, b) => dist(a) - dist(b))[0];
      if (!num) continue;
      const team = side === 'home' ? home : away;
      const player = team.alineacion.find((p) => p.dorsal === Number(num.str));
      if (!player) continue;
      const pos = horizontalToAttack(rectCenter(s.rect), pitch, side === 'home');
      player.x = pos.x;
      player.y = pos.y;
    }
    for (const [label, team] of [['local', home], ['visitante', away]] as const) {
      const missing = team.alineacion.filter((p) => p.es_titular && p.x === undefined);
      if (missing.length) warnings.push(`Alineaciones: sin posición media para ${missing.length} titular(es) ${label}`);
    }
  }

  if (home.alineacion.length < 11 || away.alineacion.length < 11) warnings.push('Alineaciones: se detectaron menos de 11 jugadores en algún equipo');
  return { home, away };
};

// ---------------------------------------------------------------------------
// Página 3 · Score (estadísticas por tiempo)
// ---------------------------------------------------------------------------
type StatKey = keyof PaniniPeriodStats;
type StatSpec = { label: string; set: (s: Partial<PaniniPeriodStats>, raw: string) => void };

const timeAndPct = (timeKey: StatKey, pctKey: StatKey) => (s: Partial<PaniniPeriodStats>, raw: string) => {
  const m = raw.match(/^(.+?)\s*\((\d+)\)$/);
  (s as Record<string, unknown>)[timeKey] = m ? m[1].trim() : raw;
  (s as Record<string, unknown>)[pctKey] = m ? Number(m[2]) : 0;
};
const numAndPct = (numKey: StatKey, pctKey: StatKey) => (s: Partial<PaniniPeriodStats>, raw: string) => {
  const m = raw.match(/^([\d.,]+)\s*\((\d+)\)$/);
  (s as Record<string, unknown>)[numKey] = toNum(m ? m[1] : raw);
  (s as Record<string, unknown>)[pctKey] = m ? Number(m[2]) : 0;
};
const num = (key: StatKey) => (s: Partial<PaniniPeriodStats>, raw: string) => {
  (s as Record<string, unknown>)[key] = toNum(raw);
};
const text = (key: StatKey) => (s: Partial<PaniniPeriodStats>, raw: string) => {
  (s as Record<string, unknown>)[key] = raw;
};

const SCORE_ROWS: StatSpec[] = [
  { label: 'Possesso palla (%)', set: timeAndPct('posesion_tiempo', 'posesion_pct') },
  { label: 'Palle giocate (%)', set: numAndPct('balones_jugados_total', 'balones_jugados_pct') },
  { label: 'Passaggi riusciti (%)', set: numAndPct('pases_acertados_total', 'pases_acertados_pct_sobre_total_partido') },
  { label: '% passaggi riusciti', set: num('precision_pases_pct') },
  { label: 'Giocate utili (%)', set: numAndPct('acciones_utiles_total', 'acciones_utiles_pct') },
  { label: 'Baricentro (mt)', set: num('baricentro_altura_m') },
  { label: 'Supremazia territoriale (%)', set: timeAndPct('supremacia_territorial_tiempo', 'supremacia_territorial_pct') },
  { label: 'Falli commessi nei pressi della propria area', set: text('faltas_cerca_area_propia') },
  { label: 'Fuorigioco avversari', set: num('fueras_juego_provocados') },
  { label: 'Pressing (mt)', set: num('altura_pressing_m') },
  { label: '% per fine azione avversaria', set: num('recuperacion_fin_accion_rival_pct') },
  { label: '% palle recuperate effettive', set: num('recuperaciones_efectivas_pct') },
  { label: '% palle recuperate temporanee', set: num('recuperaciones_temporales_pct') },
  { label: 'Palle giocate in zona area dagli avversari', set: num('balones_area_propia_rival') },
  { label: '% protezione area', set: num('proteccion_area_pct') },
  { label: 'Uscite', set: num('salidas_portero') },
  { label: 'Parate', set: num('paradas_portero') },
  { label: '% palle a scavalcare il centrocampo', set: num('salto_linea_largo_pct') },
  { label: '% azioni manovrate da dietro', set: num('elaboracion_desde_atras_pct') },
  { label: 'Passaggi bassi utili nella metà campo avversaria', set: text('pases_rasos_campo_rival') },
  { label: 'Passaggi lunghi utili', set: text('pases_largos_utiles') },
  { label: 'Cambi di gioco', set: num('cambios_orientacion') },
  { label: 'Cross su azione dal fondo', set: text('centros_desde_fondo') },
  { label: '% cross su azione da destra', set: num('centros_derecha_pct') },
  { label: '% cross su azione da sinistra', set: num('centros_izquierda_pct') },
  { label: 'Dribbling utili', set: text('regates_utiles') },
  { label: 'Accelerazioni', set: num('aceleraciones') },
  { label: 'Palle giocate in zona area', set: num('balones_en_area_rival') },
  { label: '% attacco alla porta', set: num('ataque_porteria_pct') },
  { label: '% efficacia calci piazzati in attacco', set: num('eficacia_abp_ofensivo_pct') },
  { label: 'Tiri dentro', set: text('tiros_a_puerta') },
  { label: 'Occasioni', set: num('ocasiones_gol') },
];

const emptyPeriod = (): PaniniPeriodStats => ({
  posesion_tiempo: '',
  posesion_pct: 0,
  balones_jugados_total: 0,
  balones_jugados_pct: 0,
  pases_acertados_total: 0,
  pases_acertados_pct_sobre_total_partido: 0,
  precision_pases_pct: 0,
  acciones_utiles_total: 0,
  acciones_utiles_pct: 0,
  baricentro_altura_m: 0,
  supremacia_territorial_tiempo: '',
  supremacia_territorial_pct: 0,
  faltas_cerca_area_propia: '',
  fueras_juego_provocados: 0,
  altura_pressing_m: 0,
  recuperacion_fin_accion_rival_pct: 0,
  recuperaciones_efectivas_pct: 0,
  recuperaciones_temporales_pct: 0,
  balones_area_propia_rival: 0,
  proteccion_area_pct: 0,
  salidas_portero: 0,
  paradas_portero: 0,
  salto_linea_largo_pct: 0,
  elaboracion_desde_atras_pct: 0,
  pases_rasos_campo_rival: '',
  pases_largos_utiles: '',
  cambios_orientacion: 0,
  centros_desde_fondo: '',
  centros_derecha_pct: 0,
  centros_izquierda_pct: 0,
  regates_utiles: '',
  aceleraciones: 0,
  balones_en_area_rival: 0,
  ataque_porteria_pct: 0,
  eficacia_abp_ofensivo_pct: 0,
  tiros_a_puerta: '',
  ocasiones_gol: 0,
});

const parseScore = (page: PdfPageContent, warnings: string[]) => {
  const result = {
    home: { primer_tiempo: emptyPeriod(), segundo_tiempo: emptyPeriod(), total_partido: emptyPeriod() },
    away: { primer_tiempo: emptyPeriod(), segundo_tiempo: emptyPeriod(), total_partido: emptyPeriod() },
  };

  // Columnas a partir de las cabeceras "1° tempo | 2° tempo | Incontro" de cada lado
  const headers = page.words.filter((w) => /tempo|Incontro/.test(w.str) && w.y < 150);
  const colX = (label: RegExp, side: Side) => {
    const w = headers.filter((h) => label.test(h.str)).sort((a, b) => a.x - b.x);
    const hw = side === 'home' ? w[0] : w[w.length - 1];
    return hw ? hw.x + hw.width / 2 : NaN;
  };
  const columns = (['home', 'away'] as Side[]).flatMap((side) => [
    { side, period: 'primer_tiempo' as const, x: colX(/^1/, side) },
    { side, period: 'segundo_tiempo' as const, x: colX(/^2/, side) },
    { side, period: 'total_partido' as const, x: colX(/Incontro/, side) },
  ]);
  if (columns.some((c) => !Number.isFinite(c.x))) {
    warnings.push('Score: no se encontraron las cabeceras de columnas');
    return result;
  }

  const labelZone = { x0: page.width * 0.33, x1: page.width * 0.72 };
  const allRows = rows(page.words.filter((w) => w.y > 150));
  let parsed = 0;
  for (const row of allRows) {
    const labelWords = row.filter((w) => w.x >= labelZone.x0 - 30 && w.x + w.width <= labelZone.x1 + 30 && /[a-z]/i.test(w.str));
    const label = norm(labelWords.map((w) => w.str).join(' '));
    const spec = SCORE_ROWS.find((r) => norm(r.label) === label);
    if (!spec) continue;
    const values = row.filter((w) => !labelWords.includes(w));
    for (const v of values) {
      const cx = v.x + v.width / 2;
      const col = columns.reduce((best, c) => (Math.abs(c.x - cx) < Math.abs(best.x - cx) ? c : best));
      if (Math.abs(col.x - cx) > 30) continue;
      spec.set(result[col.side][col.period], v.str);
    }
    parsed++;
  }
  if (parsed < SCORE_ROWS.length) warnings.push(`Score: ${SCORE_ROWS.length - parsed} métricas no encontradas`);
  return result;
};

// ---------------------------------------------------------------------------
// Páginas 4-5 · Disposición táctica y densidad
// ---------------------------------------------------------------------------
const ROLE_FROM_COLOR: [string, 'P' | 'D' | 'C' | 'A'][] = [
  ['#aaaaaa', 'P'],
  ['#feff40', 'D'],
  ['#ffb05f', 'C'],
  ['#ff2020', 'A'],
];

const parseDensityPage = (page: PdfPageContent, warnings: string[]) => {
  const periodo: '1T' | '2T' = hasWord(page, 'secondo tempo') ? '2T' : '1T';
  // Cabecera "45' | primo tempo | 23':27''": duración y tiempo efectivo del periodo
  const halfLabel = page.words.find((w) => /^(primo|secondo) tempo$/i.test(w.str));
  const headerRow = halfLabel ? page.words.filter((w) => Math.abs(w.y - halfLabel.y) < 4) : [];
  const duracion = headerRow.find((w) => /^\d+(\+\d+)?'$/.test(w.str))?.str ?? '';
  const tiempoEfectivo = headerRow.find((w) => /^\d+':\d+/.test(w.str))?.str ?? '';
  // Las celdas tapan el césped: el campo es el rectángulo blanco grande que las contiene
  const grasses = page.shapes
    .filter((s) => s.fill === '#ffffff' && !s.hasCurves && rectWidth(s.rect) > 300 && rectHeight(s.rect) > 200)
    .map((s) => s.rect)
    .sort((a, b) => a.y0 - b.y0);
  const out: Partial<Record<Side, PaniniDensityMap>> = {};

  // Cabeceras de cada campo: "4-4-2  NOMBRE EQUIPO" encima de cada campo
  grasses.slice(0, 2).forEach((grass, i) => {
    const side: Side = i === 0 ? 'home' : 'away';
    const attacksRight = side === 'home';
    const band: Rect = { x0: 0, y0: grass.y0 - 45, x1: page.width, y1: grass.y1 + 45 };

    const sistema = page.words.find((w) => /^\d(-\d){2,4}$/.test(w.str) && w.y < grass.y0 && w.y > grass.y0 - 40)?.str ?? '';

    // Celdas de la rejilla: rectángulos rellenos (sólidos o con trama) de algún tono de verde
    const cells = page.shapes.filter((s) => {
      if (!s.fill || s.fill === 'pattern' || s.hasCurves || !rectInside(s.rect, grass, 2)) return false;
      const w = rectWidth(s.rect);
      return w > 25 && w < rectWidth(grass) / 5 && rectHeight(s.rect) > 25 && isGreen(s.fill);
    });
    const colStarts = cluster(cells.map((c) => c.rect.x0));
    const rowStarts = cluster(cells.map((c) => c.rect.y0));
    const celdas = cells.map((c) => {
      const intensidad = densityIntensity(c.fill!);
      let columna = nearestIndex(colStarts, c.rect.x0);
      let fila = nearestIndex(rowStarts, c.rect.y0);
      if (!attacksRight) {
        columna = colStarts.length - 1 - columna;
        fila = rowStarts.length - 1 - fila;
      }
      return { fila, columna, nivel: Math.round(intensidad * 15), intensidad: Math.round(intensidad * 100) / 100, color: c.fill!, trama: c.fillIsPattern };
    });
    // Una celda por posición (algunas se dibujan dos veces)
    const unique = new Map(celdas.map((c) => [`${c.fila}-${c.columna}`, c]));

    // Longitud / anchura del bloque: textos "mt 44,8"
    const mts = page.words.filter((w) => /^mt /.test(w.str) && w.y > band.y0 && w.y < band.y1);
    const vertical = mts.find((w) => w.x > grass.x1 - 90 || w.x < grass.x0 + 60);
    const horizontal = mts.find((w) => w !== vertical);
    // En el PDF: el texto horizontal (bajo el bloque) es la longitud; el lateral es la anchura
    const longitud_m = toNum(horizontal?.str.replace('mt', ''));
    const anchura_m = toNum(vertical?.str.replace('mt', ''));

    // % por tercios: fila "%  28,9  42,7  28,4" bajo el campo
    const pctRow = rows(page.words.filter((w) => w.y > grass.y1 - 25 && w.y < grass.y1 + 40 && /^\d+,\d$/.test(w.str)))[0] ?? [];
    let thirds = pctRow.map((w) => toNum(w.str));
    if (!attacksRight) thirds = [...thirds].reverse();

    // Jugadores: círculos numerados + etiqueta con nombre (su fondo indica el rol)
    const jugadores: PaniniDensityMap['jugadores'] = [];
    const circles = page.shapes.filter((s) => s.hasCurves && s.fill && rectInside(s.rect, grass, 2) && rectWidth(s.rect) > 14 && rectWidth(s.rect) < 26);
    const labels = page.shapes.filter(
      (s) => s.hasCurves && s.fill && rectInside(s.rect, grass, 4) && rectWidth(s.rect) > 40 && rectHeight(s.rect) < 16 && ROLE_FROM_COLOR.some(([hex]) => colorDistance(hex, s.fill!) < 40),
    );
    for (const c of circles) {
      const center = rectCenter(c.rect);
      const numWord = page.words.find((w) => /^\d+$/.test(w.str) && insideRect(wordCenter(w), c.rect, 1));
      // Etiqueta con nombre: la más cercana al círculo
      const label = labels
        .map((l) => ({ l, d: Math.hypot(rectCenter(l.rect).x - center.x, rectCenter(l.rect).y - center.y) }))
        .sort((a, b) => a.d - b.d)[0];
      const nameWord = label && label.d < 30 ? page.words.find((w) => insideRect(wordCenter(w), label.l.rect, 2) && /[A-Za-z]/.test(w.str)) : undefined;
      const rol = ROLE_FROM_COLOR.find(([hex]) => label && colorDistance(hex, label.l.fill!) < 40)?.[1] ?? (colorDistance(c.fill!, COLOR.goalkeeper) < 20 ? 'P' : 'C');
      if (!numWord && !nameWord) continue;
      jugadores.push({
        dorsal: numWord ? Number(numWord.str) : undefined,
        nombre: clean(nameWord?.str ?? ''),
        rol,
        ...horizontalToAttack(center, grass, attacksRight),
      });
    }

    if (unique.size < colStarts.length * rowStarts.length) warnings.push(`Densidad ${periodo} (${side === 'home' ? 'local' : 'visitante'}): rejilla incompleta`);

    out[side] = {
      periodo,
      duracion,
      tiempo_efectivo: tiempoEfectivo,
      sistema,
      longitud_m,
      anchura_m,
      filas: rowStarts.length,
      columnas: colStarts.length,
      celdas: [...unique.values()].sort((a, b) => a.fila - b.fila || a.columna - b.columna),
      jugadores: dedupeBy(jugadores, (j) => `${j.dorsal}-${j.nombre}`),
      zonas_pct: { defensa: thirds[0] ?? 0, medio: thirds[1] ?? 0, ataque: thirds[2] ?? 0 },
    };
  });

  if (grasses.length < 2) warnings.push(`Densidad ${periodo}: no se encontraron los dos campos`);
  return { periodo, maps: out };
};

const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const isGreen = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return g > 80 && g >= r + 20 && g >= b + 20;
};
/** 0 = tono más claro de la escala Panini, 1 = el más oscuro */
const densityIntensity = (hex: string) => {
  const lo = luminance(COLOR.densityMin);
  const hi = luminance(COLOR.densityMax);
  return Math.max(0, Math.min(1, (lo - luminance(hex)) / (lo - hi)));
};

/** Agrupa valores cercanos (bordes de celdas) y devuelve los representantes ordenados */
const cluster = (values: number[], tolerance = 4) => {
  const sorted = [...values].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const v of sorted) {
    const g = groups[groups.length - 1];
    if (g && v - g[g.length - 1] <= tolerance) g.push(v);
    else groups.push([v]);
  }
  return groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
};
const nearestIndex = (arr: number[], v: number) => arr.reduce((best, x, i) => (Math.abs(x - v) < Math.abs(arr[best] - v) ? i : best), 0);
const dedupeBy = <T>(arr: T[], key: (t: T) => string) => [...new Map(arr.map((t) => [key(t), t])).values()];

// ---------------------------------------------------------------------------
// Páginas 6-7 · Cobertura territorial (eventos posicionados)
// ---------------------------------------------------------------------------
type EventKey = keyof PaniniEventMaps;
const COVERAGE_SECTIONS: { title: string; key: EventKey }[] = [
  { title: 'PALLE RECUPERATE', key: 'recuperaciones' },
  { title: 'FALLI COMMESSI', key: 'faltas' },
  { title: 'GIOCATE UTILI', key: 'acciones_utiles' },
  { title: 'PASSAGGI LUNGHI', key: 'pases_largos' },
  { title: 'DRIBBLING', key: 'regates' },
  { title: 'CROSS SU AZIONE', key: 'centros' },
];

const parseCoverage = (page: PdfPageContent) => {
  const events: Record<Side, Partial<PaniniEventMaps>> = { home: {}, away: {} };
  const thirds: Record<Side, Partial<Record<EventKey, { defensa: number; medio: number; ataque: number }>>> = { home: {}, away: {} };

  const titles = COVERAGE_SECTIONS.map((s) => ({ ...s, word: page.words.find((w) => w.str.trim() === s.title) })).filter((s) => s.word).sort((a, b) => a.word!.y - b.word!.y);
  titles.forEach((section, i) => {
    const y0 = section.word!.y;
    const y1 = titles[i + 1]?.word!.y ?? page.height;
    const grasses = findPitches(page, { x0: 0, y0, x1: page.width, y1 }, 100).sort((a, b) => a.x0 - b.x0);
    grasses.slice(0, 2).forEach((grass, idx) => {
      const side: Side = idx === 0 ? 'home' : 'away';
      const pitch = pitchLines(page, grass);
      // Ambos equipos están dibujados atacando hacia la derecha
      const pts = markersIn(page, grass, 5, 11)
        .filter((m) => m.team.side === side)
        .map<PaniniMapEvent>((m) => ({ ...horizontalToAttack(m.center, pitch, true), periodo: m.periodo, balon_parado: m.team.light }));
      events[side][section.key] = pts;

      // % por tercios impresos bajo el campo ("3 7" = 37)
      const labels = rows(page.words.filter((w) => w.y > grass.y1 - 25 && w.y < grass.y1 + 20 && w.x >= grass.x0 - 5 && w.x <= grass.x1 + 5 && /^\d[\d ]*$/.test(w.str)))[0] ?? [];
      const third = (k: number) => {
        const cx0 = grass.x0 + (rectWidth(grass) * k) / 3;
        const w = labels.find((l) => wordCenter(l).x >= cx0 && wordCenter(l).x < cx0 + rectWidth(grass) / 3);
        return w ? spacedNumber(w.str) : 0;
      };
      thirds[side][section.key] = { defensa: third(0), medio: third(1), ataque: third(2) };
    });
  });
  return { events, thirds };
};

/** % por zonas laterales a partir de los puntos (en el PDF son imágenes de texto) */
const lateralPct = (points: { y: number }[]) => {
  const n = points.length || 1;
  const count = (a: number, b: number) => points.filter((p) => p.y >= a && p.y < b).length;
  return {
    izquierda: Math.round((count(0, 100 / 3) / n) * 100),
    centro: Math.round((count(100 / 3, 200 / 3) / n) * 100),
    derecha: Math.round((count(200 / 3, 101) / n) * 100),
  };
};

const spatialCategory = (points: PaniniMapEvent[] = [], third?: { defensa: number; medio: number; ataque: number }): PaniniSpatialCategory => {
  const lat = lateralPct(points);
  return {
    defensa_pct: third?.defensa ?? 0,
    medio_pct: third?.medio ?? 0,
    ataque_pct: third?.ataque ?? 0,
    izquierda_pct: lat.izquierda,
    centro_pct: lat.centro,
    derecha_pct: lat.derecha,
  };
};

// ---------------------------------------------------------------------------
// Páginas 8-9 · Estudio de finalizaciones
// ---------------------------------------------------------------------------
const SET_PIECE_ROWS: { label: string; categoria: PaniniSetPieceEfficacy['categoria'] }[] = [
  { label: 'Punizioni da destra', categoria: 'faltas_derecha' },
  { label: 'Punizioni centrali', categoria: 'faltas_centrales' },
  { label: 'Punizioni da sinistra', categoria: 'faltas_izquierda' },
  { label: 'Angoli da destra', categoria: 'corners_derecha' },
  { label: 'Angoli da sinistra', categoria: 'corners_izquierda' },
  { label: 'Falli laterali da destra', categoria: 'saques_banda_derecha' },
  { label: 'Falli laterali da sinistra', categoria: 'saques_banda_izquierda' },
];

const parseFinishing = (page: PdfPageContent, warnings: string[]) => {
  const headline = (label: string) => toInt(page.words.find((w) => norm(w.str).startsWith(norm(label) + ':'))?.str.split(':')[1]);
  const tiros = headline('Tiri');
  const tirosDentro = headline('Tiri dentro');
  const reti = headline('Reti');
  const occasioni = headline('Occasioni');

  // Gráficos de barras de la columna izquierda: valor encima de cada barra, 3 barras por sección
  const barSection = (title: string) => {
    const t = findWord(page, title);
    if (!t) return [0, 0, 0];
    const next = page.words.filter((w) => w.x < page.width * 0.4 && w.y > t.y + 10 && /^[A-Z ']{8,}$/.test(w.str)).sort((a, b) => a.y - b.y)[0];
    const y1 = next?.y ?? t.y + 140;
    const nums = page.words.filter((w) => w.y > t.y && w.y < y1 && w.x < page.width * 0.45 && /^\d+$/.test(w.str));
    // Cada valor aparece dos veces (sombra): nos quedamos con una por columna
    const bounds = { x0: t.x, x1: t.x + (page.width * 0.4 - t.x) };
    const colW = (bounds.x1 - bounds.x0) / 3;
    return [0, 1, 2].map((k) => {
      const w = nums.find((n) => wordCenter(n).x >= bounds.x0 + colW * k && wordCenter(n).x < bounds.x0 + colW * (k + 1));
      return w ? Number(w.str) : 0;
    });
  };
  const [llegadaJugada, llegadaAbpInd, llegadaAbpDir] = barSection('COME SI ARRIVA AL TIRO');
  const [zonaAreaPeq, zonaAreaPen, zonaFuera] = barSection('DA DOVE SI TIRA');
  const [pie, acrobacia, cabeza] = barSection('COME SI TIRA');
  const [aPuerta, bloqueado, fuera] = barSection('ESITO DEI TIRI');

  // Mapa de tiros: medio campo vertical (portería arriba)
  const shotGrass = findPitches(page, { x0: page.width * 0.4, y0: 0, x1: page.width, y1: page.height }, 200)[0];
  const mapa_tiros: PaniniShotMarker[] = [];
  let side: Side | null = null;
  if (shotGrass) {
    const pitch = pitchLines(page, shotGrass);
    // La línea de medio campo es una línea horizontal blanca dentro del contorno
    const halfway = page.shapes.find((s) => s.stroke === '#ffffff' && !s.hasCurves && s.points.length === 2 && rectHeight(s.rect) < 1 && rectWidth(s.rect) > rectWidth(pitch) * 0.9 && s.rect.y0 > pitch.y0 + 20);
    const halfY = halfway?.rect.y0 ?? pitch.y1;
    const half: Rect = { x0: pitch.x0, y0: pitch.y0, x1: pitch.x1, y1: halfY };
    for (const m of markersIn(page, shotGrass, 9, 22)) {
      side ??= m.team.side;
      // x: 50 = medio campo → 100 = línea de gol rival
      const x = 50 + ((half.y1 - m.center.y) / rectHeight(half)) * 50;
      const y = ((m.center.x - half.x0) / rectWidth(half)) * 100;
      // Los goles se dibujan con un marcador mayor (≈17 pt frente a 11 pt)
      const gol = Math.max(rectWidth(m.shape.rect), rectHeight(m.shape.rect)) > 14.5;
      mapa_tiros.push({ x: round1(clamp(x)), y: round1(clamp(y)), periodo: m.periodo, balon_parado: m.team.light, ...(gol ? { gol: true } : {}) });
    }
  } else {
    warnings.push('Finalización: no se encontró el mapa de tiros');
  }
  if (tiros && mapa_tiros.length !== tiros) warnings.push(`Finalización: ${mapa_tiros.length} tiros en el mapa y ${tiros} en el resumen`);
  if (reti && mapa_tiros.filter((t) => t.gol).length !== reti) warnings.push(`Finalización: ${mapa_tiros.filter((t) => t.gol).length} goles en el mapa y ${reti} en el resumen`);

  // Línea de tiempo de tiros: marcadores pequeños sobre el eje 0'-90'
  const axis = page.words.filter((w) => /^\d+'$/.test(w.str) && w.y < page.height * 0.25);
  const minutos_tiros: { minuto: number; periodo: PaniniPeriodo; balon_parado: boolean }[] = [];
  const zero = axis.find((w) => w.str === "0'");
  const ninety = axis.find((w) => w.str === "90'");
  if (zero && ninety) {
    const x0 = wordCenter(zero).x;
    const perMinute = (wordCenter(ninety).x - x0) / 90;
    const band: Rect = { x0: 0, y0: zero.y, x1: page.width, y1: zero.y + 40 };
    for (const m of markersIn(page, band, 4, 9)) {
      minutos_tiros.push({ minuto: Math.max(0, Math.round((m.center.x - x0) / perMinute)), periodo: m.periodo, balon_parado: m.team.light });
    }
    minutos_tiros.sort((a, b) => a.minuto - b.minuto);
  }

  // Goles en la portería (imagen sobre el mapa): marcador numerado + etiqueta "65' Benzoni"
  const goles_porteria: PaniniGoalMarker[] = [];
  const goalImage = shotGrass
    ? page.images.filter((r) => r.y1 <= shotGrass.y0 + 3 && r.y1 > shotGrass.y0 - 30 && rectWidth(r) > rectWidth(shotGrass) * 0.6).sort((a, b) => rectWidth(b) - rectWidth(a))[0]
    : undefined;
  if (goalImage) {
    const goalMarkers = markersIn(page, goalImage, 12, 22);
    for (const gm of goalMarkers) {
      const orderWord = page.words.find((w) => /^\d+$/.test(w.str) && insideRect(wordCenter(w), gm.shape.rect, 1));
      // Etiqueta: el texto "minuto jugador" justo encima del marcador
      const label = page.words
        .filter((w) => /^\d+(\+\d+)?'\s+\S/.test(w.str) && Math.abs(wordCenter(w).y - gm.center.y) < 40)
        .sort((a, b) => Math.hypot(wordCenter(a).x - gm.center.x, wordCenter(a).y - gm.center.y) - Math.hypot(wordCenter(b).x - gm.center.x, wordCenter(b).y - gm.center.y))[0];
      const m = label?.str.match(/^(\d+(?:\+\d+)?')\s+(.+)$/);
      goles_porteria.push({
        orden: toInt(orderWord?.str, goles_porteria.length + 1),
        minuto: m?.[1] ?? '',
        jugador: clean(m?.[2] ?? ''),
        x: round1(clamp(((gm.center.x - goalImage.x0) / rectWidth(goalImage)) * 100)),
        y: round1(clamp(((gm.center.y - goalImage.y0) / rectHeight(goalImage)) * 100)),
      });
    }
    goles_porteria.sort((a, b) => a.orden - b.orden);
  }

  // Eficacia a balón parado: barras horizontales (rosa/azul claro = con éxito, blanco = resto)
  const eficacia: PaniniSetPieceEfficacy[] = [];
  const axisNums = rows(page.words.filter((w) => /^\d+$/.test(w.str) && w.y > page.height * 0.85 && w.x > page.width * 0.6))[0] ?? [];
  if (axisNums.length >= 2) {
    const a = axisNums[0];
    const b = axisNums[axisNums.length - 1];
    const unit = (wordCenter(b).x - wordCenter(a).x) / (Number(b.str) - Number(a.str));
    for (const rowSpec of SET_PIECE_ROWS) {
      const label = page.words.find((w) => norm(w.str) === norm(rowSpec.label));
      if (!label) continue;
      const bars = page.shapes.filter((s) => s.fill && !s.hasCurves && rectHeight(s.rect) < 10 && rectHeight(s.rect) > 4 && Math.abs(rectCenter(s.rect).y - (label.y - label.height / 2)) < 6 && s.rect.x0 > label.x + label.width);
      const success = bars.filter((s) => teamColor(s.fill)?.light).reduce((acc, s) => acc + rectWidth(s.rect), 0);
      const rest = bars.filter((s) => s.fill === '#ffffff').reduce((acc, s) => acc + rectWidth(s.rect), 0);
      eficacia.push({ categoria: rowSpec.categoria, exitosas: Math.round(success / unit), total: Math.round((success + rest) / unit) });
    }
  }

  const finalizacion: PaniniFinishingStats = {
    tiros_totales: tiros,
    tiros_a_puerta: tirosDentro,
    goles: reti,
    ocasiones: occasioni,
    llegada_jugada: llegadaJugada,
    llegada_abp_indirecto: llegadaAbpInd,
    llegada_abp_directo: llegadaAbpDir,
    zona_area_pequena: zonaAreaPeq,
    zona_area_penalti: zonaAreaPen,
    zona_fuera_area: zonaFuera,
    remate_pie_raso: pie,
    remate_acrobacia: acrobacia,
    remate_cabeza: cabeza,
    resultado_a_puerta: aPuerta,
    resultado_bloqueado: bloqueado,
    resultado_fuera: fuera,
    abp_faltas_derecha: eficacia.find((e) => e.categoria === 'faltas_derecha')?.total ?? 0,
    abp_faltas_centrales: eficacia.find((e) => e.categoria === 'faltas_centrales')?.total ?? 0,
    abp_faltas_izquierda: eficacia.find((e) => e.categoria === 'faltas_izquierda')?.total ?? 0,
    abp_corners_derecha: eficacia.find((e) => e.categoria === 'corners_derecha')?.total ?? 0,
    abp_corners_izquierda: eficacia.find((e) => e.categoria === 'corners_izquierda')?.total ?? 0,
    abp_saques_banda_derecha: eficacia.find((e) => e.categoria === 'saques_banda_derecha')?.total ?? 0,
    abp_saques_banda_izquierda: eficacia.find((e) => e.categoria === 'saques_banda_izquierda')?.total ?? 0,
  };

  // El equipo de la página: por el color de sus marcadores o por el nombre del título
  return { side, finalizacion, mapa_tiros, minutos_tiros, goles_porteria, eficacia };
};

// ---------------------------------------------------------------------------
// Páginas 10-11 · Flujos de juego (red y matriz de pases)
// ---------------------------------------------------------------------------
const parseFlows = (page: PdfPageContent, warnings: string[]) => {
  const grass = findPitches(page, undefined, 200)[0];
  const nodos: PaniniPassNetwork['nodos'] = [];
  const enlaces: PaniniPassNetwork['enlaces'] = [];
  let side: Side | null = null;

  if (grass) {
    const pitch = pitchLines(page, grass);
    // Nodos: círculos del color del equipo (o gris con borde de color, el portero)
    const rawNodes: { dorsal: number; center: { x: number; y: number } }[] = [];
    let gkCenter: { x: number; y: number } | null = null;
    for (const s of page.shapes) {
      if (!s.hasCurves || !s.fill || !rectInside(s.rect, grass, 2)) continue;
      const w = rectWidth(s.rect);
      if (w < 15 || w > 30) continue;
      let team = teamColor(s.fill);
      const isGoalkeeper = !team && colorDistance(s.fill, COLOR.goalkeeper) < 20;
      if (isGoalkeeper) {
        const border = page.shapes.find((b) => b.stroke && teamColor(b.stroke) && Math.abs(rectCenter(b.rect).x - rectCenter(s.rect).x) < 2 && Math.abs(rectCenter(b.rect).y - rectCenter(s.rect).y) < 2);
        team = border ? teamColor(border.stroke) : null;
      }
      if (!team) continue;
      const numWord = page.words.find((wd) => /^\d+$/.test(wd.str) && insideRect(wordCenter(wd), s.rect, 1));
      if (!numWord) continue;
      side ??= team.side;
      if (isGoalkeeper) gkCenter = rectCenter(s.rect);
      rawNodes.push({ dorsal: Number(numWord.str), center: rectCenter(s.rect) });
    }

    // El equipo puede estar dibujado atacando hacia la izquierda: lo decide la posición del portero
    const attacksRight = !gkCenter || gkCenter.x < (pitch.x0 + pitch.x1) / 2;
    for (const n of rawNodes) {
      nodos.push({ dorsal: n.dorsal, ...horizontalToAttack(n.center, pitch, attacksRight), _center: n.center } as PaniniPassNetwork['nodos'][number] & { _center: { x: number; y: number } });
    }

    // Flechas: cuerpo (polígono negro) + punta (triángulo negro). La punta marca el receptor.
    const black = page.shapes.filter((s) => s.fill === '#000000' && !s.hasCurves && rectInside(s.rect, grass, 2));
    // Cuerpo: polígono de 6 vértices (línea con grosor). Punta: triángulo (3-4 puntos).
    const heads = black.filter((s) => s.points.length <= 4);
    const bodies = black.filter((s) => s.points.length > 4);
    const centers = nodos as (PaniniPassNetwork['nodos'][number] & { _center: { x: number; y: number } })[];
    const nearestNode = (p: { x: number; y: number }) =>
      centers.map((n) => ({ n, d: Math.hypot(n._center.x - p.x, n._center.y - p.y) })).sort((a, b) => a.d - b.d)[0];

    for (const body of bodies) {
      // Cada flecha se dibuja como cuerpo y, a continuación, su punta
      const head = heads.find((h) => h.index === body.index + 1) ?? heads.find((h) => h.index === body.index - 1);
      if (!head) continue;
      // La punta es el vértice del triángulo más alejado del cuerpo
      const bodyCenter = rectCenter(body.rect);
      const tip = head.points.reduce((a, p) => (Math.hypot(p.x - bodyCenter.x, p.y - bodyCenter.y) > Math.hypot(a.x - bodyCenter.x, a.y - bodyCenter.y) ? p : a));
      const far = body.points.reduce((a, p) => (Math.hypot(p.x - tip.x, p.y - tip.y) > Math.hypot(a.x - tip.x, a.y - tip.y) ? p : a));
      const from = nearestNode(far);
      const to = nearestNode(tip);
      if (!from || !to || from.n === to.n) continue;
      enlaces.push({ origen_dorsal: from.n.dorsal, destino_dorsal: to.n.dorsal, pases: 0 });
    }
    for (const n of centers) delete (n as Partial<typeof n>)._center;
  } else {
    warnings.push('Flujos de juego: no se encontró la red de pases');
  }

  // Matriz de pases (tabla bajo el campo): filas "Nombre dorsal valores... total %"
  const daWord = findWord(page, 'DA');
  const totalWord = findWord(page, 'TOTALI');
  const matriz: PaniniPassingMatrix['matriz'] = {};
  const totales_dados: PaniniPassingMatrix['totales_dados'] = {};
  const totales_recibidos: PaniniPassingMatrix['totales_recibidos'] = {};
  const precision: PaniniPassingMatrix['precision_individual_pct'] = {};
  const nombres: Record<number, string> = {};
  let total_equipo_pases = 0;
  let precision_equipo_pct = 0;

  if (daWord && totalWord) {
    const headerRow = rows(page.words.filter((w) => w.y > daWord.y - 2 && w.y < daWord.y + 10 && /^\d+$/.test(w.str) && w.x > daWord.x + 30))[0] ?? [];
    const cols = headerRow.map((w) => ({ dorsal: Number(w.str), x: wordCenter(w).x }));
    const bodyRows = rows(page.words.filter((w) => w.y > daWord.y + 8 && w.y < totalWord.y - 4));
    for (const row of bodyRows) {
      const name = row.find((w) => /[A-Za-z]/.test(w.str) && !/%$/.test(w.str));
      const dorsalWord = row.find((w) => name && w.x > name.x && /^\d+$/.test(w.str));
      if (!name || !dorsalWord) continue;
      const from = Number(dorsalWord.str);
      nombres[from] = clean(name.str);
      matriz[from] = {};
      const pct = row.find((w) => /%$/.test(w.str));
      if (pct) precision[from] = toNum(pct.str);
      const lastCol = cols[cols.length - 1];
      for (const w of row) {
        if (w === name || w === dorsalWord || w === pct) continue;
        const cx = wordCenter(w).x;
        if (lastCol && cx > lastCol.x + 30) {
          totales_dados[from] = toInt(w.str);
          continue;
        }
        const col = cols.reduce((best, c) => (Math.abs(c.x - cx) < Math.abs(best.x - cx) ? c : best), cols[0]);
        if (!col || Math.abs(col.x - cx) > 8) continue;
        const v = w.str === '-' ? 0 : toInt(w.str);
        if (v > 0) matriz[from][col.dorsal] = v;
      }
      totales_dados[from] ??= Object.values(matriz[from]).reduce((a, b) => a + b, 0);
    }
    const totalRow = rows(page.words.filter((w) => w.y > totalWord.y - 4 && w.y < totalWord.y + 12))[0] ?? [];
    for (const w of totalRow) {
      if (w === totalWord) continue;
      const cx = wordCenter(w).x;
      if (/%$/.test(w.str)) precision_equipo_pct = toNum(w.str);
      else if (cols.length && cx > cols[cols.length - 1].x + 30) total_equipo_pases = toInt(w.str);
      else {
        const col = cols.reduce((best, c) => (Math.abs(c.x - cx) < Math.abs(best.x - cx) ? c : best), cols[0]);
        if (col && Math.abs(col.x - cx) < 8) totales_recibidos[col.dorsal] = toInt(w.str);
      }
    }
    // Comprobación: la suma de la matriz debe cuadrar con los totales impresos
    const sum = Object.values(matriz).reduce((acc, r) => acc + Object.values(r).reduce((a, b) => a + b, 0), 0);
    if (total_equipo_pases && sum !== total_equipo_pases) warnings.push(`Matriz de pases: la suma (${sum}) no cuadra con el total (${total_equipo_pases})`);
  } else {
    warnings.push('Flujos de juego: no se encontró la matriz de pases');
  }

  for (const e of enlaces) e.pases = matriz[e.origen_dorsal]?.[e.destino_dorsal] ?? 0;

  const matrizPases: PaniniPassingMatrix = {
    jugadores: nodos.map((n) => ({
      dorsal: n.dorsal,
      nombre: nombres[n.dorsal] ?? '',
      x: n.x,
      y: n.y,
      pases_dados: totales_dados[n.dorsal],
      pases_recibidos: totales_recibidos[n.dorsal],
      precision_pct: precision[n.dorsal],
    })),
    matriz,
    totales_dados,
    totales_recibidos,
    precision_individual_pct: precision,
    total_equipo_pases,
    precision_equipo_pct,
    enlaces,
  };
  // Jugadores de la matriz que no salen en la red (suplentes con pocos pases)
  for (const d of Object.keys(nombres).map(Number)) {
    if (!matrizPases.jugadores.some((j) => j.dorsal === d)) {
      matrizPases.jugadores.push({ dorsal: d, nombre: nombres[d], x: NaN, y: NaN, pases_dados: totales_dados[d], pases_recibidos: totales_recibidos[d], precision_pct: precision[d] });
    }
  }
  matrizPases.jugadores = matrizPases.jugadores.map((j) => (Number.isFinite(j.x) ? j : { ...j, x: undefined as unknown as number, y: undefined as unknown as number }));

  const teamName = clean(rows(page.words.filter((w) => w.y < (grass?.y0 ?? 150) && /^[A-Z][A-Z .'-]+$/.test(w.str) && !/PANINI|FLUSSI/.test(w.str)))[0]?.map((w) => w.str).join(' ') ?? '');
  return { side, teamName, red: { nodos, enlaces } as PaniniPassNetwork, matriz: matrizPases };
};

// ---------------------------------------------------------------------------
// Páginas 12-20 · Zoom sobre jugadores
// ---------------------------------------------------------------------------
type PlayerField = keyof PaniniPlayerStats;
const PLAYER_LABELS: Record<string, { field: PlayerField; kind: 'int' | 'text' }> = {
  'palle giocate': { field: 'balones_jugados', kind: 'int' },
  'possesso palla': { field: 'posesion_tiempo', kind: 'text' },
  'passaggi riusciti': { field: 'pases_acertados', kind: 'int' },
  'giocate utili': { field: 'acciones_utiles', kind: 'int' },
  'palle perse effettive': { field: 'perdidas_efectivas', kind: 'int' },
  'palle recuperate effettive': { field: 'recuperaciones_efectivas', kind: 'text' },
  'palle recuperate in zona area': { field: 'recuperaciones_area', kind: 'int' },
  'palle recuperate in attacco': { field: 'recuperaciones_ataque', kind: 'int' },
  'palle recuperate aeree': { field: 'recuperaciones_aereas', kind: 'int' },
  intercettazioni: { field: 'intercepciones', kind: 'int' },
  'anticipi effettivi': { field: 'anticipaciones_efectivas', kind: 'text' },
  'contrasti effettivi': { field: 'duelos_efectivos', kind: 'text' },
  'falli commessi': { field: 'faltas_cometidas', kind: 'int' },
  'falli subiti': { field: 'faltas_recibidas', kind: 'int' },
  'passaggi lunghi utili': { field: 'pases_largos_utiles', kind: 'text' },
  'dribbling utili': { field: 'regates_utiles', kind: 'text' },
  'cross su azione utili': { field: 'centros_utiles', kind: 'text' },
  'assist vincenti': { field: 'asistencias_pases_clave', kind: 'text' },
  'tiri dentro': { field: 'tiros_a_puerta', kind: 'text' },
  'tiri dentro di destro': { field: 'tiros_derecha', kind: 'text' },
  'tiri dentro di sinistro': { field: 'tiros_izquierda', kind: 'text' },
  'tiri dentro di testa': { field: 'tiros_cabeza', kind: 'text' },
  'palle giocate in zona area': { field: 'balones_jugados_en_area', kind: 'int' },
  'colpi di testa offensivi': { field: 'cabezazos_ofensivos', kind: 'int' },
  'sponde di piede riuscite': { field: 'descargas_primer_toque', kind: 'text' },
  'reti subite': { field: 'goles_encajados', kind: 'int' },
  'tiri dentro subiti': { field: 'tiros_a_puerta_recibidos', kind: 'text' },
  parate: { field: 'paradas', kind: 'int' },
  'parate su occasione': { field: 'paradas_ocasion', kind: 'int' },
  'uscite alte': { field: 'salidas_altas', kind: 'int' },
  'uscite basse': { field: 'salidas_bajas', kind: 'int' },
  'uscite su cross su azione': { field: 'salidas_centro_jugada', kind: 'int' },
  'uscite su calcio piazzato': { field: 'salidas_balon_parado', kind: 'int' },
  'rilanci lunghi utili': { field: 'saques_largos_utiles', kind: 'text' },
};

const ROLE_IT: Record<string, string> = { portiere: 'Portero', difensore: 'Defensa', centrocampista: 'Centrocampista', attaccante: 'Delantero' };

const parseZoomPage = (page: PdfPageContent) => {
  const players: PaniniPlayerStats[] = [];
  const headers = page.words.filter((w) => /^\d+ - .+ - /.test(w.str)).sort((a, b) => a.y - b.y);
  const valueZoneEnd = page.width * 0.53; // a la derecha están los dos mapas por tiempo

  headers.forEach((h, i) => {
    const y0 = h.y - 12;
    const y1 = headers[i + 1] ? headers[i + 1].y - 12 : page.height - 40;
    const [, dorsalStr, nombre, minutos] = h.str.match(/^(\d+) - (.+?) - (.+)$/) ?? [];
    const sub = page.words.find((w) => w.y > h.y && w.y < h.y + 22 && /^\d{4} - /.test(w.str));
    const [anio, rol] = sub?.str.split(' - ') ?? [];

    const stats: PaniniPlayerStats = {
      dorsal: Number(dorsalStr),
      nombre: clean(nombre ?? ''),
      anio_nacimiento: toInt(anio),
      posicion: ROLE_IT[norm(rol ?? '')] ?? clean(rol ?? ''),
      minutos: clean(minutos ?? ''),
      balones_jugados: 0,
      posesion_tiempo: '',
      pases_acertados: 0,
      acciones_utiles: 0,
      perdidas_efectivas: 0,
      recuperaciones_efectivas: '',
      recuperaciones_aereas: 0,
      recuperaciones_area: 0,
      intercepciones: 0,
      anticipaciones_efectivas: '',
      duelos_efectivos: '',
      faltas_cometidas: 0,
      faltas_recibidas: 0,
      pases_largos_utiles: '',
      regates_utiles: '',
      centros_utiles: '',
      asistencias_pases_clave: '',
      tiros_a_puerta: '',
    };
    const otros: Record<string, string> = {};

    // Pares etiqueta/valor en dos columnas
    const blockWords = page.words.filter((w) => w.y > y0 && w.y < y1 && w.x < valueZoneEnd && w !== h && w !== sub);
    for (const row of rows(blockWords)) {
      const labels = row.filter((w) => /[a-z]/i.test(w.str) && !/^\d/.test(w.str));
      for (const label of labels) {
        const next = labels.find((l) => l.x > label.x);
        const value = row.find((w) => w.x > label.x && (!next || w.x < next.x) && !labels.includes(w));
        if (!value) continue;
        const spec = PLAYER_LABELS[norm(label.str)];
        if (spec) (stats as unknown as Record<string, unknown>)[spec.field] = spec.kind === 'int' ? toInt(value.str) : value.str;
        else otros[clean(label.str)] = value.str;
      }
    }
    if (Object.keys(otros).length) stats.otros = otros;

    // Mapas de toques (1T y 2T): campos verticales a la derecha del bloque
    const grasses = findPitches(page, { x0: valueZoneEnd, y0, x1: page.width, y1 }, 60).sort((a, b) => a.x0 - b.x0);
    const toques: PaniniMapEvent[][] = grasses.slice(0, 2).map((grass) => {
      const pitch = pitchLines(page, grass);
      return markersIn(page, grass, 4, 9).map((m) => ({ ...verticalToAttack(m.center, pitch), periodo: m.periodo, balon_parado: m.team.light }));
    });
    stats.toques_1t = (toques[0] ?? []).map((t) => ({ ...t, periodo: '1T' }));
    stats.toques_2t = (toques[1] ?? []).map((t) => ({ ...t, periodo: '2T' }));

    // % por carriles impresos bajo cada mapa ("7 5" = 75); los tercios verticales son imágenes → se calculan
    const distribution = (grass: Rect | undefined, pts: PaniniMapEvent[]) => {
      if (!grass) return undefined;
      const labels = page.words.filter((w) => w.y > grass.y1 - 20 && w.y < grass.y1 + 14 && w.x >= grass.x0 - 5 && w.x <= grass.x1 + 5 && /^[\d ]+$/.test(w.str));
      const lane = (k: number) => {
        const lx0 = grass.x0 + (rectWidth(grass) * k) / 3;
        const w = labels.find((l) => wordCenter(l).x >= lx0 && wordCenter(l).x < lx0 + rectWidth(grass) / 3);
        return w ? spacedNumber(w.str) : 0;
      };
      const n = pts.length || 1;
      const band = (a: number, b: number) => Math.round((pts.filter((p) => p.x >= a && p.x < b).length / n) * 100);
      return { defensa_pct: band(0, 100 / 3), medio_pct: band(100 / 3, 200 / 3), ataque_pct: band(200 / 3, 101), izq_pct: lane(0), cen_pct: lane(1), dcha_pct: lane(2) };
    };
    stats.distribucion_1t = distribution(grasses[0], stats.toques_1t);
    stats.distribucion_2t = distribution(grasses[1], stats.toques_2t);

    players.push(stats);
  });
  return players;
};

// ---------------------------------------------------------------------------
// Páginas 16 / 21 · Rankings Top 5
// ---------------------------------------------------------------------------
const RANKING_KEYS: Record<string, string> = {
  'palle giocate': 'balones_jugados',
  'passaggi riusciti': 'pases_completados',
  'giocate utili': 'acciones_utiles',
  'palle perse': 'perdidas',
  'palle recuperate': 'recuperaciones',
  'falli subiti': 'faltas_recibidas',
  'falli commessi': 'faltas_cometidas',
  assist: 'asistencias',
  tiri: 'tiros',
};

const parseRankings = (page: PdfPageContent) => {
  const out: PaniniTeamData['rankings_top'] = {};
  const titles = page.words.filter((w) => RANKING_KEYS[norm(w.str)]);
  for (const t of titles) {
    const sameRowTitles = titles.filter((o) => Math.abs(o.y - t.y) < 4).sort((a, b) => a.x - b.x);
    const nextX = sameRowTitles.find((o) => o.x > t.x)?.x ?? page.width;
    const nextY = titles.filter((o) => o.y > t.y + 4).sort((a, b) => a.y - b.y)[0]?.y ?? t.y + 90;
    const entries = rows(page.words.filter((w) => w.y > t.y + 4 && w.y < nextY - 4 && w.x >= t.x && w.x < nextX)).map((r) => {
      const name = r.find((w) => /[A-Za-z]/.test(w.str));
      const nums = r.filter((w) => /^\d+$/.test(w.str));
      return name && nums.length >= 2 ? { dorsal: Number(nums[0].str), nombre: clean(name.str), valor: Number(nums[nums.length - 1].str) } : null;
    });
    out[RANKING_KEYS[norm(t.str)]] = entries.filter((e): e is NonNullable<typeof e> => !!e);
  }
  return out;
};

// ---------------------------------------------------------------------------
// Ensamblado del informe
// ---------------------------------------------------------------------------
const emptyBlock = (): PaniniTacticalBlock => ({ sistema: '', longitud_m: 0, anchura_m: 0, densidad_defensa_pct: 0, densidad_medio_pct: 0, densidad_ataque_pct: 0 });
const blockFrom = (d?: PaniniDensityMap): PaniniTacticalBlock =>
  d
    ? { sistema: d.sistema, longitud_m: d.longitud_m, anchura_m: d.anchura_m, densidad_defensa_pct: d.zonas_pct.defensa, densidad_medio_pct: d.zonas_pct.medio, densidad_ataque_pct: d.zonas_pct.ataque }
    : emptyBlock();

export interface PaniniPdfParseResult {
  report: PaniniMatchReport;
  warnings: string[];
}

export function parsePaniniPages(pages: PdfPageContent[], fileName = 'informe.pdf'): PaniniPdfParseResult {
  const warnings: string[] = [];
  const kinds = pages.map(classifyPage);
  const pageOf = (k: PageKind) => pages[kinds.indexOf(k)];
  const pagesOf = (k: PageKind) => pages.filter((_, i) => kinds[i] === k);

  const coverPage = pageOf('cover');
  const lineupsPage = pageOf('lineups');
  if (!coverPage || !lineupsPage) {
    throw new Error('El PDF no parece un informe Panini Digital Match Analysis (no se encontraron portada y alineaciones).');
  }

  const cover = parseCover(coverPage, warnings);
  const lineups = parseLineups(lineupsPage, warnings);
  const scorePage = pageOf('score');
  const score = scorePage ? parseScore(scorePage, warnings) : null;
  if (!scorePage) warnings.push('No se encontró la página de Score');

  const density: Record<Side, Partial<Record<'1T' | '2T', PaniniDensityMap>>> = { home: {}, away: {} };
  for (const p of pagesOf('density')) {
    const d = parseDensityPage(p, warnings);
    if (d.maps.home) density.home[d.periodo] = d.maps.home;
    if (d.maps.away) density.away[d.periodo] = d.maps.away;
  }

  const events: Record<Side, Partial<PaniniEventMaps>> = { home: {}, away: {} };
  const thirds: Record<Side, Partial<Record<EventKey, { defensa: number; medio: number; ataque: number }>>> = { home: {}, away: {} };
  for (const p of [...pagesOf('coverageA'), ...pagesOf('coverageB')]) {
    const c = parseCoverage(p);
    for (const side of ['home', 'away'] as Side[]) {
      Object.assign(events[side], c.events[side]);
      Object.assign(thirds[side], c.thirds[side]);
    }
  }

  const finishing: Partial<Record<Side, ReturnType<typeof parseFinishing>>> = {};
  pagesOf('finishing').forEach((p, i) => {
    const f = parseFinishing(p, warnings);
    const side = f.side ?? (i === 0 ? 'home' : 'away');
    finishing[side] = f;
  });

  const flows: Partial<Record<Side, ReturnType<typeof parseFlows>>> = {};
  pagesOf('flows').forEach((p, i) => {
    const f = parseFlows(p, warnings);
    const side = f.side ?? (i === 0 ? 'home' : 'away');
    flows[side] = f;
  });

  // Fichas y rankings: primero las del local, luego (tras su página de rankings) las del visitante
  const zoom: Record<Side, PaniniPlayerStats[]> = { home: [], away: [] };
  const rankings: Partial<Record<Side, PaniniTeamData['rankings_top']>> = {};
  let current: Side = 'home';
  pages.forEach((p, i) => {
    if (kinds[i] === 'zoom') zoom[current].push(...parseZoomPage(p));
    if (kinds[i] === 'rankings') {
      rankings[current] = parseRankings(p);
      current = 'away';
    }
  });

  const team = (side: Side): PaniniTeamData => {
    const l = side === 'home' ? lineups.home : lineups.away;
    const ev = events[side];
    const th = thirds[side];
    const f = finishing[side];
    const fl = flows[side];
    const emptyFinishing = parseFinishingFallback();
    return {
      nombre: side === 'home' ? cover.local : cover.visitante,
      goles: side === 'home' ? cover.golesLocal : cover.golesVisitante,
      entrenador: l.entrenador,
      xg: side === 'home' ? cover.xgLocal : cover.xgVisitante,
      ims: side === 'home' ? cover.imsLocal : cover.imsVisitante,
      alineacion: l.alineacion,
      suplentes_no_utilizados: l.suplentes,
      estadisticas: score ? score[side] : { primer_tiempo: emptyPeriod(), segundo_tiempo: emptyPeriod(), total_partido: emptyPeriod() },
      bloque_tactico_1t: blockFrom(density[side]['1T']),
      bloque_tactico_2t: blockFrom(density[side]['2T']),
      cobertura_recuperaciones: spatialCategory(ev.recuperaciones, th.recuperaciones),
      cobertura_faltas: spatialCategory(ev.faltas, th.faltas),
      cobertura_acciones_utiles: spatialCategory(ev.acciones_utiles, th.acciones_utiles),
      cobertura_pases_largos: spatialCategory(ev.pases_largos, th.pases_largos),
      cobertura_regates: spatialCategory(ev.regates, th.regates),
      cobertura_centros: spatialCategory(ev.centros, th.centros),
      finalizacion: f?.finalizacion ?? emptyFinishing,
      matriz_pases: fl?.matriz ?? { jugadores: [], matriz: {}, totales_dados: {}, totales_recibidos: {}, precision_individual_pct: {}, total_equipo_pases: 0, precision_equipo_pct: 0 },
      jugadores_stats: zoom[side],
      rankings_top: rankings[side] ?? {},
      densidad_1t: density[side]['1T'],
      densidad_2t: density[side]['2T'],
      mapas_eventos: {
        recuperaciones: ev.recuperaciones ?? [],
        faltas: ev.faltas ?? [],
        acciones_utiles: ev.acciones_utiles ?? [],
        pases_largos: ev.pases_largos ?? [],
        regates: ev.regates ?? [],
        centros: ev.centros ?? [],
      },
      mapa_tiros: f?.mapa_tiros ?? [],
      minutos_tiros: f?.minutos_tiros ?? [],
      goles_porteria: f?.goles_porteria ?? [],
      eficacia_balon_parado: f?.eficacia ?? [],
      red_pases: fl?.red,
    };
  };

  const equipo_local = team('home');
  const equipo_visitante = team('away');

  // Posición media de cada jugador en sus fichas, a partir del campograma de alineaciones
  for (const t of [equipo_local, equipo_visitante]) {
    for (const s of t.jugadores_stats) {
      const p = t.alineacion.find((a) => a.dorsal === s.dorsal);
      if (p?.x !== undefined) {
        s.posicion_media_x = p.x;
        s.posicion_media_y = p.y;
      }
    }
  }

  const timeline: PaniniTimelineEvent[] = [
    ...cover.goleadores.map((g) => ({ minute: g.minuto, type: 'goal' as const, team: g.equipo, player: g.jugador })),
    ...lineups.home.timeline,
    ...lineups.away.timeline,
  ].sort((a, b) => minuteOf(a.minute) - minuteOf(b.minute));

  const report: PaniniMatchReport = {
    fecha: cover.fecha,
    competicion: cover.competicion,
    jornada: cover.jornada,
    estadio: cover.estadio,
    arbitro: cover.arbitro,
    duracion_total: cover.duracion,
    tiempo_efectivo: cover.tiempoEfectivo,
    equipo_local,
    equipo_visitante,
    goleadores: cover.goleadores,
    timeline_eventos: timeline,
    fuente: { tipo: 'pdf_vectorial', archivo: fileName, extraido_en: new Date().toISOString(), version_parser: PANINI_PARSER_VERSION, avisos: warnings },
  };
  return { report, warnings };
}

function parseFinishingFallback(): PaniniFinishingStats {
  return {
    tiros_totales: 0,
    tiros_a_puerta: 0,
    goles: 0,
    ocasiones: 0,
    llegada_jugada: 0,
    llegada_abp_indirecto: 0,
    llegada_abp_directo: 0,
    zona_area_pequena: 0,
    zona_area_penalti: 0,
    zona_fuera_area: 0,
    remate_pie_raso: 0,
    remate_acrobacia: 0,
    remate_cabeza: 0,
    resultado_a_puerta: 0,
    resultado_bloqueado: 0,
    resultado_fuera: 0,
    abp_faltas_derecha: 0,
    abp_faltas_centrales: 0,
    abp_faltas_izquierda: 0,
    abp_corners_derecha: 0,
    abp_corners_izquierda: 0,
    abp_saques_banda_derecha: 0,
    abp_saques_banda_izquierda: 0,
  };
}
