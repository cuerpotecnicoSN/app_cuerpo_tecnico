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

// html2canvas 1.4.1 solo entiende rgb()/rgba()/hsl()/hsla(): al encontrar un color
// moderno (oklch, oklab, color-mix...) lanza un error y se pierde la captura entera.
// Tailwind v4 genera su paleta en oklch (p.ej. border-gray-200 del campo), así que
// convertimos esos colores a rgba() en línea antes de pasar el nodo a html2canvas.
const MODERN_COLOR_RE = /(oklch|oklab|lch|lab|hwb|color|color-mix)\(/;

const COLOR_PROPERTIES = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'column-rule-color',
  'fill',
  'stroke',
  'stop-color'
];

const colorCache = new Map<string, string>();
let colorProbe: CanvasRenderingContext2D | null = null;

const toRgbaColor = (value: string): string => {
  const cached = colorCache.get(value);
  if (cached) return cached;

  let result = value;
  try {
    if (!colorProbe) {
      const probeCanvas = document.createElement('canvas');
      probeCanvas.width = 1;
      probeCanvas.height = 1;
      colorProbe = probeCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (colorProbe) {
      colorProbe.clearRect(0, 0, 1, 1);
      colorProbe.fillStyle = 'rgba(0, 0, 0, 0)'; // si el color no es válido, queda transparente
      colorProbe.fillStyle = value;
      colorProbe.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = colorProbe.getImageData(0, 0, 1, 1).data;
      result = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
    }
  } catch {
    // nos quedamos con el valor original
  }

  colorCache.set(value, result);
  return result;
};

const inlineModernColors = (root: HTMLElement) => {
  const nodes: Element[] = [root, ...Array.from(root.querySelectorAll('*'))];
  nodes.forEach((node) => {
    const styled = node as HTMLElement | SVGElement;
    if (!styled.style) return;

    const computed = window.getComputedStyle(node);

    COLOR_PROPERTIES.forEach((prop) => {
      const value = computed.getPropertyValue(prop);
      if (value && MODERN_COLOR_RE.test(value)) {
        styled.style.setProperty(prop, toRgbaColor(value), 'important');
      }
    });

    // Los degradados y sombras con colores modernos también rompen el parser
    const backgroundImage = computed.backgroundImage;
    if (backgroundImage && backgroundImage !== 'none' && MODERN_COLOR_RE.test(backgroundImage)) {
      styled.style.setProperty('background-image', 'none', 'important');
    }
    const boxShadow = computed.boxShadow;
    if (boxShadow && boxShadow !== 'none' && MODERN_COLOR_RE.test(boxShadow)) {
      styled.style.setProperty('box-shadow', 'none', 'important');
    }
  });
};

// Render raw HTML (with colors, bold, lists) to a temporary image
const renderHtmlToImage = async (htmlContent: string, widthPx: number, compact = false): Promise<RenderedHtmlImage | null> => {
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
  container.style.lineHeight = compact ? '1.12' : '1.4';
  container.style.padding = compact ? '1px' : '4px';
  container.style.whiteSpace = 'pre-wrap';

  // En modo compacto se juntan las filas para que el bloque ocupe mucho menos alto
  const blockMargin = compact ? '0.02rem' : '0.25rem';

  container.innerHTML = `
    <style>
      ul { list-style-type: disc !important; padding-left: 1.25rem !important; margin-bottom: ${blockMargin} !important; }
      ol { list-style-type: decimal !important; padding-left: 1.25rem !important; margin-bottom: ${blockMargin} !important; }
      p { margin-bottom: ${blockMargin} !important; margin-top: 0 !important; }
      br { line-height: ${compact ? '1.05' : '1.4'} !important; }
      blockquote {
        margin-left: 2rem !important;
        border-left: 2px solid #cbd5e1;
        padding-left: 0.5rem;
        margin-top: ${blockMargin};
        margin-bottom: ${blockMargin};
      }
    </style>
    ${htmlContent}
  `;
  document.body.appendChild(container);

  try {
    inlineModernColors(container);
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });
    // Se recorta el blanco de arriba y abajo (párrafos vacíos, márgenes del editor)
    const trimmed = trimCanvasWhitespace(canvas, 'vertical');
    const dataUrl = trimmed.toDataURL('image/jpeg', 0.95);
    const ratio = trimmed.height / trimmed.width;
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

// Recorta el blanco sobrante alrededor del dibujo para que el campo/los elementos
// lleguen justo hasta el borde de la imagen (y por tanto se impriman lo más grandes posible).
// Con mode 'vertical' sólo se recorta arriba y abajo (para bloques de texto, que
// deben conservar su ancho para no cambiar el tamaño de la letra).
const trimCanvasWhitespace = (
  canvas: HTMLCanvasElement,
  mode: 'both' | 'vertical' = 'both'
): HTMLCanvasElement => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return canvas; // canvas "sucio" por imágenes cross-origin
  }

  // Un píxel cuenta como contenido si no es prácticamente blanco
  const WHITE_THRESHOLD = 244;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y++) {
    const rowStart = y * canvas.width * 4;
    for (let x = 0; x < canvas.width; x++) {
      const i = rowStart + x * 4;
      const alpha = data[i + 3];
      if (alpha === 0) continue;
      if (data[i] >= WHITE_THRESHOLD && data[i + 1] >= WHITE_THRESHOLD && data[i + 2] >= WHITE_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // Sin contenido detectable: dejamos la imagen tal cual
  if (maxX < minX || maxY < minY) return canvas;

  // Pequeño margen para que las líneas del borde no queden cortadas
  const pad = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) * 0.005));
  minY = Math.max(0, minY - pad);
  maxY = Math.min(canvas.height - 1, maxY + pad);

  if (mode === 'vertical') {
    minX = 0;
    maxX = canvas.width - 1;
  } else {
    minX = Math.max(0, minX - pad);
    maxX = Math.min(canvas.width - 1, maxX + pad);
  }

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  if (w >= canvas.width && h >= canvas.height) return canvas;

  const trimmed = document.createElement('canvas');
  trimmed.width = w;
  trimmed.height = h;
  const trimmedCtx = trimmed.getContext('2d');
  if (!trimmedCtx) return canvas;

  trimmedCtx.fillStyle = '#ffffff';
  trimmedCtx.fillRect(0, 0, w, h);
  trimmedCtx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
  return trimmed;
};

const TaskBoardWithAnnotations = ({ boardData, width, hideAnnotations }: { boardData: string, width: number, hideAnnotations?: boolean }) => {
  let freeItems: any[] = [];
  try {
    if (!hideAnnotations) {
      const parsed = JSON.parse(boardData);
      const teamsBoard = parsed?.teamsBoard;
      if (teamsBoard && Array.isArray(teamsBoard.items)) {
        const tables = Array.isArray(teamsBoard.tables) ? teamsBoard.tables : [];
        freeItems = teamsBoard.items.filter((item: any) => {
          if (item.tableId) return false;
          if (item.type === 'player') {
            for (const t of tables) {
              if (item.x >= t.x && item.x <= t.x + t.width && item.y >= t.y && item.y <= t.y + t.height) {
                return false;
              }
            }
          }
          return true;
        });
      }
    }
  } catch {}

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <TaskBoardEditor value={boardData} readOnly hideToolbar printMode={true} printWidth={width} />
      {freeItems.map(item => {
        const isPlayer = item.type === 'player';
        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: 'translate(-50%, -50%)',
              color: isPlayer ? (item.color || '#000000') : '#ffffff',
              fontSize: isPlayer ? '14px' : '12px',
              fontWeight: isPlayer ? '900' : 'normal',
              fontFamily: isPlayer ? 'monospace' : 'sans-serif',
              textTransform: isPlayer ? 'uppercase' : 'none',
              whiteSpace: isPlayer ? 'nowrap' : 'pre-wrap',
              textShadow: isPlayer ? '0 1px 3px rgba(255,255,255,0.9), 0 -1px 3px rgba(255,255,255,0.9)' : 'none',
              backgroundColor: isPlayer ? 'transparent' : 'rgba(15, 23, 42, 0.8)',
              border: isPlayer ? 'none' : '1px solid #334155',
              borderRadius: isPlayer ? '0' : '12px',
              padding: isPlayer ? '0' : '4px 8px',
              maxWidth: isPlayer ? 'none' : '200px',
              textAlign: 'center',
              zIndex: 50
            }}
          >
            {item.text}
          </div>
        );
      })}
    </div>
  );
};

const renderTaskBoardToImage = async (boardData: string, hideAnnotations: boolean = false): Promise<{ dataUrl: string, ratio: number } | null> => {
  let width = 800;
  let height = 450;
  try {
    const parsed = JSON.parse(boardData);
    const fieldType = parsed.fieldType || 'half';
    if (fieldType === 'full' || fieldType === 'full-horizontal') {
      width = 900;
      height = 583;
    }
  } catch {}

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <TaskBoardWithAnnotations boardData={boardData} width={width} hideAnnotations={hideAnnotations} />
  );

  await new Promise(resolve => setTimeout(resolve, 250));

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
    inlineModernColors(container);
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });
    // Recortamos el blanco sobrante: la imagen queda ajustada al último elemento dibujado
    const trimmed = trimCanvasWhitespace(canvas);
    const dataUrl = trimmed.toDataURL('image/jpeg', 0.95);
    const ratio = trimmed.height / trimmed.width;

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

// Parse tables array inside board data.
// Se leen TODAS las tablas de la pizarra (no sólo la primera) y, si un jugador
// no lleva tableId/colIndex guardados, se deduce su columna por su posición,
// igual que hace el editor.
const getTeamTables = (boardDataStr?: string): PdfTeamColumn[] => {
  if (!boardDataStr) return [];
  try {
    const parsed = JSON.parse(boardDataStr);
    const teamsBoard = parsed?.teamsBoard;
    if (!teamsBoard) return [];

    let tables: any[] = Array.isArray(teamsBoard.tables) ? teamsBoard.tables : [];

    // Formato antiguo con una sola tabla en columnsConfig
    if (tables.length === 0 && teamsBoard.columnsConfig && teamsBoard.columnsConfig.count > 0) {
      tables = [{ id: 'table-default', ...teamsBoard.columnsConfig }];
    }

    const items = Array.isArray(teamsBoard.items) ? teamsBoard.items : [];


    if (tables.length === 0) return [];

    // Misma regla que getTableAssignment() del editor
    const assignmentOf = (item: any) => {
      if (item.tableId) {
        const t = tables.find((tbl) => tbl.id === item.tableId);
        if (t) {
          const count = t.count || 1;
          const colIndex = Math.max(0, Math.min(count - 1, item.colIndex ?? 0));
          return { tableId: t.id, colIndex };
        }
      }
      for (const t of tables) {
        const withinX = item.x >= t.x && item.x <= t.x + t.width;
        const withinY = item.y >= t.y && item.y <= t.y + t.height;
        if (withinX && withinY) {
          const count = t.count || 1;
          const colIndex = Math.max(0, Math.min(count - 1, Math.floor(((item.x - t.x) / t.width) * count)));
          return { tableId: t.id, colIndex };
        }
      }
      return { tableId: undefined, colIndex: undefined };
    };

    const players = items
      .filter((item: any) => item.type === 'player')
      .map((item: any) => ({ ...item, ...assignmentOf(item) }));

    const columns: PdfTeamColumn[] = [];
    tables.forEach((tbl) => {
      const colCount = tbl.count || 2;
      for (let c = 0; c < colCount; c++) {
        columns.push({
          name: tbl.names?.[c] || '',
          color: tbl.colors?.[c] || '#000000',
          players: players
            .filter((item: any) => item.tableId === tbl.id && item.colIndex === c)
            .sort((a: any, b: any) => (a.y ?? 0) - (b.y ?? 0))
            .map((item: any) => ({
              text: item.text,
              color: item.color || '#000000'
            }))
        });
      }
    });

    return columns;
  } catch {}
  return [];
};

export const exportSessionToPdf = async (options: SessionPdfOptions) => {
  const {
    sessionTitle,
    date,
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
    // Title of training above the red line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(translatedTitle.toUpperCase(), MARGIN, yPos + 4);

    // Escudo Logo (smaller and aligned next to title)
    try {
      const logoImg = document.querySelector('img[alt="Escudo"]') as HTMLImageElement;
      if (logoImg && logoImg.complete && logoImg.naturalWidth) {
        doc.addImage(logoImg, 'PNG', PAGE_W - MARGIN - 8, yPos - 3.5, 8, 8);
      }
    } catch {}

    // Top border accent line (red)
    doc.setFillColor(220, 38, 38);
    doc.rect(MARGIN, yPos + 6, PAGE_W - MARGIN * 2, 1.5, 'F');
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

  let currentY = MARGIN + 10;

  // RENDER SUMMARY BLOCK (Only in Full Format)
  if (format === 'full') {
    const innerW = COL_W - 8;   // ancho real de la imagen dentro de la caja
    const headerH = 4.2;        // alto reservado al rótulo de la caja

    // Se renderizan en compacto (filas muy juntas) para robar el mínimo de alto
    const [structResult, obsResult] = await Promise.all([
      renderHtmlToImage(translatedStructure || '-', 900, true),
      renderHtmlToImage(translatedObservations || '-', 900, true)
    ]);

    // La caja se adapta al contenido en lugar de ocupar siempre 32mm
    const contentH = Math.max(
      structResult ? innerW * structResult.ratio : 0,
      obsResult ? innerW * obsResult.ratio : 0
    );
    const blockH = Math.max(9, Math.min(22, headerH + contentH + 1.2));
    const maxImgH = blockH - headerH - 1;

    const drawSummaryBox = (
      boxX: number,
      label: string,
      img: RenderedHtmlImage | null
    ) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(boxX, currentY, COL_W, blockH, 2, 2, 'FD');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(label.toUpperCase(), boxX + 4, currentY + 3.2);

      if (!img) return;
      const h = Math.min(innerW * img.ratio, maxImgH);
      const w = h < innerW * img.ratio ? h / img.ratio : innerW;
      doc.addImage(img.dataUrl, 'JPEG', boxX + 4, currentY + headerH, w, h);
    };

    drawSummaryBox(MARGIN, t.structure, structResult);
    drawSummaryBox(MARGIN + COL_W + MARGIN, t.observations, obsResult);

    currentY += blockH + 3;
  }

  // Recorta un texto al ancho disponible
  const fitText = (text: string, maxW: number) => {
    if (doc.getTextWidth(text) <= maxW) return text;
    let cut = text;
    while (cut.length > 1 && doc.getTextWidth(`${cut}.`) > maxW) cut = cut.slice(0, -1);
    return `${cut}.`;
  };

  // Ancho de un texto para un tamaño de fuente concreto, sin alterar el estado del doc
  const textWidthAt = (text: string, fontSize: number) => {
    const previous = doc.getFontSize();
    doc.setFontSize(fontSize);
    const width = doc.getTextWidth(text);
    doc.setFontSize(previous);
    return width;
  };

  // Ancho mínimo que necesita el panel para que los nombres se lean sin encogerse
  // demasiado. Si no cabe al lado del dibujo, el panel se coloca debajo.
  const teamsPanelMinWidth = (columns: PdfTeamColumn[]) => {
    if (!columns.length) return 0;
    const READABLE_SIZE = 5.0;
    doc.setFont("helvetica", "bold");

    let widest = 0;
    columns.forEach((col) => {
      const texts = [
        (col.name || '').toUpperCase(),
        ...(includePlayerNames ? col.players.map(p => p.text.toUpperCase()) : [])
      ];
      texts.forEach((text) => {
        if (!text) return;
        const w = textWidthAt(text, READABLE_SIZE);
        if (w > widest) widest = w;
      });
    });

    return columns.length * (widest + 1.4) + (columns.length - 1) * 1.2;
  };

  // Filas que ocupa el panel (cabecera + jugadores del equipo más numeroso)
  const teamsPanelRows = (columns: PdfTeamColumn[]) => {
    const hasAnyHeader = columns.some(col => !!col.name && col.name.trim().length > 0);
    const maxPlayers = Math.max(0, ...columns.map(c => (includePlayerNames ? c.players.length : 0)));
    return (hasAnyHeader ? 1 : 0) + maxPlayers;
  };

  // Panel de equipos: se respeta el formato del editor (una columna por equipo,
  // cabecera de color con el nombre y los jugadores debajo con su color).
  // Lo único que se adapta al hueco disponible es la separación entre columnas
  // y el tamaño del texto.
  const drawTeamsPanel = (
    columns: PdfTeamColumn[],
    px: number,
    py: number,
    pw: number,
    maxH: number
  ) => {
    if (!columns.length) return 0;

    const gap = Math.max(0.6, Math.min(1.4, pw * 0.025));
    const colW = (pw - (columns.length - 1) * gap) / columns.length;
    const innerW = Math.max(1, colW - 1.0);

    const hasAnyHeader = columns.some(col => !!col.name && col.name.trim().length > 0);
    const maxPlayers = Math.max(0, ...columns.map(c => (includePlayerNames ? c.players.length : 0)));
    const totalRows = (hasAnyHeader ? 1 : 0) + maxPlayers;
    if (!totalRows) return 0;

    // Alto de fila: el que permita el hueco, sin pasarse. Sin suelo, para que
    // TODAS las filas quepan siempre dentro del panel (nunca se recorta un nombre).
    const lineH = Math.min(3.2, maxH / totalRows);

    doc.setFont("helvetica", "bold");

    // Tamaño de texto: limitado por el alto de fila y por el nombre más ancho
    const fitSize = (texts: string[], base: number) => {
      let size = base;
      texts.forEach((text) => {
        if (!text) return;
        const w = textWidthAt(text, size);
        if (w > innerW) size = Math.max(2.4, (size * innerW) / w);
      });
      return size;
    };

    const playerTexts = columns.flatMap(c => (includePlayerNames ? c.players.map(p => p.text.toUpperCase()) : []));
    const nameSize = fitSize(playerTexts, Math.min(6.5, lineH * 2.0));
    const headerTexts = columns.map(c => (c.name || '').toUpperCase());
    const headerSize = fitSize(headerTexts, Math.min(6.0, lineH * 1.8));

    const headerOffset = hasAnyHeader ? lineH : 0;

    columns.forEach((col, colIdx) => {
      const cx = px + colIdx * (colW + gap);
      const centerX = cx + colW / 2;
      const hasName = !!col.name && col.name.trim().length > 0;

      if (hasName) {
        // Cabecera de color con el nombre del equipo, como en el editor
        doc.setFillColor(/^#[0-9a-f]{3,8}$/i.test(col.color) ? col.color : '#0f172a');
        doc.roundedRect(cx, py, colW, lineH * 0.92, lineH * 0.2, lineH * 0.2, 'F');
        doc.setFontSize(headerSize);
        doc.setTextColor(255, 255, 255);
        doc.text(col.name.toUpperCase(), centerX, py + lineH * 0.68, { align: 'center' });
      }

      if (!includePlayerNames) return;

      // Jugadores, cada uno con el color que tiene en el editor
      doc.setFontSize(nameSize);
      col.players.forEach((player, rowIdx) => {
        const ny = py + headerOffset + lineH * rowIdx + lineH * 0.72;
        if (ny > py + maxH) return;
        doc.setTextColor(player.color || '#334155');
        doc.text(fitText(player.text.toUpperCase(), colW), centerX, ny, { align: 'center' });
      });
    });

    return Math.min(maxH, headerOffset + maxPlayers * lineH);
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
    doc.text(`${index + 1}. ${task.title}`, x + 6, y + 5 * s);

    // Category / Duration metadata
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5 * s);
    doc.setTextColor(100, 116, 139);
    const durationStr = task.duration_min ? `| ${t.duration}: ${task.duration_min} min` : '';
    const categoryStr = task.category ? `${task.category.toUpperCase()} ` : '';
    doc.text(`${categoryStr}${durationStr}`, x + 6, y + 9 * s);

    const contentW = COL_W - 12;
    const teamTables = format === 'full' ? getTeamTables(task.board_data) : [];
    const teamRows = teamTables.length ? teamsPanelRows(teamTables) : 0;

    // RASTER DRAWING IF EXISTS (Off-screen rendering root capture)
    const hideAnnotations = format === 'simplified' || !options.includePlayerNames;
    const drawingImg = await renderTaskBoardToImage(task.board_data || '', hideAnnotations);

    // Description text block (Rendered as HTML Image to preserve Bold, Colors, Lists)
    const descY = y + 11 * s;
    const descW = contentW;

    // Franja mínima que se protege para dibujo + nombres: la descripción nunca
    // se la puede comer, así los equipos siempre tienen sitio donde salir.
    const minBandH = teamRows > 0 ? Math.min(cardH * 0.5, 16 + teamRows * 1.9) : 18;

    const descResult = await renderHtmlToImage(task.description || '', Math.round(750 / s));
    let finalDescH = 0;
    if (descResult) {
      // En el formato completo la descripción manda; en el simplificado se deja como estaba
      const maxDescH = format === 'full'
        ? Math.max(8, Math.min(cardH * 0.34, y + cardH - descY - 6 * s - minBandH))
        : cardH * 0.20;
      let w = descW;
      let h = descW * descResult.ratio;
      if (h > maxDescH) {
        h = Math.max(5, maxDescH);
        w = h / descResult.ratio;
      }
      finalDescH = h;
      doc.addImage(descResult.dataUrl, 'JPEG', x + 6, descY, w, h);
    }

    // Render Material underneath if exists (only in full format)
    const materialY = descY + finalDescH + 1.8 * s;
    let materialH = 0;
    const shouldRenderMaterial = format === 'full' && !!task.material;

    if (shouldRenderMaterial) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6 * s); // made text smaller (was 8)
      doc.setTextColor(51, 65, 85);
      doc.text(fitText(`${t.material}: ${task.material}`, contentW), x + 6, materialY);
      materialH = 1.2 * s;
    }

    const currentY = (shouldRenderMaterial ? materialY + materialH : descY + finalDescH) + 1.2 * s;
    const remainingH = Math.max(10, y + cardH - currentY - 3);

    // Los equipos van al lado del dibujo si caben con un tamaño de letra legible;
    // si son demasiado anchos (muchos equipos o nombres largos), se colocan debajo
    // ocupando todo el ancho de la tarjeta.
    const sideTeamsW = teamTables.length > 0 ? Math.min(42, contentW * 0.30) : 0;
    const teamsBelow = teamTables.length > 0 && teamsPanelMinWidth(teamTables) > sideTeamsW;

    const teamsW = teamsBelow ? 0 : sideTeamsW;
    const drawingAreaW = contentW - (teamsW > 0 ? teamsW + 3 : 0);

    // Si van debajo, mandan los nombres: se reserva el alto que necesitan todas
    // sus filas (2.2mm por fila) y el dibujo se queda con lo que sobre.
    const belowTeamsH = teamsBelow
      ? Math.min(remainingH - 12, Math.max(6, teamRows * 2.2))
      : 0;
    const drawingAreaH = teamsBelow ? Math.max(8, remainingH - belowTeamsH - 2) : remainingH;

    // 1. Dibujo
    let drawingH = 0;
    if (drawingImg) {
      let w = drawingAreaW;
      let h = w * drawingImg.ratio;
      if (h > drawingAreaH) {
        h = drawingAreaH;
        w = h / drawingImg.ratio;
      }
      const drawingX = x + 6 + (drawingAreaW - w) / 2;
      doc.addImage(drawingImg.dataUrl, 'JPEG', drawingX, currentY, w, h);
      drawingH = h;
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8 * s);
      doc.setTextColor(148, 163, 184);
      doc.text(t.noDraw, x + 6, currentY + 4);
      drawingH = 6;
    }

    // 2. Equipos: al lado del dibujo o debajo, según quepan
    if (teamsW > 0) {
      drawTeamsPanel(teamTables, x + 6 + drawingAreaW + 3, currentY, teamsW, remainingH);
    } else if (teamsBelow) {
      const teamsY = currentY + drawingH + 2;
      // Siempre se pintan: si el hueco real fuese menor, el panel se comprime solo
      const availableH = Math.max(4, y + cardH - teamsY - 3);
      drawTeamsPanel(teamTables, x + 6, teamsY, contentW, availableH);
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
        currentY = MARGIN + 10; // reset Y offset for page 2 onwards
      }
    }
  }

  // Save the PDF
  const filename = `Sesion_Entrenamiento_${translatedTitle.replace(/\s+/g, '_')}_${date}.pdf`;
  doc.save(filename);
};
