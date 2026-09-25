import { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  Users, 
  Award, 
  Sparkles, 
  Loader2, 
  PlusCircle, 
  Link as LinkIcon,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { PaniniMatchReport } from '../../../types/paniniReport';
import { extractPaniniReportFromFile, findMatchForReport, sameOpponent, splitTeams, syncPaniniReportWithPlayersAndMatch } from '../../../services/paniniReports';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentMatchId?: string;
  onImportSuccess?: (matchId: string) => void;
}

export default function PaniniImportModal({
  isOpen,
  onClose,
  currentMatchId,
  onImportSuccess,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedReport, setExtractedReport] = useState<PaniniMatchReport | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  
  // Match selection state
  const [matchesList, setMatchesList] = useState<any[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(currentMatchId || 'auto');

  // Players analysis state
  const [dbPlayers, setDbPlayers] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    matchId: string;
    playersCreated: number;
    playersLinked: number;
    warnings: string[];
    message?: string;
  } | null>(null);

  // Load existing matches and players for association
  useEffect(() => {
    if (isOpen) {
      // Cada apertura empieza de cero
      setExtractedReport(null);
      setSourceFile(null);
      setExtractError(null);
      setSyncResult(null);
      setSelectedMatchId(currentMatchId || 'auto');
      loadData();
    }
  }, [isOpen, currentMatchId]);

  const loadData = async () => {
    try {
      const { data: mData } = await supabase
        .from('matches')
        .select('id, date, opponent, competition, is_home, result_home, result_away')
        .order('date', { ascending: false });
      setMatchesList(mData || []);

      const { data: pData } = await supabase.from('players').select('*');
      setDbPlayers(pData || []);
    } catch (err) {
      console.error('Error cargando partidos y jugadores:', err);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setIsProcessing(true);
    setSyncResult(null);
    setExtractError(null);

    try {
      const report = await extractPaniniReportFromFile(selected);
      setExtractedReport(report);
      setSourceFile(selected.name.toLowerCase().endsWith('.pdf') ? selected : null);

      // Abierto desde un partido: se propone ese partido (y se avisa si no coincide).
      // Si no, se busca por fecha + rival.
      if (currentMatchId) {
        setSelectedMatchId(currentMatchId);
      } else {
        const { match } = findMatchForReport(report, matchesList);
        setSelectedMatchId(match ? match.id : 'new');
      }
    } catch (err: any) {
      setExtractError(err.message || 'Archivo no reconocido');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleConfirmSync = async () => {
    if (!extractedReport) return;
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const targetId = selectedMatchId === 'new' || selectedMatchId === 'auto' ? undefined : selectedMatchId;
      const res = await syncPaniniReportWithPlayersAndMatch(extractedReport, targetId, sourceFile ?? undefined);

      if (res.success) {
        setSyncResult({
          success: true,
          matchId: res.matchId,
          playersCreated: res.playersCreated,
          playersLinked: res.playersLinked,
          warnings: res.warnings,
        });
        if (onImportSuccess) {
          onImportSuccess(res.matchId);
        }
      } else {
        setSyncResult({
          success: false,
          matchId: '',
          playersCreated: 0,
          playersLinked: 0,
          warnings: res.warnings,
          message: res.error,
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        matchId: '',
        playersCreated: 0,
        playersLinked: 0,
        warnings: [],
        message: err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Analyze which players are matched vs to be created
  const ourTeam = extractedReport ? splitTeams(extractedReport).our : null;
  const rivalName = extractedReport ? splitTeams(extractedReport).rival.nombre : '';
  const extractionWarnings = extractedReport?.fuente?.avisos ?? [];

  // ¿El partido elegido corresponde al informe?
  const selectedMatch = matchesList.find((m) => m.id === selectedMatchId);
  const mismatch =
    extractedReport && selectedMatch
      ? [
          selectedMatch.date !== extractedReport.fecha && `la fecha del partido (${selectedMatch.date}) no coincide con la del informe (${extractedReport.fecha})`,
          selectedMatch.opponent && !sameOpponent(selectedMatch.opponent, rivalName) && `el rival del partido (${selectedMatch.opponent}) no coincide con el del informe (${rivalName})`,
        ].filter(Boolean) as string[]
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 dark:border-white/10 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Award size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Importador Panini Digital Match Analysis
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sincroniza el partido, campogramas y ficha a jugadores automáticamente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step 1: File Upload */}
        {!extractedReport && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group text-center">
              <FileText className="text-indigo-400 group-hover:text-indigo-600 transition-colors mb-3" size={44} />
              <span className="font-extrabold text-sm text-indigo-700 dark:text-indigo-300">
                Selecciona o arrastra el archivo del partido
              </span>
              <span className="text-xs text-gray-400 mt-1">
                PDF original de Panini Digital Match Analysis (o un .json exportado)
              </span>
              <input
                type="file"
                accept=".pdf,.json"
                className="hidden"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </label>

            {isProcessing && (
              <div className="flex items-center justify-center gap-3 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-2xl">
                <Loader2 size={20} className="animate-spin" />
                <span>Extrayendo campogramas, métricas y jugadores del informe...</span>
              </div>
            )}

            {extractError && (
              <div className="flex items-start gap-2 text-sm font-bold text-red-700 bg-red-50 border border-red-200 p-4 rounded-2xl">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span>No se pudo leer el informe: {extractError}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Extraction Preview & Association Controls */}
        {extractedReport && !syncResult?.success && (
          <div className="space-y-6">
            
            {/* Extracted Match Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="bg-amber-400 text-black px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                  {extractedReport.competicion}
                </span>
                <span className="text-gray-300 font-bold">📅 {extractedReport.fecha}</span>
              </div>
              <div className="flex items-center justify-between font-black text-lg">
                <span className="text-red-400">{extractedReport.equipo_local.nombre} ({extractedReport.equipo_local.goles})</span>
                <span className="text-gray-400 text-sm">VS</span>
                <span className="text-blue-400">{extractedReport.equipo_visitante.nombre} ({extractedReport.equipo_visitante.goles})</span>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-4">
                <span>📍 {extractedReport.estadio}</span>
                <span>⏱️ {extractedReport.tiempo_efectivo}</span>
              </div>
            </div>

            {extractionWarnings.length > 0 && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                <p className="font-extrabold flex items-center gap-1.5"><AlertTriangle size={14} /> Revisa estos puntos de la extracción:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {extractionWarnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>
            )}

            {/* Match Association Selector */}
            <div className="bg-gray-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-gray-200 dark:border-white/10 space-y-3">
              <label className="font-extrabold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wider block flex items-center gap-1.5">
                <LinkIcon size={14} className="text-indigo-600" /> Asociación de Partido en el Sistema:
              </label>

              <select
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="w-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="new">➕ Crear un nuevo partido con los datos del informe ({extractedReport.fecha})</option>
                <optgroup label="Asociar a un partido existente:">
                  {matchesList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.date} - vs {m.opponent || 'Rival'} ({m.competition || 'Oficial'})
                    </option>
                  ))}
                </optgroup>
              </select>

              {mismatch.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>¡Ojo! {mismatch.join(' y ')}. Comprueba que es el partido correcto antes de importar.</span>
                </div>
              )}
            </div>

            {/* Player Roster & Auto-Creation Preview */}
            {ourTeam && (
              <div className="bg-gray-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-gray-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-600" /> Sincronización de Jugadores ({ourTeam.nombre})
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {ourTeam.alineacion.length} jugadores detectados
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {ourTeam.alineacion.map((p) => {
                    const foundInDb = dbPlayers.find(
                      (dp) =>
                        (dp.kit_number && Number(dp.kit_number) === p.dorsal) ||
                        `${dp.first_name} ${dp.last_name}`.toLowerCase().includes(p.nombre.toLowerCase().split(' ').pop() || '')
                    );

                    return (
                      <div
                        key={p.dorsal}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-neutral-800 border border-gray-100 dark:border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-black text-[10px] flex items-center justify-center">
                            {p.dorsal}
                          </span>
                          <div>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{p.nombre}</span>
                            <span className="text-[10px] text-gray-400 ml-1.5">({p.posicion_desc || p.posicion})</span>
                          </div>
                        </div>

                        {foundInDb ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                            <CheckCircle2 size={11} /> Vinculado a BD
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold text-[10px] flex items-center gap-1">
                            <PlusCircle size={11} /> Se creará en BD (sin foto)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setExtractedReport(null); setSourceFile(null); }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100"
              >
                Cambiar Archivo
              </button>
              <button
                type="button"
                onClick={handleConfirmSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black shadow-lg transition-all disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Guardando y Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Confirmar e Importar Informe</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {syncResult && !syncResult.success && (
          <div className="flex items-start gap-2 text-sm font-bold text-red-700 bg-red-50 border border-red-200 p-4 rounded-2xl">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>No se pudo guardar el informe: {syncResult.message}</span>
          </div>
        )}

        {/* Step 3: Success Confirmation */}
        {syncResult?.success && (
          <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-emerald-900 dark:text-emerald-200">
                ¡Informe Panini Importado con Éxito!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 max-w-md mx-auto">
                El partido ha sido guardado con todos sus campogramas, redes de pases, remates y estadísticas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs">
              <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                <span className="text-gray-400 block text-[10px]">Jugadores Creados</span>
                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-lg">
                  {syncResult.playersCreated}
                </span>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                <span className="text-gray-400 block text-[10px]">Jugadores Vinculados</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-lg">
                  {syncResult.playersLinked}
                </span>
              </div>
            </div>

            {syncResult.warnings.length > 0 && (
              <ul className="text-left text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 list-disc pl-6 space-y-0.5 max-w-md mx-auto">
                {syncResult.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all"
            >
              Ver Informe Completo
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
