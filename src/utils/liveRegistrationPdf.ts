import { jsPDF } from 'jspdf';
import type { MatchDB, MatchFocus, MatchDataPoint } from '../components/types';
import { loadImage } from './matchesPdf';

export interface FocusStatRow {
  title: string;
  type: string;
  total: number;
  success: number;
  failure: number;
  neutral: number;
  /** % de acierto sobre éxitos + fallos, null si no hay ninguno valorado */
  pct: number | null;
}

interface Params {
  match: MatchDB;
  role: string;
  focuses: MatchFocus[];
  dataPoints: MatchDataPoint[];
  rows: FocusStatRow[];
  elapsedLabel: string;
  clubName?: string;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const USABLE_W = PAGE_W - MARGIN * 2;

export const exportLiveRegistrationPdf = async ({ match, role, focuses, dataPoints, rows, elapsedLabel, clubName = 'Milan Futuro' }: Params) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const homeLogo = match.home_logo ? await loadImage(match.home_logo) : null;
  const awayLogo = match.away_logo ? await loadImage(match.away_logo) : null;

  const homeName = match.is_home ? clubName : match.opponent;
  const awayName = match.is_home ? match.opponent : clubName;

  const focusById = new Map(focuses.map(f => [f.id, f]));

  // ---------- Cabecera ----------
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, PAGE_W, 42, 'F');
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 42, PAGE_W, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('REGISTRO EN VIVO', MARGIN, 15);

  doc.setFontSize(10);
  doc.setTextColor(160, 170, 190);
  doc.text(`${homeName}  vs  ${awayName}`, MARGIN, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(140, 150, 170);
  const dateStr = match.date ? new Date(match.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha';
  doc.text(`${match.competition || 'Partido Oficial'} · ${dateStr}${match.time ? ` · ${match.time}` : ''}`, MARGIN, 29);
  doc.text(`Entrenador: ${role}   |   Tiempo registrado: ${elapsedLabel}`, MARGIN, 34.5);

  if (homeLogo) doc.addImage(homeLogo.dataUrl, 'PNG', PAGE_W - MARGIN - 26, 10, 11, 11);
  if (awayLogo) doc.addImage(awayLogo.dataUrl, 'PNG', PAGE_W - MARGIN - 12, 10, 11, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(140, 150, 170);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, PAGE_W - MARGIN, 27, { align: 'right' });

  // ---------- KPIs ----------
  const total = rows.reduce((a, r) => a + r.total, 0);
  const success = rows.reduce((a, r) => a + r.success, 0);
  const failure = rows.reduce((a, r) => a + r.failure, 0);
  const neutral = rows.reduce((a, r) => a + r.neutral, 0);
  const globalPct = success + failure > 0 ? Math.round((success / (success + failure)) * 100) : null;

  const kpis: { label: string; value: string; color: number[] }[] = [
    { label: 'EVENTOS', value: String(total), color: [37, 99, 235] },
    { label: 'ACIERTOS', value: String(success), color: [16, 185, 129] },
    { label: 'FALLOS', value: String(failure), color: [239, 68, 68] },
    { label: 'NEUTROS', value: String(neutral), color: [107, 114, 128] },
    { label: '% ACIERTO', value: globalPct == null ? '—' : `${globalPct}%`, color: [17, 24, 39] },
  ];

  let y = 52;
  const kpiW = (USABLE_W - 4 * 3) / 5;
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (kpiW + 3);
    doc.setFillColor(249, 250, 252);
    doc.setDrawColor(k.color[0], k.color[1], k.color[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, kpiW, 18, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.value, x + kpiW / 2, y + 9, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setTextColor(120, 128, 140);
    doc.text(k.label, x + kpiW / 2, y + 14.5, { align: 'center' });
  });

  y += 26;

  // ---------- Tabla por foco ----------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text('RESUMEN POR FOCO', MARGIN, y);
  y += 5;

  const colFocus = MARGIN + 2;
  const colTotal = MARGIN + 105;
  const colOk = MARGIN + 121;
  const colKo = MARGIN + 137;
  const colNeu = MARGIN + 153;
  const colPct = MARGIN + USABLE_W - 2;

  const drawTableHeader = () => {
    doc.setFillColor(243, 245, 248);
    doc.rect(MARGIN, y, USABLE_W, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(110, 118, 130);
    doc.text('FOCO', colFocus, y + 4.6);
    doc.text('TOTAL', colTotal, y + 4.6, { align: 'center' });
    doc.text('ACIERTOS', colOk, y + 4.6, { align: 'center' });
    doc.text('FALLOS', colKo, y + 4.6, { align: 'center' });
    doc.text('NEUTROS', colNeu, y + 4.6, { align: 'center' });
    doc.text('% ACIERTO', colPct, y + 4.6, { align: 'right' });
    y += 9;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed <= PAGE_H - 16) return;
    doc.addPage();
    y = 20;
  };

  drawTableHeader();

  if (rows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(150, 155, 165);
    doc.text('Sin eventos registrados todavía.', colFocus, y + 3);
    y += 10;
  }

  rows.forEach((r, idx) => {
    ensureSpace(11);
    if (idx % 2 === 0) {
      doc.setFillColor(252, 253, 255);
      doc.rect(MARGIN, y - 3.5, USABLE_W, 10, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 35, 45);
    doc.text(doc.splitTextToSize(r.title, 78)[0], colFocus, y + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(140, 146, 158);
    doc.text(r.type.toUpperCase(), colFocus, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 35, 45);
    doc.text(String(r.total), colTotal, y + 2, { align: 'center' });
    doc.setTextColor(16, 185, 129);
    doc.text(String(r.success), colOk, y + 2, { align: 'center' });
    doc.setTextColor(239, 68, 68);
    doc.text(String(r.failure), colKo, y + 2, { align: 'center' });
    doc.setTextColor(120, 128, 140);
    doc.text(String(r.neutral), colNeu, y + 2, { align: 'center' });

    // Barra de porcentaje
    const barW = 26;
    const barX = colPct - barW;
    doc.setFillColor(232, 236, 241);
    doc.roundedRect(barX, y + 3, barW, 2.4, 1.2, 1.2, 'F');
    if (r.pct != null) {
      const fill = Math.max(0.8, (barW * r.pct) / 100);
      const c = r.pct >= 60 ? [16, 185, 129] : r.pct >= 40 ? [245, 158, 11] : [239, 68, 68];
      doc.setFillColor(c[0], c[1], c[2]);
      doc.roundedRect(barX, y + 3, fill, 2.4, 1.2, 1.2, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 35, 45);
    doc.text(r.pct == null ? '—' : `${r.pct}%`, colPct, y + 1, { align: 'right' });

    y += 11;
  });

  // ---------- Mapas de Eventos ----------
  const focusesWithMaps = focuses.map(f => {
    const pts = dataPoints.filter(dp => dp.focus_id === f.id && dp.coordinates?.x != null && dp.coordinates?.y != null);
    return { focus: f, pts };
  }).filter(x => x.pts.length > 0);

  if (focusesWithMaps.length > 0) {
    y += 8;
    ensureSpace(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text('MAPAS DE EVENTOS', MARGIN, y);
    y += 8;

    const mapW = (USABLE_W - 10) / 2; // Two columns
    const mapH = mapW / 1.5;
    let col = 0;

    focusesWithMaps.forEach(({ focus, pts }) => {
      if (col === 0) ensureSpace(mapH + 12);
      const px = MARGIN + col * (mapW + 10);
      
      // Título del mapa
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 35, 45);
      doc.text(doc.splitTextToSize(focus.title, mapW)[0], px, y);
      
      // Fondo verde del campo
      const py = y + 3;
      doc.setFillColor(74, 222, 128); // bg-green-400
      doc.rect(px, py, mapW, mapH, 'F');
      
      // Líneas blancas
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.4);
      doc.rect(px, py, mapW, mapH, 'S'); // Outer border
      doc.line(px + mapW / 2, py, px + mapW / 2, py + mapH); // Medio campo
      doc.circle(px + mapW / 2, py + mapH / 2, mapW * 0.1, 'S'); // Círculo central
      
      // Áreas
      doc.rect(px, py + mapH * 0.2, mapW * 0.15, mapH * 0.6, 'S');
      doc.rect(px + mapW - mapW * 0.15, py + mapH * 0.2, mapW * 0.15, mapH * 0.6, 'S');
      
      // Áreas pequeñas
      doc.rect(px, py + mapH * 0.35, mapW * 0.05, mapH * 0.3, 'S');
      doc.rect(px + mapW - mapW * 0.05, py + mapH * 0.35, mapW * 0.05, mapH * 0.3, 'S');

      // Puntos
      pts.forEach(dp => {
        const cx = px + (dp.coordinates!.x! / 100) * mapW;
        const cy = py + (dp.coordinates!.y! / 100) * mapH;
        
        const isSuccess = dp.outcome === 'Success';
        const isFailure = dp.outcome === 'Failure';
        doc.setFillColor(isSuccess ? 34 : (isFailure ? 239 : 255), isSuccess ? 197 : (isFailure ? 68 : 255), isSuccess ? 94 : (isFailure ? 68 : 255));
        
        if (dp.coordinates!.endX != null && dp.coordinates!.endY != null) {
          const ex = px + (dp.coordinates!.endX! / 100) * mapW;
          const ey = py + (dp.coordinates!.endY! / 100) * mapH;
          doc.setDrawColor(isSuccess ? 34 : (isFailure ? 239 : 255), isSuccess ? 197 : (isFailure ? 68 : 255), isSuccess ? 94 : (isFailure ? 68 : 255));
          doc.setLineWidth(0.8);
          doc.line(cx, cy, ex, ey);
          // Puntito al final
          doc.circle(ex, ey, 1, 'F');
        }
        
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.3);
        doc.circle(cx, cy, 1.5, 'FD');
      });

      col++;
      if (col > 1) {
        col = 0;
        y += mapH + 12;
      }
    });
    
    if (col > 0) y += mapH + 12;
  }

  // ---------- Cronología ----------
  y += 6;
  ensureSpace(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text('CRONOLOGÍA DE EVENTOS', MARGIN, y);
  y += 6;

  const ordered = dataPoints.slice().sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  if (ordered.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(150, 155, 165);
    doc.text('Sin eventos registrados todavía.', MARGIN + 2, y);
  }

  ordered.forEach(dp => {
    const focus = dp.focus_id ? focusById.get(dp.focus_id) : undefined;
    const period = dp.coordinates?.period;
    const zone = dp.coordinates?.zone;
    const extras = [period, zone, dp.comments].filter(Boolean).join(' · ');
    const extraLines = extras ? doc.splitTextToSize(extras, USABLE_W - 40) : [];
    const rowH = 7 + extraLines.length * 3.6;
    ensureSpace(rowH + 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(37, 99, 235);
    doc.text(dp.minute != null ? `${dp.minute}'` : "-", MARGIN + 2, y);

    doc.setTextColor(30, 35, 45);
    doc.text(doc.splitTextToSize(focus?.title || dp.type, 110)[0], MARGIN + 14, y);

    const label = dp.outcome === 'Success' ? 'ACIERTO' : dp.outcome === 'Failure' ? 'FALLO' : 'NEUTRO';
    const c = dp.outcome === 'Success' ? [16, 185, 129] : dp.outcome === 'Failure' ? [239, 68, 68] : [150, 156, 168];
    doc.setFillColor(c[0], c[1], c[2]);
    doc.roundedRect(PAGE_W - MARGIN - 22, y - 3.4, 22, 4.8, 1.2, 1.2, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(label, PAGE_W - MARGIN - 11, y, { align: 'center' });

    if (extraLines.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(130, 137, 150);
      extraLines.forEach((line: string, i: number) => doc.text(line, MARGIN + 14, y + 3.6 + i * 3.6));
    }

    doc.setDrawColor(238, 240, 244);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y + rowH - 4, PAGE_W - MARGIN, y + rowH - 4);

    y += rowH;
  });

  // ---------- Pie ----------
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 229, 234);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 10, PAGE_W - MARGIN, PAGE_H - 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(140, 146, 158);
    doc.text(`${clubName.toUpperCase()} · ${role.toUpperCase()}`, MARGIN, PAGE_H - 6);
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
  }

  const safe = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  doc.save(`registro_${safe(match.opponent || 'partido')}_${safe(role)}.pdf`);
};
