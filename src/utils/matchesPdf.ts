import { jsPDF } from 'jspdf';
import { MatchDB } from '../components/types';

const loadImage = async (url: string): Promise<{ dataUrl: string; ratio: number } | null> => {
  try {
    const imgUrl = url.startsWith('http') ? `https://corsproxy.io/?${encodeURIComponent(url)}` : url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    if (!img.width || !img.height) return null;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), ratio: img.width / img.height };
  } catch {
    return null;
  }
};

export const exportMatchesListPdf = async (
  matches: MatchDB[],
  filterLabel: string,
  clubName: string = 'Milan Futuro'
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 15;
  const USABLE_W = PAGE_W - MARGIN * 2;

  // Pre-load logos
  const loadedLogos: Record<string, { dataUrl: string; ratio: number } | null> = {};
  for (const m of matches) {
    if (m.home_logo && !loadedLogos[m.home_logo]) loadedLogos[m.home_logo] = await loadImage(m.home_logo);
    if (m.away_logo && !loadedLogos[m.away_logo]) loadedLogos[m.away_logo] = await loadImage(m.away_logo);
  }

  // Draw Header
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, 25, 'F');
  doc.setFillColor(37, 99, 235); // Blue accent
  doc.rect(0, 25, PAGE_W, 1.5, 'F');

  doc.setTextColor(30, 35, 45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LISTADO DE PARTIDOS', MARGIN, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 125, 135);
  doc.text(`Filtro: ${filterLabel.toUpperCase()}`, MARGIN, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 35, 45);
  doc.text(clubName.toUpperCase(), PAGE_W - MARGIN, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140, 145, 155);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, PAGE_W - MARGIN, 21, { align: 'right' });

  // Draw Matches
  let currentY = 35;
  const itemH = 22;

  matches.forEach((m) => {
    if (currentY + itemH > PAGE_H - 15) {
      doc.addPage();
      currentY = 20;
    }

    // Colors by competition
    let accentColor = [37, 99, 235]; // Blue (League)
    const comp = (m.competition || '').toLowerCase();
    if (comp.includes('amistoso')) accentColor = [249, 115, 22]; // Orange
    if (comp.includes('copa') || comp.includes('coppa')) accentColor = [168, 85, 247]; // Purple

    // Card background
    doc.setFillColor(252, 253, 255);
    doc.setDrawColor(235, 237, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, currentY, USABLE_W, itemH, 2, 2, 'FD');

    // Accent line
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.path([
      { op: 'm', c: [MARGIN + 1.5, currentY] },
      { op: 'l', c: [MARGIN + 1.5, currentY + itemH] },
    ]);
    doc.rect(MARGIN, currentY, 1.5, itemH, 'F'); // actually just a solid rect on left edge
    // hack to draw rounded corner on left accent:
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(MARGIN, currentY, 2, itemH, 2, 2, 'F');
    doc.setFillColor(252, 253, 255);
    doc.rect(MARGIN + 1.5, currentY, 1, itemH, 'F');

    // Date & Time
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 105, 115);
    const dateStr = new Date(m.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    doc.text(`${dateStr.toUpperCase()}${m.time ? ` | ${m.time}` : ''}`, MARGIN + 5, currentY + 7);

    // Competition
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text((m.competition || 'Partido').toUpperCase(), MARGIN + 5, currentY + 11.5);

    // Stadium
    if (m.stadium) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(140, 145, 155);
      doc.text(m.stadium, MARGIN + 5, currentY + 16);
    }

    // Teams
    const center = MARGIN + USABLE_W - 65;
    
    // Home team
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 35, 45);
    const homeName = m.is_home ? clubName : m.opponent;
    doc.text(homeName, center - 15, currentY + 12.5, { align: 'right' });
    
    // Home logo
    if (m.home_logo && loadedLogos[m.home_logo]) {
      doc.addImage(loadedLogos[m.home_logo]!.dataUrl, 'PNG', center - 12, currentY + 6.5, 9, 9);
    } else {
      doc.setFillColor(220, 225, 230);
      doc.circle(center - 7.5, currentY + 11, 4.5, 'F');
    }

    // Score / VS
    if (m.result_home != null && m.result_away != null) {
      doc.setFillColor(30, 35, 45);
      doc.roundedRect(center - 1.5, currentY + 8, 11, 6, 1, 1, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`${m.result_home} - ${m.result_away}`, center + 4, currentY + 12.5, { align: 'center' });
    } else {
      doc.setFontSize(8);
      doc.setTextColor(150, 155, 165);
      doc.text('VS', center + 4, currentY + 12.5, { align: 'center' });
    }

    // Away logo
    if (m.away_logo && loadedLogos[m.away_logo]) {
      doc.addImage(loadedLogos[m.away_logo]!.dataUrl, 'PNG', center + 11, currentY + 6.5, 9, 9);
    } else {
      doc.setFillColor(220, 225, 230);
      doc.circle(center + 15.5, currentY + 11, 4.5, 'F');
    }

    // Away team
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 35, 45);
    const awayName = m.is_home ? m.opponent : clubName;
    doc.text(awayName, center + 23, currentY + 12.5, { align: 'left' });

    currentY += itemH + 4;
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 229, 234);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 10, PAGE_W - MARGIN, PAGE_H - 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(140, 146, 158);
    doc.text(`${clubName.toUpperCase()} · CUERPO TÉCNICO`, MARGIN, PAGE_H - 6);
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
  }

  doc.save(`partidos_${filterLabel.toLowerCase().replace(/ /g, '_')}.pdf`);
};
