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

interface ArchiveRecord {
  id: number;
  type: number;
  data: Uint8Array;
}

// Parses all TSP archives from decompressed IWA bytes
function parseIwaArchives(decompressed: Uint8Array): ArchiveRecord[] {
  const archives: ArchiveRecord[] = [];
  let pos = 0;
  while (pos < decompressed.length) {
    const [headerLen, afterHeaderLen] = readVarint(decompressed, pos);
    if (headerLen <= 0 || afterHeaderLen + headerLen > decompressed.length) break;
    const headerBytes = decompressed.subarray(afterHeaderLen, afterHeaderLen + headerLen);

    let hp = 0;
    let archId = 0;
    const payloads: { type: number; length: number }[] = [];
    while (hp < headerBytes.length) {
      const [tag, nhp] = readVarint(headerBytes, hp);
      hp = nhp;
      const f = tag >> 3, w = tag & 7;
      if (w === 0) {
        const [v, np] = readVarint(headerBytes, hp);
        hp = np;
        if (f === 1) archId = v;
      } else if (w === 2) {
        const [mlen, np] = readVarint(headerBytes, hp);
        hp = np;
        const msgSub = headerBytes.subarray(hp, hp + mlen);
        hp += mlen;
        if (f === 2) {
          let mp = 0, mtype = 0, mlength = 0;
          while (mp < msgSub.length) {
            const [mtag, nmp] = readVarint(msgSub, mp);
            mp = nmp;
            const mf = mtag >> 3, mw = mtag & 7;
            if (mw === 0) {
              const [mv, nmp2] = readVarint(msgSub, mp);
              mp = nmp2;
              if (mf === 1) mtype = mv;
              if (mf === 3) mlength = mv;
            } else if (mw === 2) {
              const [slen, nmp2] = readVarint(msgSub, mp);
              mp = nmp2 + slen;
            }
          }
          payloads.push({ type: mtype, length: mlength });
        }
      }
    }

    let curPayloadPos = afterHeaderLen + headerLen;
    for (const pl of payloads) {
      if (curPayloadPos + pl.length <= decompressed.length) {
        archives.push({
          id: archId,
          type: pl.type,
          data: decompressed.subarray(curPayloadPos, curPayloadPos + pl.length),
        });
      }
      curPayloadPos += pl.length;
    }
    pos = curPayloadPos;
  }
  return archives;
}

// Extracts strings from a TSWP.StorageArchive (Type 2001)
function extractStorageText(data: Uint8Array): string {
  let p = 0;
  const paragraphs: string[] = [];
  while (p < data.length) {
    const [tag, np] = readVarint(data, p);
    p = np;
    const f = tag >> 3, w = tag & 7;
    if (w === 0) {
      const [, np2] = readVarint(data, p);
      p = np2;
    } else if (w === 2) {
      const [len, np2] = readVarint(data, p);
      p = np2;
      if (p + len <= data.length) {
        if (f === 3) {
          const strBytes = data.subarray(p, p + len);
          try {
            const str = textDecoder.decode(strBytes);
            if (str.trim()) paragraphs.push(str.trim());
          } catch {}
        }
      }
      p += len;
    } else if (w === 1) {
      p += 8;
    } else if (w === 5) {
      p += 4;
    }
  }
  return paragraphs.join('\n');
}

// Extracts target storage ID from TST.WPStorageListArchive (Type 6218)
function extractStoragePointer(data: Uint8Array): number | null {
  let p = 0;
  while (p < data.length) {
    const [tag, np] = readVarint(data, p);
    p = np;
    const f = tag >> 3, w = tag & 7;
    if (w === 0) {
      const [, np2] = readVarint(data, p);
      p = np2;
    } else if (w === 2) {
      const [len, np2] = readVarint(data, p);
      p = np2;
      const sub = data.subarray(p, p + len);
      p += len;
      if (f === 1) {
        let sp = 0;
        while (sp < sub.length) {
          const [stag, nsp] = readVarint(sub, sp);
          sp = nsp;
          if ((stag >> 3) === 1 && (stag & 7) === 0) {
            const [refId] = readVarint(sub, sp);
            return refId;
          }
        }
      }
    } else if (w === 1) {
      p += 8;
    } else if (w === 5) {
      p += 4;
    }
  }
  return null;
}

// Extracts TableDataList entries (Type 6005)
export function extractTableDataList(data: Uint8Array): Map<number, { stringVal?: string; storageRefId?: number }> {
  const map = new Map<number, { stringVal?: string; storageRefId?: number }>();
  let p = 0;
  while (p < data.length) {
    const [tag, np] = readVarint(data, p);
    p = np;
    const f = tag >> 3, w = tag & 7;
    if (w === 2 && f === 3) {
      const [len, np2] = readVarint(data, p);
      p = np2;
      const entryBuf = data.subarray(p, p + len);
      p += len;

      let ep = 0;
      let key: number | null = null;
      let strVal: string | null = null;
      let refId: number | null = null;
      while (ep < entryBuf.length) {
        const [etag, nep] = readVarint(entryBuf, ep);
        ep = nep;
        const ef = etag >> 3, ew = etag & 7;
        if (ew === 0) {
          const [ev, nep2] = readVarint(entryBuf, ep);
          ep = nep2;
          if (ef === 1) key = ev;
        } else if (ew === 2) {
          const [elen, nep2] = readVarint(entryBuf, ep);
          ep = nep2;
          const sub = entryBuf.subarray(ep, ep + elen);
          ep += elen;
          if (ef === 3) {
            try {
              strVal = textDecoder.decode(sub).trim();
            } catch {}
          } else if (ef === 9) {
            let rp = 0;
            while (rp < sub.length) {
              const [rtag, nrp] = readVarint(sub, rp);
              rp = nrp;
              const rf = rtag >> 3, rw = rtag & 7;
              if (rw === 0 && rf === 1) {
                const [rv, nrp2] = readVarint(sub, rp);
                rp = nrp2;
                refId = rv;
              }
            }
          }
        } else if (ew === 1) {
          ep += 8;
        } else if (ew === 5) {
          ep += 4;
        }
      }
      if (key !== null) {
        map.set(key, { stringVal: strVal || undefined, storageRefId: refId || undefined });
      }
    } else if (w === 0) {
      const [, np2] = readVarint(data, p);
      p = np2;
    } else if (w === 2) {
      const [len, np2] = readVarint(data, p);
      p = np2 + len;
    } else if (w === 1) {
      p += 8;
    } else if (w === 5) {
      p += 4;
    }
  }
  return map;
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
  'FRANK',
]);

function isCoachName(str: string): boolean {
  const upper = str.trim().toUpperCase();
  if (
    upper === 'ALLENATORE' ||
    upper === 'FOCUS' ||
    upper === 'CONTEGGIO E CONCLUSIONI' ||
    upper === 'CONTEGGIO' ||
    upper === 'CONCLUSIONI'
  ) {
    return false;
  }
  if (KNOWN_COACHES.has(upper)) return true;
  if (
    str.trim().split(/\s+/).length <= 2 &&
    str.trim().length <= 25 &&
    !/[;\.!\?0-9]/.test(str) &&
    /^[A-Za-zÁÉÍÓÚáéíóúÀÈÌÒÙàèìòù\s]+$/.test(str.trim())
  ) {
    return true;
  }
  return false;
}

/**
 * Main parser: accepts File, ArrayBuffer or Uint8Array and returns structured, translated and classified focus data
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

  const storageTexts = new Map<number, string>();
  const storagePointers = new Map<number, number>();
  const allDataLists: { name: string; dl: Map<number, { stringVal?: string; storageRefId?: number }> }[] = [];
  let matchTitle = '';
  let dateDetected = '';

  for (const [filename, file] of Object.entries(zipData.files)) {
    if (file.dir) continue;
    if (filename.endsWith('.iwa')) {
      const bytes = await file.async('uint8array');
      const decompressed = unpackIwaChunks(bytes);
      const archives = parseIwaArchives(decompressed);

      for (const a of archives) {
        if (a.type === 2001) {
          const txt = extractStorageText(a.data);
          if (txt) storageTexts.set(a.id, txt);
        } else if (a.type === 6218) {
          const targetId = extractStoragePointer(a.data);
          if (targetId) storagePointers.set(a.id, targetId);
        } else if (a.type === 6005) {
          const dl = extractTableDataList(a.data);
          if (dl.size > 0) allDataLists.push({ name: filename, dl });
        }
      }

      if (filename.includes('Slide')) {
        try {
          const rawStr = textDecoder.decode(decompressed);
          const lines = rawStr.match(/[\w\s\.,;:!?\'\(\)\/\-\+%=#@€\$áéíóúÁÉÍÓÚñÑüÜàèìòùÀÈÌÒÙ\u201c\u201d\u2026]{4,}/g) || [];
          for (const l of lines) {
            const clean = l.trim();
            if (clean.length > 3 && !clean.startsWith('$') && !clean.startsWith('Index/')) {
              if (
                clean.includes(' - ') ||
                clean.toLowerCase().includes(' vs ') ||
                clean.toLowerCase().includes('piano gara') ||
                clean.toLowerCase().includes('milan')
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

  // Resolve storage references in DataLists
  const rawTables: { name: string; entries: Map<number, string> }[] = [];
  for (const item of allDataLists) {
    const resolved = new Map<number, string>();
    for (const [k, v] of item.dl.entries()) {
      if (v.stringVal) resolved.set(k, v.stringVal);
      if (v.storageRefId) {
        let target = v.storageRefId;
        if (storagePointers.has(target)) target = storagePointers.get(target)!;
        if (storageTexts.has(target)) resolved.set(k, storageTexts.get(target)!);
      }
    }
    if (resolved.size > 0) {
      rawTables.push({ name: item.name, entries: resolved });
    }
  }

  // Find coach list table
  let mainTable: Map<number, string> | null = null;
  for (const t of rawTables) {
    const vals = Array.from(t.entries.values()).map((v) => v.toUpperCase());
    if (vals.includes('ALLENATORE') && vals.includes('FOCUS')) {
      mainTable = t.entries;
      break;
    }
  }

  if (!mainTable) {
    for (const t of rawTables) {
      const vals = Array.from(t.entries.values()).map((v) => v.toUpperCase());
      const coachMatches = vals.filter((v) => isCoachName(v));
      if (coachMatches.length >= 2) {
        mainTable = t.entries;
        break;
      }
    }
  }

  const coaches: string[] = [];
  let focusTexts: string[] = [];

  if (mainTable) {
    const values = Array.from(mainTable.entries());
    const coachesInTable: { key: number; name: string }[] = [];
    const textsInTable: { key: number; text: string }[] = [];

    for (const [k, v] of values) {
      const trimmed = v.trim();
      const upper = trimmed.toUpperCase();
      if (
        upper === 'ALLENATORE' ||
        upper === 'FOCUS' ||
        upper === 'CONTEGGIO E CONCLUSIONI' ||
        upper === 'CONTEGGIO' ||
        upper === 'CONCLUSIONI'
      ) {
        continue;
      }
      if (isCoachName(trimmed)) {
        coachesInTable.push({ key: k, name: trimmed });
      } else if (trimmed.length > 3) {
        textsInTable.push({ key: k, text: trimmed });
      }
    }

    coachesInTable.forEach((c) => coaches.push(c.name));

    if (textsInTable.length >= coachesInTable.length) {
      // Texts are in the same table
      focusTexts = textsInTable.map((t) => t.text);
    } else {
      // Texts are partially or fully in companion DataLists (Storage DataLists)
      const otherTexts: string[] = [];
      textsInTable.forEach((t) => otherTexts.push(t.text));

      for (const t of rawTables) {
        if (t.entries === mainTable) continue;
        const vals = Array.from(t.entries.values())
          .map((v) => v.trim())
          .filter((v) => {
            const upper = v.toUpperCase();
            return (
              !isCoachName(v) &&
              upper !== 'ALLENATORE' &&
              upper !== 'FOCUS' &&
              upper !== 'CONTEGGIO E CONCLUSIONI' &&
              upper !== 'CONTEGGIO' &&
              upper !== 'CONCLUSIONI' &&
              v.length > 3
            );
          });
        if (vals.length > 0) {
          otherTexts.push(...vals);
        }
      }
      focusTexts = otherTexts;
    }
  }

  const focusItems: ExtractedFocusItem[] = [];

  for (let i = 0; i < coaches.length; i++) {
    const coachName = coaches[i];
    const text = focusTexts[i];

    if (text && text.trim()) {
      const sentences = splitFocusSentences(text);
      for (const sentence of sentences) {
        const translated = await translateTacticalText(sentence, targetLang);
        const classification = classifyFocus(sentence, coachName);

        focusItems.push({
          id: `focus_${coachName}_${Math.random().toString(36).substr(2, 7)}`,
          coach: coachName,
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
