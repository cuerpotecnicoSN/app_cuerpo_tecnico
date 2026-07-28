import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

const dataScores = [
  { name: 'J. López', score: 85 },
  { name: 'M. García', score: 78 },
  { name: 'A. Martínez', score: 92 },
  { name: 'D. Sánchez', score: 88 },
  { name: 'C. Ruiz', score: 70 },
];

const dataEvolution = [
  { month: 'Ago', value: 70 },
  { month: 'Sep', value: 72 },
  { month: 'Oct', value: 75 },
  { month: 'Nov', value: 80 },
  { month: 'Dic', value: 79 },
];

const PlayersAnalytics = () => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="h3 mb-4">{t('reports.players.topScores') || 'Rendimiento Global por Jugador'}</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={dataScores}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="score" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 className="h3 mb-4">{t('reports.players.evolution') || 'Evolución Media del Equipo'}</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={dataEvolution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="card md:col-span-2">
         <h3 className="h3 mb-4">Métricas Consolidadas (Mock)</h3>
         <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
               <div className="text-3xl font-bold text-primary">24</div>
               <div className="text-sm text-muted mt-1">Reuniones Este Mes</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
               <div className="text-3xl font-bold text-green-500">85%</div>
               <div className="text-sm text-muted mt-1">Objetivos Cumplidos</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
               <div className="text-3xl font-bold text-blue-500">+4.2</div>
               <div className="text-sm text-muted mt-1">Mejora Táctica (Ptos)</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
               <div className="text-3xl font-bold text-purple-500">12</div>
               <div className="text-sm text-muted mt-1">Lesiones/Molestias</div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default PlayersAnalytics;
