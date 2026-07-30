import React from 'react';

export interface BodyZoneMarker {
  id: string;
  zone: string;
  side: 'frontal' | 'posterior';
  severity: 'Leve' | 'Moderada' | 'Grave';
  status: string;
  diagnosis?: string;
  date?: string;
}

interface BodyMapProps {
  markers: BodyZoneMarker[];
  onZoneClick?: (zone: string, side: 'frontal' | 'posterior') => void;
  onMarkerClick?: (marker: BodyZoneMarker) => void;
}

// Frontal (Centro X ≈ 25%)
export const BODY_ZONES_FRONT = [
  { key: 'Cabeza', label: 'Cabeza', cx: 25, cy: 8 },
  { key: 'Hombro Derecho', label: 'Hombro Derecho', cx: 16, cy: 20 },
  { key: 'Hombro Izquierdo', label: 'Hombro Izquierdo', cx: 34, cy: 20 },
  { key: 'Pecho', label: 'Pectoral / Pecho', cx: 25, cy: 25 },
  { key: 'Brazo Derecho', label: 'Bíceps Derecho', cx: 14, cy: 30 },
  { key: 'Brazo Izquierdo', label: 'Bíceps Izquierdo', cx: 36, cy: 30 },
  { key: 'Mano Derecha', label: 'Mano Derecha', cx: 9, cy: 45 },
  { key: 'Mano Izquierda', label: 'Mano Izquierda', cx: 41, cy: 45 },
  { key: 'Abdomen', label: 'Abdomen / Core', cx: 25, cy: 38 },
  { key: 'Cadera Derecha', label: 'Cadera / Ingle Der.', cx: 18, cy: 48 },
  { key: 'Cadera Izquierda', label: 'Cadera / Ingle Izq.', cx: 32, cy: 48 },
  { key: 'Cuádriceps Derecho', label: 'Cuádriceps Derecho', cx: 19, cy: 60 },
  { key: 'Cuádriceps Izquierdo', label: 'Cuádriceps Izquierdo', cx: 31, cy: 60 },
  { key: 'Rodilla Derecha', label: 'Rodilla Derecha', cx: 20, cy: 72 },
  { key: 'Rodilla Izquierda', label: 'Rodilla Izquierda', cx: 30, cy: 72 },
  { key: 'Tibia Derecha', label: 'Tibial / Espinilla Der.', cx: 20, cy: 82 },
  { key: 'Tibia Izquierda', label: 'Tibial / Espinilla Izq.', cx: 30, cy: 82 },
  { key: 'Tobillo Derecho', label: 'Tobillo Derecho', cx: 20, cy: 92 },
  { key: 'Tobillo Izquierdo', label: 'Tobillo Izquierdo', cx: 30, cy: 92 },
];

// Posterior (Centro X ≈ 75%)
export const BODY_ZONES_BACK = [
  { key: 'Cervicales', label: 'Cervicales / Nuca', cx: 75, cy: 12 },
  { key: 'Hombro Post. Izquierdo', label: 'Hombro Post. Izq.', cx: 66, cy: 20 },
  { key: 'Hombro Post. Derecho', label: 'Hombro Post. Der.', cx: 84, cy: 20 },
  { key: 'Brazo Post. Izquierdo', label: 'Brazo Post. Izq.', cx: 64, cy: 30 },
  { key: 'Brazo Post. Derecho', label: 'Brazo Post. Der.', cx: 86, cy: 30 },
  { key: 'Mano Izquierda (Post.)', label: 'Mano Izquierda (Post.)', cx: 59, cy: 45 },
  { key: 'Mano Derecha (Post.)', label: 'Mano Derecha (Post.)', cx: 91, cy: 45 },
  { key: 'Espalda Alta', label: 'Espalda Alta / Trapecio', cx: 75, cy: 26 },
  { key: 'Lumbar', label: 'Zona Lumbar', cx: 75, cy: 42 },
  { key: 'Glúteo Izquierdo', label: 'Glúteo Izquierdo', cx: 68, cy: 50 },
  { key: 'Glúteo Derecho', label: 'Glúteo Derecho', cx: 82, cy: 50 },
  { key: 'Isquiotibial Izquierdo', label: 'Isquiotibial Izq.', cx: 69, cy: 60 },
  { key: 'Isquiotibial Derecho', label: 'Isquiotibial Der.', cx: 81, cy: 60 },
  { key: 'Gemelo Izquierdo', label: 'Gemelo / Sóleo Izq.', cx: 69, cy: 75 },
  { key: 'Gemelo Derecho', label: 'Gemelo / Sóleo Der.', cx: 81, cy: 75 },
  { key: 'Aquiles Izquierdo', label: 'T. Aquiles Izq.', cx: 69, cy: 88 },
  { key: 'Aquiles Derecho', label: 'T. Aquiles Der.', cx: 81, cy: 88 },
];

export const _severityColor = (severity: string) => {
  switch (severity) {
    case 'Grave': return 'bg-red-600';
    case 'Moderada': return 'bg-orange-500';
    case 'Leve': return 'bg-yellow-400';
    default: return 'bg-red-600';
  }
};

const getWorstSeverity = (injuries: BodyZoneMarker[]) => {
  if (injuries.some(i => i.severity === 'Grave')) return 'Grave';
  if (injuries.some(i => i.severity === 'Moderada')) return 'Moderada';
  return 'Leve';
};

const getGlowColors = (severity: string) => {
  switch (severity) {
    case 'Grave': return { bg: 'bg-red-500', bgDark: 'bg-red-600', shadow: 'rgba(239,68,68,0.5)' };
    case 'Moderada': return { bg: 'bg-orange-400', bgDark: 'bg-orange-500', shadow: 'rgba(249,115,22,0.5)' };
    case 'Leve': return { bg: 'bg-yellow-300', bgDark: 'bg-yellow-400', shadow: 'rgba(250,204,21,0.5)' };
    default: return { bg: 'bg-red-500', bgDark: 'bg-red-600', shadow: 'rgba(239,68,68,0.5)' };
  }
};

export default function BodyMap({ markers, onZoneClick, onMarkerClick }: BodyMapProps) {
  const [hoveredZone, setHoveredZone] = React.useState<string | null>(null);
  const activeInjuries = markers.filter(i => i.status !== 'Recuperado');
  const allZones = [...BODY_ZONES_FRONT, ...BODY_ZONES_BACK];

  return (
    <div className="space-y-4 w-full">
      <div 
        className="relative w-full max-w-[800px] mx-auto rounded-xl overflow-visible bg-gray-50 shadow-inner" 
        style={{ aspectRatio: '473 / 487' }}
      >
        {/* IMAGEN DEL SISTEMA MUSCULAR */}
        <img 
          src="/muscular_map.png" 
          alt="Anatomía Muscular" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none opacity-90 mix-blend-multiply"
        />

        {/* MAPEO DE ZONAS Y LESIONES */}
        {allZones.map(zone => {
          const zoneInjuries = activeInjuries.filter(inj => inj.zone === zone.key);
          const hasInjury = zoneInjuries.length > 0;
          const side = BODY_ZONES_FRONT.includes(zone) ? 'frontal' : 'posterior';
          const worstSeverity = hasInjury ? getWorstSeverity(zoneInjuries) : 'Leve';
          const glow = getGlowColors(worstSeverity);

          return (
            <div
              key={zone.key}
              className="absolute group cursor-pointer"
              style={{ left: `${zone.cx}%`, top: `${zone.cy}%`, transform: 'translate(-50%, -50%)', zIndex: (hasInjury || hoveredZone === zone.key) ? 50 : 10 }}
              onClick={() => {
                if (hasInjury && onMarkerClick) {
                  onMarkerClick(zoneInjuries[0]);
                } else if (onZoneClick) {
                  onZoneClick(zone.key, side);
                }
              }}
              onMouseEnter={() => setHoveredZone(zone.key)}
              onMouseLeave={() => setHoveredZone(null)}
            >
              {/* Zona Clícable */}
              <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full transition-all flex items-center justify-center ${!hasInjury && 'hover:bg-blue-600/10'}`}>
                
                {/* Sombreado de la Lesión */}
                {hasInjury && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`absolute w-12 h-12 md:w-16 md:h-16 ${glow.bg}/40 rounded-full blur-md animate-pulse`} />
                    <div className={`absolute w-6 h-6 md:w-8 md:h-8 ${glow.bgDark}/70 rounded-full blur-[2px]`} />
                    <div 
                      className={`w-4 h-4 md:w-5 md:h-5 ${glow.bgDark} text-white text-[10px] md:text-xs font-black flex items-center justify-center rounded-full z-10 border border-white/50 shadow-md`}
                      style={{ boxShadow: `0 0 10px ${glow.shadow}` }}
                    >
                      {zoneInjuries.length}
                    </div>
                  </div>
                )}
              </div>

              {/* Tooltip personalizado on hover */}
              {hoveredZone === zone.key && hasInjury && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-gray-900 text-white rounded-xl p-4 shadow-2xl pointer-events-none z-50 animate-fade-in border border-gray-700">
                  <div className="font-extrabold border-b border-gray-700 pb-2 mb-3 text-sm uppercase text-gray-300">
                    {zone.label}
                  </div>
                  <div className="space-y-3">
                    {zoneInjuries.map(inj => (
                      <div key={inj.id} className="flex flex-col gap-1.5">
                        <span className="text-base font-semibold leading-tight">{inj.diagnosis}</span>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className={`px-2 py-1 rounded font-bold uppercase tracking-wider ${inj.severity === 'Grave' ? 'bg-red-500/20 text-red-300' : inj.severity === 'Moderada' ? 'bg-orange-500/20 text-orange-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                            {inj.severity}
                          </span>
                          <span className="text-gray-400 font-medium">
                            {inj.date ? new Date(inj.date).toLocaleDateString('es-ES') : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
