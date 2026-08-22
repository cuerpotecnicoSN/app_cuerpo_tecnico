import { useState, useEffect } from 'react';
import { ChevronLeft, BarChart2 } from 'lucide-react';
import { getAllMatchDataPoints } from '../../services/matches';
import type { MatchDB, MatchDataPoint } from '../types';

interface Props {
  matches: MatchDB[];
  onBack: () => void;
}

export default function FocusStatisticsView({ onBack }: Props) {
  const [dataPoints, setDataPoints] = useState<MatchDataPoint[]>([]);

  useEffect(() => {
    getAllMatchDataPoints().then(setDataPoints).catch(() => setDataPoints([]));
  }, []);

  // Aggregate by Focus Title (to merge same focuses across matches if they share same title/desc, or just group by title)
  const statsByTitle = dataPoints.reduce((acc, dp) => {
    if (!dp.focus_id && !dp.type) return acc;
    const title = dp.type || 'Sin título';
    if (!acc[title]) acc[title] = { total: 0, success: 0, failure: 0, neutral: 0 };
    acc[title].total++;
    if (dp.outcome === 'Success') acc[title].success++;
    if (dp.outcome === 'Failure') acc[title].failure++;
    if (dp.outcome === 'Neutral') acc[title].neutral++;
    return acc;
  }, {} as Record<string, { total: number, success: number, failure: number, neutral: number }>);

  // You can also aggregate by Zone
  const statsByZone = dataPoints.reduce((acc, dp) => {
    const zone = dp.coordinates?.zone || 'Sin zona especificada';
    if (!acc[zone]) acc[zone] = 0;
    acc[zone]++;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
       <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
         <ChevronLeft size={16} /> Volver a Partidos
       </button>
       <div className="flex items-center gap-3">
         <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-inner"><BarChart2 size={24} /></div>
         <h2 className="text-2xl font-black text-gray-900 tracking-tight">Estadísticas de Focos</h2>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <span className="w-2 h-6 rounded-full bg-blue-500"></span>
                Total por Foco
             </h3>
             <div className="space-y-3">
                {Object.entries(statsByTitle).sort((a,b) => b[1].total - a[1].total).map(([title, stats]) => (
                   <div key={title} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex justify-between items-center mb-3">
                         <span className="font-bold text-sm text-gray-800 leading-tight pr-4">{title}</span>
                         <span className="font-black text-blue-700 bg-blue-100 border border-blue-200 px-3 py-1 rounded-xl text-sm shrink-0">{stats.total} total</span>
                      </div>
                      <div className="flex gap-2 text-[11px] font-black uppercase tracking-wider">
                         <span className="text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg">Éxitos: {stats.success}</span>
                         <span className="text-red-700 bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg">Fallos: {stats.failure}</span>
                         <span className="text-gray-600 bg-gray-200 border border-gray-300 px-2.5 py-1 rounded-lg">Neutral: {stats.neutral}</span>
                      </div>
                   </div>
                ))}
                {Object.keys(statsByTitle).length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No hay datos registrados en ningún partido.</p>}
             </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <span className="w-2 h-6 rounded-full bg-indigo-500"></span>
                Eventos por Zona
             </h3>
             <div className="space-y-2">
                {Object.entries(statsByZone).sort((a,b) => b[1] - a[1]).map(([zone, count]) => (
                   <div key={zone} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg transition-colors">
                      <span className="text-sm text-gray-700 font-bold">{zone}</span>
                      <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{count}</span>
                   </div>
                ))}
                {Object.keys(statsByZone).length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No hay zonas especificadas.</p>}
             </div>
          </div>
       </div>
    </div>
  );
}
