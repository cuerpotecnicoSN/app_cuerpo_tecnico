// Exportación del calendario a PDF en formato cuadrícula clásica (una página por mes).

export interface PdfEvent {
  date: string;      // YYYY-MM-DD
  time?: string;     // HH:MM
  type: 'match' | 'training' | 'meeting' | 'birthday' | 'dynamics';
  typeLabel: string;
  title: string;
  meta?: string;
}

export interface CalendarPdfOptions {
  events: PdfEvent[];
  from: string;      // YYYY-MM-DD
  to: string;        // YYYY-MM-DD
  locale?: string;
  clubName?: string;
  logoUrl?: string;
}

type RGB = [number, number, number];

const TYPE_COLORS: Record<PdfEvent['type'], RGB> = {
  match: [37, 99, 235],
  training: [220, 38, 38],
  meeting: [79, 70, 229],
  dynamics: [16, 185, 129],
  birthday: [245, 158, 11],
};

const TYPE_NAMES: Record<PdfEvent['type'], string> = {
  match: 'Partido',
  training: 'Entrenamiento',
  dynamics: 'Dinámica',
  meeting: 'Reunión',
  birthday: 'Cumpleaños',
};

// Página A4 apaisada
const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 10;
const USABLE_W = PAGE_W - MARGIN * 2;

const tint = ([r, g, b]: RGB, amount: number): RGB => [
  Math.round(r + (255 - r) * amount),
  Math.round(g + (255 - g) * amount),
  Math.round(b + (255 - b) * amount),
];

const parseDate = (iso: string) => new Date(`${iso}T00:00:00`);

const loadImage = async (url: string): Promise<{ dataUrl: string; ratio: number } | null> => {
  try {
    const img = new Image();
    img.src = url;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
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

export const exportCalendarPdf = async ({
  events,
  from,
  to,
  locale = 'es',
  clubName = '',
  logoUrl = '/escudo.png',
}: CalendarPdfOptions) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const inRange = events
    .filter((e) => e.date >= from && e.date <= to)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (!a.time) return b.time ? -1 : 0;
      if (!b.time) return 1;
      return a.time.localeCompare(b.time);
    });

  const todayStr = new Date().toISOString().slice(0, 10);
  const logo = await loadImage(logoUrl);

  const fitText = (text: string, maxW: number) => {
    if (doc.getTextWidth(text) <= maxW) return text;
    let out = text;
    while (out.length > 1 && doc.getTextWidth(`${out}…`) > maxW) out = out.slice(0, -1);
    return `${out.trim()}…`;
  };

  // Obtener los meses que abarca el rango
  const start = parseDate(from);
  const end = parseDate(to);
  const months: { year: number; month: number }[] = [];
  let curr = new Date(start.getFullYear(), start.getMonth(), 1);
  while (curr <= end) {
    months.push({ year: curr.getFullYear(), month: curr.getMonth() });
    curr.setMonth(curr.getMonth() + 1);
  }

  if (months.length === 0) {
    months.push({ year: start.getFullYear(), month: start.getMonth() });
  }

  for (let mIdx = 0; mIdx < months.length; mIdx++) {
    const { year, month: monthIndex } = months[mIdx];
    if (mIdx > 0) {
      doc.addPage();
    }

    // ---------- Cabecera ----------
    doc.setFillColor(17, 18, 23);
    doc.rect(0, 0, PAGE_W, 28, 'F');
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 28, PAGE_W, 1.5, 'F');

    let titleX = MARGIN;
    if (logo) {
      const logoH = 18;
      const logoW = logoH * logo.ratio;
      doc.addImage(logo.dataUrl, 'PNG', MARGIN, 5, logoW, logoH);
      titleX = MARGIN + logoW + 7;
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    
    const tempDate = new Date(year, monthIndex, 1);
    const monthTitle = tempDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase();
    doc.text(monthTitle, titleX, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(168, 172, 180);
    const longDate = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Rango: Del ${longDate(start)} al ${longDate(end)}`, titleX, 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    if (clubName) doc.text(clubName.toUpperCase(), PAGE_W - MARGIN, 13, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(168, 172, 180);
    doc.text(
      `Generado el ${new Date().toLocaleDateString(locale)}`,
      PAGE_W - MARGIN,
      20,
      { align: 'right' }
    );

    // ---------- Leyenda ----------
    doc.setFillColor(246, 247, 249);
    doc.rect(0, 29.5, PAGE_W, 7, 'F');
    let legendX = MARGIN;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    
    const types: PdfEvent['type'][] = ['match', 'training', 'dynamics', 'meeting', 'birthday'];
    types.forEach((tp) => {
      const [r, g, b] = TYPE_COLORS[tp];
      doc.setFillColor(r, g, b);
      doc.circle(legendX + 1, 33, 1, 'F');
      doc.setTextColor(90, 95, 105);
      const label = TYPE_NAMES[tp].toUpperCase();
      doc.text(label, legendX + 3, 33.8);
      legendX += 3 + doc.getTextWidth(label) + 6;
    });

    // ---------- Días de la semana ----------
    const weekdays = [1, 2, 3, 4, 5, 6, 0].map(d => {
      const date = new Date(2024, 0, 1 + (d === 0 ? 6 : d - 1));
      return date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase();
    });

    const weekdayY = 38;
    doc.setFillColor(235, 237, 240);
    doc.rect(MARGIN, weekdayY, USABLE_W, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(70, 75, 85);
    const colW = USABLE_W / 7;
    weekdays.forEach((dayLabel, idx) => {
      const cx = MARGIN + idx * colW + colW / 2;
      doc.text(dayLabel, cx, weekdayY + 4.2, { align: 'center' });
    });

    // ---------- Cuadrícula del Calendario ----------
    const gridY = 45;
    const gridH = PAGE_H - gridY - 12; // Dejar espacio abajo para el pie de página
    
    const firstDay = new Date(year, monthIndex, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Lunes = 0, Domingo = 6
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;
    const numRows = totalCells / 7;
    const rowH = gridH / numRows;

    const gridDates: Date[] = [];
    const startGridDate = new Date(year, monthIndex, 1 - startOffset);
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(startGridDate);
      d.setDate(startGridDate.getDate() + i);
      gridDates.push(d);
    }

    gridDates.forEach((d, idx) => {
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const cx = MARGIN + col * colW;
      const cy = gridY + row * rowH;
      const isCurrentMonth = d.getMonth() === monthIndex;

      // Dibujar fondo de la celda
      if (!isCurrentMonth) {
        doc.setFillColor(248, 249, 251);
        doc.rect(cx, cy, colW, rowH, 'F');
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(cx, cy, colW, rowH, 'F');
      }
      
      // Borde de la celda
      doc.setDrawColor(218, 222, 229);
      doc.setLineWidth(0.25);
      doc.rect(cx, cy, colW, rowH, 'S');

      // Dibujar el número del día
      const dayNum = String(d.getDate());
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      
      const isToday = d.toISOString().slice(0, 10) === todayStr;
      if (isToday) {
        doc.setFillColor(37, 99, 235);
        doc.circle(cx + colW - 4.5, cy + 4, 2.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(dayNum, cx + colW - 4.5, cy + 4.9, { align: 'center' });
      } else {
        if (isCurrentMonth) {
          doc.setTextColor(40, 45, 55);
        } else {
          doc.setTextColor(170, 175, 185);
        }
        doc.text(dayNum, cx + colW - 3, cy + 4, { align: 'right' });
      }

      // Dibujar eventos en la celda
      const dayStr = d.toISOString().slice(0, 10);
      const dayEvents = inRange.filter(e => e.date === dayStr);
      
      const eventStartY = cy + 7;
      const availH = rowH - 8.5;
      const eventH = 3.8;
      const eventGap = 0.6;
      const maxEvents = Math.floor(availH / (eventH + eventGap));

      dayEvents.forEach((ev, evIdx) => {
        if (evIdx < maxEvents) {
          const eventY = eventStartY + evIdx * (eventH + eventGap);
          const color = TYPE_COLORS[ev.type];
          const [br, bg, bb] = tint(color, 0.93);
          
          // Pastilla del evento
          doc.setFillColor(br, bg, bb);
          doc.roundedRect(cx + 1, eventY, colW - 2, eventH, 0.5, 0.5, 'F');
          
          // Borde izquierdo de la pastilla
          doc.setFillColor(color[0], color[1], color[2]);
          doc.rect(cx + 1, eventY, 0.8, eventH, 'F');
          
          // Texto del evento
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(30, 35, 45);
          
          let eventText = '';
          if (ev.time) {
            eventText += `[${ev.time}] `;
          }
          eventText += ev.title;
          
          doc.text(fitText(eventText, colW - 4.5), cx + 2.5, eventY + 2.7);
        } else if (evIdx === maxEvents) {
          const eventY = eventStartY + evIdx * (eventH + eventGap);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.2);
          doc.setTextColor(110, 115, 125);
          const remaining = dayEvents.length - maxEvents;
          doc.text(`+ ${remaining} más`, cx + 2.5, eventY + 2.5);
        }
      });
    });

    drawFooter(doc, clubName, mIdx + 1, months.length);
  }

  doc.save(`calendario_${from}_${to}.pdf`);
};

const drawFooter = (doc: any, clubName: string, pageNum: number, totalPages: number) => {
  doc.setDrawColor(226, 229, 234);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, PAGE_H - 8, PAGE_W - MARGIN, PAGE_H - 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(140, 146, 158);
  doc.text(clubName ? `${clubName} · Cuerpo Técnico` : 'Cuerpo Técnico', MARGIN, PAGE_H - 4.5);
  doc.text(`Página ${pageNum} de ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4.5, { align: 'right' });
};
