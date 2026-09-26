/**
 * Squad Statistics Report in PDF (A4 horizontal / landscape).
 * Includes AC Milan branding, escudo, comparative metrics tables,
 * top player rankings per metric, and tactical pitch with average positions.
 */
import type { TFunction } from 'i18next';
import { loadImage } from './calendarPdf';
import {
  PLAYER_METRICS,
  aggValue,
  averagePosition,
  formatMetric,
  rankPlayers,
  type CompetitionFilter,
  type PlayerAggregate,
  type ValueMode,
} from './playerPaniniStats';
import type { Player } from '../components/types';

export type SquadStatsPdfSection = 'rankings' | 'table' | 'positions' | 'participation';

export const SQUAD_STATS_PDF_SECTIONS: SquadStatsPdfSection[] = [
  'rankings',
  'table',
  'positions',
  'participation',
];

export interface SquadStatsPdfOptions {
  squad: PlayerAggregate[];
  lines?: unknown[];
  playerDbInfoMap?: Map<string, Player>;
  sections: SquadStatsPdfSection[];
  t: TFunction;
  locale?: string;
  competitionFilter?: CompetitionFilter;
  valueMode?: ValueMode;
  minMinutes?: number;
  logoUrl?: string;
}

type RGB = [number, number, number];

// A4 Horizontal (mm)
const PAGE_W = 297;
const PAGE_H = 210;
const M = 12;
const USABLE_W = PAGE_W - M * 2;

// Colores del club
const RED: RGB = [219, 0, 48];
const BLACK: RGB = [17, 17, 20];
const INK: RGB = [30, 35, 45];
const GREY: RGB = [105, 112, 125];
const GREY_LIGHT: RGB = [230, 233, 238];
const PAPER: RGB = [248, 249, 250];
const WHITE: RGB = [255, 255, 255];

const ROLE_COLORS: Record<string, RGB> = {
  P: [245, 158, 11],
  D: [59, 130, 246],
  C: [16, 185, 129],
  A: [219, 0, 48],
};

export async function exportSquadStatsPdf({
  squad,
  playerDbInfoMap,
  sections,
  t,
  competitionFilter = 'all',
  valueMode = 'total',
  minMinutes = 90,
  logoUrl = '/escudo.png',
}: SquadStatsPdfOptions) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const logoImg = await loadImage(logoUrl);
  let pageNum = 1;

  const compLabel =
    competitionFilter === 'league' ? 'Liga' : competitionFilter === 'cup' ? 'Copa' : 'Todas las competiciones';
  const modeLabel = valueMode === 'per90' ? 'Valores por 90 min' : 'Valores totales';

  const drawPageHeader = (title: string, subtitle?: string) => {
    // Fondo superior rossonero
    doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.rect(0, 0, PAGE_W, 20, 'F');

    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.rect(0, 19, PAGE_W, 1.2, 'F');

    // Escudo Milan
    if (logoImg) {
      doc.addImage(logoImg.dataUrl, 'PNG', M, 3, 14, 14);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.text('AC MILAN FUTURO · INFORME ESTADÍSTICO DE LA PLANTILLA', M + (logoImg ? 17 : 0), 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 205, 215);
    doc.text(`${title} · ${compLabel} · ${modeLabel} (Partido Completo)`, M + (logoImg ? 17 : 0), 14.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text('TEMPORADA 2026/27', PAGE_W - M, 10, { align: 'right' });

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(180, 185, 195);
      doc.text(subtitle, PAGE_W - M, 14.5, { align: 'right' });
    }
  };

  const drawFooter = (curPage: number) => {
    doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
    doc.setLineWidth(0.3);
    doc.line(M, PAGE_H - 10, PAGE_W - M, PAGE_H - 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('AC Milan Futuro · Departamento de Rendimiento & Scouting', M, PAGE_H - 5.5);
    doc.text(`Página ${curPage}`, PAGE_W - M, PAGE_H - 5.5, { align: 'right' });
  };

  // ==========================================
  // SECCIÓN 1: RANKINGS DE RENDIMIENTO POR MÉTRICA
  // ==========================================
  if (sections.includes('rankings')) {
    drawPageHeader('RANKINGS DE RENDIMIENTO DESTACADO', `${squad.length} Jugadores analizados`);

    let curY = 26;

    // Métricas clave para rankings en tarjetas
    const featuredMetrics = ['minutes', 'goals', 'assists', 'useful', 'pass_acc', 'recoveries', 'dribbles', 'tackles'];
    const cardW = (USABLE_W - 3 * 4) / 4; // 4 columnas de tarjetas
    const cardH = 36;

    featuredMetrics.forEach((mKey, idx) => {
      const colIdx = idx % 4;
      const rowIdx = Math.floor(idx / 4);
      const cx = M + colIdx * (cardW + 4);
      const cy = curY + rowIdx * (cardH + 4);

      const m = PLAYER_METRICS.find((x) => x.key === mKey);
      if (!m) return;

      const ranked = rankPlayers(squad, m, valueMode, minMinutes).slice(0, 4);

      // Card background
      doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
      doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'F');
      doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'S');

      // Card Header
      doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.rect(cx, cy, cardW, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
      doc.text(t(`playerStats.metrics.${m.key}`, m.key).toUpperCase(), cx + 3, cy + 4.2);

      // Top 4 Rows
      ranked.forEach((r, rIdx) => {
        const ry = cy + 8.5 + rIdx * 6.5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);

        // Rank badge
        if (r.rank === 1) doc.setTextColor(RED[0], RED[1], RED[2]);
        else if (r.rank <= 3) doc.setTextColor(234, 88, 12);
        else doc.setTextColor(GREY[0], GREY[1], GREY[2]);

        doc.text(`${r.rank}.`, cx + 3, ry + 3);

        // Player Name
        doc.setTextColor(INK[0], INK[1], INK[2]);
        const resolvedName = (r.player.playerId && playerDbInfoMap?.get(r.player.playerId)?.name) || r.player.name;
        const pName = resolvedName.length > 18 ? `${resolvedName.substring(0, 16)}...` : resolvedName;
        doc.text(`#${r.player.dorsal} ${pName}`, cx + 8, ry + 3);

        // Value
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
        doc.text(formatMetric(r.value, m, valueMode), cx + cardW - 3, ry + 3, { align: 'right' });
      });
    });

    drawFooter(pageNum);
  }

  // ==========================================
  // SECCIÓN 2: TABLA COMPARATIVA DE LA PLANTILLA
  // ==========================================
  if (sections.includes('table')) {
    if (sections.includes('rankings')) {
      doc.addPage();
      pageNum++;
    }

    drawPageHeader('TABLA COMPARATIVA DE LA PLANTILLA', 'Métricas de Partido Completo');

    let curY = 26;

    // Métricas para la tabla horizontal
    const tableMetrics = PLAYER_METRICS.filter(
      (m) => ['minutes', 'goals', 'assists', 'useful', 'passes_ok', 'pass_acc', 'key_passes', 'recoveries', 'dribbles', 'tackles', 'losses'].includes(m.key),
    );

    // Header de la tabla
    doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.rect(M, curY, USABLE_W, 6.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);

    doc.text('DORSAL / JUGADOR', M + 3, curY + 4.5);
    doc.text('POS', M + 50, curY + 4.5);
    doc.text('PJ', M + 62, curY + 4.5, { align: 'center' });
    doc.text('MIN', M + 74, curY + 4.5, { align: 'center' });

    const colStep = (USABLE_W - 84) / tableMetrics.length;
    tableMetrics.forEach((m, idx) => {
      const mx = M + 84 + idx * colStep + colStep / 2;
      const mLabel = t(`playerStats.metrics.${m.key}`, m.key).substring(0, 10);
      doc.text(mLabel.toUpperCase(), mx, curY + 4.5, { align: 'center' });
    });

    curY += 6.5;

    // Filas de jugadores
    squad.slice(0, 24).forEach((p, pIdx) => {
      const rowH = 5.6;
      if (pIdx % 2 === 1) {
        doc.setFillColor(248, 249, 250);
        doc.rect(M, curY, USABLE_W, rowH, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(INK[0], INK[1], INK[2]);

      const fullName = (p.playerId && playerDbInfoMap?.get(p.playerId)?.name) || p.name;
      const name = fullName.length > 22 ? `${fullName.substring(0, 20)}...` : fullName;
      doc.text(`#${p.dorsal} ${name}`, M + 3, curY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(p.role, M + 50, curY + 4);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(String(p.matches), M + 62, curY + 4, { align: 'center' });
      doc.text(`${p.minutes}'`, M + 74, curY + 4, { align: 'center' });

      // Métricas
      tableMetrics.forEach((m, idx) => {
        const mx = M + 84 + idx * colStep + colStep / 2;
        const v = aggValue(p, m, valueMode);
        const valStr = formatMetric(v, m, valueMode);

        doc.setFont('helvetica', m.key === 'goals' || m.key === 'assists' ? 'bold' : 'normal');
        if (m.key === 'goals' && Number(v) > 0) doc.setTextColor(RED[0], RED[1], RED[2]);
        else doc.setTextColor(INK[0], INK[1], INK[2]);

        doc.text(valStr, mx, curY + 4, { align: 'center' });
      });

      curY += rowH;
    });

    drawFooter(pageNum);
  }

  // ==========================================
  // SECCIÓN 3: POSICIONES MEDIAS Y PARTICIPACIÓN
  // ==========================================
  if (sections.includes('positions') || sections.includes('participation')) {
    doc.addPage();
    pageNum++;

    drawPageHeader('POSICIONES MEDIAS TÁCTICAS Y PARTICIPACIÓN', 'Distribución sobre el terreno de juego');

    let curY = 26;

    if (sections.includes('positions')) {
      const pitchW = 160;
      const pitchH = (pitchW * 68) / 105; // 103.6mm
      const pitchX = M;
      const pitchY = curY;

      // Césped
      doc.setFillColor(11, 44, 27);
      doc.roundedRect(pitchX, pitchY, pitchW, pitchH, 2.5, 2.5, 'F');

      // Franjas
      const stripes = 12;
      const stripeW = pitchW / stripes;
      for (let i = 0; i < stripes; i += 2) {
        doc.setFillColor(14, 56, 34);
        doc.rect(pitchX + i * stripeW, pitchY, stripeW, pitchH, 'F');
      }

      // Líneas
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.roundedRect(pitchX + 0.6, pitchY + 0.6, pitchW - 1.2, pitchH - 1.2, 1, 1, 'S');
      doc.line(pitchX + pitchW / 2, pitchY + 0.6, pitchX + pitchW / 2, pitchY + pitchH - 0.6);
      doc.circle(pitchX + pitchW / 2, pitchY + pitchH / 2, 13.9, 'S');

      // Áreas
      const boxW = (pitchW * 16.5) / 105;
      const boxH = (pitchH * 40.32) / 68;
      doc.rect(pitchX + 0.6, pitchY + pitchH / 2 - boxH / 2, boxW, boxH, 'S');
      doc.rect(pitchX + pitchW - 0.6 - boxW, pitchY + pitchH / 2 - boxH / 2, boxW, boxH, 'S');

      // Puntos de los jugadores
      const points = squad
        .map((p) => ({ p, pos: averagePosition(p.lines) }))
        .filter((x): x is { p: PlayerAggregate; pos: { x: number; y: number } } => !!x.pos);

      points.forEach(({ p, pos }) => {
        const cx = pitchX + (pos.x / 100) * pitchW;
        const cy = pitchY + (pos.y / 100) * pitchH;

        // Círculo por rol
        const [r, g, b] = ROLE_COLORS[p.role] || RED;
        doc.setFillColor(r, g, b);
        doc.circle(cx, cy, 3.2, 'F');
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.4);
        doc.circle(cx, cy, 3.2, 'S');

        // Dorsal
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text(String(p.dorsal), cx, cy + 2.1, { align: 'center' });

        // Nombre pequeño debajo
        doc.setFontSize(5);
        const lastName = p.name.split(' ').slice(-1)[0] || p.name;
        doc.text(lastName, cx, cy + 6.2, { align: 'center' });
      });

      // Leyenda lateral de roles
      const legX = pitchX + pitchW + 8;
      const legW = USABLE_W - pitchW - 8;

      doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
      doc.roundedRect(legX, pitchY, legW, pitchH, 2.5, 2.5, 'F');
      doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
      doc.roundedRect(legX, pitchY, legW, pitchH, 2.5, 2.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.text('LEYENDA DE ROLES', legX + 5, pitchY + 8);

      const rolesList = [
        { code: 'P', label: 'Porteros', color: [245, 158, 11] as RGB },
        { code: 'D', label: 'Defensas', color: [37, 99, 235] as RGB },
        { code: 'C', label: 'Centrocampistas', color: [16, 185, 129] as RGB },
        { code: 'A', label: 'Atacantes', color: [219, 0, 48] as RGB },
      ];

      rolesList.forEach((r, rIdx) => {
        const ry = pitchY + 16 + rIdx * 10;
        doc.setFillColor(r.color[0], r.color[1], r.color[2]);
        doc.circle(legX + 8, ry, 3.2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(r.label, legX + 15, ry + 2);
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text('Coordenadas medias calculadas', legX + 5, pitchY + 68);
      doc.text('a partir de los informes Panini', legX + 5, pitchY + 73);
      doc.text('con sentido de ataque hacia la derecha.', legX + 5, pitchY + 78);
    }

    drawFooter(pageNum);
  }

  // Guardar archivo
  doc.save(`informe_plantilla_estadisticas_${competitionFilter}.pdf`);
}
