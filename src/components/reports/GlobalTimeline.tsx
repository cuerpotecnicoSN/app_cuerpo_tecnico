import { Calendar, Activity, Users, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Mock chronological feed
const mockFeed = [
  { id: '1', date: 'Hoy', time: '18:00', type: 'match', title: 'FC Example 1 - 2 Deportivo Rival', desc: 'Partido de Liga. Goles: 2. Posesión: 55%.', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: '2', date: 'Ayer', time: '10:30', type: 'training', title: 'Entrenamiento - Alta Carga', desc: 'Duración: 90m. Tareas enfocadas en táctica y presión.', icon: Calendar, color: 'text-green-500', bg: 'bg-green-100' },
  { id: '3', date: 'Ayer', time: '09:00', type: 'meeting', title: 'Reunión Individual', desc: 'Jugador: J. López. Tema: Evolución técnica.', icon: Users, color: 'text-purple-500', bg: 'bg-purple-100' },
  { id: '4', date: 'Hace 3 días', time: '11:00', type: 'report', title: 'Informe de Rendimiento', desc: 'Informe mensual generado por Analista Principal.', icon: FileText, color: 'text-orange-500', bg: 'bg-orange-100' },
];

const GlobalTimeline = () => {
  const { t } = useTranslation();

  return (
    <div className="card">
      <h3 className="h3 mb-6">{t('reports.timeline.title') || 'Actividad Reciente'}</h3>
      <div className="flex flex-col gap-6 relative">
        <div className="absolute left-6 top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700"></div>
        
        {mockFeed.map((item) => (
          <div key={item.id} className="flex gap-4 relative z-10">
            <div className={`w-12 h-12 rounded-full ${item.bg} flex items-center justify-center flex-shrink-0 shadow-sm border border-white dark:border-gray-800`}>
              <item.icon className={item.color} size={20} />
            </div>
            <div className="flex-1 pt-1 border-b border-gray-100 dark:border-gray-800 pb-6">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-lg">{item.title}</h4>
                <span className="text-sm font-semibold text-muted bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                  {item.date} • {item.time}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <button className="btn btn-outline text-sm">Cargar más historial</button>
      </div>
    </div>
  );
};

export default GlobalTimeline;
