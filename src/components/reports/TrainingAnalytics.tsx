import { useTranslation } from 'react-i18next';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

const dataCategories = [
  { name: 'Táctica', value: 45 },
  { name: 'Física', value: 25 },
  { name: 'Técnica', value: 20 },
  { name: 'Estrategia', value: 10 },
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

const dataLoad = [
  { week: 'Sem 1', load: 800 },
  { week: 'Sem 2', load: 950 },
  { week: 'Sem 3', load: 1100 },
  { week: 'Sem 4', load: 850 }, // Descarga
];

const TrainingAnalytics = () => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card">
         <h3 className="h3 mb-4">{t('reports.training.load') || 'Carga Semanal (Unidades Arbitrarias)'}</h3>
         <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={dataLoad}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="load" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      <div className="card flex flex-col">
         <h3 className="h3 mb-4">{t('reports.training.categories') || 'Distribución de Tareas por Categoría'}</h3>
         <div className="flex-1" style={{ width: '100%', minHeight: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={dataCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataCategories.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
         </div>
         <div className="flex justify-center gap-4 mt-4 flex-wrap">
            {dataCategories.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                 <span>{entry.name} ({entry.value}%)</span>
              </div>
            ))}
         </div>
      </div>

      <div className="card md:col-span-2">
         <h3 className="h3 mb-4">Tareas Más Utilizadas</h3>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-sm text-muted">
                  <th className="pb-2 font-medium">Nombre de la Tarea</th>
                  <th className="pb-2 font-medium">Categoría</th>
                  <th className="pb-2 font-medium">Veces Usada</th>
                  <th className="pb-2 font-medium">Minutos Totales</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 font-semibold text-primary">Rondo 4v2 Transición</td>
                  <td className="py-3">Técnica/Táctica</td>
                  <td className="py-3">12</td>
                  <td className="py-3">180'</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 font-semibold text-primary">Partido Modificado 8v8</td>
                  <td className="py-3">Partido</td>
                  <td className="py-3">8</td>
                  <td className="py-3">240'</td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-primary">Circuito Fuerza Explosiva</td>
                  <td className="py-3">Física</td>
                  <td className="py-3">6</td>
                  <td className="py-3">90'</td>
                </tr>
              </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default TrainingAnalytics;
