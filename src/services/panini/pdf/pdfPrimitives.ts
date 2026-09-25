/**
 * Lectura de primitivas vectoriales de un PDF con pdf.js.
 *
 * Los informes Panini Digital son PDF vectoriales: jugadores, flechas de pases,
 * celdas de densidad y eventos son figuras con posición y color exactos. Aquí
 * recorremos la lista de operadores de pdf.js y reconstruimos cada figura en
 * coordenadas de página (origen arriba-izquierda, en puntos PDF), junto con el
 * texto posicionado. Los parsers de cada página trabajan sobre este modelo.
 */
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// Códigos de operador de pdf.js (OPS). Se fijan aquí para no depender del build
// concreto (navegador vs. legacy de Node) al importar.
const OP = {
  save: 10,
  restore: 11,
  transform: 12,
  setLineWidth: 2,
  stroke: 20,
  closeStroke: 21,
  fill: 22,
  eoFill: 23,
  fillStroke: 24,
  eoFillStroke: 25,
  closeFillStroke: 26,
  closeEOFillStroke: 27,
  endPath: 28,
  setStrokeGray: 56,
  setFillGray: 57,
  setStrokeRGBColor: 58,
  setFillRGBColor: 59,
  setStrokeCMYKColor: 60,
  setFillCMYKColor: 61,
  setStrokeColorN: 53,
  setFillColorN: 55,
  paintFormXObjectBegin: 74,
  paintImageMaskXObject: 83,
  paintImageXObject: 85,
  paintInlineImageXObject: 86,
  paintFormXObjectEnd: 75,
  constructPath: 91,
} as const;

// Códigos de trazado dentro de constructPath (DrawOPS)
const DRAW = { moveTo: 0, lineTo: 1, curveTo: 2, quadraticCurveTo: 3, closePath: 4 } as const;

const FILL_OPS = new Set<number>([OP.fill, OP.eoFill, OP.fillStroke, OP.eoFillStroke, OP.closeFillStroke, OP.closeEOFillStroke]);
const STROKE_OPS = new Set<number>([OP.stroke, OP.closeStroke, OP.fillStroke, OP.eoFillStroke, OP.closeFillStroke, OP.closeEOFillStroke]);

/** Valor de color para figuras rellenas/trazadas con un patrón en lugar de un color sólido */
export const PATTERN = 'pattern';

export type Matrix = [number, number, number, number, number, number];

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PdfShape {
  /** Color de relleno en hex (#rrggbb) o null si la figura no se rellena.
   *  Para rellenos con trama es el color de las rayas (ver `fillIsPattern`). */
  fill: string | null;
  /** true si el relleno es una trama (patrón de rayas sobre fondo blanco) */
  fillIsPattern: boolean;
  /** Color de trazo en hex o null si la figura no se traza */
  stroke: string | null;
  lineWidth: number;
  /** Caja delimitadora en coordenadas de página (y hacia abajo) */
  rect: Rect;
  /** Puntos del trazado (extremos de segmentos y curvas), ya transformados */
  points: { x: number; y: number }[];
  hasCurves: boolean;
  /** Número de subtrazados (moveTo) */
  subpaths: number;
  /** Orden de dibujo dentro de la página */
  index: number;
}

export interface PdfWord {
  str: string;
  x: number;
  /** Línea base del texto, en coordenadas de página (y hacia abajo) */
  y: number;
  width: number;
  height: number;
  /** true si el texto está girado */
  rotated: boolean;
}

export interface PdfPageContent {
  pageNumber: number;
  width: number;
  height: number;
  shapes: PdfShape[];
  /** Rectángulos donde se pintan imágenes (p. ej. la portería del mapa de tiros) */
  images: Rect[];
  words: PdfWord[];
}

const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

/** pdf.js entrega los colores RGB ya como '#rrggbb'; los grises/CMYK como números 0-1. */
const colorFromArgs = (fn: number, args: unknown[]): string | null => {
  if (fn === OP.setFillRGBColor || fn === OP.setStrokeRGBColor) {
    const a = args[0];
    if (typeof a === 'string') return a.toLowerCase();
    return toHex(Number(args[0]) / 255, Number(args[1]) / 255, Number(args[2]) / 255);
  }
  if (fn === OP.setFillGray || fn === OP.setStrokeGray) {
    const g = Number(args[0]);
    return toHex(g, g, g);
  }
  const [c, m, y, k] = args.map(Number);
  return toHex((1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k));
};

/**
 * Color de un patrón de tipo "tiling" (args de setFillColorN en pdf.js):
 * ['TilingPattern', color, operatorList, matrix, bbox, xstep, ystep, paintType].
 * Las tramas de Panini pintan fondo blanco y luego las rayas: nos quedamos con
 * el último color RGB distinto de blanco de su lista de operadores.
 */
const patternColor = (args: unknown[]): string | null => {
  const ops = args[2] as { fnArray?: number[]; argsArray?: unknown[][] } | undefined;
  if (!ops?.fnArray || !ops.argsArray) return null;
  let color: string | null = null;
  ops.fnArray.forEach((fn, i) => {
    if (fn !== OP.setFillRGBColor) return;
    const c = colorFromArgs(fn, ops.argsArray![i]);
    if (c && c !== '#ffffff') color = c;
  });
  return color;
};

interface GState {
  ctm: Matrix;
  fill: string;
  fillIsPattern: boolean;
  stroke: string;
  lineWidth: number;
}

export async function readPageContent(page: PDFPageProxy): Promise<PdfPageContent> {
  const [vx0, vy0, vx1, vy1] = page.view;
  const height = vy1 - vy0;
  const width = vx1 - vx0;
  const ops = await page.getOperatorList();

  const shapes: PdfShape[] = [];
  const images: Rect[] = [];
  const stack: GState[] = [];
  let gs: GState = { ctm: [1, 0, 0, 1, 0, 0], fill: '#000000', fillIsPattern: false, stroke: '#000000', lineWidth: 1 };

  const apply = (x: number, y: number) => {
    const m = gs.ctm;
    return { x: m[0] * x + m[2] * y + m[4] - vx0, y: height - (m[1] * x + m[3] * y + m[5] - vy0) };
  };

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i] as unknown[];

    switch (fn) {
      case OP.save:
        stack.push({ ...gs });
        break;
      case OP.restore:
        gs = stack.pop() ?? gs;
        break;
      case OP.transform:
        gs = { ...gs, ctm: multiply(args as Matrix, gs.ctm) };
        break;
      case OP.paintFormXObjectBegin: {
        stack.push({ ...gs });
        const matrix = args[0] as Matrix | null;
        if (matrix) gs = { ...gs, ctm: multiply(matrix, gs.ctm) };
        break;
      }
      case OP.paintFormXObjectEnd:
        gs = stack.pop() ?? gs;
        break;
      case OP.setLineWidth:
        gs = { ...gs, lineWidth: Number(args[0]) };
        break;
      case OP.setFillRGBColor:
      case OP.setFillGray:
      case OP.setFillCMYKColor:
        gs = { ...gs, fill: colorFromArgs(fn, args) ?? gs.fill, fillIsPattern: false };
        break;
      case OP.setFillColorN:
        // Relleno con trama: tomamos el color de las rayas del propio patrón
        gs = { ...gs, fill: patternColor(args) ?? PATTERN, fillIsPattern: true };
        break;
      case OP.setStrokeColorN:
        gs = { ...gs, stroke: PATTERN };
        break;
      case OP.setStrokeRGBColor:
      case OP.setStrokeGray:
      case OP.setStrokeCMYKColor:
        gs = { ...gs, stroke: colorFromArgs(fn, args) ?? gs.stroke };
        break;
      case OP.paintImageXObject:
      case OP.paintImageMaskXObject:
      case OP.paintInlineImageXObject: {
        // Las imágenes se pintan en el cuadrado unidad transformado por la CTM
        const corners = [apply(0, 0), apply(1, 0), apply(0, 1), apply(1, 1)];
        const xs = corners.map((p) => p.x);
        const ys = corners.map((p) => p.y);
        images.push({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
        break;
      }
      case OP.constructPath: {
        const paintOp = args[0] as number;
        if (paintOp === OP.endPath) break; // trazados de recorte
        const pathData = (args[1] as ArrayLike<number>[] | undefined)?.[0];
        if (!pathData) break;

        const points: { x: number; y: number }[] = [];
        let hasCurves = false;
        let subpaths = 0;
        for (let k = 0; k < pathData.length; ) {
          const cmd = pathData[k++];
          if (cmd === DRAW.moveTo) {
            subpaths++;
            points.push(apply(pathData[k], pathData[k + 1]));
            k += 2;
          } else if (cmd === DRAW.lineTo) {
            points.push(apply(pathData[k], pathData[k + 1]));
            k += 2;
          } else if (cmd === DRAW.curveTo) {
            hasCurves = true;
            points.push(apply(pathData[k + 4], pathData[k + 5]));
            k += 6;
          } else if (cmd === DRAW.quadraticCurveTo) {
            hasCurves = true;
            points.push(apply(pathData[k + 2], pathData[k + 3]));
            k += 4;
          } else {
            // closePath u operador desconocido: sin argumentos
          }
        }
        if (!points.length) break;

        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const scale = Math.sqrt(Math.abs(gs.ctm[0] * gs.ctm[3] - gs.ctm[1] * gs.ctm[2])) || 1;
        shapes.push({
          fill: FILL_OPS.has(paintOp) ? gs.fill : null,
          fillIsPattern: FILL_OPS.has(paintOp) && gs.fillIsPattern,
          stroke: STROKE_OPS.has(paintOp) ? gs.stroke : null,
          lineWidth: gs.lineWidth * scale,
          rect: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
          points,
          hasCurves,
          subpaths,
          index: shapes.length,
        });
        break;
      }
      default:
        break;
    }
  }

  const text = await page.getTextContent();
  const words: PdfWord[] = [];
  for (const item of text.items) {
    if (!('str' in item) || !item.str.trim()) continue;
    const [a, b, , , e, f] = item.transform as number[];
    words.push({
      str: item.str.trim(),
      x: e - vx0,
      y: height - (f - vy0),
      width: item.width,
      height: item.height,
      rotated: Math.abs(b) > Math.abs(a),
    });
  }

  return { pageNumber: page.pageNumber, width, height, shapes, images, words };
}

export async function readDocumentContent(doc: PDFDocumentProxy): Promise<PdfPageContent[]> {
  const pages: PdfPageContent[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    pages.push(await readPageContent(await doc.getPage(n)));
  }
  return pages;
}

// ---------------------------------------------------------------------------
// Utilidades geométricas y de color para los parsers
// ---------------------------------------------------------------------------

export const rectWidth = (r: Rect) => r.x1 - r.x0;
export const rectHeight = (r: Rect) => r.y1 - r.y0;
export const rectCenter = (r: Rect) => ({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 });

export const insideRect = (p: { x: number; y: number }, r: Rect, tolerance = 0) =>
  p.x >= r.x0 - tolerance && p.x <= r.x1 + tolerance && p.y >= r.y0 - tolerance && p.y <= r.y1 + tolerance;

export const rectInside = (inner: Rect, outer: Rect, tolerance = 0) =>
  inner.x0 >= outer.x0 - tolerance && inner.x1 <= outer.x1 + tolerance && inner.y0 >= outer.y0 - tolerance && inner.y1 <= outer.y1 + tolerance;

export const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

export const colorDistance = (a: string, b: string) => {
  if (a === PATTERN || b === PATTERN) return a === b ? 0 : Infinity;
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
};

/** Centro de un texto (aprox.: la línea base está abajo, la altura hacia arriba) */
export const wordCenter = (w: PdfWord) => ({ x: w.x + w.width / 2, y: w.y - w.height / 2 });

/** Pasa un punto de página a porcentaje (0-100) dentro de un rectángulo de campo */
export const toPct = (p: { x: number; y: number }, pitch: Rect) => ({
  x: Math.round(((p.x - pitch.x0) / rectWidth(pitch)) * 1000) / 10,
  y: Math.round(((p.y - pitch.y0) / rectHeight(pitch)) * 1000) / 10,
});

/** Número italiano "44,8" → 44.8; devuelve NaN si no es numérico */
export const parseItNumber = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
