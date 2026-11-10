import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Player, MeetingDB } from '../types';
import { createMeeting, addMeetingPlayer } from '../../services/meetings';

interface MeetingsExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  existingMeetings: MeetingDB[];
  existingMeetingPlayersMap: Record<string, string[]>;
  onImportComplete: () => void;
}

interface ParsedMeetingRow {
  sheetName: string;
  playerId: string;
  playerName: string;
  date: string;
  time: string;
  location: string;
  objective: string;
  development: string;
  observations: string;
  coach: string;
  isDuplicate: boolean;
}

function parseExcelDate(raw: any): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  let result = '';

  if (typeof raw === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const targetDate = new Date(excelEpoch.getTime() + raw * 86400000);
    result = targetDate.toISOString().split('T')[0];
  } else {
    const str = String(raw).trim();
    const m = str.match(/(\d{1,2})[\s\/\-\.]+(\d{1,2})[\s\/\-\.]+(\d{2,4})/);
    if (m) {
      let day = m[1].padStart(2, '0');
      let month = m[2].padStart(2, '0');
      let year = m[3];
      if (year.length === 2) year = '20' + year;
      result = `${year}-${month}-${day}`;
    } else {
      const months: Record<string, string> = {
        gennaio: '01', febbraio: '02', marzo: '03', aprile: '04',
        maggio: '05', giugno: '06', luglio: '07', agosto: '08',
        settembre: '09', ottobre: '10', novembre: '11', dicembre: '12',
        enero: '01', febrero: '02', marzo_: '03', abril: '04',
        mayo: '05', junio: '06', julio: '07', septiembre: '09',
        octubre: '10', noviembre: '11', diciembre: '12'
      };
      const lower = str.toLowerCase();
      let matched = false;
      for (const [mName, mNum] of Object.entries(months)) {
        if (lower.includes(mName.replace('_', ''))) {
          const dayMatch = lower.match(/(\d{1,2})/);
          const day = dayMatch ? dayMatch[1].padStart(2, '0') : '01';
          result = `2026-${mNum}-${day}`;
          matched = true;
          break;
        }
      }
      if (!matched) {
        result = new Date().toISOString().split('T')[0];
      }
    }
  }

  // Corregir incondicionalmente cualquier fecha que venga como 2027 y pasarla a 2026
  if (result.startsWith('2027')) {
    result = '2026' + result.slice(4);
  }

  return result;
}

export default function MeetingsExcelImportModal({
  isOpen,
  onClose,
  players,
  existingMeetings,
  existingMeetingPlayersMap,
  onImportComplete,
}: MeetingsExcelImportModalProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedMeetingRow[]>([]);
  const [unmatchedSheets, setUnmatchedSheets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Normalization helper for player name matching
  const matchPlayer = (sheetName: string): Player | undefined => {
    const s = sheetName.trim().toLowerCase();
    // 1. Direct match on footballName or parts of name
    return players.find((p) => {
      const fn = (p.name || '').toLowerCase();
      const foot = (p.footballName || '').toLowerCase();
      const parts = fn.split(/\s+/);
      return (
        parts.some((part) => part.length >= 3 && (part === s || s.includes(part) || part.includes(s))) ||
        (foot && (foot === s || s.includes(foot) || foot.includes(s)))
      );
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg(null);
    setLoading(true);
    setSuccessCount(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      const parsed: ParsedMeetingRow[] = [];
      const unmatched: string[] = [];

      // Build quick lookup for existing meetings: key = `${playerId}_${date}_${normObjective}`
      const existingKeySet = new Set<string>();
      existingMeetings.forEach((m) => {
        const pIds = existingMeetingPlayersMap[m.id] || [];
        const normObj = (m.objective || '').trim().toLowerCase().slice(0, 30);
        pIds.forEach((pid) => {
          existingKeySet.add(`${pid}_${m.date}_${normObj}`);
        });
      });

      // Ignore month sheets or group sheets
      const ignoreSheets = new Set([
        'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
        'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
        'riunioni di gruppo', 'gruppo', 'riassunto', 'foglio1', 'sheet1'
      ]);

      workbook.SheetNames.forEach((sheetName: string) => {
        const cleanName = sheetName.trim();
        if (ignoreSheets.has(cleanName.toLowerCase())) return;

        const player = matchPlayer(cleanName);
        if (!player) {
          unmatched.push(cleanName);
          return;
        }

        const ws = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        // Rows starting around row 5
        for (let r = 4; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          // Columns: [0: null, 1: INTERVENTI, 2: LUOGO, 3: DATA, 4: CONTENUTO, 5: OSSERVAZIONI]
          const rawInterv = row[1];
          const rawLuogo = row[2];
          const rawDate = row[3];
          const rawCont = row[4];
          const rawOss = row[5];

          const intervStr = rawInterv ? String(rawInterv).trim() : '';
          if (!intervStr && !rawCont && !rawOss && !rawDate) continue;
          if (intervStr.toUpperCase() === 'INTERVENTI' || intervStr.toUpperCase() === 'INTERVENTO') continue;

          const dateStr = parseExcelDate(rawDate);
          const locationStr = rawLuogo ? String(rawLuogo).trim() : '';
          const objectiveStr = intervStr;

          const developmentHtml = rawCont && String(rawCont).trim() ? `<p>${String(rawCont).trim()}</p>` : '';
          const observationsHtml = rawOss && String(rawOss).trim() ? `<p>${String(rawOss).trim()}</p>` : '';

          const normObj = objectiveStr.toLowerCase().slice(0, 30);
          const checkKey = `${player.id}_${dateStr}_${normObj}`;
          const isDuplicate = existingKeySet.has(checkKey);

          parsed.push({
            sheetName: cleanName,
            playerId: player.id,
            playerName: player.name,
            date: dateStr,
            time: '10:00',
            location: locationStr || 'Sala video',
            objective: objectiveStr ? `<p>${objectiveStr}</p>` : '<p>Coloquio individual</p>',
            development: developmentHtml || (observationsHtml ? '' : `<p>${objectiveStr}</p>`),
            coach: 'Staff Milan Futuro',
            isDuplicate,
            observations: observationsHtml,
          });
        }
      });

      setParsedRows(parsed);
      setUnmatchedSheets(unmatched);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar el archivo Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const toImport = parsedRows.filter((r) => !r.isDuplicate);
    if (toImport.length === 0) {
      alert(t('meetingsTab.noNewMeetingsToImport', 'No hay reuniones nuevas para importar (todas ya existen).'));
      return;
    }

    setImporting(true);
    setImportProgress(0);
    let imported = 0;

    try {
      for (let i = 0; i < toImport.length; i++) {
        const item = toImport[i];
        const newMeeting = await createMeeting({
          date: item.date,
          time: item.time,
          location: item.location,
          type: 'individual',
          objective: item.objective,
          development: item.development,
          agreements: item.observations,
          created_by: item.coach,
        });

        if (newMeeting && newMeeting.id) {
          await addMeetingPlayer(newMeeting.id, item.playerId);
        }

        imported++;
        setImportProgress(Math.round(((i + 1) / toImport.length) * 100));
      }

      setSuccessCount(imported);
      onImportComplete();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error importando reuniones a la base de datos');
    } finally {
      setImporting(false);
    }
  };

  const newMeetingsCount = parsedRows.filter((r) => !r.isDuplicate).length;
  const duplicateMeetingsCount = parsedRows.filter((r) => r.isDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">
                {t('meetingsTab.importExcelTitle', 'Importar Registro de Coloquios (Excel)')}
              </h3>
              <p className="text-xs text-gray-500">
                {t('meetingsTab.importExcelSubtitle', 'Carga las reuniones individuales de cada pestaña de jugador')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5">
          {/* File selector dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-blue-50/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="mx-auto text-blue-500 mb-2" size={32} />
            <p className="text-sm font-bold text-gray-700">
              {file ? file.name : t('meetingsTab.dropExcelHere', 'Haz clic o arrastra aquí "Registro colloqui individuali.xlsx"')}
            </p>
            <p className="text-xs text-gray-400 mt-1">{t('meetingsTab.supportedFormats')}</p>
          </div>

          {loading && (
            <div className="py-8 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-blue-500" size={18} />
              {t('meetingsTab.readingExcel', 'Leyendo y analizando pestañas de jugadores...')}
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-start gap-2 border border-red-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm flex items-start gap-2 border border-emerald-200">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-bold">
                  {t('meetingsTab.importSuccess', { count: successCount })}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Las reuniones ya están disponibles en el listado y se adaptarán automáticamente a cualquier idioma.
                </p>
              </div>
            </div>
          )}

          {parsedRows.length > 0 && successCount === null && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-center">
                  <div className="text-xl font-black text-blue-700">{parsedRows.length}</div>
                  <div className="text-[11px] font-medium text-blue-600 uppercase">
                    {t('meetingsTab.totalDetected', 'Detectadas')}
                  </div>
                </div>
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-center">
                  <div className="text-xl font-black text-emerald-700">{newMeetingsCount}</div>
                  <div className="text-[11px] font-medium text-emerald-600 uppercase">
                    {t('meetingsTab.toImport', 'Nuevas a Importar')}
                  </div>
                </div>
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-center">
                  <div className="text-xl font-black text-amber-700">{duplicateMeetingsCount}</div>
                  <div className="text-[11px] font-medium text-amber-600 uppercase">
                    {t('meetingsTab.alreadyExisting', 'Ya Existentes')}
                  </div>
                </div>
              </div>

              {unmatchedSheets.length > 0 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
                  <span className="font-bold text-gray-700">{t('meetingsTab.unmatchedTabs')}</span>{' '}
                  {unmatchedSheets.join(', ')}
                </div>
              )}

              {/* Sample preview list */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {t('meetingsTab.previewSample', 'Vista previa de reuniones a incorporar')}
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 border border-gray-100 rounded-xl p-2 bg-gray-50/30">
                  {parsedRows.slice(0, 10).map((r, i) => (
                    <div
                      key={i}
                      className="bg-white p-2.5 rounded-lg border border-gray-100 text-xs flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-gray-900">{r.playerName}</span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-gray-500">{r.date}</span>
                        <div
                          className="text-gray-600 truncate mt-0.5"
                          dangerouslySetInnerHTML={{ __html: r.objective }}
                        />
                      </div>
                      <div>
                        {r.isDuplicate ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Existente
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Nueva
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {parsedRows.length > 10 && (
                    <p className="text-[11px] text-center text-gray-400 pt-1">
                      ... y {parsedRows.length - 10} reuniones más
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-600">
                <span>{t('meetingsTab.importingStatus', 'Importando a la base de datos...')}</span>
                <span>{importProgress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={importing}
            className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            {successCount !== null ? t('common.close', 'Cerrar') : t('common.cancel', 'Cancelar')}
          </button>

          {successCount === null && (
            <button
              onClick={handleImport}
              disabled={importing || loading || newMeetingsCount === 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  {t('meetingsTab.importing', 'Importando...')}
                </>
              ) : (
                t('meetingsTab.confirmImportBtn', { count: newMeetingsCount })
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

