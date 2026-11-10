import type { TFunction } from 'i18next';
import type { Player, MeetingDB, PlayerObjective, PlayerWeight, PlayerInjury, SeasonReport } from '../components/types';
import type { PlayerAggregate } from './playerPaniniStats';
import { loadPlayerImage } from './playerReportPdf';

export interface FullPlayerPdfOptions {
  player: Player;
  dbPlayer?: any;
  stats?: PlayerAggregate | null;
  objectives?: PlayerObjective[];
  meetings?: MeetingDB[];
  injuries?: PlayerInjury[];
  weights?: PlayerWeight[];
  reports?: SeasonReport[];
  focuses?: any[];
  t: TFunction;
  locale: string;
}

type RGB = [number, number, number];

const PAGE_W = 210;
const PAGE_H = 297;
const M = 14;
const USABLE_W = PAGE_W - M * 2;
const CONTENT_BOTTOM_LIMIT = PAGE_H - 18;

// Colores del club y diseño moderno
const RED: RGB = [219, 0, 48];
const BLACK: RGB = [17, 17, 20];
const INK: RGB = [30, 35, 45];
const GREY: RGB = [105, 112, 125];
const GREY_LIGHT: RGB = [230, 233, 238];
const PAPER: RGB = [248, 249, 250];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [16, 185, 129];
const BLUE: RGB = [37, 99, 235];

function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<li>/gi, ' • ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

export async function exportFullPlayerPdf(options: FullPlayerPdfOptions) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const {
    player,
    dbPlayer,
    stats,
    objectives = [],
    meetings = [],
    injuries = [],
    weights = [],
    reports = [],
    focuses = [],
    t,
    locale,
  } = options;

  // Cargar imagen de escudo y foto de jugador
  const logoImg = await loadPlayerImage('/escudo.png');
  const photoUrl = player.avatar || dbPlayer?.photo_url || dbPlayer?.photo;
  const playerPhoto = photoUrl ? await loadPlayerImage(photoUrl) : null;

  let pageNum = 1;

  // Cabecera idéntica en todas las páginas con la foto y el nombre arriba
  const drawPageHeader = () => {
    // Franja negra superior
    doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.rect(0, 0, PAGE_W, 24, 'F');

    // Línea roja distintiva
    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.rect(0, 23, PAGE_W, 1.2, 'F');

    // Escudo AC Milan izquierda
    if (logoImg) {
      try {
        doc.addImage(logoImg.dataUrl, logoImg.format, M, 3.5, 16, 16);
      } catch {
        // ignore
      }
    }

    // Foto del jugador en la cabecera (esquina derecha o junto al texto)
    const photoSize = 18;
    const photoX = PAGE_W - M - photoSize;
    const photoY = 3;

    if (playerPhoto) {
      try {
        doc.addImage(playerPhoto.dataUrl, playerPhoto.format, photoX, photoY, photoSize, photoSize);
        doc.setDrawColor(RED[0], RED[1], RED[2]);
        doc.setLineWidth(0.6);
        doc.roundedRect(photoX, photoY, photoSize, photoSize, 1.5, 1.5, 'S');
      } catch {
        // fallback
      }
    } else {
      doc.setFillColor(30, 30, 35);
      doc.roundedRect(photoX, photoY, photoSize, photoSize, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(RED[0], RED[1], RED[2]);
      doc.text(dbPlayer?.dorsal ? `#${dbPlayer.dorsal}` : 'AC', photoX + photoSize / 2, photoY + photoSize / 2 + 3, { align: 'center' });
    }

    // Texto de cabecera con Nombre del Jugador
    const textStartX = M + (logoImg ? 19 : 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.text((player.name || 'JUGADOR').toUpperCase(), textStartX, 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    const dorsalStr = dbPlayer?.dorsal ? `#${dbPlayer.dorsal} · ` : '';
    const posStr = player.position || 'FUTBOLISTA';
    doc.text(`${dorsalStr}${posStr.toUpperCase()}`, textStartX, 14.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(190, 195, 205);
    doc.text('AC MILAN FUTURO · DOSSIER TÉCNICO COMPLETO 2026/27', textStartX, 19.5);
  };

  const drawFooter = (page: number) => {
    doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
    doc.setLineWidth(0.3);
    doc.line(M, PAGE_H - 10, PAGE_W - M, PAGE_H - 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('AC Milan Futuro · Departamento de Rendimiento y Desarrollo Individual', M, PAGE_H - 5.5);
    doc.text(`${t('common.page', 'Página')} ${page}`, PAGE_W - M, PAGE_H - 5.5, { align: 'right' });
  };

  const checkPageBreak = (neededHeight: number): number => {
    if (curY + neededHeight > CONTENT_BOTTOM_LIMIT) {
      drawFooter(pageNum);
      doc.addPage();
      pageNum++;
      drawPageHeader();
      curY = 30;
    }
    return curY;
  };

  const drawSectionTitle = (title: string, badge?: string) => {
    checkPageBreak(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(title.toUpperCase(), M, curY);

    if (badge) {
      doc.setFontSize(7);
      doc.setTextColor(RED[0], RED[1], RED[2]);
      doc.text(`[ ${badge.toUpperCase()} ]`, PAGE_W - M, curY, { align: 'right' });
    }

    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.rect(M, curY + 1.5, 22, 0.8, 'F');
    curY += 6.5;
  };

  // ============================================================
  // PÁGINA 1: FICHA TÉCNICA + RENDIMIENTO + CONTROL DE PESO
  // ============================================================
  drawPageHeader();
  let curY = 30;

  // 1. Tarjeta resumen Ficha Técnica
  drawSectionTitle(t('playerTabs.technicalSheet', 'Ficha Técnica y Datos'), player.status || 'Disponible');

  const cardH = 26;
  doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
  doc.roundedRect(M, curY, USABLE_W, cardH, 2, 2, 'F');
  doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, curY, USABLE_W, cardH, 2, 2, 'S');

  const age = player.age || (dbPlayer?.birth_date ? new Date().getFullYear() - new Date(dbPlayer.birth_date).getFullYear() : '–');
  const height = dbPlayer?.height_cm || player.height || '–';
  const weight = dbPlayer?.weight_kg || player.weight || '–';
  const nationality = dbPlayer?.nationality || player.nationality || 'Italia';
  const foot = dbPlayer?.dominant_foot || player.dominantFoot || '–';
  const birthPlace = dbPlayer?.birth_place || player.birthPlace || '–';

  const bioItems = [
    { label: t('playerProfile.fields.birth_date', 'Edad'), val: `${age} años` },
    { label: t('playerProfile.fields.nationality', 'Nacionalidad'), val: nationality },
    { label: t('playerProfile.fields.dominant_foot', 'Pie dominante'), val: foot },
    { label: t('playerProfile.fields.height_cm', 'Altura'), val: `${height} cm` },
    { label: t('playerProfile.fields.weight_kg', 'Peso actual'), val: `${weight} kg` },
    { label: t('playerProfile.fields.birth_place', 'Lugar nac.'), val: birthPlace },
  ];

  const colW = USABLE_W / 3;
  bioItems.forEach((it, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = M + 4 + col * colW;
    const y = curY + 5.5 + row * 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(it.label.toUpperCase(), x, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(String(it.val), x, y + 4.2);
  });

  curY += cardH + 5;

  // 2. Rendimiento en Partidos (KPIs)
  drawSectionTitle(t('playerProfile.performanceSummary', 'Rendimiento en Partidos'));

  const matches = stats?.matches ?? (dbPlayer?.matches ?? 0);
  const minutes = stats?.minutes ?? (dbPlayer?.minutes ?? 0);
  const goals = stats?.total?.goals ?? (dbPlayer?.goals ?? 0);
  const assists = stats?.total?.assists ?? (dbPlayer?.assists ?? 0);
  const useful = stats?.total?.useful ?? 0;
  const recoveries = stats?.total?.recoveries ?? 0;

  const kpis = [
    { label: t('playerStats.kpi.matches', 'PARTIDOS'), val: String(matches), sub: `${stats?.total?.starts ?? matches} titular` },
    { label: t('playerStats.metrics.minutes', 'MINUTOS'), val: `${minutes}'`, sub: matches ? `~${Math.round(minutes / matches)}'/partido` : '0\'' },
    { label: t('playerProfile.goals', 'GOLES'), val: String(goals), sub: 'Ofensiva' },
    { label: t('playerProfile.assists', 'ASISTENCIAS'), val: String(assists), sub: 'Pases de gol' },
    { label: t('playerStats.metrics.useful', 'ACCIONES ÚTILES'), val: String(useful), sub: 'Impacto total' },
    { label: t('playerStats.metrics.recoveries', 'RECUPERACIONES'), val: String(recoveries), sub: 'Fase defensiva' },
  ];

  const kpiW = (USABLE_W - 5 * 2.5) / 6;
  kpis.forEach((c, idx) => {
    const cx = M + idx * (kpiW + 2.5);
    doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.roundedRect(cx, curY, kpiW, 16, 1.5, 1.5, 'F');
    doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
    doc.roundedRect(cx, curY, kpiW, 16, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(c.label, cx + kpiW / 2, curY + 4, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(idx === 2 || idx === 3 ? RED[0] : BLACK[0], idx === 2 || idx === 3 ? RED[1] : BLACK[1], idx === 2 || idx === 3 ? RED[2] : BLACK[2]);
    doc.text(c.val, cx + kpiW / 2, curY + 9.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(c.sub, cx + kpiW / 2, curY + 13.5, { align: 'center' });
  });

  curY += 21;

  // 3. Control de Peso y Composición Corporal
  drawSectionTitle(t('playerTabs.weightControl', 'Control de Peso y Evolución'), `${weights.length} registros`);

  if (weights.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('Sin registros de peso en el sistema.', M, curY + 3);
    curY += 8;
  } else {
    // Últimos 6 registros en fila moderna
    const recentWeights = [...weights].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    const wCardW = (USABLE_W - (recentWeights.length - 1) * 2.5) / recentWeights.length;

    recentWeights.forEach((w, idx) => {
      const cx = M + idx * (wCardW + 2.5);
      doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
      doc.roundedRect(cx, curY, wCardW, 14, 1.5, 1.5, 'F');
      doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
      doc.roundedRect(cx, curY, wCardW, 14, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(w.date, cx + wCardW / 2, curY + 4.2, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(`${w.weight} kg`, cx + wCardW / 2, curY + 9.8, { align: 'center' });
    });
    curY += 19;
  }

  // 4. Historial Médico y Lesiones
  drawSectionTitle(t('playerTabs.medicalInjuries', 'Lesiones y Situación Médica'), `${injuries.length} registradas`);

  if (injuries.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.text('✓ El jugador no registra lesiones activas ni antecedentes recientes.', M, curY + 3);
    curY += 10;
  } else {
    injuries.slice(0, 4).forEach((inj) => {
      checkPageBreak(14);
      doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
      doc.roundedRect(M, curY, USABLE_W, 11, 1.5, 1.5, 'F');
      doc.setDrawColor(inj.status === 'Activa' || inj.status === 'Baja' ? RED[0] : GREY_LIGHT[0], inj.status === 'Activa' || inj.status === 'Baja' ? RED[1] : GREY_LIGHT[1], inj.status === 'Activa' || inj.status === 'Baja' ? RED[2] : GREY_LIGHT[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(M, curY, USABLE_W, 11, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(inj.diagnosis || 'Lesión deportiva', M + 4, curY + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      const zoneText = `${inj.body_zone || 'General'} · Severidad: ${inj.severity || 'Normal'}`;
      doc.text(zoneText, M + 4, curY + 8.2);

      // Estado Badge
      const isRed = inj.status === 'Activa' || inj.status === 'Baja';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(isRed ? RED[0] : GREEN[0], isRed ? RED[1] : GREEN[1], isRed ? RED[2] : GREEN[2]);
      doc.text(`${inj.status.toUpperCase()} (${inj.injury_date})`, PAGE_W - M - 4, curY + 6.2, { align: 'right' });

      curY += 13.5;
    });
  }

  // ============================================================
  // PÁGINA 2: PLAN INDIVIDUAL, OBJETIVOS Y FOCOS
  // ============================================================
  checkPageBreak(40);
  drawSectionTitle(t('playerTabs.individualPlan', 'Plan Individual y Focos de Desarrollo'));

  if (focuses.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(RED[0], RED[1], RED[2]);
    doc.text('FOCOS PRIORITARIOS DE APRENDIZAJE:', M, curY);
    curY += 4.5;

    focuses.forEach((f) => {
      checkPageBreak(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(`• [${(f.context || 'Foco').toUpperCase()}]: ${f.title}`, M + 2, curY);
      if (f.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(`   ${f.description}`, M + 2, curY + 3.5);
        curY += 3.5;
      }
      curY += 4.5;
    });
    curY += 3;
  }

  // Objetivos fijados
  if (objectives.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('Sin objetivos registrados en el plan individual.', M, curY + 3);
    curY += 8;
  } else {
    objectives.forEach((obj) => {
      checkPageBreak(18);
      const isAchieved = obj.status === 'Cumplido';
      doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
      doc.roundedRect(M, curY, USABLE_W, 14, 1.5, 1.5, 'F');
      doc.setDrawColor(isAchieved ? GREEN[0] : BLUE[0], isAchieved ? GREEN[1] : BLUE[1], isAchieved ? GREEN[2] : BLUE[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(M, curY, USABLE_W, 14, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(obj.title, M + 4, curY + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(isAchieved ? GREEN[0] : BLUE[0], isAchieved ? GREEN[1] : BLUE[1], isAchieved ? GREEN[2] : BLUE[2]);
      doc.text(obj.status.toUpperCase(), PAGE_W - M - 4, curY + 5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      const descSnippet = obj.description ? stripHtml(obj.description).slice(0, 120) : 'Sin descripción adicional';
      doc.text(descSnippet, M + 4, curY + 9.5);

      curY += 17;
    });
  }

  // ============================================================
  // PÁGINA 3 / SIGUIENTE: COLOQUIOS Y REUNIONES INDIVIDUALES
  // ============================================================
  checkPageBreak(30);
  drawSectionTitle(t('playerTabs.individualMeetings', 'Coloquios y Reuniones Individuales'), `${meetings.length} sesiones`);

  if (meetings.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text('No hay coloquios registrados para este futbolista.', M, curY + 3);
    curY += 8;
  } else {
    // Ordenar reuniones por fecha descendente
    const sortedMeetings = [...meetings].sort((a, b) => b.date.localeCompare(a.date));

    for (const m of sortedMeetings) {
      const titleClean = stripHtml(m.objective) || 'Coloquio individual';
      const contentClean = stripHtml(m.development);
      const obsClean = stripHtml(m.agreements);

      // Calcular líneas de texto necesarias para no solapar páginas
      const splitContent = contentClean ? doc.splitTextToSize(contentClean, USABLE_W - 8) : [];
      const splitObs = obsClean ? doc.splitTextToSize(obsClean, USABLE_W - 8) : [];

      const boxHeight = 12 + (splitContent.length ? splitContent.length * 3 + 4 : 0) + (splitObs.length ? splitObs.length * 3 + 4 : 0);
      checkPageBreak(boxHeight + 4);

      doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
      doc.roundedRect(M, curY, USABLE_W, boxHeight, 1.8, 1.8, 'F');
      doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(M, curY, USABLE_W, boxHeight, 1.8, 1.8, 'S');

      // Fecha y lugar
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(RED[0], RED[1], RED[2]);
      const dateHeader = `${m.date}${m.time ? ` · ${m.time}` : ''}${m.location ? ` (${m.location})` : ''}`;
      doc.text(dateHeader, M + 4, curY + 4.5);

      if (m.created_by) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(`Staff: ${m.created_by}`, PAGE_W - M - 4, curY + 4.5, { align: 'right' });
      }

      // Título / Intervención
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.text(titleClean, M + 4, curY + 8.5);

      let textY = curY + 12.5;

      // Contenido
      if (splitContent.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
        doc.text('CONTENIDO:', M + 4, textY);
        textY += 3;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(splitContent, M + 4, textY);
        textY += splitContent.length * 3 + 1;
      }

      // Observaciones
      if (splitObs.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        doc.text('OBSERVACIONES:', M + 4, textY);
        textY += 3;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(splitObs, M + 4, textY);
      }

      curY += boxHeight + 4;
    }
  }

  // ============================================================
  // INFORMES DE TEMPORADAS ANTERIORES
  // ============================================================
  if (reports.length > 0) {
    checkPageBreak(25);
    drawSectionTitle(t('playerTabs.pastSeasonReports', 'Informes de Temporada'), `${reports.length} informes`);

    reports.forEach((rep) => {
      const summaryClean = stripHtml(rep.summary);
      const splitRep = doc.splitTextToSize(summaryClean, USABLE_W - 8);
      const h = 10 + splitRep.length * 3;
      checkPageBreak(h + 3);

      doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
      doc.roundedRect(M, curY, USABLE_W, h, 1.5, 1.5, 'F');
      doc.setDrawColor(GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2]);
      doc.roundedRect(M, curY, USABLE_W, h, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(RED[0], RED[1], RED[2]);
      doc.text(`Informe ${rep.created_at ? new Date(rep.created_at).toLocaleDateString(locale) : ''}`, M + 4, curY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(splitRep, M + 4, curY + 8.5);

      curY += h + 3;
    });
  }

  // Dibujar pie en la última página
  drawFooter(pageNum);

  // Guardar archivo PDF con nombre descriptivo
  const safeName = (player.name || 'jugador').toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`dossier_completo_${safeName}_${dbPlayer?.dorsal || ''}.pdf`);
}

