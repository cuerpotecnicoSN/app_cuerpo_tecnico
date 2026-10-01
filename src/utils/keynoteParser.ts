/**
 * Snappy & Apple IWA / Keynote Parser for Web & Node
 * Parses Apple Keynote (.key) presentations directly in the browser using JSZip.
 */
import JSZip from 'jszip';
import { translateTacticalText } from './focusTranslator';
import { classifyFocus, type FocusPhase, type FocusType } from './focusClassifier';

// Decompresses a raw Snappy byte block
export function decompressSnappy(data: Uint8Array): Uint8Array {
  let pos = 0;
  let length = 0;
  let shift = 0;

  // Read uncompressed length (varint)
  while (pos < data.length) {
    const b = data[pos++];
    length |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }

  const out = new Uint8Array(length);
  let outPos = 0;

  while (pos < data.length && outPos < length) {
    const tag = data[pos] & 0x03;

    if (tag === 0) {
      // Literal
      let litLen = data[pos++] >> 2;
      if (litLen < 60) {
        litLen += 1;
      } else if (litLen === 60) {
        litLen = data[pos++] + 1;
      } else if (litLen === 61) {
        litLen = (data[pos] | (data[pos + 1] << 8)) + 1;
        pos += 2;
      } else if (litLen === 62) {
        litLen = (data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16)) + 1;
        pos += 3;
      } else if (litLen === 63) {
        litLen = (data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16) | (data[pos + 3] << 24)) + 1;
        pos += 4;
      }
      out.set(data.subarray(pos, pos + litLen), outPos);
      pos += litLen;
      outPos += litLen;
    } else if (tag === 1) {
      // Copy with 1-byte offset
      const copyLen = ((data[pos] >> 2) & 0x07) + 4;
      const offset = ((data[pos] & 0xe0) << 3) | data[pos + 1];
      pos += 2;
      for (let i = 0; i < copyLen; i++) {
        out[outPos] = out[outPos - offset];
        outPos++;
      }
    } else if (tag === 2) {
      // Copy with 2-byte offset
      const copyLen = (data[pos] >> 2) + 1;
      const offset = data[pos + 1] | (data[pos + 2] << 8);
      pos += 3;
      for (let i = 0; i < copyLen; i++) {
        out[outPos] = out[outPos - offset];
        outPos++;
      }
    } else if (tag === 3) {
      // Copy with 4-byte offset
      const copyLen = (data[pos] >> 2) + 1;
      const offset = data[pos + 1] | (data[pos + 2] << 8) | (data[pos + 3] << 16) | (data[pos + 4] << 24);
      pos += 5;
      for (let i = 0; i < copyLen; i++) {
        out[outPos] = out[outPos - offset];
        outPos++;
      }
    }
  }

  return out.subarray(0, outPos);
}

// Unpacks IWA snappy chunks into a single decompressed buffer
export function unpackIwaChunks(rawBytes: Uint8Array): Uint8Array {
  let pos = 0;
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (pos + 4 <= rawBytes.length) {
    const chunkLen = rawBytes[pos + 1] | (rawBytes[pos + 2] << 8) | (rawBytes[pos + 3] << 16);
    pos += 4;
    const chunkData = rawBytes.subarray(pos, pos + chunkLen);
    pos += chunkLen;

    try {
      const decompressed = decompressSnappy(chunkData);
      if (decompressed.length > 0) {
        chunks.push(decompressed);
        totalLength += decompressed.length;
      }
    } catch {
      // ignore invalid chunk
    }
  }

  const result = new Uint8Array(totalLength);
  let cur = 0;
  for (const c of chunks) {
    result.set(c, cur);
    cur += c.length;
  }
  return result;
}

function readVarint(buf: Uint8Array, startPos: number): [number, number] {
  let val = 0;
  let shift = 0;
  let p = startPos;
  while (p < buf.length) {
    const b = buf[p++];
    val |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) {
      return [val, p];
    }
    shift += 7;
  }
  return [val, p];
}

const textDecoder = new TextDecoder('utf-8');

/**
 * Extracts Table DataList protobuf entries: Map of string keys to string values
 */
export function extractDataListEntries(buf: Uint8Array): Map<number, string> {
  const entries = new Map<number, string>();
  let p = 0;
  while (p < buf.length - 4) {
    if (buf[p] === 0x1a) {
      // potential field 3 entry (tag 0x1a)
      try {
        const [entryLen, afterTag] = readVarint(buf, p + 1);
        if (entryLen > 0 && afterTag + entryLen <= buf.length) {
          const sub = buf.subarray(afterTag, afterTag + entryLen);
          let sp = 0;
          let k: number | null = null;
          let strVal: string | null = null;
          while (sp < sub.length) {
            const [stag, nsp] = readVarint(sub, sp);
            sp = nsp;
            const swire = stag & 7;
            const sfield = stag >> 3;
            if (sfield === 0) break;
            if (swire === 0) {
              const [v, np] = readVarint(sub, sp);
              sp = np;
              if (sfield === 1) k = v;
            } else if (swire === 2) {
              const [slen, np] = readVarint(sub, sp);
              sp = np;
              if (sp + slen <= sub.length) {
                const sbytes = sub.subarray(sp, sp + slen);
                sp += slen;
                if (sfield === 3) {
                  strVal = textDecoder.decode(sbytes).trim();
                }
              }
            } else if (swire === 1) {
              sp += 8;
            } else if (swire === 5) {
              sp += 4;
            } else {
              break;
            }
          }
          if (k !== null && strVal !== null && strVal.length > 0) {
            entries.set(k, strVal);
            p = afterTag + entryLen;
            continue;
          }
        }
      } catch {
        // continue scan
      }
    }
    p++;
  }
  return entries;
}

export interface ExtractedFocusItem {
  id: string;
  coach: string;
  rawItalian: string;
  translatedText: string;
  suggestedPhase: FocusPhase;
  suggestedType: FocusType;
  confidence: number;
  selected: boolean;
  notes?: string;
}

export interface ParsedKeynoteData {
  fileName: string;
  matchTitle?: string;
  opponentDetected?: string;
  dateDetected?: string;
  coaches: string[];
  focusItems: ExtractedFocusItem[];
  rawTables: { name: string; entries: Map<number, string> }[];
}

/**
 * Cleans and separates multi-line bullet points or semicolon lists into distinct focuses
 */
export function splitFocusSentences(text: string): string[] {
  const lines = text
    .split(/\r?\n|;/g)
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && !l.startsWith('http') && !l.startsWith('$'));

  return lines.length > 0 ? lines : [text.trim()];
}

// Known common coach names in the club staff
const KNOWN_COACHES = new Set([
  'ROBERTO',
  'VALERIO',
  'PIETRO',
  'THOMAS',
  'GIGI',
  'DANIELE',
  'MASSIMO',
  'MARCO',
  'STEFANO',
  'IGNAZIO',
  'DAVIDE',
  'ALESSANDRO',
  'MATTEO',
  'ANDREA',
  'LUCA',
  'SIMONE',
  'FRANCESCO',
  'FEDERICO',
  'GABRIELE',
]);

/**
 * Main parser: accepts File or ArrayBuffer and returns structured, translated and classified focus data
 */
export async function parseKeynoteFile(
  input: File | ArrayBuffer | Uint8Array,
  fileName = 'presentation.key',
  targetLang: 'es' | 'en' | 'it' = 'es'
): Promise<ParsedKeynoteData> {
  const zip = new JSZip();
  let zipData: JSZip;

  if (input instanceof Uint8Array || input instanceof ArrayBuffer) {
    zipData = await zip.loadAsync(input);
  } else {
    const arrayBuf = await input.arrayBuffer();
    zipData = await zip.loadAsync(arrayBuf);
    fileName = input.name;
  }

  const rawTables: { name: string; entries: Map<number, string> }[] = [];
  let matchTitle = '';
  let dateDetected = '';

  // Process all files inside zip
  for (const [relativePath, zipEntry] of Object.entries(zipData.files)) {
    if (zipEntry.dir) continue;

    if (relativePath.endsWith('.iwa')) {
      const fileBytes = await zipEntry.async('uint8array');
      const decompressed = unpackIwaChunks(fileBytes);

      // 1. Table DataLists
      if (relativePath.includes('Tables/DataList')) {
        const entries = extractDataListEntries(decompressed);
        if (entries.size > 0) {
          rawTables.push({ name: relativePath, entries });
        }
      }

      // 2. Slide text extraction for Match title / Date
      if (relativePath.includes('Slide')) {
        try {
          const rawStr = textDecoder.decode(decompressed);
          const lines = rawStr.match(/[\w\s\.,;:!?\'\(\)\/\-\+%=#@€\$áéíóúÁÉÍÓÚñÑüÜàèìòùÀÈÌÒÙ]{4,}/g) || [];
          for (const l of lines) {
            const clean = l.trim();
            if (clean.length > 3 && !clean.startsWith('$') && !clean.startsWith('Index/')) {
              if (
                clean.includes(' - ') ||
                clean.toLowerCase().includes(' vs ') ||
                clean.toLowerCase().includes('piano gara') ||
                clean.toLowerCase().includes('milan futuro')
              ) {
                if (!matchTitle || matchTitle.length < clean.length) {
                  matchTitle = clean.replace(/piano gara/i, '').replace(/focus della partita/i, '').trim();
                }
              }
              if (clean.toLowerCase().includes('giornata') || /\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4}/.test(clean)) {
                if (!dateDetected) dateDetected = clean;
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // Find the focus table
  let focusEntries: Map<number, string> | null = null;
  for (const t of rawTables) {
    const vals = Array.from(t.entries.values()).map((v) => v.toUpperCase());
    if (vals.includes('ALLENATORE') || (vals.includes('FOCUS') && vals.some((v) => KNOWN_COACHES.has(v)))) {
      focusEntries = t.entries;
      break;
    }
  }

  if (!focusEntries) {
    for (const t of rawTables) {
      const vals = Array.from(t.entries.values()).map((v) => v.toUpperCase());
      const coachMatches = vals.filter((v) => KNOWN_COACHES.has(v));
      if (coachMatches.length >= 2) {
        focusEntries = t.entries;
        break;
      }
    }
  }

  const coaches: string[] = [];
  const focusItems: ExtractedFocusItem[] = [];

  if (focusEntries) {
    const values = Array.from(focusEntries.entries());
    const foundCoaches: { key: number; name: string }[] = [];
    const foundTexts: { key: number; text: string }[] = [];

    for (const [k, v] of values) {
      const trimmed = v.trim();
      const upper = trimmed.toUpperCase();
      if (upper === 'ALLENATORE' || upper === 'FOCUS' || upper === 'CONTEGGIO E CONCLUSIONI') {
        continue;
      }
      if (
        KNOWN_COACHES.has(upper) ||
        (trimmed.split(/\s+/).length <= 2 &&
          trimmed.length <= 20 &&
          !/[;\.!\?]/.test(trimmed) &&
          /^[A-Za-zÁÉÍÓÚáéíóúÀÈÌÒÙàèìòù\s]+$/.test(trimmed))
      ) {
        foundCoaches.push({ key: k, name: trimmed });
      } else {
        foundTexts.push({ key: k, text: trimmed });
      }
    }

    foundCoaches.forEach((c) => coaches.push(c.name));

    // Map coach to focus text
    for (let i = 0; i < foundCoaches.length; i++) {
      const coach = foundCoaches[i];
      const matchingText = foundTexts[i];

      if (matchingText && matchingText.text.trim()) {
        const sentences = splitFocusSentences(matchingText.text);
        for (const sentence of sentences) {
          const translated = await translateTacticalText(sentence, targetLang);
          const classification = classifyFocus(sentence, coach.name);

          focusItems.push({
            id: `focus_${coach.name}_${Math.random().toString(36).substr(2, 7)}`,
            coach: coach.name,
            rawItalian: sentence,
            translatedText: translated,
            suggestedPhase: classification.phase,
            suggestedType: classification.focusType,
            confidence: classification.confidence,
            selected: true,
          });
        }
      }
    }
  }

  return {
    fileName,
    matchTitle,
    opponentDetected: matchTitle,
    dateDetected,
    coaches,
    focusItems,
    rawTables,
  };
}
