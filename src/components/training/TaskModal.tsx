import React, { useEffect, useState } from 'react';
import { X, Save, Dumbbell, Clock, AlignLeft, Layers } from 'lucide-react';
import { TaskBoardEditor } from './TaskBoardEditor';
import { TeamsAnnotationsBoard } from './TeamsAnnotationsBoard';
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
  const [activeTab, setActiveTab] = useState<'drawing' | 'teams'>('drawing');
  const [isSaving, setIsSaving] = useState(false);

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

  // El modal no se desmonta al cerrarse, así que sincronizamos el formulario cada
  // vez que se abre: si no, al editar una tarea distinta (o crear una nueva
  // después de editar) se arrastraban los datos y la pizarra de la anterior.
  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData?.title || '');
    setCategory(initialData?.category || 'Principal');
    setDescription(initialData?.description || '');
    setDurationMin(initialData?.duration_min ?? 15);
    setMaterial(initialData?.material || '');
    setBoardData(initialData?.board_data || '');
    setActiveTab('drawing');
    setIsSaving(false);
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
      } as any);
      onClose();
    } catch (err: any) {
      console.error('Error saving task:', err);
      alert('Error al guardar la tarea: ' + (err.message || err.details || JSON.stringify(err)));
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
        <form onSubmit={(e) => e.preventDefault()} className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Columna Izquierda: Datos de la tarea */}
          <div className="w-full md:w-56 lg:w-60 shrink-0 p-3 lg:p-4 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto space-y-3 bg-gray-50/30">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                <AlignLeft size={14} className="text-blue-500" />
                Nombre de la Tarea <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Rondo 4v4 + 3 comodines"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  <Layers size={14} className="text-purple-500" />
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="Calentamiento">Calentamiento</option>
                  <option value="Principal">Principal</option>
                  <option value="ABP">ABP / Táctica</option>
                  <option value="Física">Preparación Física</option>
                  <option value="Vuelta a la calma">Vuelta a la calma</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  <Clock size={14} className="text-emerald-500" />
                  Duración (min)
                </label>
                <input
                  type="number"
                  min="1"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Material Necesario
              </label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Ej. 10 conos, petos rojos/azules, 2 balones"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Descripción / Consignas
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Explica las reglas, objetivos tácticos y comportamiento esperado..."
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Columna Derecha: Editor Táctico / Equipos */}
          <div className="flex-1 flex flex-col p-2 lg:p-3 bg-gray-50 overflow-hidden relative">
            <div className="mb-3 flex items-center justify-between shrink-0">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('drawing')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 border-2 ${
                    activeTab === 'drawing' 
                      ? 'bg-blue-600 border-blue-700 text-white shadow-blue-500/20' 
                      : 'bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🎨 Pizarra Táctica
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('teams')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 border-2 ${
                    activeTab === 'teams' 
                      ? 'bg-blue-600 border-blue-700 text-white shadow-blue-500/20' 
                      : 'bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📋 Equipos / Anotaciones
                </button>
              </div>
              <span className="text-[11px] text-gray-500 hidden sm:inline font-bold">
                {activeTab === 'drawing' ? '🎨 Arrastra material, jugadores y dibuja líneas' : '📋 Organiza jugadores y escribe notas en columnas'}
              </span>
            </div>
            
            <div className="flex-1 rounded-xl overflow-hidden bg-white border border-gray-200 shadow-inner relative">
              {activeTab === 'drawing' ? (
                <TaskBoardEditor
                  value={boardData}
                  onChange={handleBoardDataChange}
                />
              ) : (
                <TeamsAnnotationsBoard
                  value={boardData}
                  onChange={(newData) => setBoardData(newData)}
                />
              )}
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
    </div>
  );
}
