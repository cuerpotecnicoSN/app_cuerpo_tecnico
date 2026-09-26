/**
 * Individual Player Report in PDF (A4 vertical / portrait).
 * Includes AC Milan branding, escudo, player portrait, bio, full-match statistics
 * grouped by sections, tactical pitch heatmap, pass network partners, and match-by-match history.
 */
import type { TFunction } from 'i18next';
import { loadImage } from './calendarPdf';
import {
  PLAYER_METRICS,
  formatMetric,
  lineLabel,
  passPartners,
  touchDensity,
  touchZones,
  type CompetitionFilter,
  type MetricGroup,
  type PlayerAggregate,
  type PlayerMatchLine,
  type ValueMode,
} from './playerPaniniStats';
import type { Player } from '../components/types';

export type PlayerReportSection = 'summary' | 'metrics' | 'heatmap' | 'passing' | 'matches';

export const PLAYER_REPORT_SECTIONS: PlayerReportSection[] = [
  'summary',
  'metrics',
  'heatmap',
  'passing',
  'matches',
];

export interface PlayerReportPdfOptions {
  player: PlayerAggregate;
  playerDbInfo?: Player;
  lines: PlayerMatchLine[];
  sections: PlayerReportSection[];
  t: TFunction;
  locale: string;
  competitionFilter?: CompetitionFilter;
  valueMode?: ValueMode;
  logoUrl?: string;
}

type RGB = [number, number, number];

// A4 Vertical (mm)
const PAGE_W = 210;
const PAGE_H = 297;
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
const GREEN: RGB = [16, 185, 129];

const ROLE_NAMES: Record<string, string> = {
  P: 'Portero',
  D: 'Defensa',
  C: 'Centrocampista',
  A: 'Atacante',
};

export async function exportPlayerReportPdf({
  player,
  playerDbInfo,
  lines,
  sections,
  t,
  locale = 'es',
  competitionFilter = 'all',
  valueMode = 'total',
  logoUrl = '/escudo.png',
}: PlayerReportPdfOptions) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const logoImg = await loadImage(logoUrl);
  const playerPhoto = playerDbInfo?.avatar ? await loadImage(playerDbInfo.avatar) : null;

  let pageNum = 1;

  // Filtrado de líneas por competición si aplica
  const filteredLines = lines.filter((l) => l.minutes > 0);
  const touches = filteredLines.flatMap((l) => l.touches);
  const zones = touchZones(touches);

  // --- HEADER & PLAYER PROFILE CARD ---
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
    doc.setFontSize(10);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.text('AC MILAN FUTURO · CUERPO TÉCNICO', M + (logoImg ? 17 : 0), 9);

    const compLabel =
      competitionFilter === 'league' ? 'Liga' : competitionFilter === 'cup' ? 'Copa' : 'Todas las competiciones';
    const modeLabel = valueMode === 'per90' ? 'Valores por 90 min' : 'Valores totales';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 205, 215);
    doc.text(`INFORME INDIVIDUAL · ${title} · ${compLabel}`, M + (logoImg ? 17 : 0), 14.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text('TEMPORADA 2026/27', PAGE_W - M, 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(180, 185, 195);
    doc.text(subtitle || `${modeLabel} · Partido Completo`, PAGE_W - M, 14.5, { align: 'right' });
  };

  const drawFooter = (curPage: number) => {
    doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
    doc.setLineWidth(0.3);
    doc.line(M, PAGE_H - 10, PAGE_W - M, PAGE_H - 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('AC Milan Futuro · Departamento de Análisis & Rendimiento', M, PAGE_H - 5.5);
    doc.text(`Página ${curPage}`, PAGE_W - M, PAGE_H - 5.5, { align: 'right' });
  };

  // ==========================================
  // PÁGINA 1: FICHA, KPIs Y MÉTRICAS POR BLOQUES
  // ==========================================
  drawPageHeader(player.name.toUpperCase(), `Partido Completo · ${player.matches} Partidos`);

  let curY = 26;

  // --- TARJETA DE PERFIL DEL JUGADOR ---
  doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
  doc.roundedRect(M, curY, USABLE_W, 32, 2.5, 2.5, 'F');
  doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, curY, USABLE_W, 32, 2.5, 2.5, 'S');

  // Foto del jugador
  const photoSize = 24;
  if (playerPhoto) {
    doc.addImage(playerPhoto.dataUrl, 'JPEG', M + 4, curY + 4, photoSize, photoSize);
    doc.setDrawColor(RED[0], RED[1], RED[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(M + 4, curY + 4, photoSize, photoSize, 2, 2, 'S');
  } else {
    doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.roundedRect(M + 4, curY + 4, photoSize, photoSize, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text(`#${player.dorsal}`, M + 4 + photoSize / 2, curY + 4 + photoSize / 2 + 2, { align: 'center' });
  }

  // Datos principales
  const infoX = M + photoSize + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(player.name, infoX, curY + 8);

  // Dorsal y rol
  doc.setFontSize(8.5);
  doc.setTextColor(RED[0], RED[1], RED[2]);
  doc.text(`#${player.dorsal} · ${ROLE_NAMES[player.role] || player.role} · ${playerDbInfo?.position || 'Sin definir'}`, infoX, curY + 13.5);

  // Fila de metadatos (Edad, Nacionalidad, Pie, Estado médico)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);

  const ageStr = playerDbInfo?.age ? `${playerDbInfo.age} años` : '–';
  const natStr = playerDbInfo?.nationality || 'Italia';
  const footStr = playerDbInfo?.dominantFoot ? `Pie: ${playerDbInfo.dominantFoot}` : '';
  const statusStr = playerDbInfo?.status ? `Estado: ${playerDbInfo.status}` : 'Apto';

  doc.text([ageStr, natStr, footStr, statusStr].filter(Boolean).join('   |   '), infoX, curY + 19);

  // Badge resumen de minutos y partidos
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.roundedRect(PAGE_W - M - 48, curY + 4, 44, 24, 2, 2, 'F');
  doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
  doc.roundedRect(PAGE_W - M - 48, curY + 4, 44, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(RED[0], RED[1], RED[2]);
  doc.text(`${player.minutes}'`, PAGE_W - M - 26, curY + 13, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  doc.text(`${player.matches} PARTIDOS (${player.total.starts ?? 0} TITULAR)`, PAGE_W - M - 26, curY + 18, { align: 'center' });

  doc.setFontSize(6);
  doc.text(`MEDIA ${player.matches ? Math.round(player.minutes / player.matches) : 0}' / PARTIDO`, PAGE_W - M - 26, curY + 23, { align: 'center' });

  curY += 38;

  // --- SECCIÓN: RESUMEN / KPIS ---
  if (sections.includes('summary')) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text('RESUMEN DE RENDIMIENTO (PARTIDO COMPLETO)', M, curY);

    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.rect(M, curY + 1.5, 20, 0.8, 'F');

    curY += 6;

    const isGK = player.role === 'P';
    const kpiCards = isGK
      ? [
          { label: 'PARTIDOS', val: String(player.matches), sub: `${player.total.starts ?? 0} titular` },
          { label: 'MINUTOS', val: `${player.minutes}'`, sub: 'Total acumulado' },
          { label: 'PARADAS', val: String(player.total.saves ?? 0), sub: `${player.total.saves_chance ?? 0} en ocasión` },
          { label: 'ENCAJADOS', val: String(player.total.conceded ?? 0), sub: 'Goles recibidos' },
          { label: 'ACCIONES ÚTILES', val: String(player.total.useful ?? 0), sub: `${player.per90.useful?.toFixed(1) || '0'} / 90'` },
          { label: 'TARJETAS (A/R)', val: `${player.total.yellow ?? 0} / ${player.total.red ?? 0}`, sub: 'Disciplina' },
        ]
      : [
          { label: 'PARTIDOS', val: String(player.matches), sub: `${player.total.starts ?? 0} titular` },
          { label: 'MINUTOS', val: `${player.minutes}'`, sub: 'Total acumulado' },
          { label: 'GOLES', val: String(player.total.goals ?? 0), sub: `${player.total.shots ?? 0} tiros` },
          { label: 'ASISTENCIAS', val: String(player.total.assists ?? 0), sub: `${player.total.key_passes ?? 0} p. clave` },
          { label: 'ACCIONES ÚTILES', val: String(player.total.useful ?? 0), sub: `${player.per90.useful?.toFixed(1) || '0'} / 90'` },
          { label: 'RECUPERACIONES', val: String(player.total.recoveries ?? 0), sub: `${player.total.interceptions ?? 0} intercep.` },
        ];

    const cardW = (USABLE_W - 5 * 2.5) / 6;
    kpiCards.forEach((c, idx) => {
      const cx = M + idx * (cardW + 2.5);
      doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
      doc.roundedRect(cx, curY, cardW, 17, 1.5, 1.5, 'F');
      doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
      doc.roundedRect(cx, curY, cardW, 17, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(c.label, cx + cardW / 2, curY + 4.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(idx === 2 || idx === 3 ? RED[0] : BLACK[0], idx === 2 || idx === 3 ? RED[1] : BLACK[1], idx === 2 || idx === 3 ? RED[2] : BLACK[2]);
      doc.text(c.val, cx + cardW / 2, curY + 10.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.2);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(c.sub, cx + cardW / 2, curY + 14.5, { align: 'center' });
    });

    curY += 23;
  }

  // --- SECCIÓN: TABLA DE ESTADÍSTICAS POR BLOQUES ---
  if (sections.includes('metrics')) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text('ESTADÍSTICAS DETALLADAS POR BLOQUES', M, curY);

    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.rect(M, curY + 1.5, 20, 0.8, 'F');

    curY += 6;

    // Bloques de métricas relevantes
    const groupsToShow: MetricGroup[] = player.role === 'P'
      ? ['participation', 'passing', 'defense', 'goalkeeper', 'discipline']
      : ['participation', 'passing', 'attack', 'finishing', 'defense', 'discipline'];

    const groupTitles: Record<MetricGroup, string> = {
      participation: 'PARTICIPACIÓN GENERAL',
      passing: 'PASE Y CONSTRUCCIÓN',
      attack: 'CREACIÓN Y ATAQUE',
      finishing: 'FINALIZACIÓN Y REMATES',
      defense: 'DEFENSA Y RECUPERACIÓN',
      discipline: 'DISCIPLINA',
      goalkeeper: 'PORTERÍA',
    };

    for (const grp of groupsToShow) {
      const metricsInGroup = PLAYER_METRICS.filter((m) => m.group === grp && (m.gk ? player.role === 'P' : true));
      if (!metricsInGroup.length) continue;

      // Header de Bloque
      doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
      doc.rect(M, curY, USABLE_W, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(RED[0], RED[1], RED[2]);
      doc.text(groupTitles[grp], M + 3, curY + 3.6);

      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text('TOTAL', PAGE_W - M - 28, curY + 3.6, { align: 'right' });
      doc.text('POR 90 MIN', PAGE_W - M - 4, curY + 3.6, { align: 'right' });

      curY += 5.5;

      metricsInGroup.forEach((m, rowIdx) => {
        const rowH = 4.4;
        if (rowIdx % 2 === 1) {
          doc.setFillColor(252, 252, 253);
          doc.rect(M, curY, USABLE_W, rowH, 'F');
        }

        const label = t(`playerStats.metrics.${m.key}`, m.key);
        const totalVal = formatMetric(player.total[m.key], m, 'total');
        const per90Val = m.kind === 'count' && m.per90 ? formatMetric(player.per90[m.key], m, 'per90') : '–';

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(label, M + 3, curY + 3.2);

        doc.setFont('helvetica', 'bold');
        doc.text(totalVal, PAGE_W - M - 28, curY + 3.2, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(per90Val, PAGE_W - M - 4, curY + 3.2, { align: 'right' });

        curY += rowH;
      });

      curY += 2;
    }
  }

  drawFooter(pageNum);

  // ==========================================
  // PÁGINA 2: CAMPOGRAMA, RED DE PASES Y PARTIDOS
  // ==========================================
  if (sections.includes('heatmap') || sections.includes('passing') || sections.includes('matches')) {
    doc.addPage();
    pageNum++;
    drawPageHeader(player.name.toUpperCase(), 'Distribución Táctica y Partidos');

    curY = 26;

    // --- SECCIÓN: CAMPOGRAMA Y MAPA DE CALOR ---
    if (sections.includes('heatmap')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.text('CAMPOGRAMA TÁCTICO Y MAPA DE CALOR', M, curY);

      doc.setFillColor(RED[0], RED[1], RED[2]);
      doc.rect(M, curY + 1.5, 20, 0.8, 'F');

      curY += 6;

      const pitchW = 96;
      const pitchH = (pitchW * 68) / 105; // 62.17mm
      const pitchX = M;
      const pitchY = curY;

      // Fondo césped
      doc.setFillColor(11, 44, 27);
      doc.roundedRect(pitchX, pitchY, pitchW, pitchH, 2, 2, 'F');

      // Franjas de césped
      const stripes = 12;
      const stripeW = pitchW / stripes;
      for (let i = 0; i < stripes; i += 2) {
        doc.setFillColor(14, 56, 34);
        doc.rect(pitchX + i * stripeW, pitchY, stripeW, pitchH, 'F');
      }

      // Líneas de campo
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.25);
      doc.roundedRect(pitchX + 0.5, pitchY + 0.5, pitchW - 1, pitchH - 1, 1, 1, 'S');

      // Medio campo y círculo central
      doc.line(pitchX + pitchW / 2, pitchY + 0.5, pitchX + pitchW / 2, pitchY + pitchH - 0.5);
      doc.circle(pitchX + pitchW / 2, pitchY + pitchH / 2, 8.36, 'S');

      // Áreas grandes
      const boxW = (pitchW * 16.5) / 105;
      const boxH = (pitchH * 40.32) / 68;
      doc.rect(pitchX + 0.5, pitchY + pitchH / 2 - boxH / 2, boxW, boxH, 'S');
      doc.rect(pitchX + pitchW - 0.5 - boxW, pitchY + pitchH / 2 - boxH / 2, boxW, boxH, 'S');

      // Rejilla de densidad térmica dibujada en vectorial
      const densityGrid = touchDensity(touches);
      const cellW = pitchW / densityGrid[0].length;
      const cellH = pitchH / densityGrid.length;

      densityGrid.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v < 0.08) return;
          const cx = pitchX + c * cellW;
          const cy = pitchY + r * cellH;
          // Colores térmicos vibrantes
          if (v > 0.75) {
            doc.setFillColor(RED[0], RED[1], RED[2]);
          } else if (v > 0.45) {
            doc.setFillColor(249, 115, 22);
          } else if (v > 0.25) {
            doc.setFillColor(250, 204, 21);
          } else {
            doc.setFillColor(34, 197, 94);
          }
          doc.rect(cx, cy, cellW + 0.2, cellH + 0.2, 'F');
        });
      });

      // Posición media del jugador
      const avgPos = player.lines.find((l) => l.avgPosition)?.avgPosition;
      if (avgPos) {
        const px = pitchX + (avgPos.x / 100) * pitchW;
        const py = pitchY + (avgPos.y / 100) * pitchH;
        doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
        doc.circle(px, py, 2.2, 'F');
        doc.setFillColor(RED[0], RED[1], RED[2]);
        doc.circle(px, py, 1.2, 'F');
      }

      // Panel lateral de Distribución de toques (Tercios y Carriles)
      const distW = USABLE_W - pitchW - 6;
      const distX = pitchX + pitchW + 6;

      doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
      doc.roundedRect(distX, pitchY, distW, pitchH, 2, 2, 'F');
      doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
      doc.roundedRect(distX, pitchY, distW, pitchH, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.text('DÓNDE ACTÚA (POR TERCIOS)', distX + 4, pitchY + 6);

      const thirdsLabels = ['Defensa', 'Medio', 'Ataque'];
      thirdsLabels.forEach((lbl, i) => {
        const pct = Math.round(zones.thirds[i] || 0);
        const barY = pitchY + 10 + i * 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(lbl, distX + 4, barY + 3);
        doc.setFont('helvetica', 'bold');
        doc.text(`${pct}%`, distX + distW - 4, barY + 3, { align: 'right' });

        // Barra
        doc.setFillColor(230, 233, 238);
        doc.roundedRect(distX + 18, barY, distW - 30, 2.5, 1, 1, 'F');
        doc.setFillColor(RED[0], RED[1], RED[2]);
        doc.roundedRect(distX + 18, barY, Math.max(1, ((distW - 30) * pct) / 100), 2.5, 1, 1, 'F');
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.text('DÓNDE ACTÚA (POR CARRILES)', distX + 4, pitchY + 36);

      const lanesLabels = ['Izquierda', 'Centro', 'Derecha'];
      lanesLabels.forEach((lbl, i) => {
        const pct = Math.round(zones.lanes[i] || 0);
        const barY = pitchY + 40 + i * 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(lbl, distX + 4, barY + 3);
        doc.setFont('helvetica', 'bold');
        doc.text(`${pct}%`, distX + distW - 4, barY + 3, { align: 'right' });

        // Barra
        doc.setFillColor(230, 233, 238);
        doc.roundedRect(distX + 18, barY, distW - 30, 2.5, 1, 1, 'F');
        doc.setFillColor(INK[0], INK[1], INK[2]);
        doc.roundedRect(distX + 18, barY, Math.max(1, ((distW - 30) * pct) / 100), 2.5, 1, 1, 'F');
      });

      curY += pitchH + 8;
    }

    // --- SECCIÓN: SOCIOS DE PASE ---
    if (sections.includes('passing')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.text('SOCIOS Y RED DE PASES', M, curY);

      doc.setFillColor(RED[0], RED[1], RED[2]);
      doc.rect(M, curY + 1.5, 20, 0.8, 'F');

      curY += 6;

      const halfW = (USABLE_W - 4) / 2;

      // Columna 1: A quién pasa
      doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
      doc.roundedRect(M, curY, halfW, 26, 2, 2, 'F');
      doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
      doc.roundedRect(M, curY, halfW, 26, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(RED[0], RED[1], RED[2]);
      doc.text('A QUIÉN PASA (RECEPTORES)', M + 4, curY + 5);

      const toPartners = passPartners(lines, 'to', 4);

      if (toPartners.length) {
        toPartners.forEach((p, idx) => {
          const py = curY + 9 + idx * 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(INK[0], INK[1], INK[2]);
          doc.text(p.name, M + 4, py);
          doc.setFont('helvetica', 'bold');
          doc.text(`${p.passes} pases`, M + halfW - 4, py, { align: 'right' });
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text('Sin datos de matriz registrados', M + 4, curY + 12);
      }

      // Columna 2: De quién recibe
      doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
      doc.roundedRect(M + halfW + 4, curY, halfW, 26, 2, 2, 'F');
      doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
      doc.roundedRect(M + halfW + 4, curY, halfW, 26, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text('DE QUIÉN RECIBE (PASADORES)', M + halfW + 8, curY + 5);

      const fromPartners = passPartners(lines, 'from', 4);

      if (fromPartners.length) {
        fromPartners.forEach((p, idx) => {
          const py = curY + 9 + idx * 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(INK[0], INK[1], INK[2]);
          doc.text(p.name, M + halfW + 8, py);
          doc.setFont('helvetica', 'bold');
          doc.text(`${p.passes} pases`, M + halfW * 2 - 4, py, { align: 'right' });
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text('Sin datos de matriz registrados', M + halfW + 8, curY + 12);
      }

      curY += 32;
    }

    // --- SECCIÓN: HISTORIAL PARTIDO A PARTIDO ---
    if (sections.includes('matches')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.text('HISTORIAL PARTIDO A PARTIDO (PARTIDO COMPLETO)', M, curY);

      doc.setFillColor(RED[0], RED[1], RED[2]);
      doc.rect(M, curY + 1.5, 20, 0.8, 'F');

      curY += 6;

      // Header de tabla
      doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.rect(M, curY, USABLE_W, 5.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
      doc.text('JORNADA / FECHA', M + 3, curY + 3.8);
      doc.text('RIVAL', M + 34, curY + 3.8);
      doc.text('MIN', M + 82, curY + 3.8, { align: 'center' });
      doc.text('GOLES', M + 98, curY + 3.8, { align: 'center' });
      doc.text('ASIST', M + 114, curY + 3.8, { align: 'center' });
      doc.text('PASES (OK/TOT)', M + 136, curY + 3.8, { align: 'center' });
      doc.text('% PREC.', M + 160, curY + 3.8, { align: 'center' });
      doc.text('RESULTADO', PAGE_W - M - 4, curY + 3.8, { align: 'right' });

      curY += 5.5;

      filteredLines.slice(0, 12).forEach((l, idx) => {
        const rowH = 5.2;
        if (idx % 2 === 1) {
          doc.setFillColor(248, 249, 250);
          doc.rect(M, curY, USABLE_W, rowH, 'F');
        }

        const dateStr = l.entry.match.date ? new Date(l.entry.match.date).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }) : '';
        const jorLabel = `${lineLabel(l)} · ${dateStr}`;
        const rivalName = `${l.entry.isHome ? 'vs' : '@'} ${l.entry.rival.nombre || l.entry.match.opponent}`;
        const pasesOk = l.stats?.pases_acertados ?? 0;
        const pasesTot = l.passesGiven ?? 0;
        const passPrec = l.passAccuracy !== null ? `${Math.round(l.passAccuracy)}%` : '–';
        const resStr = `${l.entry.our.goles} – ${l.entry.rival.goles}`;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(jorLabel, M + 3, curY + 3.6);

        doc.setFont('helvetica', 'normal');
        doc.text(rivalName, M + 34, curY + 3.6);

        doc.setFont('helvetica', 'bold');
        doc.text(`${l.minutes}'`, M + 82, curY + 3.6, { align: 'center' });
        doc.text(String(l.goals || 0), M + 98, curY + 3.6, { align: 'center' });
        doc.text(String(l.stats?.asistencias_pases_clave ? Number(l.stats.asistencias_pases_clave.split('/')[0] || 0) : 0), M + 114, curY + 3.6, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(`${pasesOk}/${pasesTot}`, M + 136, curY + 3.6, { align: 'center' });
        doc.text(passPrec, M + 160, curY + 3.6, { align: 'center' });

        // Marcador con color
        const isWin = l.entry.our.goles > l.entry.rival.goles;
        const isLoss = l.entry.our.goles < l.entry.rival.goles;
        if (isWin) doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        else if (isLoss) doc.setTextColor(RED[0], RED[1], RED[2]);
        else doc.setTextColor(GREY[0], GREY[1], GREY[2]);

        doc.setFont('helvetica', 'bold');
        doc.text(resStr, PAGE_W - M - 4, curY + 3.6, { align: 'right' });

        curY += rowH;
      });
    }

    drawFooter(pageNum);
  }

  // Guardar archivo
  const safeName = (player.name || 'jugador').toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`informe_${safeName}_${player.dorsal || ''}.pdf`);
}
