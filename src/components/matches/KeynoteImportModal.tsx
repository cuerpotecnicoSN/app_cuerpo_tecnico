import { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Sparkles,
  Check,
  Trash2,
  Plus,
  AlertCircle,
  Activity,
  Shield,
  Flag,
  Users,
  UsersRound,
  User,
  ShieldAlert,
  Globe,
  Brain,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import type { MatchDB, MatchFocus, FocusDetails } from '../types';
import { parseKeynoteFile, type ParsedKeynoteData, type ExtractedFocusItem } from '../../utils/keynoteParser';
import { createMatchFocus } from '../../services/matches';
import { focusLearningService } from '../../services/focusLearningService';
import { translateTacticalText } from '../../utils/focusTranslator';
import { matchLabel } from './UpcomingMatchPicker';

interface Props {
  match: MatchDB;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PHASES = [
  { key: 'Ofensivo', label: 'Ofensivo', icon: Activity, bg: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', active: 'bg-blue-600 text-white shadow-sm' },
  { key: 'Defensivo', label: 'Defensivo', icon: Shield, bg: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100', active: 'bg-red-600 text-white shadow-sm' },
  { key: 'ABP', label: 'ABP', icon: Flag, bg: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', active: 'bg-amber-600 text-white shadow-sm' },
] as const;

const FOCUS_TYPES = [
  { key: 'Colectivo', label: 'Colectivo', icon: Users, bg: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', active: 'bg-blue-600 text-white' },
  { key: 'Grupal', label: 'Grupal', icon: UsersRound, bg: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100', active: 'bg-teal-600 text-white' },
  { key: 'Individual', label: 'Individual', icon: User, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', active: 'bg-emerald-600 text-white' },
  { key: 'Rival', label: 'Rival', icon: ShieldAlert, bg: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100', active: 'bg-rose-600 text-white' },
] as const;

export default function KeynoteImportModal({ match, isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedKeynoteData | null>(null);
  const [items, setItems] = useState<ExtractedFocusItem[]>([]);
  const [targetLang, setTargetLang] = useState<'es' | 'en' | 'it'>('es');
  const [saveToLearning, setSaveToLearning] = useState(true);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setParsedData(null);
      setItems([]);
      setErrorMessage(null);
      setParsing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileProcess = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.key')) {
      setErrorMessage('Por favor, selecciona un archivo de presentación de Keynote (.key)');
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);
    setParsing(true);

    try {
      const data = await parseKeynoteFile(selectedFile, selectedFile.name, targetLang);
      setParsedData(data);
      setItems(data.focusItems);

      if (data.focusItems.length === 0) {
        setErrorMessage('No se encontraron tablas de focos/entrenadores en este archivo Keynote. Comprueba el formato de la presentación.');
      }
    } catch (err: any) {
      console.error('Error parsing Keynote file:', err);
      setErrorMessage(`Error al leer el archivo Keynote: ${err.message || 'Estructura no compatible'}`);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleLanguageChange = async (lang: 'es' | 'en' | 'it') => {
    setTargetLang(lang);
    if (items.length > 0) {
      setParsing(true);
      const updated = await Promise.all(
        items.map(async (item) => {
          const translated = await translateTacticalText(item.rawItalian, lang);
          return { ...item, translatedText: translated };
        })
      );
      setItems(updated);
      setParsing(false);
    }
  };

  const updateItem = (id: string, updates: Partial<ExtractedFocusItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addNewItem = () => {
    const newItem: ExtractedFocusItem = {
      id: `custom_${Math.random().toString(36).substr(2, 7)}`,
      coach: items[0]?.coach || 'Míster',
      rawItalian: '',
      translatedText: '',
      suggestedPhase: 'Ofensivo',
      suggestedType: 'Colectivo',
      confidence: 1.0,
      selected: true,
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const toggleSelectAll = () => {
    const allSelected = items.every((i) => i.selected);
    setItems((prev) => prev.map((i) => ({ ...i, selected: !allSelected })));
  };

  const handleImport = async () => {
    const selectedItems = items.filter((i) => i.selected && i.translatedText.trim());
    if (selectedItems.length === 0) {
      setErrorMessage('Selecciona al menos un foco válido para importar.');
      return;
    }

    setImporting(true);
    setErrorMessage(null);

    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];

        const details: FocusDetails = {
          text: item.translatedText.trim(),
          focusType: item.suggestedType,
          phase: item.suggestedPhase,
          phases: [item.suggestedPhase],
          assignedTo: item.coach.trim() || 'General',
        };

        const newFocus: Omit<MatchFocus, 'id'> = {
          match_id: match.id,
          title: item.translatedText.trim(),
          description: JSON.stringify(details),
          order: i + 1,
        };

        await createMatchFocus(newFocus);

        // Record in learning service if enabled
        if (saveToLearning && item.rawItalian) {
          focusLearningService.recordLearning({
            rawText: item.rawItalian,
            coach: item.coach,
            phase: item.suggestedPhase,
            focusType: item.suggestedType,
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error importing focuses:', err);
      setErrorMessage(`Error al guardar los focos: ${err.message || 'Error de conexión'}`);
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight">Importar Focos desde Keynote (.key)</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Auto-traducción & Clasificación IA
                </span>
              </div>
              <p className="text-xs text-gray-300 font-bold mt-0.5">
                Partido: <span className="text-white font-extrabold">{matchLabel(match)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Dropzone & Upload section */}
          {!parsedData || items.length === 0 ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-3 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                  : 'border-gray-200 hover:border-indigo-400 bg-gray-50/50 hover:bg-indigo-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".key"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />

              {parsing ? (
                <div className="py-6 flex flex-col items-center">
                  <Loader2 size={40} className="text-indigo-600 animate-spin mb-3" />
                  <p className="text-base font-black text-gray-800">Analizando archivo Keynote y traduciendo focos...</p>
                  <p className="text-xs font-bold text-gray-400 mt-1">Descomprimiendo .iwa y clasificando con IA táctica</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <UploadCloud size={36} />
                  </div>

                  <h4 className="text-lg font-black text-gray-800">
                    Arrastra aquí tu archivo <span className="text-indigo-600 font-black">.key</span> de Keynote
                  </h4>
                  <p className="text-sm font-bold text-gray-500 mt-1">
                    o haz clic para explorar en tu Mac (ej. <i>Giornata 4_Villa Valle_ACMilan Futuro.key</i>)
                  </p>
                </>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white text-gray-700 border border-gray-200 shadow-xs">
                  <Brain size={14} className="text-indigo-600" /> Detección de entrenadores y focos
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white text-gray-700 border border-gray-200 shadow-xs">
                  <Globe size={14} className="text-emerald-600" /> Traducción del italiano
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white text-gray-700 border border-gray-200 shadow-xs">
                  <Activity size={14} className="text-blue-600" /> Auto-clasificación Ofensivo / Defensivo / ABP
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* File details bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 truncate max-w-md">{file?.name}</p>
                    <p className="text-xs text-gray-500 font-bold">
                      {parsedData.matchTitle && <span>Partido detectado: <b className="text-gray-700">{parsedData.matchTitle}</b> · </span>}
                      <span>{items.length} focos encontrados</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Language Selector */}
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
                    <Globe size={14} className="text-gray-400 ml-1.5" />
                    <span className="text-xs font-extrabold text-gray-600 pr-1">Idioma destino:</span>
                    {(['es', 'en', 'it'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => handleLanguageChange(l)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                          targetLang === l ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* Reset file */}
                  <button
                    onClick={() => {
                      setParsedData(null);
                      setItems([]);
                      setFile(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    <RotateCcw size={14} /> Cambiar archivo
                  </button>
                </div>
              </div>

              {/* Focuses list / Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {items.every((i) => i.selected) ? 'Desmarcar todos' : 'Seleccionar todos'}
                    </button>
                    <span className="text-xs font-bold text-gray-400">|</span>
                    <span className="text-xs font-bold text-gray-500">
                      {selectedCount} de {items.length} focos seleccionados
                    </span>
                  </div>

                  <button
                    onClick={addNewItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                  >
                    <Plus size={14} /> Añadir foco manual
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 bg-white shadow-xs">
                  {items.map((item, idx) => {
                    const isSelected = item.selected;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 transition-colors flex flex-col md:flex-row items-start md:items-center gap-4 ${
                          isSelected ? 'bg-white' : 'bg-gray-50/60 opacity-60'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="flex items-center gap-3 shrink-0">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => updateItem(item.id, { selected: e.target.checked })}
                            className="w-5 h-5 rounded-lg text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-xs font-extrabold text-gray-400 w-5">#{idx + 1}</span>
                        </div>

                        {/* Coach */}
                        <div className="w-full md:w-36 shrink-0">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                            Entrenador
                          </label>
                          <input
                            type="text"
                            value={item.coach}
                            onChange={(e) => updateItem(item.id, { coach: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs font-extrabold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Nombre del entrenador"
                          />
                        </div>

                        {/* Focus description (Translated + Original Italian) */}
                        <div className="flex-1 min-w-0 w-full space-y-1">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                            Foco Traducido ({targetLang.toUpperCase()})
                          </label>
                          <textarea
                            rows={2}
                            value={item.translatedText}
                            onChange={(e) => updateItem(item.id, { translatedText: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs font-bold text-gray-900 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-y"
                            placeholder="Descripción del foco..."
                          />
                          {item.rawItalian && item.rawItalian !== item.translatedText && (
                            <p className="text-[11px] text-gray-400 italic truncate font-medium">
                              <span className="font-bold text-gray-500 not-italic">IT:</span> «{item.rawItalian}»
                            </p>
                          )}
                        </div>

                        {/* Phase Selector */}
                        <div className="shrink-0 w-full md:w-auto">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                            Fase
                          </label>
                          <div className="flex items-center gap-1">
                            {PHASES.map((p) => {
                              const active = item.suggestedPhase === p.key;
                              return (
                                <button
                                  key={p.key}
                                  type="button"
                                  onClick={() => updateItem(item.id, { suggestedPhase: p.key })}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1 ${
                                    active ? p.active : p.bg
                                  }`}
                                >
                                  <p.icon size={12} />
                                  {p.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Type Selector */}
                        <div className="shrink-0 w-full md:w-auto">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                            Tipo
                          </label>
                          <select
                            value={item.suggestedType}
                            onChange={(e) => updateItem(item.id, { suggestedType: e.target.value as any })}
                            className="px-2.5 py-1.5 text-xs font-extrabold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          >
                            {FOCUS_TYPES.map((t) => (
                              <option key={t.key} value={t.key}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Delete action */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          title="Eliminar este foco"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {errorMessage && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold animate-shake">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="learningCheckbox"
              checked={saveToLearning}
              onChange={(e) => setSaveToLearning(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="learningCheckbox" className="text-xs font-bold text-gray-700 cursor-pointer select-none flex items-center gap-1.5">
              <Brain size={15} className="text-indigo-600" /> Recordar mis correcciones (aprendizaje táctico activo)
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>

            {items.length > 0 && (
              <button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
                className="px-6 py-2.5 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando focos...
                  </>
                ) : (
                  <>
                    <Check size={16} strokeWidth={3} />
                    Importar {selectedCount} Foco{selectedCount === 1 ? '' : 's'} al Partido
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
