import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Calendar as CalendarIcon, AlignLeft, Target, Loader2, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
import { useTranslation } from 'react-i18next';
import type { TrainingSessionDB } from '../types';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: Omit<TrainingSessionDB, 'id' | 'created_at' | 'season_id'>) => Promise<void>;
  initialData?: TrainingSessionDB;
  suggestedTitle?: string;
}

export function SessionFormModal({ isOpen, onClose, onSave, initialData, suggestedTitle }: SessionFormModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialData?.title || suggestedTitle || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [time, setTime] = useState(initialData?.time || '');
  const [objective, setObjective] = useState(initialData?.objective || '');
  const [location, setLocation] = useState(initialData?.location || '');
  
  // Helper to parse notes JSON
  const parseNotes = (rawNotes?: string) => {
    if (!rawNotes) return { structure: '', observations: '' };
    try {
      const parsed = JSON.parse(rawNotes);
      if (parsed && typeof parsed === 'object') {
        return {
          structure: parsed.structure || '',
          observations: parsed.observations || parsed.notes || ''
        };
      }
    } catch {
      return { structure: '', observations: rawNotes };
    }
    return { structure: '', observations: '' };
  };

  const parsedNotes = parseNotes(initialData?.notes);
  const [structure, setStructure] = useState(parsedNotes.structure);
  const [observations, setObservations] = useState(parsedNotes.observations);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || suggestedTitle || '');
      setDate(initialData?.date || '');
      setTime(initialData?.time || '');
      setObjective(initialData?.objective || '');
      setLocation(initialData?.location || '');
      const p = parseNotes(initialData?.notes);
      setStructure(p.structure);
      setObservations(p.observations);
    }
  }, [isOpen, initialData, suggestedTitle]);
  
  const [mapCoordinates, setMapCoordinates] = useState<{lat: string, lon: string} | null>(null);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const skipSearch = useRef(false);

  // Debounced search for map location
  useEffect(() => {
    if (!location.trim()) {
      setMapCoordinates(null);
      return;
    }
    
    if (skipSearch.current) {
      skipSearch.current = false;
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
        time: time || undefined,
        objective: objective.trim(),
        location: location.trim(),
        notes: JSON.stringify({
          structure: structure.trim(),
          observations: observations.trim()
        })
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

  const handleMapClick = async (lat: number, lng: number) => {
    setMapCoordinates({ lat: lat.toString(), lon: lng.toString() });
    
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data && data.display_name) {
        let locationName = data.display_name;
        if (data.address) {
           const street = data.address.road || data.address.pedestrian || data.address.suburb;
           const city = data.address.city || data.address.town || data.address.village;
           if (street && city) locationName = `${street}, ${city}`;
           else if (city) locationName = city;
           else if (street) locationName = street;
        }
        skipSearch.current = true;
        setLocation(locationName);
      }
    } catch (err) {
      console.error('Reverse geocoding error', err);
    }
  };

  const MapEvents = () => {
    useMapEvents({
      click: (e) => handleMapClick(e.latlng.lat, e.latlng.lng)
    });
    return null;
  };

  const MapCenterer = () => {
    const map = useMap();
    useEffect(() => {
      if (mapCoordinates) {
        map.setView([parseFloat(mapCoordinates.lat), parseFloat(mapCoordinates.lon)], 15);
      }
    }, [mapCoordinates, map]);
    return null;
  };

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

              <div className="grid grid-cols-2 gap-4">
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
                    <Clock size={16} className="text-orange-500" />
                    Hora
                  </label>
                  <input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 hover:bg-white focus:bg-white cursor-pointer"
                  />
                </div>
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
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 hover:bg-white focus:bg-white resize-none text-sm"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                  <AlignLeft size={16} className="text-indigo-500" />
                  Estructura del entrenamiento <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
                </label>
                <textarea 
                  value={structure}
                  onChange={(e) => setStructure(e.target.value)}
                  placeholder="Ej. Calentamiento (15 min) -> Rondo (20 min) -> Posesión (30 min)..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 hover:bg-white focus:bg-white resize-none text-sm"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                  <AlignLeft size={16} className="text-amber-500" />
                  Observaciones <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
                </label>
                <textarea 
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observaciones adicionales de la sesión..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 hover:bg-white focus:bg-white resize-none text-sm"
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
                <MapContainer 
                  center={mapCoordinates ? [parseFloat(mapCoordinates.lat), parseFloat(mapCoordinates.lon)] : [40.4168, -3.7038]} 
                  zoom={mapCoordinates ? 15 : 5} 
                  style={{ width: '100%', height: '100%', zIndex: 10 }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {mapCoordinates && (
                    <Marker position={[parseFloat(mapCoordinates.lat), parseFloat(mapCoordinates.lon)]} />
                  )}
                  <MapEvents />
                  <MapCenterer />
                </MapContainer>
                
                {!mapCoordinates && !isSearchingMap && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-gray-50/50 backdrop-blur-[2px] z-20">
                    <MapPin size={48} className="text-blue-500 mb-2 drop-shadow-md" />
                    <p className="text-sm font-bold text-gray-700 bg-white/90 px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-center max-w-[80%]">
                      Escribe una ubicación o <span className="text-blue-600">pulsa en el mapa</span> para fijar el lugar de entrenamiento
                    </p>
                  </div>
                )}
                {isSearchingMap && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] z-20">
                    <Loader2 size={32} className="animate-spin text-blue-500 mb-2" />
                    <p className="text-sm font-bold text-gray-700">Buscando...</p>
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
