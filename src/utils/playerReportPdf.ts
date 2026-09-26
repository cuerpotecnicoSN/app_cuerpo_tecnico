/**
 * Individual Player Report in PDF (A4 vertical / portrait).
 * Includes AC Milan branding, escudo, player portrait, bio, full-match statistics
 * grouped by sections, 4 modern tactical pitch campogramas (General + 3 Tramos evolution),
 * pass network partners, and match-by-match history.
 */
import type { TFunction } from 'i18next';
import {
  PLAYER_METRICS,
  formatMetric,
  lineLabel,
  partitionPlayerTramos,
  passPartners,
  touchZones,
  averagePosition,
  type CompetitionFilter,
  type MetricGroup,
  type PlayerAggregate,
  type PlayerMatchLine,
  type ValueMode,
} from './playerPaniniStats';
import type { Player } from '../components/types';
import type { PaniniMapEvent } from '../types/paniniReport';

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

export interface LoadedImage {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  ratio: number;
}

/**
 * Carga robusta de imágenes (data URLs, URLs remotas con CORS y proxys de respaldo con timeout).
 */
export async function loadPlayerImage(url?: string | null): Promise<LoadedImage | null> {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const cleanUrl = url.trim();

  // Si ya es data URL
  if (cleanUrl.startsWith('data:image/')) {
    const isJpeg = cleanUrl.startsWith('data:image/jpeg') || cleanUrl.startsWith('data:image/jpg');
    return {
      dataUrl: cleanUrl,
      format: isJpeg ? 'JPEG' : 'PNG',
      ratio: 1,
    };
  }

  const rasterize = (src: string, useCors: boolean): Promise<LoadedImage | null> =>
    new Promise((resolve) => {
      const img = new Image();
      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          resolve(null);
        }
      }, 4000);

      if (useCors) img.crossOrigin = 'anonymous';

      img.onload = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try {
          if (!img.naturalWidth || !img.naturalHeight) return resolve(null);
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          resolve({
            dataUrl: pngUrl,
            format: 'PNG',
            ratio: img.naturalWidth / img.naturalHeight,
          });
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(null);
      };

      img.src = src;
    });

  const isRemote = /^https?:\/\//i.test(cleanUrl);
  if (!isRemote) {
    return rasterize(cleanUrl, false);
  }

  const candidates = [
    cleanUrl,
    `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl.replace(/^https?:\/\//, ''))}&output=png`,
    `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`,
  ];

  for (const candidate of candidates) {
    try {
      const res = await rasterize(candidate, true);
      if (res) return res;
    } catch {
      // Siguiente
    }
  }

  return null;
}

/**
 * Renderiza un campograma táctico moderno de alta resolución en un Canvas HTML5
 * con césped estilizado, mapa térmico Gaussiano suave y líneas de juego vectoriales.
 */
export function renderModernTacticalPitchCanvas(options: {
  width?: number;
  height?: number;
  touches: PaniniMapEvent[];
  avgPos?: { x: number; y: number } | null;
}): string {
  const W = options.width || 1050;
  const H = options.height || 680;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Césped táctico moderno con gradiente profundo
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0c2217');
  bgGrad.addColorStop(0.5, '#0f2c1e');
  bgGrad.addColorStop(1, '#0c2217');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Franjas verticales sutiles
  const stripes = 14;
  const stripeW = W / stripes;
  for (let i = 0; i < stripes; i += 2) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.fillRect(i * stripeW, 0, stripeW, H);
  }

  // 2. Mapa de calor Gaussiano continuo y suave
  const { touches, avgPos } = options;
  if (touches && touches.length > 0) {
    const heatCanvas = document.createElement('canvas');
    const HW = 210;
    const HH = 136;
    heatCanvas.width = HW;
    heatCanvas.height = HH;
    const hctx = heatCanvas.getContext('2d');

    if (hctx) {
      const n = touches.length;
      const radius = n > 120 ? 16 : n > 60 ? 20 : n > 25 ? 25 : 30;

      for (const tc of touches) {
        const tx = (tc.x / 100) * HW;
        const ty = (tc.y / 100) * HH;
        const g = hctx.createRadialGradient(tx, ty, 0, tx, ty, radius);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
        g.addColorStop(0.35, 'rgba(255, 255, 255, 0.14)');
        g.addColorStop(0.75, 'rgba(255, 255, 255, 0.03)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        hctx.fillStyle = g;
        hctx.beginPath();
        hctx.arc(tx, ty, radius, 0, Math.PI * 2);
        hctx.fill();
      }

      const imgData = hctx.getImageData(0, 0, HW, HH);
      const data = imgData.data;

      let maxAlpha = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > maxAlpha) maxAlpha = data[i];
      }
      if (maxAlpha === 0) maxAlpha = 1;

      // Paleta térmica suave (Verde Lima -> Ámbar Solar -> Naranja Fuego -> Rojo Milan -> Carmesí Brillante)
      const colorAt = (norm: number): [number, number, number, number] => {
        if (norm < 0.04) return [0, 0, 0, 0];

        const stops: [number, [number, number, number, number]][] = [
          [0.04, [34, 197, 94, 70]],    // Verde lima
          [0.18, [132, 204, 22, 130]],  // Lima cálido
          [0.36, [250, 204, 21, 185]],  // Amarillo ámbar
          [0.58, [249, 115, 22, 225]],  // Naranja
          [0.80, [225, 29, 72, 245]],   // Rojo escarlata
          [1.00, [255, 23, 68, 255]],   // Carmesí intenso
        ];

        let idx = 0;
        while (idx < stops.length - 2 && norm > stops[idx + 1][0]) {
          idx++;
        }
        const [p0, c0] = stops[idx];
        const [p1, c1] = stops[idx + 1];
        const k = Math.max(0, Math.min(1, (norm - p0) / (p1 - p0)));

        return [
          Math.round(c0[0] + (c1[0] - c0[0]) * k),
          Math.round(c0[1] + (c1[1] - c0[1]) * k),
          Math.round(c0[2] + (c1[2] - c0[2]) * k),
          Math.round(c0[3] + (c1[3] - c0[3]) * k),
        ];
      };

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a > 0) {
          const norm = a / maxAlpha;
          const [r, g, b, alpha] = colorAt(norm);
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = alpha;
        }
      }

      hctx.putImageData(imgData, 0, 0);

      // Renderizado difuminado y suavizado
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = 'blur(12px)';
      ctx.drawImage(heatCanvas, 0, 0, W, H);
      ctx.restore();
    }
  }

  // 3. Marcaje de campo vectorial de alta precisión
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const pad = 14;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;

  // Borde exterior
  ctx.strokeRect(pad, pad, innerW, innerH);

  // Línea de medio campo
  ctx.beginPath();
  ctx.moveTo(W / 2, pad);
  ctx.lineTo(W / 2, H - pad);
  ctx.stroke();

  // Círculo central y punto
  const centerRadius = (9.15 / 105) * innerW;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, centerRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Áreas grandes (16.5m)
  const boxW = (16.5 / 105) * innerW;
  const boxH = (40.32 / 68) * innerH;
  ctx.strokeRect(pad, H / 2 - boxH / 2, boxW, boxH);
  ctx.strokeRect(W - pad - boxW, H / 2 - boxH / 2, boxW, boxH);

  // Áreas pequeñas (5.5m)
  const goalW = (5.5 / 105) * innerW;
  const goalH = (18.32 / 68) * innerH;
  ctx.strokeRect(pad, H / 2 - goalH / 2, goalW, goalH);
  ctx.strokeRect(W - pad - goalW, H / 2 - goalH / 2, goalW, goalH);

  // Puntos de penalti (11m)
  const penDist = (11 / 105) * innerW;
  ctx.beginPath();
  ctx.arc(pad + penDist, H / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W - pad - penDist, H / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Arcos de área de penalti
  ctx.beginPath();
  ctx.arc(pad + penDist, H / 2, centerRadius, -0.65, 0.65);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W - pad - penDist, H / 2, centerRadius, Math.PI - 0.65, Math.PI + 0.65);
  ctx.stroke();

  // Córners
  const cornerR = (1.5 / 105) * innerW;
  ctx.beginPath();
  ctx.arc(pad, pad, cornerR, 0, Math.PI / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pad, H - pad, cornerR, -Math.PI / 2, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W - pad, pad, cornerR, Math.PI / 2, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W - pad, H - pad, cornerR, Math.PI, Math.PI * 1.5);
  ctx.stroke();

  // Indicador de Ataque
  ctx.font = 'bold 16px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.textAlign = 'right';
  ctx.fillText('ATAQUE →', W - pad - 12, H - pad - 10);

  ctx.restore();

  // Mensaje si no hay toques
  if (!touches || touches.length === 0) {
    ctx.save();
    ctx.font = 'bold 20px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SIN DATOS EN ESTE TRAMO', W / 2, H / 2);
    ctx.restore();
  }

  // 4. Marcador de Posición Media (Centroide Táctico Luminoso)
  if (avgPos && avgPos.x !== undefined && avgPos.y !== undefined) {
    const ax = pad + (avgPos.x / 100) * innerW;
    const ay = pad + (avgPos.y / 100) * innerH;

    ctx.save();
    ctx.shadowColor = 'rgba(219, 0, 48, 0.8)';
    ctx.shadowBlur = 18;

    // Halo exterior blanco
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ax, ay, 15, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo rojo Milan
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#db0030';
    ctx.beginPath();
    ctx.arc(ax, ay, 10.5, 0, Math.PI * 2);
    ctx.fill();

    // Punto central blanco
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ax, ay, 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}

/**
 * Dibuja la tarjeta del campograma en el documento PDF usando la imagen de canvas generada.
 */
function drawTacticalPitchCard(
  doc: any,
  x: number,
  y: number,
  cardW: number,
  cardH: number,
  options: {
    badge: string;
    title: string;
    subtitle: string;
    touchesCount: number;
    isAccent?: boolean;
    touches: PaniniMapEvent[];
    avgPos: { x: number; y: number } | null;
    t?: TFunction;
  }
) {
  const { badge, title, subtitle, touchesCount, isAccent, touches, avgPos, t } = options;

  // 1. Tarjeta contenedora
  doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
  doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'F');
  doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'S');

  // 2. Header de la tarjeta (Badge + Título + Subtítulo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  const badgeW = doc.getTextWidth(badge.toUpperCase()) + 3.5;
  const badgeH = 4.2;
  const badgeY = y + 2.4;

  if (isAccent) {
    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.roundedRect(x + 3, badgeY, badgeW, badgeH, 1, 1, 'F');
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  } else {
    doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.roundedRect(x + 3, badgeY, badgeW, badgeH, 1, 1, 'F');
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  }
  doc.text(badge.toUpperCase(), x + 3 + badgeW / 2, badgeY + 3, { align: 'center' });

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(title, x + 3 + badgeW + 2.5, badgeY + 3);

  // Subtítulo con partidos y toques
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  const touchesStr = t ? t('playerStats.heatmap.touches', { count: touchesCount }) : `${touchesCount} toques`;
  const subText = `${subtitle}${touchesCount > 0 ? ` · ${touchesStr}` : ''}`;
  doc.text(subText, x + cardW - 3, badgeY + 3, { align: 'right' });

  // 3. Renderizado del campograma vía Canvas de alta resolución
  const pitchX = x + 3;
  const pitchY = y + 8;
  const pitchW = cardW - 6;
  const pitchH = (pitchW * 68) / 105;

  const pitchDataUrl = renderModernTacticalPitchCanvas({
    touches,
    avgPos,
  });

  if (pitchDataUrl) {
    try {
      doc.addImage(pitchDataUrl, 'PNG', pitchX, pitchY, pitchW, pitchH);
    } catch (e) {
      console.warn('Error embedding pitch heatmap canvas:', e);
    }
  }

  // Borde fino alrededor del campo
  doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(pitchX, pitchY, pitchW, pitchH, 1.5, 1.5, 'S');
}

/**
 * Generador principal del informe individual en PDF.
 */
export async function exportPlayerReportPdf({
  player,
  playerDbInfo,
  lines,
  sections,
  t,
  locale,
  competitionFilter = 'all',
  valueMode = 'total',
  logoUrl = '/escudo.png',
}: PlayerReportPdfOptions) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Carga del escudo del club
  const logoImg = await loadPlayerImage(logoUrl);

  // Carga de la foto del jugador
  const photoUrl = playerDbInfo?.avatar || (playerDbInfo as any)?.photo_url || (playerDbInfo as any)?.photo;
  const playerPhoto = photoUrl ? await loadPlayerImage(photoUrl) : null;

  let pageNum = 1;

  // Filtrado de líneas por competición si aplica
  const filteredLines = lines.filter((l) => l.minutes > 0);
  const touches = filteredLines.flatMap((l) => l.touches);
  const zones = touchZones(touches);
  const playerTramos = partitionPlayerTramos(filteredLines, 'all', t);

  // --- HEADER & FOOTER COMUNES ---
  const drawPageHeader = (title: string, subtitle?: string) => {
    // Fondo superior rossonero
    doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.rect(0, 0, PAGE_W, 20, 'F');

    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.rect(0, 19, PAGE_W, 1.2, 'F');

    // Escudo Milan
    if (logoImg) {
      try {
        doc.addImage(logoImg.dataUrl, logoImg.format, M, 3, 14, 14);
      } catch {
        // ignore
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.text('AC MILAN FUTURO · CUERPO TÉCNICO', M + (logoImg ? 17 : 0), 9);

    const compLabel =
      competitionFilter === 'league' ? t('playerStats.competition.league', 'Liga') : competitionFilter === 'cup' ? t('playerStats.competition.cup', 'Copa') : t('playerStats.competition.all', 'Todas las competiciones');
    const modeLabel = valueMode === 'per90' ? t('playerStats.mode.per90') : t('playerStats.mode.total');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 205, 215);
    doc.text(`${t('playerStats.report.individualReport', 'INFORME INDIVIDUAL')} · ${title} · ${compLabel}`, M + (logoImg ? 17 : 0), 14.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text(t('dashboard.season', 'TEMPORADA 2026/27').toUpperCase(), PAGE_W - M, 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(180, 185, 195);
    doc.text(subtitle || `${modeLabel} · ${t('playerStats.report.fullMatch', 'Partido Completo')}`, PAGE_W - M, 14.5, { align: 'right' });
  };

  const drawFooter = (curPage: number) => {
    doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
    doc.setLineWidth(0.3);
    doc.line(M, PAGE_H - 10, PAGE_W - M, PAGE_H - 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(t('playerStats.report.footer', 'AC Milan Futuro · Departamento de Análisis & Rendimiento'), M, PAGE_H - 5.5);
    doc.text(`${t('common.page', 'Página')} ${curPage}`, PAGE_W - M, PAGE_H - 5.5, { align: 'right' });
  };

  // ==========================================
  // PÁGINA 1: FICHA, KPIs Y MÉTRICAS POR BLOQUES
  // ==========================================
  drawPageHeader(player.name.toUpperCase(), `${t('playerStats.report.fullMatch', 'Partido Completo')} · ${player.matches} ${t('playerStats.kpi.matches', 'Partidos')}`);

  let curY = 26;

  // --- TARJETA DE PERFIL DEL JUGADOR ---
  doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
  doc.roundedRect(M, curY, USABLE_W, 32, 2.5, 2.5, 'F');
  doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, curY, USABLE_W, 32, 2.5, 2.5, 'S');

  // Foto del jugador
  const photoSize = 24;
  let photoDrawn = false;
  if (playerPhoto) {
    try {
      doc.addImage(playerPhoto.dataUrl, playerPhoto.format, M + 4, curY + 4, photoSize, photoSize);
      doc.setDrawColor(RED[0], RED[1], RED[2]);
      doc.setLineWidth(0.6);
      doc.roundedRect(M + 4, curY + 4, photoSize, photoSize, 1.5, 1.5, 'S');
      photoDrawn = true;
    } catch (e) {
      console.warn('Error embedding player photo:', e);
    }
  }

  if (!photoDrawn) {
    doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.roundedRect(M + 4, curY + 4, photoSize, photoSize, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text(`#${player.dorsal}`, M + 4 + photoSize / 2, curY + 4 + photoSize / 2 + 2, { align: 'center' });
  }

  // Datos principales
  const infoX = M + photoSize + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(player.name, infoX, curY + 8);

  // Dorsal y rol
  doc.setFontSize(8.5);
  doc.setTextColor(RED[0], RED[1], RED[2]);
  doc.text(
    `#${player.dorsal} · ${t(`playerStats.roles.${player.role}`)} · ${playerDbInfo?.position || t('dashboard.toBeDefined', 'Sin definir')}`,
    infoX,
    curY + 13.5
  );

  // Fila de metadatos (Edad, Nacionalidad, Pie, Estado médico)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);

  const ageStr = playerDbInfo?.age ? `${playerDbInfo.age} ${t('playerProfile.years', 'años')}` : '–';
  const natStr = playerDbInfo?.nationality || 'Italia';
  const footStr = playerDbInfo?.dominantFoot ? `${t('playerProfile.fields.dominant_foot', 'Pie')}: ${playerDbInfo.dominantFoot}` : '';
  const statusStr = playerDbInfo?.status ? `${t('playerProfile.fields.medical_status', 'Estado')}: ${playerDbInfo.status}` : t('playerProfile.available', 'Apto');

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
  doc.text(
    `${player.matches} ${t('playerStats.kpi.matches', 'PARTIDOS').toUpperCase()} (${player.total.starts ?? 0} ${t('playerStats.matchTable.start', 'TITULAR').toUpperCase()})`,
    PAGE_W - M - 26,
    curY + 18,
    { align: 'center' }
  );

  doc.setFontSize(6);
  doc.text(
    `${t('teamReport.table.mean', 'MEDIA').toUpperCase()} ${player.matches ? Math.round(player.minutes / player.matches) : 0}' / ${t('playerStats.tramos.badgeMatch', 'PARTIDO').toUpperCase()}`,
    PAGE_W - M - 26,
    curY + 23,
    { align: 'center' }
  );

  curY += 38;

  // --- SECCIÓN: RESUMEN / KPIS ---
  if (sections.includes('summary')) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(`${t('playerProfile.performanceSummary', 'RESUMEN DE RENDIMIENTO').toUpperCase()} (${t('playerStats.report.fullMatch', 'PARTIDO COMPLETO').toUpperCase()})`, M, curY);

    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.rect(M, curY + 1.5, 20, 0.8, 'F');

    curY += 6;

    const isGK = player.role === 'P';
    const kpiCards = isGK
      ? [
          { label: t('playerStats.kpi.matches', 'PARTIDOS').toUpperCase(), val: String(player.matches), sub: t('playerStats.kpi.starts', { count: player.total.starts ?? 0 }) },
          { label: t('playerStats.metrics.minutes', 'MINUTOS').toUpperCase(), val: `${player.minutes}'`, sub: t('playerStats.col.total', 'Total') },
          { label: t('playerStats.metrics.saves', 'PARADAS').toUpperCase(), val: String(player.total.saves ?? 0), sub: `${player.total.saves_chance ?? 0} ${t('playerStats.metrics.saves_chance', 'en ocasión')}` },
          { label: t('playerStats.metrics.conceded', 'ENCAJADOS').toUpperCase(), val: String(player.total.conceded ?? 0), sub: t('playerStats.metricDesc.conceded', 'Goles recibidos') },
          { label: t('playerStats.metrics.useful', 'ACCIONES ÚTILES').toUpperCase(), val: String(player.total.useful ?? 0), sub: `${player.per90.useful?.toFixed(1) || '0'} / 90'` },
          { label: `${t('playerStats.metrics.yellow', 'TARJETAS').toUpperCase()} (A/R)`, val: `${player.total.yellow ?? 0} / ${player.total.red ?? 0}`, sub: t('playerStats.groups.discipline', 'Disciplina') },
        ]
      : [
          { label: t('playerStats.kpi.matches', 'PARTIDOS').toUpperCase(), val: String(player.matches), sub: t('playerStats.kpi.starts', { count: player.total.starts ?? 0 }) },
          { label: t('playerStats.metrics.minutes', 'MINUTOS').toUpperCase(), val: `${player.minutes}'`, sub: t('playerStats.col.total', 'Total') },
          { label: t('playerProfile.goals', 'GOLES').toUpperCase(), val: String(player.total.goals ?? 0), sub: `${player.total.shots ?? 0} ${t('playerStats.metrics.shots', 'tiros')}` },
          { label: t('playerProfile.assists', 'ASISTENCIAS').toUpperCase(), val: String(player.total.assists ?? 0), sub: `${player.total.key_passes ?? 0} ${t('playerStats.metrics.key_passes', 'p. clave')}` },
          { label: t('playerStats.metrics.useful', 'ACCIONES ÚTILES').toUpperCase(), val: String(player.total.useful ?? 0), sub: `${player.per90.useful?.toFixed(1) || '0'} / 90'` },
          { label: t('playerStats.metrics.recoveries', 'RECUPERACIONES').toUpperCase(), val: String(player.total.recoveries ?? 0), sub: `${player.total.interceptions ?? 0} ${t('playerStats.metrics.interceptions', 'intercep.')}` },
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
      doc.setTextColor(
        idx === 2 || idx === 3 ? RED[0] : BLACK[0],
        idx === 2 || idx === 3 ? RED[1] : BLACK[1],
        idx === 2 || idx === 3 ? RED[2] : BLACK[2]
      );
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
    doc.text(t('playerStats.metricsTitle', 'ESTADÍSTICAS DETALLADAS POR BLOQUES').toUpperCase(), M, curY);

    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.rect(M, curY + 1.5, 20, 0.8, 'F');

    curY += 6;

    const groupsToShow: MetricGroup[] =
      player.role === 'P'
        ? ['participation', 'passing', 'defense', 'goalkeeper', 'discipline']
        : ['participation', 'passing', 'attack', 'finishing', 'defense', 'discipline'];

    for (const grp of groupsToShow) {
      const metricsInGroup = PLAYER_METRICS.filter((m) => m.group === grp && (m.gk ? player.role === 'P' : true));
      if (!metricsInGroup.length) continue;

      // Header de Bloque
      doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
      doc.rect(M, curY, USABLE_W, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(RED[0], RED[1], RED[2]);
      doc.text(t(`playerStats.groups.${grp}`).toUpperCase(), M + 3, curY + 3.6);

      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(t('playerStats.col.total', 'TOTAL').toUpperCase(), PAGE_W - M - 28, curY + 3.6, { align: 'right' });
      doc.text(t('playerStats.mode.per90', 'POR 90 MIN').toUpperCase(), PAGE_W - M - 4, curY + 3.6, { align: 'right' });

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
  // PÁGINA 2: CAMPOGRAMAS (GENERAL + 3 TRAMOS) Y DISTRIBUCIÓN
  // ==========================================
  if (sections.includes('heatmap') || sections.includes('passing')) {
    doc.addPage();
    pageNum++;
    drawPageHeader(player.name.toUpperCase(), `${t('playerStats.zones.title', 'Distribución Táctica')} & ${t('playerStats.evolution.title', 'Evolución')}`);

    curY = 26;

    if (sections.includes('heatmap')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.text(t('playerStats.report.tacticalPitchesTitle', 'CAMPOGRAMAS TÁCTICOS Y EVOLUCIÓN POR TRAMOS'), M, curY);

      doc.setFillColor(RED[0], RED[1], RED[2]);
      doc.rect(M, curY + 1.5, 20, 0.8, 'F');

      curY += 6;

      // Matriz 2x2 de campogramas (General + 3 Tramos)
      const gridGap = 4;
      const cardW = (USABLE_W - gridGap) / 2; // ~91mm
      const pitchInsideW = cardW - 6;
      const pitchInsideH = (pitchInsideW * 68) / 105;
      const cardH = 8 + pitchInsideH + 3.5; // ~66mm

      const globalAvgPos = averagePosition(filteredLines);

      // 1. Campograma General (Top-Left)
      drawTacticalPitchCard(doc, M, curY, cardW, cardH, {
        badge: t('playerStats.tramos.global', 'GLOBAL').toUpperCase(),
        title: t('playerStats.tramos.general', 'General'),
        subtitle: `${t('playerStats.tramos.allSeason', 'Toda la temporada')} · ${t('playerStats.matchesCount', { count: filteredLines.length })}`,
        touchesCount: touches.length,
        isAccent: true,
        touches,
        avgPos: globalAvgPos,
        t,
      });

      // 2. Tramo 1 (Top-Right)
      const t1 = playerTramos[0];
      drawTacticalPitchCard(doc, M + cardW + gridGap, curY, cardW, cardH, {
        badge: t('playerStats.tramos.tramoBadge', { n: 1 }).toUpperCase(),
        title: t('playerStats.report.startPeriod', 'Inicio de Temporada'),
        subtitle: t1 ? t1.label : t('playerStats.tramos.noMatches', '0 PJ'),
        touchesCount: t1 ? t1.touches.length : 0,
        isAccent: false,
        touches: t1 ? t1.touches : [],
        avgPos: t1 ? t1.avgPos : null,
        t,
      });

      // 3. Tramo 2 (Bottom-Left)
      const t2 = playerTramos[1];
      drawTacticalPitchCard(doc, M, curY + cardH + gridGap, cardW, cardH, {
        badge: t('playerStats.tramos.tramoBadge', { n: 2 }).toUpperCase(),
        title: t('playerStats.report.midPeriod', 'Fase Intermedia'),
        subtitle: t2 ? t2.label : t('playerStats.tramos.noMatches', '0 PJ'),
        touchesCount: t2 ? t2.touches.length : 0,
        isAccent: false,
        touches: t2 ? t2.touches : [],
        avgPos: t2 ? t2.avgPos : null,
        t,
      });

      // 4. Tramo 3 (Bottom-Right)
      const t3 = playerTramos[2];
      drawTacticalPitchCard(doc, M + cardW + gridGap, curY + cardH + gridGap, cardW, cardH, {
        badge: t('playerStats.tramos.tramoBadge', { n: 3 }).toUpperCase(),
        title: t('playerStats.report.recentPeriod', 'Fase Reciente'),
        subtitle: t3 ? t3.label : t('playerStats.tramos.noMatches', '0 PJ'),
        touchesCount: t3 ? t3.touches.length : 0,
        isAccent: false,
        touches: t3 ? t3.touches : [],
        avgPos: t3 ? t3.avgPos : null,
        t,
      });

      curY += cardH * 2 + gridGap + 6;
    }

    // --- PANELES INFERIORES: DISTRIBUCIÓN TERRITORIAL Y SOCIOS DE PASE ---
    const panelGap = 4;
    const panelW = (USABLE_W - panelGap) / 2;
    const panelH = 42;

    // Panel Izquierdo: Dónde Actúa (Tercios y Carriles)
    doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
    doc.roundedRect(M, curY, panelW, panelH, 2, 2, 'F');
    doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, curY, panelW, panelH, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(`${t('playerStats.zones.title', 'DÓNDE ACTÚA').toUpperCase()} (${t('playerStats.zones.thirds', 'POR TERCIOS').toUpperCase()})`, M + 4, curY + 5.5);

    const thirdsLabels = [t('playerStats.zones.defense', 'Defensa'), t('playerStats.zones.middle', 'Medio'), t('playerStats.zones.attack', 'Ataque')];
    thirdsLabels.forEach((lbl, i) => {
      const pct = Math.round(zones.thirds[i] || 0);
      const barY = curY + 9 + i * 5.2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(lbl, M + 4, barY + 2.8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${pct}%`, M + panelW - 4, barY + 2.8, { align: 'right' });

      // Barra
      doc.setFillColor(230, 233, 238);
      doc.roundedRect(M + 18, barY, panelW - 30, 2.2, 0.8, 0.8, 'F');
      doc.setFillColor(RED[0], RED[1], RED[2]);
      doc.roundedRect(M + 18, barY, Math.max(1, ((panelW - 30) * pct) / 100), 2.2, 0.8, 0.8, 'F');
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(`${t('playerStats.zones.title', 'DÓNDE ACTÚA').toUpperCase()} (${t('playerStats.zones.lanes', 'POR CARRILES').toUpperCase()})`, M + 4, curY + 26);

    const lanesLabels = [t('playerStats.zones.left', 'Izquierda'), t('playerStats.zones.center', 'Centro'), t('playerStats.zones.right', 'Derecha')];
    lanesLabels.forEach((lbl, i) => {
      const pct = Math.round(zones.lanes[i] || 0);
      const barY = curY + 29.5 + i * 4.2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(lbl, M + 4, barY + 2.4);
      doc.setFont('helvetica', 'bold');
      doc.text(`${pct}%`, M + panelW - 4, barY + 2.4, { align: 'right' });

      // Barra
      doc.setFillColor(230, 233, 238);
      doc.roundedRect(M + 18, barY, panelW - 30, 1.8, 0.8, 0.8, 'F');
      doc.setFillColor(INK[0], INK[1], INK[2]);
      doc.roundedRect(M + 18, barY, Math.max(1, ((panelW - 30) * pct) / 100), 1.8, 0.8, 0.8, 'F');
    });

    // Panel Derecho: Socios de Pase (A quién pasa & De quién recibe)
    const px2 = M + panelW + panelGap;
    doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
    doc.roundedRect(px2, curY, panelW, panelH, 2, 2, 'F');
    doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(px2, curY, panelW, panelH, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text(`${t('playerStats.partners.to', 'A QUIÉN PASA').toUpperCase()} (${t('playerStats.hub.receiver', 'RECEPTORES').toUpperCase()})`, px2 + 4, curY + 5.5);

    const toPartners = passPartners(lines, 'to', 3);
    if (toPartners.length) {
      toPartners.forEach((p, idx) => {
        const py = curY + 9 + idx * 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(p.name, px2 + 4, py + 2.5);
        doc.setFont('helvetica', 'bold');
        doc.text(t('playerStats.partners.passes', { count: p.passes }), px2 + panelW - 4, py + 2.5, { align: 'right' });
      });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(t('playerStats.report.noMatrixData', 'Sin datos de matriz registrados'), px2 + 4, curY + 13);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(`${t('playerStats.partners.from', 'DE QUIÉN RECIBE').toUpperCase()} (${t('playerStats.hub.passer', 'PASADORES').toUpperCase()})`, px2 + 4, curY + 26);

    const fromPartners = passPartners(lines, 'from', 3);
    if (fromPartners.length) {
      fromPartners.forEach((p, idx) => {
        const py = curY + 29.5 + idx * 4.2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(p.name, px2 + 4, py + 2.4);
        doc.setFont('helvetica', 'bold');
        doc.text(t('playerStats.partners.passes', { count: p.passes }), px2 + panelW - 4, py + 2.4, { align: 'right' });
      });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(t('playerStats.report.noMatrixData', 'Sin datos de matriz registrados'), px2 + 4, curY + 33);
    }

    drawFooter(pageNum);
  }

  // ==========================================
  // PÁGINA 3 (O SIGUIENTE): HISTORIAL PARTIDO A PARTIDO
  // ==========================================
  if (sections.includes('matches')) {
    doc.addPage();
    pageNum++;
    drawPageHeader(player.name.toUpperCase(), t('playerStats.matchTable.title', 'Historial Partido a Partido'));

    curY = 26;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(`${t('playerStats.matchTable.title', 'HISTORIAL PARTIDO A PARTIDO').toUpperCase()} (${t('playerStats.report.fullMatch', 'PARTIDO COMPLETO').toUpperCase()})`, M, curY);

    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.rect(M, curY + 1.5, 20, 0.8, 'F');

    curY += 6;

    const drawMatchTableHeader = () => {
      doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.rect(M, curY, USABLE_W, 5.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
      doc.text(`${t('dashboard.matchday', 'JORNADA').toUpperCase()} / ${t('dashboard.dayLabel', 'FECHA').toUpperCase()}`, M + 3, curY + 3.8);
      doc.text(t('dashboard.nextOpponent', 'RIVAL').toUpperCase(), M + 34, curY + 3.8);
      doc.text(t('playerStats.matchTable.min', 'MIN').toUpperCase(), M + 82, curY + 3.8, { align: 'center' });
      doc.text(t('playerProfile.goals', 'GOLES').toUpperCase(), M + 98, curY + 3.8, { align: 'center' });
      doc.text(t('playerProfile.assists', 'ASIST').toUpperCase(), M + 114, curY + 3.8, { align: 'center' });
      doc.text(`${t('playerStats.groups.passing', 'PASES').toUpperCase()} (OK/TOT)`, M + 136, curY + 3.8, { align: 'center' });
      doc.text(t('playerStats.metrics.pass_acc', '% PREC.').toUpperCase(), M + 160, curY + 3.8, { align: 'center' });
      doc.text(t('teamReport.table.result', 'RESULTADO').toUpperCase(), PAGE_W - M - 4, curY + 3.8, { align: 'right' });

      curY += 5.5;
    };

    drawMatchTableHeader();

    filteredLines.forEach((l, idx) => {
      const rowH = 5.2;

      // Si sobrepasa la página, añadir nueva página
      if (curY + rowH > PAGE_H - 16) {
        drawFooter(pageNum);
        doc.addPage();
        pageNum++;
        drawPageHeader(player.name.toUpperCase(), `${t('playerStats.matchTable.title', 'Historial Partido a Partido')} (${t('common.continue', 'Continuación')})`);
        curY = 26;
        drawMatchTableHeader();
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 249, 250);
        doc.rect(M, curY, USABLE_W, rowH, 'F');
      }

      const dateStr = l.entry.match.date
        ? new Date(l.entry.match.date).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
        : '';
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
      doc.text(
        String(
          l.stats?.asistencias_pases_clave
            ? Number(l.stats.asistencias_pases_clave.split('/')[0] || 0)
            : 0
        ),
        M + 114,
        curY + 3.6,
        { align: 'center' }
      );
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

    drawFooter(pageNum);
  }

  // Guardar archivo
  const safeName = (player.name || 'jugador').toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`informe_${safeName}_${player.dorsal || ''}.pdf`);
}
