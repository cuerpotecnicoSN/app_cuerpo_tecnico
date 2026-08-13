import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GoogleGenAI } from '@google/genai';
import { createRoot } from 'react-dom/client';
import { TaskBoardEditor } from '../components/training/TaskBoardEditor';

export interface SessionTaskData {
  id: string;
  title: string;
  category?: string;
  duration_min?: number;
  material?: string;
  description?: string;
  board_data?: string;
}

export interface SessionPdfOptions {
  sessionTitle: string;
  date: string;
  time?: string;
  location?: string;
  structure?: string;
  observations?: string;
  tasks: SessionTaskData[];
  format: 'full' | 'simplified';
  lang: 'es' | 'it' | 'en';
  includePlayerNames: boolean;
}

interface PdfPlayerItem {
  text: string;
  color: string;
}

interface PdfTeamColumn {
  name: string;
  color: string;
  players: PdfPlayerItem[];
}

const TRANSLATIONS = {
  es: {
    title: "SESIÓN DE ENTRENAMIENTO",
    date: "Fecha",
    time: "Hora",
    location: "Lugar",
    structure: "Estructura de la Sesión",
    observations: "Observaciones / Notas",
    tasks: "Tareas",
    duration: "Duración",
    material: "Material",
    teams: "Distribución de Equipos",
    page: "Página",
    noDraw: "Sin dibujo táctico",
    noTeams: "Sin equipos definidos",
    team: "Equipo"
  },
  it: {
    title: "SESSIONE DI ALLENAMENTO",
    date: "Data",
    time: "Ora",
    location: "Luogo",
    structure: "Struttura della Sessione",
    observations: "Osservazioni / Note",
    tasks: "Esercizi",
    duration: "Durata",
    material: "Materiale",
    teams: "Distribuzione delle Squadre",
    page: "Pagina",
    noDraw: "Senza disegno tattico",
    noTeams: "Senza squadre definite",
    team: "Squadra"
  },
  en: {
    title: "TRAINING SESSION",
    date: "Date",
    time: "Time",
    location: "Location",
    structure: "Session Structure",
    observations: "Observations / Notes",
    tasks: "Tasks",
    duration: "Duration",
    material: "Material",
    teams: "Teams Distribution",
    page: "Page",
    noDraw: "No tactical drawing",
    noTeams: "No teams defined",
    team: "Team"
  }
};

// Free translator fallback using Google Translate API
const freeTranslate = async (text: string, targetLang: string): Promise<string> => {
  if (!text || !text.trim()) return '';
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      return data[0].map((sentence: any) => sentence[0]).join('');
    }
    return text;
  } catch (err) {
    console.error("Free Translate Fallback Error:", err);
    return text;
  }
};

interface RenderedHtmlImage {
  dataUrl: string;
  ratio: number;
}

// Render raw HTML (with colors, bold, lists) to a temporary image
const renderHtmlToImage = async (htmlContent: string, widthPx: number): Promise<RenderedHtmlImage | null> => {
  if (!htmlContent || !htmlContent.trim()) return null;
  
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${widthPx}px`;
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#334155'; // slate-700
  container.style.fontFamily = 'Helvetica, Arial, sans-serif';
  container.style.fontSize = '12px';
  container.style.lineHeight = '1.4';
  container.style.padding = '4px';
  
  container.innerHTML = htmlContent;
  document.body.appendChild(container);
  
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const ratio = canvas.height / canvas.width;
    document.body.removeChild(container);
    return { dataUrl, ratio };
  } catch (err) {
    console.error('Error rendering HTML to image:', err);
    try {
      document.body.removeChild(container);
    } catch {}
    return null;
  }
};

// Translate any text dynamically using Gemini AI or Google Translate
const translateSessionDetails = async (text: string, targetLang: 'es' | 'it' | 'en'): Promise<string> => {
  if (!text || !text.trim() || targetLang === 'es') return text;
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const langNames = { es: 'Spanish', it: 'Italian', en: 'English' };
      const prompt = `Translate the following HTML or plain text football training content into ${langNames[targetLang]}. 
Keep any HTML tags (like <b>, <i>, <span>, color styles, bullet points) exactly intact so they render correctly. Keep football abbreviations (like 6VS6, 2P, etc.) correct. 
Do not add any explanations or introductory remarks. Output ONLY the translated HTML/text:\n\n${text}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      if (response.text?.trim()) {
        return response.text.trim();
      }
    } catch (error) {
      console.warn("Gemini Translation failed, falling back to Google Translate API:", error);
    }
  }

  // Fallback to Google Translate API
  return await freeTranslate(text, targetLang);
};

// Mount and render TaskBoardEditor off-screen, then capture it
const renderTaskBoardToImage = async (boardData: string): Promise<RenderedHtmlImage | null> => {
  if (!boardData) return null;
  
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.height = '450px';
  container.style.backgroundColor = '#ffffff';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <TaskBoardEditor value={boardData} readOnly hideToolbar rotateFullField={true} printMode={true} />
  );

  // Wait for React rendering cycles and canvas paints
  await new Promise(resolve => setTimeout(resolve, 250));

  // Fix SVG dimension attributes for html2canvas
  const svgs = container.querySelectorAll('svg');
  svgs.forEach(svg => {
    if (!svg.getAttribute('width')) {
      const bbox = svg.getBoundingClientRect();
      if (bbox.width && bbox.height) {
        svg.setAttribute('width', bbox.width.toString());
        svg.setAttribute('height', bbox.height.toString());
      }
    }
  });

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const ratio = canvas.height / canvas.width;
    
    root.unmount();
    document.body.removeChild(container);
    return { dataUrl, ratio };
  } catch (err) {
    console.error('Error capturing task board:', err);
    root.unmount();
    document.body.removeChild(container);
    return null;
  }
};

// Parse tables array inside board data
const getTeamTables = (boardDataStr?: string): PdfTeamColumn[] => {
  if (!boardDataStr) return [];
  try {
    const parsed = JSON.parse(boardDataStr);
    if (parsed.teamsBoard && Array.isArray(parsed.teamsBoard.tables) && parsed.teamsBoard.tables.length > 0) {
      const tbl = parsed.teamsBoard.tables[0];
      const items = Array.isArray(parsed.teamsBoard.items) ? parsed.teamsBoard.items : [];
      
      const columns: PdfTeamColumn[] = [];
      const colCount = tbl.count || 2;
      for (let c = 0; c < colCount; c++) {
        const colName = tbl.names?.[c] || '';
        const colColor = tbl.colors?.[c] || '#000000';
        
        const players = items
          .filter((item: any) => item.type === 'player' && item.tableId === tbl.id && item.colIndex === c)
          .map((item: any) => ({
            text: item.text,
            color: item.color || '#000000'
          }));

        columns.push({
          name: colName,
          color: colColor,
          players
        });
      }
      return columns;
    }
  } catch {}
  return [];
};

export const exportSessionToPdf = async (options: SessionPdfOptions) => {
  const {
    sessionTitle,
    date,
    time,
    location,
    structure,
    observations,
    tasks,
    format,
    lang,
    includePlayerNames
  } = options;

  const t = TRANSLATIONS[lang];
  
  // Translate custom text using Gemini or Google Translate
  const [translatedTitle, translatedStructure, translatedObservations] = await Promise.all([
    translateSessionDetails(sessionTitle, lang),
    translateSessionDetails(structure || '', lang),
    translateSessionDetails(observations || '', lang)
  ]);

  const translatedTasks = await Promise.all(
    tasks.map(async (task) => ({
      ...task,
      title: await translateSessionDetails(task.title, lang),
      category: await translateSessionDetails(task.category || '', lang),
      material: await translateSessionDetails(task.material || '', lang),
      description: await translateSessionDetails(task.description || '', lang),
    }))
  );

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  
  const PAGE_W = 297;
  const PAGE_H = 210;
  const MARGIN = 10;
  const COL_W = (PAGE_W - MARGIN * 3) / 2; // ~138.5mm
  
  let pageNum = 1;

  // Header logo helper
  const drawHeader = (yPos: number) => {
    // Top border accent line (red)
    doc.setFillColor(220, 38, 38);
    doc.rect(MARGIN, yPos, PAGE_W - MARGIN * 2, 2, 'F');

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(t.title, MARGIN, yPos + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38); // red accent
    doc.text(translatedTitle.toUpperCase(), MARGIN, yPos + 13);

    // Escudo Logo
    try {
      const logoImg = document.querySelector('img[alt="Escudo"]') as HTMLImageElement;
      if (logoImg && logoImg.complete && logoImg.naturalWidth) {
        doc.addImage(logoImg, 'PNG', PAGE_W - MARGIN - 18, yPos + 3, 15, 15);
      }
    } catch {}

    // Date, Time, Location block
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    const metaText = `${t.date}: ${new Date(date).toLocaleDateString()} ${time ? `| ${t.time}: ${time}` : ''} ${location ? `| ${t.location}: ${location}` : ''}`;
    doc.text(metaText, MARGIN, yPos + 18);
  };

  // Footer page number helper
  const drawFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`${t.page} ${pageNum}`, PAGE_W - MARGIN - 12, PAGE_H - 5);
  };

  // Add first page
  drawHeader(MARGIN);

  let currentY = MARGIN + 22;

  // RENDER SUMMARY BLOCK (Only in Full Format)
  if (format === 'full') {
    // Structure and Observations side by side or stacked
    const blockH = 32;
    
    // Structure block (left half)
    const structResult = await renderHtmlToImage(translatedStructure || '-', 750);
    if (structResult) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(MARGIN, currentY, COL_W, blockH, 2, 2, 'FD');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(t.structure.toUpperCase(), MARGIN + 4, currentY + 5);
      
      const structH = COL_W * structResult.ratio;
      const finalStructH = Math.min(structH, blockH - 7);
      doc.addImage(structResult.dataUrl, 'JPEG', MARGIN + 4, currentY + 6, COL_W - 8, finalStructH);
    }

    // Observations block (right half)
    const obsResult = await renderHtmlToImage(translatedObservations || '-', 750);
    if (obsResult) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(MARGIN + COL_W + MARGIN, currentY, COL_W, blockH, 2, 2, 'FD');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(t.observations.toUpperCase(), MARGIN + COL_W + MARGIN + 4, currentY + 5);
      
      const obsH = COL_W * obsResult.ratio;
      const finalObsH = Math.min(obsH, blockH - 7);
      doc.addImage(obsResult.dataUrl, 'JPEG', MARGIN + COL_W + MARGIN + 4, currentY + 6, COL_W - 8, finalObsH);
    }

    currentY += blockH + 6;
  }

  // Recorta un texto al ancho disponible
  const fitText = (text: string, maxW: number) => {
    if (doc.getTextWidth(text) <= maxW) return text;
    let cut = text;
    while (cut.length > 1 && doc.getTextWidth(`${cut}.`) > maxW) cut = cut.slice(0, -1);
    return `${cut}.`;
  };

  // Panel de equipos. Devuelve la altura usada.
  const drawTeamsPanel = (
    columns: PdfTeamColumn[],
    px: number,
    py: number,
    pw: number,
    maxH: number,
    s: number
  ) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5 * s);
    doc.setTextColor(15, 23, 42);
    doc.text(t.teams.toUpperCase(), px, py + 2.4 * s);

    const bodyY = py + 4 * s;
    const bodyH = Math.max(0, maxH - (bodyY - py));

    const maxPlayers = Math.max(0, ...columns.map((c) => (includePlayerNames ? c.players.length : 0)));
    const hasAnyHeader = columns.some(col => !!col.name && col.name.trim().length > 0);
    const totalRows = (hasAnyHeader ? 1 : 0) + maxPlayers;
    const lineH = Math.max(2.0, Math.min(3.4 * s, bodyH / Math.max(1, totalRows)));
    const nameSize = Math.min(7.5 * s, lineH * 2.3);

    let cursorY = bodyY;

    const colW = columns.length ? (pw - (columns.length - 1) * 1.2) / columns.length : pw;

    columns.forEach((col, colIdx) => {
      const cx = px + colIdx * (colW + 1.2);
      const hasName = !!col.name && col.name.trim().length > 0;

      if (hasName) {
        // Cabecera de color con el nombre del equipo
        doc.setFillColor(/^#[0-9a-f]{3,8}$/i.test(col.color) ? col.color : '#0f172a');
        doc.rect(cx, cursorY, colW, lineH * 0.92, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(Math.min(6.5 * s, lineH * 2));
        doc.setTextColor(255, 255, 255);
        doc.text(fitText(col.name, colW - 1.6), cx + 0.8, cursorY + lineH * 0.68);
      }

      if (!includePlayerNames) return;

      // Jugadores de la columna (sin truncar nombres y con colores de editor)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(nameSize);
      col.players.forEach((player, rowIdx) => {
        const headerOffset = hasName ? lineH : 0;
        const ny = cursorY + headerOffset + lineH * rowIdx + lineH * 0.75;
        if (ny > py + maxH) return;
        
        doc.setTextColor(player.color || '#334155');
        doc.text(player.text, cx + 0.8, ny);
      });
    });

    const headerRowsCount = hasAnyHeader ? 1 : 0;
    cursorY += (headerRowsCount + maxPlayers) * lineH;

    return Math.min(maxH, cursorY - py);
  };

  // Draw tasks helper
  const drawTaskCard = async (task: SessionTaskData, index: number, x: number, y: number, cardH: number) => {
    const s = Math.min(1.45, Math.max(1, cardH / 110));

    // Draw card outline
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, COL_W, cardH, 3, 3, 'FD');

    // Accent line (red)
    doc.setFillColor(220, 38, 38);
    doc.rect(x, y, 3, cardH, 'F');

    // Title & Category
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${index + 1}. ${task.title}`, x + 6, y + 6 * s);

    // Category / Duration metadata
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8 * s);
    doc.setTextColor(100, 116, 139);
    const durationStr = task.duration_min ? `| ${t.duration}: ${task.duration_min} min` : '';
    const categoryStr = task.category ? `${task.category.toUpperCase()} ` : '';
    doc.text(`${categoryStr}${durationStr}`, x + 6, y + 11 * s);

    // RASTER DRAWING IF EXISTS (Off-screen rendering root capture)
    const drawingImg = await renderTaskBoardToImage(task.board_data || '');

    const contentW = COL_W - 12;
    const rowY = y + 14 * s;

    // Los dibujos van a pantalla completa en la tarjeta (mucho más grandes)
    const maxDrawingW = contentW;
    const maxDrawingH = cardH * 0.40; // 40% of card height
    let drawingH = 0;

    if (drawingImg) {
      let w = maxDrawingW;
      let h = w * drawingImg.ratio;
      if (h > maxDrawingH) {
        h = maxDrawingH;
        w = h / drawingImg.ratio;
      }
      const drawingX = x + 6 + (maxDrawingW - w) / 2;
      doc.addImage(drawingImg.dataUrl, 'JPEG', drawingX, rowY, w, h);
      drawingH = h;
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8 * s);
      doc.setTextColor(148, 163, 184);
      doc.text(t.noDraw, x + 6, rowY + 4);
      drawingH = 6;
    }

    // Description text block (Rendered as HTML Image to preserve Bold, Colors, Lists)
    const descY = rowY + drawingH + 4;
    const descW = contentW;

    const descResult = await renderHtmlToImage(task.description || '', Math.round(750 / s));
    let finalDescH = 0;
    if (descResult) {
      const maxDescH = y + cardH - descY - (task.material ? 18 : 12);
      let w = descW;
      let h = descW * descResult.ratio;
      if (h > maxDescH) {
        h = Math.max(5, maxDescH);
        w = h / descResult.ratio;
      }
      finalDescH = h;
      doc.addImage(descResult.dataUrl, 'JPEG', x + 6, descY, w, h);
    }

    let currentCardY = descY + finalDescH + 4 * s;

    // Render Material underneath if exists
    if (task.material) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8 * s);
      doc.setTextColor(51, 65, 85);
      doc.text(fitText(`${t.material}: ${task.material}`, contentW), x + 6, currentCardY);
      currentCardY += 4.5 * s;
    }

    // TEAMS DISTRIBUTION (Full format only, rendered below the description)
    const teamTables = format === 'full' ? getTeamTables(task.board_data) : [];
    if (teamTables.length) {
      const maxTeamsH = y + cardH - currentCardY - 3;
      if (maxTeamsH > 8) {
        drawTeamsPanel(teamTables, x + 6, currentCardY, contentW, maxTeamsH, s);
      }
    }
  };

  // Loop and place tasks
  const FOOTER_H = 8;
  for (let i = 0; i < translatedTasks.length; i++) {
    const isRightCol = i % 2 === 1;
    const taskX = isRightCol ? MARGIN + COL_W + MARGIN : MARGIN;
    const taskY = currentY;
    const cardH = PAGE_H - taskY - FOOTER_H;

    // Draw the card
    await drawTaskCard(translatedTasks[i], i, taskX, taskY, cardH);

    // If it was the right column or the last task in the list
    if (isRightCol || i === translatedTasks.length - 1) {
      drawFooter();
      if (i < translatedTasks.length - 1) {
        doc.addPage();
        pageNum++;
        drawHeader(MARGIN);
        currentY = MARGIN + 22; // reset Y offset for page 2 onwards
      }
    }
  }

  // Save the PDF
  const filename = `Sesion_Entrenamiento_${translatedTitle.replace(/\s+/g, '_')}_${date}.pdf`;
  doc.save(filename);
};
