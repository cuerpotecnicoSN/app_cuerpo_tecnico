import { useTranslation } from 'react-i18next';
import PitchGraph from '../matches/PitchGraph';

// Mock heatmap data for the pitch (losses and recoveries)
const mockEvents = [
  { id: '1', outcome: 'Failure' as const, type: 'Pérdida', coordinates: { x: 30, y: 40 }, matchId: 'm1', staffId: 's1', timestamp: '10:00', minute: 10 },
  { id: '2', outcome: 'Failure' as const, type: 'Pérdida', coordinates: { x: 45, y: 80 }, matchId: 'm1', staffId: 's1', timestamp: '12:00', minute: 12 },
  { id: '3', outcome: 'Failure' as const, type: 'Pérdida', coordinates: { x: 80, y: 20 }, matchId: 'm1', staffId: 's1', timestamp: '14:00', minute: 14 },
  { id: '4', outcome: 'Failure' as const, type: 'Pérdida', coordinates: { x: 75, y: 60 }, matchId: 'm1', staffId: 's1', timestamp: '16:00', minute: 16 },
  
  { id: '5', outcome: 'Success' as const, type: 'Recuperación', coordinates: { x: 20, y: 50 }, matchId: 'm1', staffId: 's1', timestamp: '20:00', minute: 20 },
  { id: '6', outcome: 'Success' as const, type: 'Recuperación', coordinates: { x: 60, y: 30 }, matchId: 'm1', staffId: 's1', timestamp: '22:00', minute: 22 },
  { id: '7', outcome: 'Success' as const, type: 'Recuperación', coordinates: { x: 55, y: 70 }, matchId: 'm1', staffId: 's1', timestamp: '25:00', minute: 25 },
];

const MatchesAnalytics = () => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <div className="card md:col-span-2">
         <h3 className="h3 mb-4">{t('reports.matches.heatmap') || 'Mapa de Zonas (Recuperaciones vs Pérdidas)'}</h3>
         <p className="text-sm text-muted mb-4">
           Los puntos <span className="text-blue-500 font-bold">azules</span> representan recuperaciones o acciones de éxito. 
           Los puntos <span className="text-red-500 font-bold">rojos</span> indican pérdidas o acciones fallidas.
         </p>
         
         <div className="w-full max-w-2xl mx-auto rounded overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
           {/* Reusing PitchGraph as a viewer */}
           <PitchGraph interactive={false} events={mockEvents} />
         </div>
      </div>

      <div className="flex flex-col gap-6">
         <div className="card">
            <h3 className="h3 mb-4">Resumen de Temporada</h3>
            <div className="flex flex-col gap-3">
               <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                 <span className="font-semibold text-muted">Partidos Jugados</span>
                 <span className="text-xl font-bold">12</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                 <span className="font-semibold text-muted">Victorias</span>
                 <span className="text-xl font-bold text-green-500">8</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                 <span className="font-semibold text-muted">Empates</span>
                 <span className="text-xl font-bold text-yellow-500">2</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                 <span className="font-semibold text-muted">Derrotas</span>
                 <span className="text-xl font-bold text-red-500">2</span>
               </div>
            </div>
         </div>

         <div className="card">
            <h3 className="h3 mb-4">Métricas Ofensivas</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted">Goles a favor</span>
                  <span className="font-bold">24 (2.0/partido)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '80%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted">Tiros a puerta</span>
                  <span className="font-bold">68 (5.6/partido)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: '65%' }}></div>
                </div>
              </div>
            </div>
         </div>
      </div>

    </div>
  );
};

export default MatchesAnalytics;
