import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Clock,
  Award,
  BookOpen,
  Activity,
  Play,
  Filter,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { TASK_TYPES, type TaskLibraryItem, type TrainingSessionDB, type SessionTask } from '../types';
import { getAllSessionTasks } from '../../services/training';

interface TaskStatsViewProps {
  tasks: TaskLibraryItem[];
  sessions: TrainingSessionDB[];
  onOpenTask: (task: TaskLibraryItem) => void;
  onFilterByType: (type: string) => void;
}

export function TaskStatsView({ tasks, sessions, onOpenTask, onFilterByType }: TaskStatsViewProps) {
  const [sessionTasks, setSessionTasks] = useState<SessionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | '3months'>('month');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;
    const fetchSessionTasks = async () => {
      try {
        setLoading(true);
        const data = await getAllSessionTasks();
        if (active) {
          setSessionTasks(data);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching session tasks:', err);
        if (active) {
          setError('Error al cargar el historial de tareas.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchSessionTasks();
    return () => {
      active = false;
    };
  }, []);

  // Helper para verificar rango de tiempo
  const isWithinTimeRange = (dateStr: string, range: string) => {
    if (range === 'all') return true;
    const sessionDate = new Date(dateStr);
    sessionDate.setHours(0, 0, 0, 0);
    const limitDate = new Date();
    limitDate.setHours(0, 0, 0, 0);

    if (range === 'week') {
      limitDate.setDate(limitDate.getDate() - 7);
    } else if (range === 'month') {
      limitDate.setDate(limitDate.getDate() - 30);
    } else if (range === '3months') {
      limitDate.setDate(limitDate.getDate() - 90);
    }
    return sessionDate >= limitDate;
  };

  // Helper para filtrar por tipo
  const matchesTypeFilter = (task: TaskLibraryItem | undefined, filter: string) => {
    if (filter === 'all') return true;
    if (!task) return false;
    if (filter === 'sin_tipo') return !task.types || task.types.length === 0;
    return task.types?.includes(filter);
  };

  // 1. Filtrar sesiones según el tiempo
  const filteredSessions = sessions.filter((s) => isWithinTimeRange(s.date, timeFilter));
  const filteredSessionIds = new Set(filteredSessions.map((s) => s.id));

  // Mapear tareas de la librería por ID para acceso rápido
  const taskMap = React.useMemo(() => {
    const map = new Map<string, TaskLibraryItem>();
    tasks.forEach((t) => map.set(t.id, t));
    return map;
  }, [tasks]);

  // 2. Filtrar usos de tareas (session_tasks) según tiempo y tipo
  const activeSessionTasks = sessionTasks.filter((st) => st.task_id && filteredSessionIds.has(st.session_id));
  const filteredActiveSessionTasks = activeSessionTasks.filter((st) => {
    const task = taskMap.get(st.task_id!);
    return matchesTypeFilter(task, typeFilter);
  });



  // --- CÁLCULO DE MÉTRICAS ---

  // Total Usos
  const totalUsages = filteredActiveSessionTasks.length;

  // Usos globales (sin filtro de tiempo, pero sí por tipo) para la tarea más usada de siempre
  const globalActiveSessionTasks = sessionTasks.filter((st) => st.task_id);
  const globalFilteredSessionTasks = globalActiveSessionTasks.filter((st) => {
    const task = taskMap.get(st.task_id!);
    return matchesTypeFilter(task, typeFilter);
  });

  // Conteo de usos por tarea (para el período filtrado)
  const taskUsageCounts = React.useMemo(() => {
    const counts: { [id: string]: number } = {};
    filteredActiveSessionTasks.forEach((st) => {
      const tid = st.task_id!;
      counts[tid] = (counts[tid] || 0) + 1;
    });
    return counts;
  }, [filteredActiveSessionTasks]);

  // Conteo de usos globales por tarea
  const globalTaskUsageCounts = React.useMemo(() => {
    const counts: { [id: string]: number } = {};
    globalFilteredSessionTasks.forEach((st) => {
      const tid = st.task_id!;
      counts[tid] = (counts[tid] || 0) + 1;
    });
    return counts;
  }, [globalFilteredSessionTasks]);

  // Tareas con número de usos en el periodo (ordenadas de mayor a menor)
  const tasksWithUsage = React.useMemo(() => {
    return tasks
      .map((t) => ({
        ...t,
        usages: taskUsageCounts[t.id] || 0
      }))
      .filter((t) => matchesTypeFilter(t, typeFilter))
      .sort((a, b) => b.usages - a.usages);
  }, [tasks, taskUsageCounts, typeFilter]);

  // Tareas con número de usos globales (ordenadas de mayor a menor)
  const globalTasksWithUsage = React.useMemo(() => {
    return tasks
      .map((t) => ({
        ...t,
        usages: globalTaskUsageCounts[t.id] || 0
      }))
      .filter((t) => matchesTypeFilter(t, typeFilter))
      .sort((a, b) => b.usages - a.usages);
  }, [tasks, globalTaskUsageCounts, typeFilter]);

  // Tarea más utilizada en el periodo
  const mostUsedTaskInPeriod = tasksWithUsage[0]?.usages > 0 ? tasksWithUsage[0] : null;

  // Tarea más utilizada de siempre
  const mostUsedTaskOverall = globalTasksWithUsage[0]?.usages > 0 ? globalTasksWithUsage[0] : null;

  // Distribución de tipos (Biblioteca vs Usos)
  const chartData = React.useMemo(() => {
    return TASK_TYPES.map((type) => {
      // Tareas en biblioteca de este tipo
      const inLibrary = tasks.filter((t) => t.types?.includes(type)).length;
      // Usos de este tipo en el periodo filtrado
      const usages = activeSessionTasks.filter((st) => {
        const task = taskMap.get(st.task_id!);
        return task?.types?.includes(type);
      }).length;

      return {
        name: type,
        Biblioteca: inLibrary,
        Usos: usages
      };
    }).sort((a, b) => b.Usos - a.Usos); // Ordenar por los más usados
  }, [tasks, activeSessionTasks, taskMap]);

  // Tipo más utilizado en el periodo
  const mostUsedTypeInfo = React.useMemo(() => {
    let maxUsages = 0;
    let typeName = 'Ninguno';

    TASK_TYPES.forEach((type) => {
      const usages = activeSessionTasks.filter((st) => {
        const task = taskMap.get(st.task_id!);
        return task?.types?.includes(type);
      }).length;
      if (usages > maxUsages) {
        maxUsages = usages;
        typeName = type;
      }
    });

    return { typeName, usages: maxUsages };
  }, [activeSessionTasks, taskMap]);

  // Duración promedio
  const avgDuration = React.useMemo(() => {
    const getDuration = (st: SessionTask) => {
      if (st.duration_min && st.duration_min > 0) return st.duration_min;
      const t = taskMap.get(st.task_id!);
      return t?.duration_min || 0;
    };
    const durations = filteredActiveSessionTasks.map(getDuration).filter((d) => d > 0);
    return durations.length > 0
      ? Math.round(durations.reduce((acc, d) => acc + d, 0) / durations.length)
      : 0;
  }, [filteredActiveSessionTasks, taskMap]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Activity className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-bold text-gray-500">Cargando estadísticas de tareas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center font-bold text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Panel de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 text-gray-800 font-extrabold text-sm">
          <Filter size={16} className="text-red-600" />
          Filtros de Análisis
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          {/* Filtro de Tiempo */}
          <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${
                timeFilter === 'week' ? 'shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
              style={timeFilter === 'week' ? { backgroundColor: '#db0030', color: '#ffffff' } : {}}
            >
              Última semana
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${
                timeFilter === 'month' ? 'shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
              style={timeFilter === 'month' ? { backgroundColor: '#db0030', color: '#ffffff' } : {}}
            >
              Último mes
            </button>
            <button
              onClick={() => setTimeFilter('3months')}
              className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${
                timeFilter === '3months' ? 'shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
              style={timeFilter === '3months' ? { backgroundColor: '#db0030', color: '#ffffff' } : {}}
            >
              Últimos 3 meses
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${
                timeFilter === 'all' ? 'shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
              style={timeFilter === 'all' ? { backgroundColor: '#db0030', color: '#ffffff' } : {}}
            >
              Todo el tiempo
            </button>
          </div>

          {/* Filtro de Tipo de Tarea */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 bg-white outline-none focus:ring-2 focus:ring-red-600 cursor-pointer shadow-sm"
            >
              <option value="all">Todos los tipos</option>
              <option value="sin_tipo">Sin tipo asignado</option>
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Usos en el Periodo */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Total Usos en Sesiones</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{totalUsages}</h3>
            <p className="text-[10px] text-gray-400 truncate mt-1">
              En el rango de tiempo filtrado
            </p>
          </div>
        </div>

        {/* Tarea más usada del Periodo */}
        <div className="bg-gray-950 text-white border border-gray-900 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
            <Award size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Tarea más usada (Periodo)</p>
            {mostUsedTaskInPeriod ? (
              <>
                <h4
                  onClick={() => onOpenTask(mostUsedTaskInPeriod)}
                  className="text-sm font-extrabold text-white mt-1 truncate hover:text-red-400 cursor-pointer flex items-center gap-0.5"
                  title={mostUsedTaskInPeriod.title}
                >
                  {mostUsedTaskInPeriod.title}
                </h4>
                <p className="text-[10px] text-red-400 font-bold mt-0.5">
                  {mostUsedTaskInPeriod.usages} {mostUsedTaskInPeriod.usages === 1 ? 'uso' : 'usos'}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400 mt-1.5 font-bold">Ninguna en este periodo</p>
            )}
          </div>
        </div>

        {/* Tipo de tarea más utilizada */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Layers size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Tipo de Tarea Principal</p>
            {mostUsedTypeInfo.usages > 0 ? (
              <>
                <h3 className="text-lg font-black text-gray-900 mt-0.5 truncate">{mostUsedTypeInfo.typeName}</h3>
                <p className="text-[10px] text-red-600 font-bold mt-0.5">
                  {mostUsedTypeInfo.usages} {mostUsedTypeInfo.usages === 1 ? 'uso' : 'usos'} en sesiones
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400 mt-1.5 font-bold">Ninguno registrado</p>
            )}
          </div>
        </div>

        {/* Duración promedio */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Duración Promedio</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{avgDuration} min</h3>
            <p className="text-[10px] text-gray-400 mt-1">
              Por tarea en el periodo
            </p>
          </div>
        </div>
      </div>

      {/* Sección principal de análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución Gráfica (2/3 de ancho en pantallas grandes) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                <BookOpen size={16} className="text-red-600" />
                Biblioteca vs. Usos por Tipo de Tarea
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Comparación entre la cantidad de tareas creadas y sus usos en los entrenamientos.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-gray-950 rounded"></span>Biblioteca</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-600 rounded"></span>Usos</span>
            </div>
          </div>

          <div className="h-72 w-full mt-2 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                barGap={4}
                onClick={(state) => {
                  if (state && state.activeLabel) {
                    onFilterByType(state.activeLabel.toString());
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="Biblioteca" fill="#111827" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Usos" fill="#db0030" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tarea más usada Globalmente (1/3 de ancho en pantallas grandes) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-500" />
              Líderes de Siempre
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Las tareas más utilizadas históricamente en el club.
            </p>
          </div>

          <div className="flex-1 flex flex-col gap-4 justify-center">
            {mostUsedTaskOverall ? (
              <div className="text-center py-4 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shadow-sm">
                  <Award size={32} />
                </div>
                <div className="min-w-0">
                  <span className="bg-red-100 text-red-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                    {mostUsedTaskOverall.category || 'Biblioteca'}
                  </span>
                  <h4
                    onClick={() => onOpenTask(mostUsedTaskOverall)}
                    className="text-base font-black text-gray-900 mt-2 hover:text-red-600 cursor-pointer leading-tight"
                  >
                    {mostUsedTaskOverall.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Utilizada <strong className="text-gray-900 text-sm">{mostUsedTaskOverall.usages}</strong> veces
                  </p>
                </div>
                <button
                  onClick={() => onOpenTask(mostUsedTaskOverall)}
                  className="mt-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-red-600 hover:border-red-200 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all"
                >
                  Ver Ficha de Tarea
                  <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs font-bold">
                No hay usos registrados
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Ranking de Tareas */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
            <Play size={16} className="text-red-600" />
            Ranking de Tareas por Frecuencia de Uso
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Listado completo de tareas ordenadas por cantidad de usos durante el período seleccionado.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100">
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 w-12">Pos</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400">Tarea</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400">Categoría</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400">Tipos</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center w-24">Usos (Período)</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-gray-400 w-36">Porcentaje de Usos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasksWithUsage.map((tk, idx) => {
                const maxUsagesInList = tasksWithUsage[0]?.usages || 1;
                const percentageOfMax = Math.round((tk.usages / maxUsagesInList) * 100);
                const overallPercentage = totalUsages > 0 ? Math.round((tk.usages / totalUsages) * 100) : 0;

                return (
                  <tr
                    key={tk.id}
                    onClick={() => onOpenTask(tk)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5 text-xs font-black text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-gray-900 group-hover:text-red-600 transition-colors">
                          {tk.title}
                        </div>
                        {tk.duration_min && (
                          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                            ⏱️ {tk.duration_min} min | 👥 {tk.players_min || 0}-{tk.players_max || 'N'} jugadores
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
                        {tk.category || 'Principal'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {tk.types && tk.types.length > 0 ? (
                          tk.types.map((type) => (
                            <span
                              key={type}
                              onClick={(e) => {
                                e.stopPropagation();
                                onFilterByType(type);
                              }}
                              className="bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded text-[9px] font-bold hover:bg-red-600 hover:text-white cursor-pointer transition-colors"
                              title={`Filtrar biblioteca por ${type}`}
                            >
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-300 text-[10px] font-bold italic">Sin tipos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center text-sm font-black text-gray-900">
                      {tk.usages}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-red-600 h-1.5 rounded-full"
                            style={{ width: `${percentageOfMax}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-extrabold text-gray-500 w-8 text-right shrink-0">
                          {overallPercentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {tasksWithUsage.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs font-bold text-gray-400">
                    No se encontraron tareas registradas con los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
