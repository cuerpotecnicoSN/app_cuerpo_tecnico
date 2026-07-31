import React, { useState } from 'react';
import { X, Save, Dumbbell, Clock, AlignLeft, Layers } from 'lucide-react';
import { TaskBoardEditor } from './TaskBoardEditor';
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
  const [isSaving, setIsSaving] = useState(false);

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
    } catch (err) {
      console.error('Error saving task:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
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
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Columna Izquierda: Datos de la tarea */}
          <div className="w-full md:w-64 shrink-0 p-4 lg:p-5 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto space-y-4 bg-gray-50/30">
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

          {/* Columna Derecha: Editor Táctico Interactivo */}
          <div className="flex-1 flex flex-col p-4 bg-gray-50 overflow-hidden relative">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Pizarra Táctica interactiva</span>
              <span className="text-[11px] text-gray-500">Arrastra material, jugadores y dibuja líneas</span>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden bg-white border border-gray-200 shadow-inner relative">
              <TaskBoardEditor
                value={boardData}
                onChange={(data) => setBoardData(data)}
              />
            </div>
          </div>

        </form>

        {/* Footer del Modal */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
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
