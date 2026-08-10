// Exportación del calendario a PDF en formato cuadrícula clásica (una página por mes).

export interface PdfEvent {
  date: string;      // YYYY-MM-DD
  time?: string;     // HH:MM
  type: 'match' | 'training' | 'meeting' | 'birthday' | 'dynamics';
  typeLabel: string;
  title: string;
  meta?: string;
  homeLogo?: string;
  awayLogo?: string;
  opponent?: string;
  isHome?: boolean;
  score?: string;
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

// IMPORTANTE: toISOString() convierte a UTC y desplaza el día en zonas horarias
// con offset positivo (España = UTC+1/+2), lo que colocaba los eventos en el día
// equivocado de la cuadrícula. Formateamos siempre en hora local.
const toIsoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type LoadedImage = { dataUrl: string; ratio: number };

const rasterize = (url: string, useCors: boolean): Promise<LoadedImage | null> =>
  new Promise((resolve) => {
    const img = new Image();
    // Sin crossOrigin el canvas queda "tainted" y toDataURL lanza SecurityError,
    // por eso los escudos remotos nunca llegaban a dibujarse.
    if (useCors) img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        if (!img.naturalWidth || !img.naturalHeight) return resolve(null);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

const loadImage = async (url: string): Promise<LoadedImage | null> => {
  if (!url) return null;
  const isRemote = /^https?:\/\//i.test(url);
  if (!isRemote) return rasterize(url, false);
  // 1) directo con CORS, 2) proxies públicos como plan B
  const candidates = [
    url,
    `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&output=png`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];
  for (const candidate of candidates) {
    const result = await rasterize(candidate, true);
    if (result) return result;
  }
  return null;
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

  const logo = await loadImage(logoUrl);

  const fitText = (text: string, maxW: number) => {
    if (doc.getTextWidth(text) <= maxW) return text;
    let out = text;
    while (out.length > 1 && doc.getTextWidth(`${out}…`) > maxW) out = out.slice(0, -1);
    return `${out.trim()}…`;
  };

  // Índice de eventos por día (evita filtrar el array completo en cada celda)
  const eventsByDay = new Map<string, PdfEvent[]>();
  for (const ev of inRange) {
    const list = eventsByDay.get(ev.date);
    if (list) list.push(ev);
    else eventsByDay.set(ev.date, [ev]);
  }

  const loadedLogos: Record<string, LoadedImage | null> = {};
  const logoUrls = new Set<string>();
  for (const ev of inRange) {
    if (ev.homeLogo) logoUrls.add(ev.homeLogo);
    if (ev.awayLogo) logoUrls.add(ev.awayLogo);
  }
  await Promise.all(
    [...logoUrls].map(async (url) => {
      loadedLogos[url] = await loadImage(url);
    })
  );

  // Obtener los meses que abarca el rango
  const start = parseDate(from);
  const end = parseDate(to);
  const months: { year: number; month: number }[] = [];
  const curr = new Date(start.getFullYear(), start.getMonth(), 1);
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

    // ---------- Cabecera Moderna ----------
    doc.setFillColor(255, 255, 255); // Fondo blanco
    doc.rect(0, 0, PAGE_W, 28, 'F');
    doc.setFillColor(220, 38, 38); // Línea roja vibrante
    doc.rect(0, 28, PAGE_W, 1.5, 'F');

    let titleX = MARGIN;
    if (logo) {
      const logoH = 18;
      const logoW = logoH * logo.ratio;
      doc.addImage(logo.dataUrl, 'PNG', MARGIN, 5, logoW, logoH);
      titleX = MARGIN + logoW + 7;
    }

    doc.setTextColor(30, 35, 45); // Texto oscuro
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);

    const tempDate = new Date(year, monthIndex, 1);
    const monthTitle = tempDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase();
    doc.text(monthTitle, titleX, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 125, 135); // Texto gris claro
    const longDate = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Rango: Del ${longDate(start)} al ${longDate(end)}`, titleX, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 35, 45);
    if (clubName) doc.text(clubName.toUpperCase(), PAGE_W - MARGIN, 14, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 145, 155);
    doc.text(
      `Generado el ${new Date().toLocaleDateString(locale)}`,
      PAGE_W - MARGIN,
      21,
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
      const isWeekend = col >= 5;

      // Dibujar fondo de la celda
      if (!isCurrentMonth) doc.setFillColor(247, 248, 250);
      else if (isWeekend) doc.setFillColor(252, 252, 254);
      else doc.setFillColor(255, 255, 255);
      doc.rect(cx, cy, colW, rowH, 'F');

      // Borde de la celda
      doc.setDrawColor(218, 222, 229);
      doc.setLineWidth(0.25);
      doc.rect(cx, cy, colW, rowH, 'S');

      // Dibujar el número del día
      const dayNum = String(d.getDate());
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(isCurrentMonth ? 40 : 175, isCurrentMonth ? 45 : 180, isCurrentMonth ? 55 : 190);
      doc.text(dayNum, cx + colW - 2.5, cy + 5, { align: 'right' });

      // ---------- Eventos del día ----------
      const dayEvents = eventsByDay.get(toIsoLocal(d)) || [];
      if (dayEvents.length === 0) return;

      const padX = 1.6;
      const pillW = colW - padX * 2;
      const topY = cy + 6.5;
      const availH = rowH - 7.5;
      const gap = 1;
      const matchH = 10.5;
      const normalH = 5.2;
      const moreH = 3;

      // Repartimos el espacio: los partidos usan tarjeta grande y, si no cabe,
      // degradan a una línea compacta antes de descartarse.
      type Slot = { ev: PdfEvent; h: number; compact: boolean };
      const slots: Slot[] = [];
      let used = 0;
      let hidden = 0;
      for (const ev of dayEvents) {
        const isMatch = ev.type === 'match';
        const spacing = slots.length ? gap : 0;
        const fullH = isMatch ? matchH : normalH;
        if (used + spacing + fullH <= availH) {
          slots.push({ ev, h: fullH, compact: false });
          used += spacing + fullH;
        } else if (isMatch && used + spacing + normalH <= availH) {
          slots.push({ ev, h: normalH, compact: true });
          used += spacing + normalH;
        } else {
          hidden++;
        }
      }
      // Reservamos hueco para el "+N más" recortando el último evento si hace falta
      while (hidden > 0 && slots.length > 0 && used + gap + moreH > availH) {
        const last = slots.pop()!;
        used -= last.h + (slots.length ? gap : 0);
        hidden++;
      }

      let y = topY;
      for (const slot of slots) {
        const { ev, h, compact } = slot;
        const color = TYPE_COLORS[ev.type];
        const bg = tint(color, ev.type === 'match' ? 0.9 : 0.93);
        const border = tint(color, 0.5);

        // Tarjeta
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.rect(cx + padX, y, pillW, h, 'F');
        doc.setDrawColor(border[0], border[1], border[2]);
        doc.setLineWidth(0.15);
        doc.rect(cx + padX, y, pillW, h, 'S');
        // Acento lateral
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(cx + padX, y, 1.1, h, 'F');

        const innerX = cx + padX + 2.4;

        if (ev.type === 'match' && !compact) {
          const home = ev.homeLogo ? loadedLogos[ev.homeLogo] : null;
          const away = ev.awayLogo ? loadedLogos[ev.awayLogo] : null;
          const crestS = 5.6;
          let x = innerX;

          const drawCrest = (img: LoadedImage | null, cxPos: number, cyPos: number) => {
            if (!img) return false;
            // Encajar manteniendo proporción dentro del cuadrado crestS
            const w = img.ratio >= 1 ? crestS : crestS * img.ratio;
            const hgt = img.ratio >= 1 ? crestS / img.ratio : crestS;
            doc.addImage(img.dataUrl, 'PNG', cxPos + (crestS - w) / 2, cyPos + (crestS - hgt) / 2, w, hgt);
            return true;
          };

          if (home || away) {
            const crestY = y + 1.1;
            if (drawCrest(home, x, crestY)) x += crestS + 0.6;
            if (drawCrest(away, x, crestY)) x += crestS + 0.6;
            x += 0.8;
          }

          const textW = cx + padX + pillW - 1.8 - x;

          // Línea 1: rival + indicativo local/visitante
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.2);
          doc.setTextColor(25, 32, 44);
          const opponentName = ev.opponent || ev.title;
          const prefix = ev.isHome === undefined ? '' : ev.isHome ? 'vs ' : '@ ';
          doc.text(fitText(`${prefix}${opponentName}`, textW), x, y + 4.2);

          // Línea 2: hora destacada + competición
          const subY = y + 7.4;
          if (ev.time) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.6);
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(ev.time, x, subY);
            const tw = doc.getTextWidth(ev.time) + 1.6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5);
            doc.setTextColor(95, 102, 115);
            doc.text(fitText(ev.typeLabel || 'Partido', textW - tw), x + tw, subY);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5);
            doc.setTextColor(95, 102, 115);
            doc.text(fitText(ev.typeLabel || 'Partido', textW), x, subY);
          }

          // Marcador (si el partido ya se jugó)
          if (ev.score) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            const sw = doc.getTextWidth(ev.score);
            const bx = cx + padX + pillW - sw - 3.4;
            doc.setFillColor(color[0], color[1], color[2]);
            doc.roundedRect(bx, y + h - 4.6, sw + 2.4, 3.4, 0.6, 0.6, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(ev.score, bx + 1.2, y + h - 2.2);
          }
        } else {
          // Eventos compactos (una línea): hora coloreada + título
          const baseY = y + h / 2 + 1.1;
          let x = innerX;

          if (ev.type === 'match') {
            const crest = (ev.isHome === false ? ev.homeLogo : ev.awayLogo) || ev.homeLogo || ev.awayLogo;
            const img = crest ? loadedLogos[crest] : null;
            if (img) {
              const s = 3.4;
              const w = img.ratio >= 1 ? s : s * img.ratio;
              const hgt = img.ratio >= 1 ? s / img.ratio : s;
              doc.addImage(img.dataUrl, 'PNG', x, y + (h - hgt) / 2, w, hgt);
              x += s + 1;
            }
          }

          let remaining = cx + padX + pillW - 1.6 - x;
          if (ev.time) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.2);
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(ev.time, x, baseY);
            const tw = doc.getTextWidth(ev.time) + 1.4;
            x += tw;
            remaining -= tw;
          }

          const label = ev.type === 'match' && ev.opponent
            ? `${ev.isHome === false ? '@ ' : 'vs '}${ev.opponent}`
            : ev.title;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.4);
          doc.setTextColor(30, 38, 50);
          doc.text(fitText(label, Math.max(remaining, 2)), x, baseY);
        }

        y += h + gap;
      }

      if (hidden > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.2);
        doc.setTextColor(120, 126, 138);
        doc.text(`+ ${hidden} más`, cx + padX + 1, y + 2.2);
      }
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
