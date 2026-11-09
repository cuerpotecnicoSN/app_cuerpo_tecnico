/**
 * Carga de fotos remotas para incrustarlas en PDFs (jsPDF necesita dataURLs).
 *
 * Antes se pedían todas las fotos a la vez a través de corsproxy.io: el proxy público
 * limita las peticiones y la mayoría fallaban, quedando cuadros grises en el PDF.
 * Aquí: carga directa → images.weserv.nl (redimensiona) → corsproxy, con timeout
 * y concurrencia limitada.
 *
 * Se carga en PNG (pedir JPEG a weserv aplana la transparencia a negro) y al final
 * se aplana sobre blanco en el canvas antes de exportar a JPEG.
 */

const LOAD_TIMEOUT_MS = 8000;

/** Distancia de color (RGB) al cuadrado. */
const dist2 = (d: Uint8ClampedArray, i: number, r: number, g: number, b: number) => {
  const dr = d[i] - r;
  const dg = d[i + 1] - g;
  const db = d[i + 2] - b;
  return dr * dr + dg * dg + db * db;
};

/**
 * Quita un fondo liso (blanco, negro, gris...) rellenando desde los bordes.
 * Sólo actúa si el borde de la foto es mayoritariamente de un mismo color,
 * para no "comerse" fotos con fondos de estadio, degradados, etc.
 */
const removeUniformBackground = (ctx: CanvasRenderingContext2D, size: number) => {
  const imageData = ctx.getImageData(0, 0, size, size);
  const d = imageData.data;
  const TOL = 30; // tolerancia de color para considerar "fondo"
  const TOL2 = TOL * TOL;
  const EDGE2 = (TOL * 1.8) ** 2; // franja de suavizado del contorno

  // Píxeles del borde (ignorando los ya transparentes)
  const border: number[] = [];
  for (let i = 0; i < size; i++) {
    border.push(i, (size - 1) * size + i, i * size, i * size + size - 1);
  }
  const opaqueBorder = border.filter((p) => d[p * 4 + 3] > 200);
  // Si gran parte del borde ya es transparente, la foto no tiene fondo: lo opaco del
  // borde es el propio jugador (camiseta cortada abajo) y no hay que tocarlo.
  if (opaqueBorder.length < border.length * 0.6) return;

  // Color de referencia: mediana por canal del borde
  const median = (ch: number) => {
    const vals = opaqueBorder.map((p) => d[p * 4 + ch]).sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)];
  };
  const r = median(0), g = median(1), b = median(2);

  // Fondos claros: la hoja del PDF ya es blanca, quitarlos no aporta nada y el relleno
  // se colaba por piel y zonas blancas de la camiseta (fotos "difuminadas").
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  if (luminance > 185) return;

  const matching = opaqueBorder.filter((p) => dist2(d, p * 4, r, g, b) <= TOL2).length;
  if (matching / opaqueBorder.length < 0.75) return; // fondo no uniforme: no tocar

  // Relleno por inundación desde el borde
  const visited = new Uint8Array(size * size);
  const stack: number[] = [];
  for (const p of border) {
    if (!visited[p]) { visited[p] = 1; stack.push(p); }
  }
  const isBackground = (p: number) => d[p * 4 + 3] <= 10 || dist2(d, p * 4, r, g, b) <= TOL2;

  while (stack.length) {
    const p = stack.pop()!;
    if (!isBackground(p)) continue;
    d[p * 4 + 3] = 0;
    const x = p % size;
    const y = (p - x) / size;
    const neighbors = [
      x > 0 ? p - 1 : -1,
      x < size - 1 ? p + 1 : -1,
      y > 0 ? p - size : -1,
      y < size - 1 ? p + size : -1,
    ];
    for (const n of neighbors) {
      if (n >= 0 && !visited[n]) { visited[n] = 1; stack.push(n); }
    }
  }

  // Suavizado: píxeles del contorno parecidos al fondo pasan a semitransparentes
  for (let p = 0; p < size * size; p++) {
    const a = p * 4 + 3;
    if (d[a] === 0) continue;
    const x = p % size;
    const touchesBg =
      (x > 0 && d[a - 4] === 0) || (x < size - 1 && d[a + 4] === 0) ||
      (p >= size && d[a - size * 4] === 0) || (p < size * (size - 1) && d[a + size * 4] === 0);
    if (!touchesBg) continue;
    const dd = dist2(d, p * 4, r, g, b);
    if (dd < EDGE2) d[a] = Math.round(d[a] * Math.min(1, dd / EDGE2));
  }

  ctx.putImageData(imageData, 0, 0);
};

interface PhotoOptions {
  size?: number;
  removeBackground?: boolean;
}

const loadIntoCanvas = (
  src: string,
  useCors: boolean,
  { size = 240, removeBackground = false }: PhotoOptions
): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    if (useCors) img.crossOrigin = 'anonymous';
    let done = false;
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), LOAD_TIMEOUT_MS);

    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return finish(null);
        // Recorte cuadrado anclado arriba (como object-cover object-top en la app)
        const side = Math.min(w, h);
        const sx = (w - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: removeBackground });
        if (!ctx) return finish(null);
        ctx.drawImage(img, sx, 0, side, side, 0, 0, size, size);
        if (removeBackground) removeUniformBackground(ctx, size);
        // Aplanar sobre blanco (la hoja del PDF es blanca) y exportar en JPEG:
        // jsPDF tarda muchísimo procesando PNG con transparencia.
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        finish(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        // Canvas "tainted" (sin CORS): probar el siguiente candidato
        finish(null);
      }
    };
    img.onerror = () => finish(null);
    img.src = src;
  });

/** Devuelve la foto como dataURL JPEG cuadrado (fondo blanco), o null si no se pudo cargar. */
export const loadSquarePhoto = async (url: string, options: PhotoOptions = {}): Promise<string | null> => {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return loadIntoCanvas(url, false, options);

  const size = options.size ?? 240;
  const bare = url.replace(/^https?:\/\//, '');
  const candidates = [
    url,
    `https://images.weserv.nl/?url=${encodeURIComponent(bare)}&w=${size * 2}&output=png`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];
  for (const candidate of candidates) {
    const result = await loadIntoCanvas(candidate, true, options);
    if (result) return result;
  }
  return null;
};

/** Ejecuta `fn` sobre cada elemento con como mucho `limit` tareas simultáneas. */
export const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};
