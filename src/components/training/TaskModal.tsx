import React, { useEffect, useState } from 'react';
import { X, Save, Dumbbell, Clock, AlignLeft, Layers } from 'lucide-react';
import { TaskBoardEditor } from './TaskBoardEditor';
import { TeamsAnnotationsBoard } from './TeamsAnnotationsBoard';
import { TASK_TYPES } from '../types';
import { isNetworkError } from '../../lib/networkError';
import type { TaskLibraryItem } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<TaskLibraryItem, 'id' | 'created_at'>) => Promise<void>;
  initialData?: Partial<TaskLibraryItem>;
}

export function TaskModal({ isOpen, onClose, onSave, initialData }: TaskModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [category, setCategory] = useState(initialData?.category || 'Principal');
  const [description, setDescription] = useState(initialData?.description || '');
  const [durationMin, setDurationMin] = useState<number | string>(initialData?.duration_min || 15);
  const [material, setMaterial] = useState(initialData?.material || '');
  const [boardData, setBoardData] = useState<string>(initialData?.board_data || '');
  const [types, setTypes] = useState<string[]>(initialData?.types || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isRichEditorOpen, setIsRichEditorOpen] = useState(false);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [isTeamsModalOpen, setIsTeamsModalOpen] = useState(false);
  const [boardDataSnapshot, setBoardDataSnapshot] = useState('');
  const [drawingUndoTrigger, setDrawingUndoTrigger] = useState(0);
  const [teamsUndoTrigger, setTeamsUndoTrigger] = useState(0);
  const [clearTeamsTrigger, setClearTeamsTrigger] = useState(0);

  const handleBoardDataChange = (drawingData: string) => {
    try {
      const parsedDrawing = JSON.parse(drawingData);
      const parsedCurrent = boardData ? JSON.parse(boardData) : {};
      const merged = {
        ...parsedCurrent,
        ...parsedDrawing
      };
      setBoardData(JSON.stringify(merged));
    } catch {
      setBoardData(drawingData);
    }
  };

  const renderTeamsPreview = () => {
    try {
      if (!boardData) return null;
      const parsed = JSON.parse(boardData);
      const tables = parsed?.teamsBoard?.tables || [];
      const items = parsed?.teamsBoard?.items || [];
      
      let displayTables = [...tables];
      if (displayTables.length === 0 && parsed?.teamsBoard?.columnsConfig && parsed?.teamsBoard?.columnsConfig.count > 0) {
        displayTables = [{
          id: 'table-default',
          ...parsed.teamsBoard.columnsConfig
        }];
      }

      if (displayTables.length === 0 && items.length === 0) return null;
      
      return (
        <div 
          className="w-full h-full relative overflow-hidden bg-white select-none rounded-xl border border-slate-100"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)',
            backgroundSize: '15px 15px',
          }}
        >
          {/* Tables */}
          {displayTables.map((t: any) => {
            const hasAnyName = t.names?.some((name: string) => !!name);
            return (
              <div
                key={t.id}
                className="absolute flex flex-col overflow-hidden bg-transparent"
                style={{
                  left: `${t.x}%`,
                  top: `${t.y}%`,
                  width: `${t.width}%`,
                  height: `${t.height}%`,
                }}
              >
                {/* Header only if has title */}
                {hasAnyName && (
                  <div 
                    className="px-1.5 py-0.5 text-[6.5px] font-black uppercase text-white truncate shrink-0 text-center"
                    style={{ backgroundColor: t.colors?.[0] || '#000000' }}
                  >
                    📋 EQUIPO
                  </div>
                )}
                {/* Columns */}
                <div className="flex-1 flex p-0.5 gap-0.5 overflow-hidden bg-transparent">
                  {Array.from({ length: t.count }).map((_, colIdx) => {
                    const colColor = t.colors?.[colIdx] || '#000000';
                    const colName = t.names?.[colIdx];
                    return (
                      <div key={colIdx} className="flex-1 flex flex-col pt-0 overflow-hidden">
                        {colName && (
                          <div 
                            className="text-[6px] font-black uppercase text-white px-1 py-0.5 rounded truncate text-center mb-0.5"
                            style={{ backgroundColor: colColor }}
                          >
                            {colName}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Items (Players & Annotations) */}
          {items.map((item: any) => (
            <div
              key={item.id}
              className="absolute select-none text-[6.5px] font-extrabold tracking-wide truncate max-w-[60px] text-center"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                color: item.color || '#000000',
                transform: 'translate(-50%, -50%)',
                zIndex: 10
              }}
            >
              {item.text}
            </div>
          ))}
        </div>
      );
    } catch {}
    return null;
  };

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData?.title || '');
    setCategory(initialData?.category || 'Principal');
    setDescription(initialData?.description || '');
    setDurationMin(initialData?.duration_min ?? 15);
    setMaterial(initialData?.material || '');
    setBoardData(initialData?.board_data || '');
    setTypes(initialData?.types || []);
    setIsSaving(false);
    setIsRichEditorOpen(false);
    setIsDrawingModalOpen(false);
    setIsTeamsModalOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        category: category.trim() || 'Principal',
        description: description.trim(),
        duration_min: durationMin ? Number(durationMin) : undefined,
        material: material.trim(),
        board_data: boardData,
        types: types,
      } as any);
      onClose();
    } catch (err: any) {
      console.error('Error saving task:', err);
      if (isNetworkError(err)) {
        // El modal sigue abierto con todos los datos: basta con volver a pulsar Guardar
        alert(
          'No se ha podido conectar con el servidor, así que la tarea no se ha guardado.\n\n' +
          'No has perdido nada: revisa la conexión y vuelve a pulsar Guardar.'
        );
      } else {
        alert('Error al guardar la tarea: ' + (err.message || err.details || JSON.stringify(err)));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1700px] h-[97vh] flex flex-col overflow-hidden">

        {/* Header del Modal */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Dumbbell size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 leading-none">
                {initialData?.id ? 'Editar Tarea de Entrenamiento' : 'Nueva Tarea de Entrenamiento'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">Diseña el gráfico táctico y define las características de la tarea</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario y Editor Táctico */}
        <form onSubmit={(e) => e.preventDefault()} className="flex-1 flex flex-col overflow-hidden">
          
          {/* Fila Superior: Parámetros y Descripción (Más grande y con scroll si es necesario) */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 lg:p-6 border-b border-gray-100 bg-gray-50/30 overflow-y-auto">
            {/* Columna Izquierda: Datos de la tarea (parámetros) */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  <AlignLeft size={16} className="text-blue-500" />
                  Nombre de la Tarea <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Rondo 4v4 + 3 comodines"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-lg font-bold text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    <Layers size={16} className="text-purple-500" />
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                  >
                    <option value="Calentamiento">Calentamiento</option>
                    <option value="Principal">Principal</option>
                    <option value="ABP">ABP / Táctica</option>
                    <option value="Física">Preparación Física</option>
                    <option value="Vuelta a la calma">Vuelta a la calma</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    <Clock size={16} className="text-emerald-500" />
                    Duración (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Tipo de Tarea (Varios)
                </label>
                <div className="flex flex-wrap gap-1.5 bg-white border border-gray-200 rounded-xl p-2.5 max-h-28 overflow-y-auto shadow-sm">
                  {TASK_TYPES.map((t) => {
                    const isSelected = types.includes(t);
                    return (
                      <span
                        key={t}
                        onClick={() => {
                          if (isSelected) {
                            setTypes(types.filter((x) => x !== t));
                          } else {
                            setTypes([...types, t]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer select-none ${
                          isSelected
                            ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {t}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Material Necesario
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="Ej. 10 conos, petos rojos/azules, 2 balones"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Columna Derecha: Descripción / Consignas */}
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Descripción / Consignas
                </label>
                <span
                  onClick={() => setIsRichEditorOpen(true)}
                  className="text-xs font-black text-blue-600 hover:text-blue-700 cursor-pointer uppercase flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 transition-colors select-none"
                >
                  📝 Abrir Editor
                </span>
              </div>
              <div
                onClick={() => setIsRichEditorOpen(true)}
                className="w-full flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer min-h-[200px] overflow-y-auto whitespace-pre-wrap select-none hover:bg-gray-50/50 shadow-sm"
                dangerouslySetInnerHTML={{
                  __html: description ? description : `<span class="text-gray-400 italic">Haz clic para escribir descripción enriquecida (estilo Word)...</span>`
                }}
              />
            </div>
          </div>

          {/* Fila Inferior: Dibujo y Hacer Equipos / Poner Anotaciones (Más alto, sin tapar dibujos) */}
          <div className="h-[360px] shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 p-2 lg:p-3 bg-gray-50 border-t border-gray-100 relative">
            
            {/* Box 1: Dibujo */}
            <div className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-inner relative flex flex-col items-center justify-start p-3 bg-slate-900 overflow-hidden group">
              <div className="absolute inset-0 opacity-100 select-none pointer-events-none pt-20">
                <TaskBoardEditor
                  value={boardData}
                  readOnly
                  hideToolbar
                  rotateFullField={true}
                />
              </div>
              <div className="relative z-10 flex items-center justify-between w-full p-3.5 bg-slate-950/95 backdrop-blur border border-slate-800 rounded-xl shadow-2xl gap-4">
                <span className="text-sm font-black uppercase tracking-wider text-slate-200">
                  📊 Gráfico Táctico
                </span>
                <span 
                  onClick={() => {
                    setBoardDataSnapshot(boardData);
                    setIsDrawingModalOpen(true);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 cursor-pointer transition-all select-none"
                >
                  🎨 Dibujo / Editar
                </span>
              </div>
            </div>

            {/* Box 2: Hacer Equipos / Poner Anotaciones */}
            <div className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-inner relative flex flex-col items-center justify-start p-3 bg-white overflow-hidden group">
              <div className="absolute inset-0 opacity-100 select-none pointer-events-none bg-white flex flex-col justify-start p-2 pt-20 overflow-y-auto">
                {renderTeamsPreview() || (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 pt-10 bg-slate-50">
                    <span className="text-3xl">📋</span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Sin Equipos Definidos</span>
                  </div>
                )}
              </div>
              <div className="relative z-10 flex items-center justify-between w-full p-3.5 bg-slate-950/95 backdrop-blur border border-slate-800 rounded-xl shadow-2xl gap-4">
                <span className="text-sm font-black uppercase tracking-wider text-slate-200">
                  👥 Distribución
                </span>
                <span 
                  onClick={() => {
                    setBoardDataSnapshot(boardData);
                    setIsTeamsModalOpen(true);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 cursor-pointer transition-all select-none"
                >
                  📋 Hacer Equipos
                </span>
              </div>
            </div>

          </div>

        </form>

        {/* Footer del Modal */}
        <div className="px-5 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !title.trim()}
            className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Save size={16} />
            {isSaving ? 'Guardando...' : 'Guardar Tarea'}
          </button>
        </div>

      </div>

      <RichTextModal
        isOpen={isRichEditorOpen}
        onClose={() => setIsRichEditorOpen(false)}
        initialValue={description}
        onSave={(val) => setDescription(val)}
      />

      {isDrawingModalOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <Dumbbell size={20} />
              </span>
              <div>
                <h3 className="text-md font-black text-white leading-none">Diseñar Pizarra Táctica</h3>
                <p className="text-xs text-slate-400 mt-1">Coloca jugadores, entrenadores, material y dibuja tus consignas tácticas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                onClick={() => setDrawingUndoTrigger(prev => prev + 1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all select-none border border-slate-700"
              >
                ↩️ Deshacer
              </span>
              <span
                onClick={() => {
                  setBoardData(boardDataSnapshot);
                  setIsDrawingModalOpen(false);
                }}
                className="px-4 py-2 bg-red-950/80 hover:bg-red-900/80 text-red-300 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all select-none border border-red-900/30"
              >
                ❌ Salir sin Guardar
              </span>
              <span
                onClick={() => {
                  setIsDrawingModalOpen(false);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all select-none"
              >
                Listo / Guardar
              </span>
            </div>
          </div>

          {/* Board Editor Container */}
          <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden relative">
            <TaskBoardEditor
              value={boardData}
              onChange={handleBoardDataChange}
              undoTrigger={drawingUndoTrigger}
            />
          </div>
        </div>
      )}

      {isTeamsModalOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <Dumbbell size={20} />
              </span>
              <div>
                <h3 className="text-md font-black text-white leading-none">Hacer Equipos / Poner Anotaciones</h3>
                <p className="text-xs text-slate-400 mt-1">Organiza a los jugadores en columns y añade notas explicativas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                onClick={() => {
                  const confirmClear = window.confirm("¿Estás seguro de que quieres borrar todos los equipos, tablas y jugadores de esta pizarra?");
                  if (confirmClear) {
                    setClearTeamsTrigger(prev => prev + 1);
                  }
                }}
                className="px-4 py-2 bg-red-955/40 hover:bg-red-900/60 text-red-300 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all select-none border border-red-900/40"
              >
                🗑️ Borrar Todo
              </span>
              <span
                onClick={() => setTeamsUndoTrigger(prev => prev + 1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all select-none border border-slate-700"
              >
                ↩️ Deshacer
              </span>
              <span
                onClick={() => {
                  setBoardData(boardDataSnapshot);
                  setIsTeamsModalOpen(false);
                }}
                className="px-4 py-2 bg-red-950/80 hover:bg-red-900/80 text-red-300 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all select-none border border-red-900/30"
              >
                ❌ Salir sin Guardar
              </span>
              <span
                onClick={() => {
                  setIsTeamsModalOpen(false);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all select-none"
              >
                Listo / Guardar
              </span>
            </div>
          </div>

          {/* Teams Editor Container */}
          <div className="flex-1 bg-white p-2 sm:p-4 overflow-hidden relative">
            <TeamsAnnotationsBoard
              value={boardData}
              onChange={(newData) => setBoardData(newData)}
              undoTrigger={teamsUndoTrigger}
              clearTrigger={clearTeamsTrigger}
            />
          </div>
        </div>
      )}

    </div>
  );
}

import { useRef } from 'react';

function RichTextModal({
  isOpen,
  onClose,
  initialValue,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialValue: string;
  onSave: (val: string) => void;
}) {
  const [val, setVal] = React.useState(initialValue);
  const editorRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setVal(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setVal(editorRef.current.innerHTML);
    }
  };

  const handleSave = () => {
    onSave(editorRef.current ? editorRef.current.innerHTML : val);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
          <h3 className="text-md font-black text-gray-900">Editor de Descripción (Estilo Word)</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-gray-50 border-b border-gray-100 shrink-0">
          <span onClick={() => execCommand('bold')} className="px-3 py-1.5 hover:bg-gray-200 rounded font-bold text-xs border border-gray-200 bg-white cursor-pointer select-none">N</span>
          <span onClick={() => execCommand('italic')} className="px-3 py-1.5 hover:bg-gray-200 rounded italic text-xs border border-gray-200 bg-white cursor-pointer select-none">K</span>
          <span onClick={() => execCommand('underline')} className="px-3 py-1.5 hover:bg-gray-200 rounded underline text-xs border border-gray-200 bg-white cursor-pointer select-none">S</span>
          
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Alignments */}
          <span onClick={() => execCommand('justifyLeft')} className="px-2 py-1.5 hover:bg-gray-200 rounded text-xs border border-gray-200 bg-white cursor-pointer select-none">⬅️</span>
          <span onClick={() => execCommand('justifyCenter')} className="px-2 py-1.5 hover:bg-gray-200 rounded text-xs border border-gray-200 bg-white cursor-pointer select-none">↔️</span>
          <span onClick={() => execCommand('justifyRight')} className="px-2 py-1.5 hover:bg-gray-200 rounded text-xs border border-gray-200 bg-white cursor-pointer select-none">➡️</span>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Font Sizes */}
          <select 
            onChange={(e) => execCommand('fontSize', e.target.value)} 
            className="border border-gray-200 rounded px-2 py-1 text-xs bg-white cursor-pointer"
          >
            <option value="3">Normal</option>
            <option value="4">Medio</option>
            <option value="5">Grande</option>
            <option value="6">Muy Grande</option>
          </select>

          {/* Color Picker */}
          <select 
            onChange={(e) => execCommand('foreColor', e.target.value)} 
            className="border border-gray-200 rounded px-2 py-1 text-xs bg-white cursor-pointer"
          >
            <option value="#000000">Negro</option>
            <option value="#ef4444">Rojo</option>
            <option value="#3b82f6">Azul</option>
            <option value="#10b981">Verde</option>
            <option value="#f59e0b">Naranja</option>
          </select>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Lists */}
          <span onClick={() => execCommand('insertUnorderedList')} className="px-2.5 py-1.5 hover:bg-gray-200 rounded text-xs border border-gray-200 bg-white cursor-pointer select-none">• Lista</span>
          <span onClick={() => execCommand('insertOrderedList')} className="px-2.5 py-1.5 hover:bg-gray-200 rounded text-xs border border-gray-200 bg-white cursor-pointer select-none">1. Lista</span>

          <span onClick={() => execCommand('removeFormat')} className="ml-auto px-2.5 py-1.5 hover:bg-red-50 text-red-600 rounded text-xs border border-red-200 bg-white cursor-pointer select-none">Borrar Formato</span>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-5 overflow-y-auto bg-white min-h-[300px]">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="w-full h-full min-h-[100%] outline-none text-gray-800 font-sans prose max-w-none"
            style={{ minHeight: '100%' }}
            dangerouslySetInnerHTML={{ __html: val }}
            onInput={(e) => setVal(e.currentTarget.innerHTML)}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 shrink-0">
          <span onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 cursor-pointer select-none border border-transparent">Cancelar</span>
          <span onClick={handleSave} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer select-none">Guardar Cambios</span>
        </div>
      </div>
    </div>
  );
}
