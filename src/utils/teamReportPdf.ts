/**
 * Informe de equipo en PDF (A4 horizontal, un análisis por página) a partir de
 * los informes Panini de la temporada: portada con resumen, tabla acumulada,
 * evolución y campogramas. Todo se dibuja en vectorial con jsPDF.
 */
import type { jsPDF } from 'jspdf';
import type { TFunction } from 'i18next';
import type { SeasonPaniniEntry } from '../services/paniniReports';
import { loadImage, type LoadedImage } from './calendarPdf';
import {
  ALL_METRICS,
  METRIC_BLOCKS,
  TRAMO_SIZE,
  accumulatedGrid,
  chunk,
  deviationColor,
  formatValue,
  isLeagueMatch,
  matchdayLabel,
  mean,
  metricByKey,
  opponentLogo,
  rollingMean,
  summarize,
  type CoverageKey,
  type MetricBlock,
  type MetricDef,
} from './teamPaniniMetrics';

export type TeamReportSection = 'summary' | 'table' | 'evolution' | 'heatmapsOur' | 'heatmapsRival';

export const TEAM_REPORT_SECTIONS: TeamReportSection[] = ['summary', 'table', 'evolution', 'heatmapsOur', 'heatmapsRival'];

export interface TeamReportPdfOptions {
  entries: SeasonPaniniEntry[];
  sections: TeamReportSection[];
  t: TFunction;
  locale: string;
  /** Filtros activos en la página, ya traducidos ("Todos · Temporada") */
  filterLabel: string;
  logoUrl?: string;
}

type RGB = [number, number, number];

// Página A4 apaisada (mm)
const PAGE_W = 297;
const PAGE_H = 210;
const M = 12;
const CONTENT_W = PAGE_W - M * 2;
const CONTENT_TOP = 34;
const CONTENT_BOTTOM = PAGE_H - 14;

// Colores del club (rossoneri) y neutros
const RED: RGB = [219, 0, 48];
const RED_DARK: RGB = [138, 0, 30];
const BLACK: RGB = [17, 17, 20];
const INK: RGB = [31, 35, 43];
const GREY: RGB = [115, 120, 130];
const GREY_LIGHT: RGB = [229, 231, 235];
const PAPER: RGB = [247, 247, 248];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [16, 185, 129];
const AMBER: RGB = [217, 119, 6];
const INDIGO: RGB = [99, 102, 241];
const GRASS: RGB = [22, 101, 52];
const YELLOW: RGB = [250, 204, 21];

const FEATURED = ['pos', 'pass_acc', 'press_h', 'barycenter', 'shots', 'r_chances'];

const HEATMAP_ACTIONS: CoverageKey[] = [
  'cobertura_recuperaciones',
  'cobertura_acciones_utiles',
  'cobertura_pases_largos',
  'cobertura_regates',
  'cobertura_centros',
  'cobertura_faltas',
];

/** Mezcla un color sobre un fondo con la opacidad dada */
const blend = (c: RGB, alpha: number, bg: RGB = WHITE): RGB => [
  Math.round(c[0] * alpha + bg[0] * (1 - alpha)),
  Math.round(c[1] * alpha + bg[1] * (1 - alpha)),
  Math.round(c[2] * alpha + bg[2] * (1 - alpha)),
];

/** "rgba(16, 185, 129, 0.35)" → color opaco equivalente sobre blanco */
const rgbaOnWhite = (rgba: string | undefined): RGB | null => {
  const m = rgba?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return blend([Number(m[1]), Number(m[2]), Number(m[3])], m[4] ? Number(m[4]) : 1);
};

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s|-)(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());

export async function exportTeamReportPdf({ entries, sections, t, locale, filterLabel, logoUrl = '/escudo.png' }: TeamReportPdfOptions) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const teamName = titleCase(entries[entries.length - 1]?.our.nombre || 'Milan Futuro');
  const seasonLabel =
    [...entries].reverse().map((e) => e.report.competicion?.match(/\d{4}\s*[-/]\s*\d{2,4}/)?.[0]).find(Boolean)?.replace(/\s/g, '') ?? '';
  const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(locale, opts);

  // Escudos: el nuestro y los de los rivales
  const logo = await loadImage(logoUrl);
  const crests = new Map<string, LoadedImage | null>();
  await Promise.all(
    [...new Set(entries.map(opponentLogo).filter((u): u is string => !!u))].map(async (url) => {
      crests.set(url, await loadImage(url));
    }),
  );

  // --- Utilidades de dibujo ---
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const draw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (size: number, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };
  const fitText = (text: string, maxW: number) => {
    if (doc.getTextWidth(text) <= maxW) return text;
    let out = text;
    while (out.length > 1 && doc.getTextWidth(`${out}…`) > maxW) out = out.slice(0, -1);
    return `${out.trim()}…`;
  };
  const dashed = (on: boolean) => doc.setLineDashPattern(on ? [1, 0.8] : [], 0);

  const drawImage = (img: LoadedImage, key: string, x: number, y: number, box: number) => {
    const w = img.ratio >= 1 ? box : box * img.ratio;
    const h = img.ratio >= 1 ? box / img.ratio : box;
    doc.addImage(img.dataUrl, 'PNG', x + (box - w) / 2, y + (box - h) / 2, w, h, key, 'FAST');
  };

  const drawCrest = (e: SeasonPaniniEntry, x: number, y: number, size: number) => {
    const url = opponentLogo(e);
    const img = url ? crests.get(url) : null;
    if (img && url) return drawImage(img, url, x, y, size);
    const name = e.rival.nombre || e.match.opponent || '';
    fill(GREY_LIGHT);
    doc.circle(x + size / 2, y + size / 2, size / 2, 'F');
    font(size * 1.3, 'bold');
    ink(GREY);
    doc.text(name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase(), x + size / 2, y + size / 2 + size * 0.17, { align: 'center' });
  };

  /** Franja rossonera vertical (rojo / negro) */
  const stripes = (x: number, y: number, w: number, h: number, count: number, dark: RGB = BLACK) => {
    const sw = w / count;
    for (let i = 0; i < count; i++) {
      fill(i % 2 ? dark : RED);
      doc.rect(x + i * sw, y, sw + 0.05, h, 'F');
    }
  };

  const card = (x: number, y: number, w: number, h: number) => {
    fill(WHITE);
    draw(GREY_LIGHT);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  };

  const matchesLabel = t('teamReport.pdf.matchesCount', { count: entries.length });

  const header = (title: string, subtitle: string) => {
    fill(WHITE);
    doc.rect(0, 0, PAGE_W, 26, 'F');
    stripes(PAGE_W - 17.6, 0, 17.6, 26, 8);

    let titleX = M;
    if (logo) {
      drawImage(logo, 'club-crest', M, 4, 18);
      titleX = M + 23;
    }
    font(17, 'bold');
    ink(BLACK);
    doc.text(title.toUpperCase(), titleX, 13);
    font(8);
    ink(GREY);
    doc.text(fitText(subtitle, 150), titleX, 19.5);

    const rightX = PAGE_W - 17.6 - 5;
    font(9, 'bold');
    ink(BLACK);
    doc.text(teamName.toUpperCase(), rightX, 11, { align: 'right' });
    font(7.5);
    ink(GREY);
    doc.text([seasonLabel && `${t('teamReport.pdf.season')} ${seasonLabel}`, filterLabel, matchesLabel].filter(Boolean).join('  ·  '), rightX, 16.5, { align: 'right' });

    fill(RED);
    doc.rect(0, 26, PAGE_W, 1.1, 'F');
    fill(BLACK);
    doc.rect(0, 27.1, PAGE_W, 0.5, 'F');
  };

  let firstPage = true;
  const newPage = () => {
    if (!firstPage) doc.addPage();
    firstPage = false;
  };

  // =====================================================================
  // Portada y resumen
  // =====================================================================
  const summaryPage = () => {
    newPage();
    const panelW = 100;
    fill(BLACK);
    doc.rect(0, 0, panelW, PAGE_H, 'F');
    stripes(0, PAGE_H - 7, panelW, 7, 14, [45, 45, 50]);
    fill(RED);
    doc.rect(panelW, 0, 1.2, PAGE_H, 'F');

    // Escudo sobre tarjeta blanca
    fill(WHITE);
    doc.roundedRect(panelW / 2 - 22, 24, 44, 44, 4, 4, 'F');
    if (logo) drawImage(logo, 'club-crest', panelW / 2 - 18, 28, 36);

    font(8.5, 'bold');
    ink(RED);
    doc.setCharSpace(0.8);
    doc.text(t('teamReport.pdf.reportTitle').toUpperCase(), panelW / 2, 84, { align: 'center' });
    doc.setCharSpace(0);

    font(24, 'bold');
    ink(WHITE);
    const nameLines = doc.splitTextToSize(teamName.toUpperCase(), panelW - 16) as string[];
    doc.text(nameLines, panelW / 2, 96, { align: 'center' });
    let y = 96 + nameLines.length * 9;

    font(11, 'bold');
    ink([200, 200, 205]);
    if (seasonLabel) {
      doc.text(`${t('teamReport.pdf.season')} ${seasonLabel}`, panelW / 2, y, { align: 'center' });
      y += 7;
    }
    fill(RED);
    doc.rect(panelW / 2 - 10, y - 1, 20, 0.8, 'F');
    y += 8;

    font(8.5);
    ink([170, 170, 178]);
    const first = entries[0]?.match.date;
    const last = entries[entries.length - 1]?.match.date;
    const lines = [
      filterLabel,
      first && last ? `${fmtDate(first)} – ${fmtDate(last)}` : '',
      t('teamReport.pdf.matchesAnalyzed', { count: entries.length }),
    ].filter(Boolean);
    lines.forEach((l, i) => doc.text(l, panelW / 2, y + i * 5.5, { align: 'center' }));

    font(7);
    ink([130, 130, 138]);
    doc.text(t('teamReport.pdf.generated', { date: new Date().toLocaleDateString(locale) }), panelW / 2, PAGE_H - 12, { align: 'center' });

    // --- Columna derecha: KPIs + resultados ---
    const x0 = panelW + 12;
    const w = PAGE_W - x0 - M;
    font(16, 'bold');
    ink(BLACK);
    doc.text(t('teamReport.sections.summary.pdfTitle').toUpperCase(), x0, 20);
    fill(RED);
    doc.rect(x0, 23, 14, 1, 'F');

    const wins = entries.filter((e) => e.our.goles > e.rival.goles).length;
    const draws = entries.filter((e) => e.our.goles === e.rival.goles).length;
    const losses = entries.length - wins - draws;
    const gf = entries.reduce((a, e) => a + (e.our.goles || 0), 0);
    const gc = entries.reduce((a, e) => a + (e.rival.goles || 0), 0);
    const xgf = mean(entries.map((e) => e.our.xg ?? null));
    const xgc = mean(entries.map((e) => e.rival.xg ?? null));
    const pos = mean(entries.map((e) => e.our.estadisticas?.total_partido?.posesion_pct ?? null));
    const n = entries.length;

    const kpis: { label: string; value: string; sub?: string; accent?: boolean }[] = [
      { label: t('teamReport.pdf.kpi.record'), value: `${wins}-${draws}-${losses}`, sub: t('teamReport.pdf.kpi.points', { points: wins * 3 + draws, count: n }), accent: true },
      { label: t('teamReport.pdf.kpi.goals'), value: `${gf} – ${gc}`, sub: `${t('teamReport.pdf.kpi.diff')} ${gf - gc >= 0 ? '+' : ''}${gf - gc}` },
      { label: t('teamReport.pdf.kpi.goalsPerMatch'), value: n ? (gf / n).toFixed(2) : '–', sub: n ? t('teamReport.pdf.kpi.against', { value: (gc / n).toFixed(2) }) : undefined },
      { label: t('teamReport.pdf.kpi.xgFor'), value: xgf !== null ? xgf.toFixed(2) : '–' },
      { label: t('teamReport.pdf.kpi.xgAgainst'), value: xgc !== null ? xgc.toFixed(2) : '–' },
      { label: t('teamReport.pdf.kpi.possession'), value: pos !== null ? `${pos.toFixed(0)}%` : '–' },
    ];
    const kw = (w - 2 * 5) / 3;
    const kh = 21;
    kpis.forEach((k, i) => {
      const kx = x0 + (i % 3) * (kw + 5);
      const ky = 30 + Math.floor(i / 3) * (kh + 5);
      if (k.accent) {
        fill(RED);
        doc.roundedRect(kx, ky, kw, kh, 2.5, 2.5, 'F');
        fill(RED_DARK);
        doc.roundedRect(kx + kw - 18, ky, 18, kh, 2.5, 2.5, 'F');
        doc.rect(kx + kw - 18, ky, 3, kh, 'F');
      } else {
        card(kx, ky, kw, kh);
        fill(RED);
        doc.rect(kx, ky + 4, 0.9, kh - 8, 'F');
      }
      font(6.5, 'bold');
      ink(k.accent ? [255, 205, 215] : GREY);
      doc.setCharSpace(0.3);
      doc.text(k.label.toUpperCase(), kx + 5, ky + 6);
      doc.setCharSpace(0);
      font(16, 'bold');
      ink(k.accent ? WHITE : BLACK);
      doc.text(k.value, kx + 5, ky + 14.5);
      if (k.sub) {
        font(7, 'bold');
        ink(k.accent ? [255, 205, 215] : GREY);
        doc.text(k.sub, kx + 5, ky + 18.8);
      }
    });

    // Resultados
    const listTop = 30 + 2 * kh + 5 + 11;
    font(10, 'bold');
    ink(BLACK);
    doc.text(t('teamReport.pdf.results').toUpperCase(), x0, listTop - 3);

    const twoCols = n > 14;
    const colGap = 6;
    const colW = twoCols ? (w - colGap) / 2 : w;
    const perCol = twoCols ? Math.ceil(n / 2) : n;
    const listH = PAGE_H - 12 - listTop - 6;
    const rowH = Math.min(8, listH / Math.max(perCol, 1));
    const fs = Math.min(8, rowH * 1.05);

    const headY = listTop + 2;
    const cols = (cx: number) => ({
      date: cx + 1,
      comp: cx + (twoCols ? 15 : 20),
      venue: cx + (twoCols ? 28 : 37),
      crest: cx + (twoCols ? 33 : 43),
      rival: cx + (twoCols ? 33 : 43) + rowH,
      score: cx + colW - (twoCols ? 9 : 49),
      xg: cx + colW - 30,
      pos: cx + colW - 3,
    });

    [0, 1].slice(0, twoCols ? 2 : 1).forEach((ci) => {
      const cx = x0 + ci * (colW + colGap);
      const c = cols(cx);
      font(6, 'bold');
      ink(GREY);
      doc.text(t('teamReport.pdf.col.date').toUpperCase(), c.date, headY);
      doc.text(t('teamReport.pdf.col.comp').toUpperCase(), c.comp, headY);
      doc.text(t('teamReport.pdf.col.rival').toUpperCase(), c.crest, headY);
      doc.text(t('teamReport.pdf.col.score').toUpperCase(), c.score, headY, { align: 'center' });
      if (!twoCols) {
        doc.text('xG', c.xg, headY, { align: 'center' });
        doc.text(t('teamReport.pdf.col.possession').toUpperCase(), c.pos, headY, { align: 'right' });
      }
      draw(GREY_LIGHT);
      doc.setLineWidth(0.3);
      doc.line(cx, headY + 1.5, cx + colW, headY + 1.5);
    });

    entries.forEach((e, i) => {
      const ci = twoCols ? Math.floor(i / perCol) : 0;
      const ri = twoCols ? i % perCol : i;
      const cx = x0 + ci * (colW + colGap);
      const c = cols(cx);
      const ry = headY + 2.5 + ri * rowH;
      const mid = ry + rowH / 2;
      if (ri % 2 === 0) {
        fill(PAPER);
        doc.rect(cx, ry, colW, rowH, 'F');
      }
      font(fs, 'normal');
      ink(INK);
      doc.text(fmtDate(e.match.date, { day: '2-digit', month: '2-digit' }), c.date, mid + fs * 0.13);

      const league = isLeagueMatch(e);
      font(fs * 0.85, 'bold');
      ink(league ? GREY : AMBER);
      doc.text(matchdayLabel(e, i), c.comp, mid + fs * 0.13);

      font(fs * 0.85, 'bold');
      ink(e.isHome ? RED : GREY);
      doc.text(e.isHome ? t('teamReport.pdf.home') : t('teamReport.pdf.away'), c.venue, mid + fs * 0.13);

      drawCrest(e, c.crest, ry + 0.8, rowH - 1.6);
      font(fs, 'bold');
      ink(INK);
      const rivalW = c.score - 8 - c.rival - 1;
      doc.text(fitText(e.rival.nombre ? titleCase(e.rival.nombre) : e.match.opponent || '', rivalW), c.rival + 1, mid + fs * 0.13);

      const res = e.our.goles > e.rival.goles ? GREEN : e.our.goles < e.rival.goles ? RED : GREY;
      fill(res);
      doc.roundedRect(c.score - 7.5, ry + rowH * 0.15, 15, rowH * 0.7, 1.2, 1.2, 'F');
      font(fs, 'bold');
      ink(WHITE);
      doc.text(`${e.our.goles} – ${e.rival.goles}`, c.score, mid + fs * 0.13, { align: 'center' });

      if (!twoCols) {
        font(fs * 0.9);
        ink(INK);
        const xg = e.our.xg !== undefined && e.rival.xg !== undefined ? `${Number(e.our.xg).toFixed(2)} – ${Number(e.rival.xg).toFixed(2)}` : '–';
        doc.text(xg, c.xg, mid + fs * 0.13, { align: 'center' });
        const p = e.our.estadisticas?.total_partido?.posesion_pct;
        doc.text(p !== undefined && p !== null ? `${Number(p).toFixed(0)}%` : '–', c.pos, mid + fs * 0.13, { align: 'right' });
      }
    });
  };

  // =====================================================================
  // Tabla acumulada
  // =====================================================================
  type Col = { kind: 'match'; entry: SeasonPaniniEntry; index: number } | { kind: 'tramo'; entries: SeasonPaniniEntry[]; label: string; range: string };

  const tablePages = () => {
    const groups: Col[][] = chunk(entries, TRAMO_SIZE).map((group, gi) => {
      const cols: Col[] = group.map((entry, i) => ({ kind: 'match', entry, index: gi * TRAMO_SIZE + i }));
      const first = matchdayLabel(group[0], gi * TRAMO_SIZE);
      const last = matchdayLabel(group[group.length - 1], gi * TRAMO_SIZE + group.length - 1);
      cols.push({ kind: 'tramo', entries: group, label: t('teamReport.pdf.tramo', { n: gi + 1 }), range: group.length > 1 ? `${first}–${last}` : first });
      return cols;
    });

    const labelW = 60;
    const meanW = 16;
    const gridW = CONTENT_W - labelW - meanW;
    const maxCols = Math.floor(gridW / 10.5);

    // Columnas repartidas por páginas sin partir un tramo
    const colPages: Col[][] = [];
    let current: Col[] = [];
    for (const g of groups) {
      if (current.length && current.length + g.length > maxCols) {
        colPages.push(current);
        current = [];
      }
      current.push(...g);
    }
    if (current.length) colPages.push(current);

    type Row = { kind: 'block'; block: MetricBlock } | { kind: 'metric'; metric: MetricDef; block: MetricBlock };
    const rowsAll: Row[] = METRIC_BLOCKS.flatMap((block) => [{ kind: 'block', block } as Row, ...block.metrics.map((metric) => ({ kind: 'metric', metric, block }) as Row)]);
    const stats = new Map(ALL_METRICS.map((m) => [m.key, { values: entries.map(m.get), s: summarize(entries.map(m.get)) }]));

    const legendY = CONTENT_TOP - 1;
    const headTop = CONTENT_TOP + 4;
    const headH = 17;
    const bodyTop = headTop + headH;
    const blockH = 5.2;
    const rowH = 4.25;

    // Filas repartidas por páginas (se repite el título del bloque al continuar)
    const rowPages: Row[][] = [];
    let page: Row[] = [];
    let y = bodyTop;
    for (const row of rowsAll) {
      const h = row.kind === 'block' ? blockH : rowH;
      const needsRoom = row.kind === 'block' ? blockH + rowH * 2 : h;
      if (y + needsRoom > CONTENT_BOTTOM) {
        rowPages.push(page);
        page = [];
        y = bodyTop;
        if (row.kind === 'metric') {
          page.push({ kind: 'block', block: row.block });
          y += blockH;
        }
      }
      page.push(row);
      y += h;
    }
    if (page.length) rowPages.push(page);

    const total = colPages.length * rowPages.length;
    let pageNo = 0;

    for (const cols of colPages) {
      const colW = Math.min(30, gridW / cols.length);
      const tableW = labelW + meanW + colW * cols.length;
      const colX = (i: number) => M + labelW + meanW + i * colW;

      for (const rows of rowPages) {
        pageNo++;
        newPage();
        header(
          `${t('teamReport.sections.table.pdfTitle')}${total > 1 ? `  (${pageNo}/${total})` : ''}`,
          t('teamReport.pdf.tableSubtitle', { n: TRAMO_SIZE }),
        );

        // Leyenda
        const legend: [RGB | 'tri', string][] = [
          [blend(GREEN, 0.45), t('teamReport.pdf.better')],
          [blend(RED, 0.45), t('teamReport.pdf.worse')],
          [GREY_LIGHT, t('teamReport.pdf.neutral')],
          ['tri', t('teamReport.pdf.lowerBetter')],
        ];
        font(6.5, 'bold');
        let lx = M + tableW;
        for (const [c, label] of [...legend].reverse()) {
          const tw = doc.getTextWidth(label);
          lx -= tw;
          ink(GREY);
          doc.text(label, lx, legendY + 1.2);
          lx -= 4;
          if (c === 'tri') {
            fill(GREY);
            doc.triangle(lx, legendY - 0.6, lx + 2.4, legendY - 0.6, lx + 1.2, legendY + 1.2, 'F');
          } else {
            fill(c);
            doc.roundedRect(lx, legendY - 1, 2.8, 2.8, 0.5, 0.5, 'F');
          }
          lx -= 5;
        }

        // Cabecera de columnas
        font(6.5, 'bold');
        ink(GREY);
        doc.setCharSpace(0.3);
        doc.text(t('teamReport.pdf.metric').toUpperCase(), M + 2, headTop + headH - 3);
        doc.setCharSpace(0);
        fill(BLACK);
        doc.rect(M + labelW, headTop, meanW, headH, 'F');
        font(7, 'bold');
        ink(WHITE);
        doc.text(t('teamReport.pdf.mean').toUpperCase(), M + labelW + meanW / 2, headTop + headH - 3, { align: 'center' });

        cols.forEach((col, i) => {
          const cx = colX(i);
          const mid = cx + colW / 2;
          if (col.kind === 'match') {
            const e = col.entry;
            font(7, 'bold');
            ink(isLeagueMatch(e) ? BLACK : AMBER);
            doc.text(matchdayLabel(e, col.index), mid, headTop + 3.3, { align: 'center' });
            drawCrest(e, mid - 2.7, headTop + 4.6, 5.4);
            font(5.8, 'bold');
            ink(e.isHome ? RED : GREY);
            doc.text(`${e.isHome ? t('teamReport.pdf.home') : t('teamReport.pdf.away')}  ${e.our.goles}–${e.rival.goles}`, mid, headTop + headH - 2.6, { align: 'center' });
          } else {
            fill(PAPER);
            doc.rect(cx, headTop, colW, headH, 'F');
            fill(RED);
            doc.rect(cx, headTop, colW, 0.8, 'F');
            font(6.3, 'bold');
            ink(BLACK);
            doc.text(fitText(col.label.toUpperCase(), colW - 1), mid, headTop + headH - 6, { align: 'center' });
            font(5.5, 'bold');
            ink(GREY);
            doc.text(fitText(col.range, colW - 1), mid, headTop + headH - 2.6, { align: 'center' });
          }
        });
        draw(BLACK);
        doc.setLineWidth(0.4);
        doc.line(M, bodyTop, M + tableW, bodyTop);

        // Filas
        let ry = bodyTop;
        let zebra = 0;
        for (const row of rows) {
          if (row.kind === 'block') {
            fill(PAPER);
            doc.rect(M, ry, tableW, blockH, 'F');
            fill(RED);
            doc.rect(M + 1.5, ry + 1.1, 0.9, blockH - 2.2, 'F');
            font(6.8, 'bold');
            ink(INK);
            doc.setCharSpace(0.4);
            doc.text(row.block.label.toUpperCase(), M + 4, ry + blockH / 2 + 1.1);
            doc.setCharSpace(0);
            ry += blockH;
            zebra = 0;
            continue;
          }
          const { metric } = row;
          const { values, s } = stats.get(metric.key)!;
          const baseline = ry + rowH / 2 + 1;
          if (zebra++ % 2) {
            fill([251, 251, 252]);
            doc.rect(M, ry, labelW, rowH, 'F');
          }
          font(6.6);
          ink(INK);
          const label = fitText(metric.label, labelW - (metric.better === 'low' ? 8 : 4));
          doc.text(label, M + 2, baseline);
          if (metric.better === 'low') {
            const tx = M + 2 + doc.getTextWidth(label) + 1.4;
            fill(GREY);
            doc.triangle(tx, ry + rowH / 2 - 0.9, tx + 2, ry + rowH / 2 - 0.9, tx + 1, ry + rowH / 2 + 0.7, 'F');
          }

          fill(BLACK);
          doc.rect(M + labelW, ry, meanW, rowH, 'F');
          font(6.6, 'bold');
          ink(WHITE);
          doc.text(formatValue(s.mean, metric), M + labelW + meanW / 2, baseline, { align: 'center' });

          cols.forEach((col, i) => {
            const cx = colX(i);
            const v = col.kind === 'match' ? values[col.index] : mean(col.entries.map(metric.get));
            const bg = rgbaOnWhite(deviationColor(v, s, metric.better)) ?? (col.kind === 'tramo' ? PAPER : null);
            if (bg) {
              fill(bg);
              doc.rect(cx, ry, colW, rowH, 'F');
            }
            font(col.kind === 'tramo' ? 6.4 : 6.2, col.kind === 'tramo' ? 'bold' : 'normal');
            ink(v === null ? GREY : INK);
            doc.text(fitText(formatValue(v, metric), colW - 0.8), cx + colW / 2, baseline, { align: 'center' });
          });

          draw(GREY_LIGHT);
          doc.setLineWidth(0.12);
          doc.line(M, ry + rowH, M + tableW, ry + rowH);
          ry += rowH;
        }

        // Separadores verticales de los tramos
        draw([210, 212, 218]);
        doc.setLineWidth(0.2);
        cols.forEach((col, i) => {
          if (col.kind !== 'tramo') return;
          doc.line(colX(i), headTop, colX(i), ry);
          doc.line(colX(i) + colW, headTop, colX(i) + colW, ry);
        });
      }
    }
  };

  // =====================================================================
  // Evolución
  // =====================================================================
  const niceDomain = (vals: number[], fromZero = false): [number, number] => {
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (fromZero || lo >= 0) lo = fromZero ? 0 : Math.max(0, lo - (hi - lo) * 0.35);
    const span = hi - lo || Math.abs(hi) * 0.2 || 1;
    hi += span * 0.15;
    if (!fromZero && lo > 0) lo = Math.max(0, lo - span * 0.05);
    return [lo, hi];
  };

  const compact = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, ''));

  const axes = (px: number, py: number, pw: number, ph: number, lo: number, hi: number, labels: string[]) => {
    const yOf = (v: number) => py + ph - ((v - lo) / (hi - lo)) * ph;
    font(5.3);
    ink(GREY);
    draw(GREY_LIGHT);
    doc.setLineWidth(0.15);
    for (let k = 0; k <= 3; k++) {
      const v = lo + ((hi - lo) * k) / 3;
      const gy = yOf(v);
      dashed(k > 0);
      doc.line(px, gy, px + pw, gy);
      doc.text(compact(v), px - 1.5, gy + 0.9, { align: 'right' });
    }
    dashed(false);
    const slot = pw / Math.max(labels.length, 1);
    const step = labels.length > 20 ? 2 : 1;
    labels.forEach((l, i) => {
      if (i % step) return;
      doc.text(l, px + slot * i + slot / 2, py + ph + 3.6, { align: 'center' });
    });
    return { yOf, slot };
  };

  const metricChart = (x: number, y: number, w: number, h: number, metric: MetricDef, big = false) => {
    card(x, y, w, h);
    const values = entries.map(metric.get);
    const rolling = rollingMean(values);
    const s = summarize(values);

    font(big ? 8.5 : 7.3, 'bold');
    ink(BLACK);
    doc.text(fitText(metric.label.toUpperCase(), w - 26), x + 4, y + 6);
    const meanText = formatValue(s.mean, metric);
    font(big ? 11 : 9.5, 'bold');
    ink(RED);
    doc.text(meanText, x + w - 4, y + 6.4, { align: 'right' });
    const meanW = doc.getTextWidth(meanText);
    font(5.2, 'bold');
    ink(GREY);
    doc.text(t('teamReport.pdf.mean').toUpperCase(), x + w - 4 - meanW - 1.5, y + 6.2, { align: 'right' });

    const px = x + 11;
    const py = y + 10;
    const pw = w - 15;
    const ph = h - 10 - 6.5;
    const nums = [...values, ...rolling, s.mean].filter((v): v is number => v !== null);
    if (!nums.length) {
      font(7, 'bold');
      ink(GREY);
      doc.text(t('teamReport.pdf.noData'), x + w / 2, y + h / 2 + 2, { align: 'center' });
      return;
    }
    const [lo, hi] = niceDomain(nums);
    const { yOf, slot } = axes(px, py, pw, ph, lo, hi, entries.map(matchdayLabel));
    const barW = Math.min(slot * 0.62, big ? 9 : 6);

    values.forEach((v, i) => {
      if (v === null) return;
      let c: RGB = INDIGO;
      if (s.mean !== null && metric.better !== 'neutral') c = (metric.better === 'high') === v >= s.mean ? GREEN : RED;
      fill(blend(c, 0.82));
      const top = yOf(v);
      const bx = px + slot * i + (slot - barW) / 2;
      doc.roundedRect(bx, top, barW, py + ph - top, Math.min(0.8, barW / 4), Math.min(0.8, barW / 4), 'F');
      doc.rect(bx, Math.max(top, py + ph - 1), barW, Math.min(1, py + ph - top), 'F');
    });

    if (s.mean !== null) {
      draw(BLACK);
      doc.setLineWidth(0.25);
      dashed(true);
      doc.line(px, yOf(s.mean), px + pw, yOf(s.mean));
      dashed(false);
    }

    draw(BLACK);
    doc.setLineWidth(big ? 0.55 : 0.45);
    let prev: [number, number] | null = null;
    rolling.forEach((v, i) => {
      if (v === null) return;
      const pt: [number, number] = [px + slot * i + slot / 2, yOf(v)];
      if (prev) doc.line(prev[0], prev[1], pt[0], pt[1]);
      prev = pt;
    });
    fill(BLACK);
    rolling.forEach((v, i) => {
      if (v !== null) doc.circle(px + slot * i + slot / 2, yOf(v), big ? 0.6 : 0.45, 'F');
    });
  };

  const legendItem = (x: number, y: number, kind: 'bar' | 'line' | 'dash', c: RGB, label: string) => {
    if (kind === 'bar') {
      fill(c);
      doc.roundedRect(x, y - 2, 2.6, 2.6, 0.4, 0.4, 'F');
    } else {
      draw(c);
      doc.setLineWidth(0.6);
      dashed(kind === 'dash');
      doc.line(x, y - 0.7, x + 4, y - 0.7);
      dashed(false);
    }
    font(6, 'bold');
    ink(GREY);
    doc.text(label, x + (kind === 'bar' ? 3.6 : 5), y);
    return x + (kind === 'bar' ? 3.6 : 5) + doc.getTextWidth(label) + 4;
  };

  const xgChart = (x: number, y: number, w: number, h: number) => {
    card(x, y, w, h);
    font(8.5, 'bold');
    ink(BLACK);
    doc.text(t('teamReport.pdf.goalsVsXg').toUpperCase(), x + 4, y + 6);
    let lx = x + 4;
    const ly = y + 11.5;
    lx = legendItem(lx, ly, 'bar', RED, t('teamReport.pdf.goalsFor'));
    lx = legendItem(lx, ly, 'bar', BLACK, t('teamReport.pdf.goalsAgainst'));
    lx = legendItem(lx, ly, 'line', RED, t('teamReport.pdf.xgFor'));
    legendItem(lx, ly, 'dash', GREY, t('teamReport.pdf.xgAgainst'));

    const px = x + 11;
    const py = y + 15;
    const pw = w - 15;
    const ph = h - 15 - 6.5;
    const gf = entries.map((e) => (typeof e.our.goles === 'number' ? e.our.goles : null));
    const gc = entries.map((e) => (typeof e.rival.goles === 'number' ? e.rival.goles : null));
    const xf = entries.map((e) => (e.our.xg !== undefined && e.our.xg !== null ? Number(e.our.xg) : null));
    const xc = entries.map((e) => (e.rival.xg !== undefined && e.rival.xg !== null ? Number(e.rival.xg) : null));
    const nums = [...gf, ...gc, ...xf, ...xc].filter((v): v is number => v !== null);
    const [lo, hi] = niceDomain(nums.length ? nums : [0, 1], true);
    const { yOf, slot } = axes(px, py, pw, ph, lo, Math.max(hi, 1), entries.map(matchdayLabel));
    const bw = Math.min(slot * 0.3, 5);

    entries.forEach((_, i) => {
      const cx = px + slot * i + slot / 2;
      ([
        [gf[i], RED, cx - bw - 0.2],
        [gc[i], BLACK, cx + 0.2],
      ] as const).forEach(([v, c, bx]) => {
        if (v === null || v <= 0) return;
        fill(c);
        doc.rect(bx, yOf(v), bw, py + ph - yOf(v), 'F');
      });
    });

    ([
      [xf, RED, false],
      [xc, GREY, true],
    ] as const).forEach(([vals, c, dash]) => {
      draw(c);
      doc.setLineWidth(0.6);
      dashed(dash);
      let prev: [number, number] | null = null;
      vals.forEach((v, i) => {
        if (v === null) return;
        const pt: [number, number] = [px + slot * i + slot / 2, yOf(v)];
        if (prev) doc.line(prev[0], prev[1], pt[0], pt[1]);
        prev = pt;
      });
      dashed(false);
      fill(c);
      vals.forEach((v, i) => {
        if (v !== null) doc.circle(px + slot * i + slot / 2, yOf(v), 0.6, 'F');
      });
    });
  };

  const trendTable = (x: number, y: number, w: number, h: number, metrics: MetricDef[]) => {
    card(x, y, w, h);
    font(8.5, 'bold');
    ink(BLACK);
    doc.text(t('teamReport.pdf.trend').toUpperCase(), x + 4, y + 6);
    font(6, 'normal');
    ink(GREY);
    doc.text(t('teamReport.pdf.trendHint', { n: TRAMO_SIZE }), x + 4, y + 10.5);

    const cMean = x + w - 38;
    const cLast = x + w - 20;
    const cTrend = x + w - 6;
    const top = y + 16;
    font(5.8, 'bold');
    ink(GREY);
    doc.text(t('teamReport.pdf.mean').toUpperCase(), cMean, top, { align: 'center' });
    doc.text(t('teamReport.pdf.lastN', { n: TRAMO_SIZE }).toUpperCase(), cLast, top, { align: 'center' });
    draw(GREY_LIGHT);
    doc.setLineWidth(0.25);
    doc.line(x + 3, top + 1.5, x + w - 3, top + 1.5);

    const rh = (y + h - 3 - (top + 2)) / metrics.length;
    metrics.forEach((m, i) => {
      const values = entries.map(m.get);
      const s = summarize(values);
      const recent = mean(values.slice(-TRAMO_SIZE));
      const ry = top + 2 + i * rh;
      const base = ry + rh / 2 + 1;
      if (i % 2 === 0) {
        fill(PAPER);
        doc.rect(x + 3, ry, w - 6, rh, 'F');
      }
      font(6.8, 'bold');
      ink(INK);
      doc.text(fitText(m.label, cMean - 10 - (x + 5)), x + 5, base);
      font(6.8);
      doc.text(formatValue(s.mean, m), cMean, base, { align: 'center' });
      font(6.8, 'bold');
      doc.text(formatValue(recent, m), cLast, base, { align: 'center' });

      // Flecha de tendencia: últimos N frente a la media
      if (recent === null || s.mean === null) return;
      const diff = recent - s.mean;
      const flat = Math.abs(diff) < Math.max(Math.abs(s.mean) * 0.02, 1e-6);
      const good = m.better === 'neutral' ? null : (m.better === 'high') === diff > 0;
      fill(flat || good === null ? GREY : good ? GREEN : RED);
      const cy = ry + rh / 2;
      if (flat) doc.rect(cTrend - 1.4, cy - 0.35, 2.8, 0.7, 'F');
      else if (diff > 0) doc.triangle(cTrend - 1.5, cy + 1, cTrend + 1.5, cy + 1, cTrend, cy - 1.2, 'F');
      else doc.triangle(cTrend - 1.5, cy - 1, cTrend + 1.5, cy - 1, cTrend, cy + 1.2, 'F');
    });
  };

  const evolutionPage = () => {
    newPage();
    header(t('teamReport.sections.evolution.pdfTitle'), t('teamReport.pdf.evolutionSubtitle', { n: TRAMO_SIZE }));
    const featured = FEATURED.map(metricByKey).filter((m): m is MetricDef => !!m);
    const topH = 72;
    const gap = 5;
    const leftW = 162;
    xgChart(M, CONTENT_TOP, leftW, topH);
    trendTable(M + leftW + gap, CONTENT_TOP, CONTENT_W - leftW - gap, topH, featured);

    const smallTop = CONTENT_TOP + topH + gap;
    const sw = (CONTENT_W - 2 * gap) / 3;
    const sh = (CONTENT_BOTTOM - smallTop - gap) / 2;
    featured.forEach((m, i) => metricChart(M + (i % 3) * (sw + gap), smallTop + Math.floor(i / 3) * (sh + gap), sw, sh, m));
  };

  // =====================================================================
  // Campogramas acumulados
  // =====================================================================
  const PW = 105;
  const PH = 68;

  const pitch = (x: number, y: number, w: number, grid: number[][], color: RGB) => {
    const k = w / PW;
    const h = PH * k;
    fill(GRASS);
    doc.rect(x, y, w, h, 'F');
    for (let i = 0; i < 10; i += 2) {
      fill(blend(WHITE, 0.035, GRASS));
      doc.rect(x + (w / 10) * i, y, w / 10, h, 'F');
    }

    const max = Math.max(...grid.flat(), 1);
    const cw = w / 3;
    const ch = h / 3;
    grid.forEach((row, r) =>
      row.forEach((v, c) => {
        fill(blend(color, 0.1 + (v / max) * 0.78, GRASS));
        doc.rect(x + c * cw, y + r * ch, cw + 0.02, ch + 0.02, 'F');
      }),
    );

    // Líneas del campo
    const line: RGB = [225, 240, 230];
    draw(line);
    doc.setLineWidth(0.25);
    const P = (px: number, py: number): [number, number] => [x + px * k, y + py * k];
    const rect = (px: number, py: number, pw: number, ph: number) => doc.rect(P(px, py)[0], P(px, py)[1], pw * k, ph * k, 'S');
    rect(0.5, 0.5, PW - 1, PH - 1);
    doc.line(...P(PW / 2, 0.5), ...P(PW / 2, PH - 0.5));
    doc.circle(...P(PW / 2, PH / 2), 9.15 * k, 'S');
    rect(0.5, PH / 2 - 20.16, 16.5, 40.32);
    rect(0.5, PH / 2 - 9.16, 5.5, 18.32);
    rect(PW - 17, PH / 2 - 20.16, 16.5, 40.32);
    rect(PW - 6, PH / 2 - 9.16, 5.5, 18.32);
    // Semicírculos del área
    const arc = (cx: number, dir: 1 | -1) => {
      const a = Math.acos(5.5 / 9.15);
      const steps = 12;
      for (let s = 0; s < steps; s++) {
        const t0 = -a + ((2 * a) / steps) * s;
        const t1 = -a + ((2 * a) / steps) * (s + 1);
        doc.line(...P(cx + dir * 9.15 * Math.cos(t0), PH / 2 + 9.15 * Math.sin(t0)), ...P(cx + dir * 9.15 * Math.cos(t1), PH / 2 + 9.15 * Math.sin(t1)));
      }
    };
    arc(11, 1);
    arc(PW - 11, -1);

    // Tercios y carriles
    draw(blend(WHITE, 0.4, GRASS));
    doc.setLineWidth(0.15);
    dashed(true);
    [1, 2].forEach((i) => {
      doc.line(x + cw * i, y, x + cw * i, y + h);
      doc.line(x, y + ch * i, x + w, y + ch * i);
    });
    dashed(false);

    grid.forEach((row, r) =>
      row.forEach((v, c) => {
        const size = v === max ? 9 : 7.5;
        const label = `${v.toFixed(0)}%`;
        font(size, 'bold');
        const tx = x + c * cw + cw / 2;
        const cy = y + r * ch + ch / 2;
        const pw = doc.getTextWidth(label) + 2.6;
        const cell = blend(color, 0.1 + (v / max) * 0.78, GRASS);
        fill(v === max ? BLACK : blend(BLACK, 0.55, cell));
        doc.roundedRect(tx - pw / 2, cy - size * 0.24, pw, size * 0.48, size * 0.2, size * 0.2, 'F');
        ink(WHITE);
        doc.text(label, tx, cy + size * 0.125, { align: 'center' });
      }),
    );

    // Dirección de ataque
    draw(WHITE);
    doc.setLineWidth(0.4);
    const ay = y + h - 2.5;
    doc.line(x + w - 13, ay, x + w - 4, ay);
    doc.line(x + w - 5.8, ay - 1.3, x + w - 4, ay);
    doc.line(x + w - 5.8, ay + 1.3, x + w - 4, ay);
    return h;
  };

  const zones = [t('teamReport.pdf.zones.defense'), t('teamReport.pdf.zones.middle'), t('teamReport.pdf.zones.attack')];

  const heatmapPage = (side: 'our' | 'rival') => {
    newPage();
    const color = side === 'our' ? RED : YELLOW;
    header(
      side === 'our' ? t('teamReport.sections.heatmapsOur.pdfTitle', { team: teamName }) : t('teamReport.sections.heatmapsRival.pdfTitle'),
      t('teamReport.pdf.heatmapsSubtitle'),
    );

    const gap = 5;
    const cw = (CONTENT_W - 3 * gap) / 4;
    const pw = cw - 6;
    const ph = (PH / PW) * pw;
    const chH = 9 + ph + 10;
    const totalH = chH * 2 + gap;
    const top = CONTENT_TOP + Math.max(0, (CONTENT_BOTTOM - CONTENT_TOP - totalH) / 2) - 2;

    const cells: ({ kind: 'pitch'; key: CoverageKey } | { kind: 'legend' })[] = [...HEATMAP_ACTIONS.map((key) => ({ kind: 'pitch' as const, key })), { kind: 'legend' }];

    cells.forEach((cell, i) => {
      const x = M + (i % 4) * (cw + gap);
      const y = top + Math.floor(i / 4) * (chH + gap);
      if (cell.kind === 'legend') {
        fill(BLACK);
        doc.roundedRect(x, y, cw, chH, 2, 2, 'F');
        stripes(x + cw - 9, y, 9, 2.2, 6, [60, 60, 66]);
        font(8, 'bold');
        ink(WHITE);
        doc.text(t('teamReport.pdf.howToRead').toUpperCase(), x + 4, y + 8);
        font(6.6);
        ink([200, 200, 206]);
        const text = doc.splitTextToSize(t('teamReport.pdf.howToReadText'), cw - 8) as string[];
        doc.text(text, x + 4, y + 13.5, { lineHeightFactor: 1.35 });

        // Escala de color
        const sy = y + chH - 13;
        const sw = cw - 8;
        for (let s = 0; s < 20; s++) {
          fill(blend(color, 0.1 + (s / 19) * 0.78, GRASS));
          doc.rect(x + 4 + (sw / 20) * s, sy, sw / 20 + 0.05, 3.2, 'F');
        }
        font(5.8, 'bold');
        ink([170, 170, 178]);
        doc.text(t('teamReport.pdf.less'), x + 4, sy + 6.5);
        doc.text(t('teamReport.pdf.more'), x + 4 + sw, sy + 6.5, { align: 'right' });
        return;
      }

      card(x, y, cw, chH);
      font(7.8, 'bold');
      ink(BLACK);
      doc.text(fitText(t(`teamReport.pdf.actions.${cell.key}`).toUpperCase(), cw - 20), x + 3, y + 6);
      const pj = t('teamReport.pdf.matchesCount', { count: entries.length });
      font(5.8, 'bold');
      const pjW = doc.getTextWidth(pj) + 3.5;
      fill(PAPER);
      doc.roundedRect(x + cw - 3 - pjW, y + 2.8, pjW, 4, 1.8, 1.8, 'F');
      ink(GREY);
      doc.text(pj, x + cw - 3 - pjW / 2, y + 5.6, { align: 'center' });

      const grid = accumulatedGrid(entries, cell.key, side);
      const py = y + 9;
      if (grid.length) {
        pitch(x + 3, py, pw, grid, color);
      } else {
        fill(PAPER);
        doc.roundedRect(x + 3, py, pw, ph, 1.5, 1.5, 'F');
        font(7, 'bold');
        ink(GREY);
        doc.text(t('teamReport.pdf.noData'), x + 3 + pw / 2, py + ph / 2 + 1, { align: 'center' });
      }
      // Total por tercio bajo cada campo
      zones.forEach((z, zi) => {
        const zx = x + 3 + (pw / 3) * zi + pw / 6;
        font(5.4, 'bold');
        ink(GREY);
        doc.text(z.toUpperCase(), zx, py + ph + 3.6, { align: 'center' });
        if (!grid.length) return;
        font(7, 'bold');
        ink(BLACK);
        doc.text(`${grid.reduce((a, row) => a + row[zi], 0).toFixed(0)}%`, zx, py + ph + 7, { align: 'center' });
      });
    });
  };

  // =====================================================================
  const selected = TEAM_REPORT_SECTIONS.filter((s) => sections.includes(s));
  for (const section of selected) {
    if (section === 'summary') summaryPage();
    if (section === 'table') tablePages();
    if (section === 'evolution') evolutionPage();
    if (section === 'heatmapsOur') heatmapPage('our');
    if (section === 'heatmapsRival') heatmapPage('rival');
  }

  footer(doc, t, teamName, selected[0] === 'summary');
  const safe = teamName.replace(/[^\p{L}\p{N}]+/gu, '_');
  doc.save(`Informe_Equipo_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** Pie de página con numeración (se dibuja al final, cuando se conoce el total) */
function footer(doc: jsPDF, t: TFunction, teamName: string, hasCover: boolean) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    // En la portada el pie empieza tras el panel negro
    const x0 = hasCover && p === 1 ? 112 : M;
    doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
    doc.setLineWidth(0.2);
    doc.line(x0, PAGE_H - 9.5, PAGE_W - M, PAGE_H - 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(`${teamName} · ${t('teamReport.pdf.reportTitle')} · ${t('teamReport.pdf.source')}`, x0, PAGE_H - 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(t('teamReport.pdf.page', { page: p, total }), PAGE_W - M, PAGE_H - 5.5, { align: 'right' });
  }
}
