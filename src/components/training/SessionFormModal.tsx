import { useState, useEffect } from 'react';
import { X, MapPin, Calendar as CalendarIcon, AlignLeft, Target, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TrainingSessionDB } from '../types';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: Omit<TrainingSessionDB, 'id' | 'created_at' | 'season_id'>) => Promise<void>;
  initialData?: TrainingSessionDB;
}

export function SessionFormModal({ isOpen, onClose, onSave, initialData }: SessionFormModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialData?.title || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [objective, setObjective] = useState(initialData?.objective || '');
  const [location, setLocation] = useState(initialData?.location || '');
  
  const [mapCoordinates, setMapCoordinates] = useState<{lat: string, lon: string} | null>(null);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Debounced search for map location
  useEffect(() => {
    if (!location.trim()) {
      setMapCoordinates(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingMap(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
          setMapCoordinates({ lat: data[0].lat, lon: data[0].lon });
        } else {
          setMapCoordinates(null);
        }
      } catch (err) {
        console.error('Error fetching map data:', err);
        setMapCoordinates(null);
      } finally {
        setIsSearchingMap(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    
    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        date,
        objective: objective.trim(),
        location: location.trim()
      });
      onClose();
    } catch (err) {
      console.error('Error saving session:', err);
      alert('Error al guardar la sesión');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-5xl min-h-[60vh] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-extrabold text-gray-900">
            {initialData ? 'Editar Sesión' : 'Nueva Sesión'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Columna Izquierda: Datos principales */}
            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                  <AlignLeft size={16} className="text-blue-500" />
                  Título de la sesión <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Sesión regenerativa"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 hover:bg-white focus:bg-white"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                  <CalendarIcon size={16} className="text-emerald-500" />
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 hover:bg-white focus:bg-white cursor-pointer"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                  <Target size={16} className="text-purple-500" />
                  Objetivo principal <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
                </label>
                <textarea 
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ej. Mejora de la salida de balón..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 hover:bg-white focus:bg-white resize-none"
                />
              </div>
            </div>

            {/* Columna Derecha: Mapa y Ubicación */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                  <MapPin size={16} className="text-red-500" />
                  Lugar de entrenamiento <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
                </label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej. Ciudad Deportiva, Estadio..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 hover:bg-white focus:bg-white"
                />
              </div>
              
              <div className="w-full h-[400px] bg-gray-100 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden relative flex flex-col items-center justify-center">
                {isSearchingMap ? (
                  <div className="flex flex-col items-center text-gray-400">
                    <Loader2 size={32} className="animate-spin mb-2" />
                    <p className="text-sm font-medium">Buscando ubicación...</p>
                  </div>
                ) : mapCoordinates ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight={0} 
                    marginWidth={0} 
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(mapCoordinates.lon)-0.005},${parseFloat(mapCoordinates.lat)-0.005},${parseFloat(mapCoordinates.lon)+0.005},${parseFloat(mapCoordinates.lat)+0.005}&layer=mapnik&marker=${mapCoordinates.lat},${mapCoordinates.lon}`}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="text-center p-6 text-gray-400 flex flex-col items-center">
                    <MapPin size={48} className="opacity-20 mb-2" />
                    <p className="text-sm font-medium">El mapa aparecerá aquí al escribir una ubicación</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="mt-8 pt-5 border-t border-gray-100 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={isSaving || !title.trim() || !date}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
