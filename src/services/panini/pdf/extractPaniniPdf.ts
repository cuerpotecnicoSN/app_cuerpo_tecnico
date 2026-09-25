/**
 * Punto de entrada en el navegador: lee un PDF de Panini Digital y devuelve el
 * informe estructurado. Se importa de forma diferida para no cargar pdf.js
 * hasta que el usuario sube un archivo.
 */
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { readDocumentContent } from './pdfPrimitives';
import { parsePaniniPages, type PaniniPdfParseResult } from './parsePaniniPdf';

GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPaniniReportFromPdf(file: File): Promise<PaniniPdfParseResult> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await getDocument({ data }).promise;
  try {
    const pages = await readDocumentContent(doc);
    return parsePaniniPages(pages, file.name);
  } finally {
    await doc.destroy();
  }
}
