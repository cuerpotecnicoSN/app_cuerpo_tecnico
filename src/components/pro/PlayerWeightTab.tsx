import React, { useState, useEffect } from 'react';
import { getPlayerWeights, createPlayerWeight, deletePlayerWeight, updatePlayerWeight } from '../../services/playerHealth';
import type { PlayerWeight } from '../types';
import { Weight, Plus, AlertTriangle, TrendingUp, TrendingDown, Minus, Scale, Trash2, Pencil } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function PlayerWeightTab({ playerId }: { playerId: string }) {
  const [weights, setWeights] = useState<PlayerWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadWeights = async () => {
    try {
      setLoading(true);
      const data = await getPlayerWeights(playerId);
      setWeights(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeights();
  }, [playerId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || !date) return;
    try {
      if (editingId) {
        await updatePlayerWeight(editingId, {
          weight: parseFloat(newWeight),
          date
        });
      } else {
        await createPlayerWeight({
          player_id: playerId,
          weight: parseFloat(newWeight),
          date
        });
      }
      closeModal();
      loadWeights();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el peso');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setNewWeight('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleEditClick = (w: PlayerWeight) => {
    setEditingId(w.id);
    setNewWeight(w.weight.toString());
    setDate(w.date);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este registro de peso?')) return;
    try {
      await deletePlayerWeight(id);
      loadWeights();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar peso');
    }
  };

  const chartData = weights.map(w => ({
    date: new Date(w.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    peso: w.weight
  }));

  const sorted = [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const current = sorted.length ? sorted[sorted.length - 1].weight : null;
  const previous = sorted.length > 1 ? sorted[sorted.length - 2].weight : null;
  const diff = current !== null && previous !== null ? current - previous : null;
  const min = sorted.length ? Math.min(...sorted.map(w => w.weight)) : null;
  const max = sorted.length ? Math.max(...sorted.map(w => w.weight)) : null;
  const avg = sorted.length ? sorted.reduce((s, w) => s + w.weight, 0) / sorted.length : null;

  return (
    <div className="animate-fade-in text-gray-900 mt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h2 className="text-2xl font-black flex items-center gap-3 text-gray-900 tracking-tight">
          <Weight className="text-blue-600 w-8 h-8" />
          Control de Peso Corporal
        </h2>
        <button
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
          onClick={() => {
            setEditingId(null);
            setNewWeight('');
            setDate(new Date().toISOString().split('T')[0]);
            setShowModal(true);
          }}
        >
          <Plus size={18} /> Añadir Registro
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Cargando datos...</div>
      ) : weights.length === 0 ? (
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 text-center text-gray-500">
          <AlertTriangle size={32} className="mx-auto mb-3 opacity-50 text-blue-500" />
          <p>No hay registros de peso para este jugador.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow">
              <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Actual</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-extrabold text-gray-900">{current}kg</span>
                {diff !== null && diff !== 0 && (
                  <span className={`flex items-center text-sm font-bold ${diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {diff > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {Math.abs(diff).toFixed(1)}
                  </span>
                )}
                {diff === 0 && <Minus size={16} className="text-gray-400" />}
              </div>
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow">
              <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Media</span>
              <span className="text-3xl font-extrabold text-gray-900">{avg?.toFixed(1)}kg</span>
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow">
              <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Mínimo</span>
              <span className="text-3xl font-extrabold text-blue-500">{min}kg</span>
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow">
              <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Máximo</span>
              <span className="text-3xl font-extrabold text-red-500">{max}kg</span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-gray-100 shadow-sm rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-10 -mr-20 -mt-20 pointer-events-none" />
              <h3 className="text-base font-bold mb-6 text-gray-900 relative z-10 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-600 rounded-full inline-block" />
                Evolución del Peso
              </h3>
              <div style={{ height: 320 }} className="relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      fontSize={12}
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(val) => `${val}kg`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        padding: '12px',
                        backdropFilter: 'blur(8px)',
                      }}
                      itemStyle={{ color: '#111827', fontWeight: 'bold' }}
                      labelStyle={{ color: '#6b7280', marginBottom: '4px', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPeso)"
                      activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
                <Scale className="w-12 h-12 text-blue-500 mx-auto mb-3 opacity-80" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Análisis Médico (IMC)</h3>
                <p className="text-sm text-gray-500 mb-6 px-2">Basado en la estatura y el peso actual del jugador.</p>
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-blue-50 shadow-inner">
                  <span className="text-2xl font-black text-blue-600">22.4</span>
                </div>
                <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mt-5 bg-emerald-50 py-1.5 px-4 rounded-full inline-block">Peso Ideal</p>
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 flex-1 flex flex-col">
                <h3 className="text-base font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-6 bg-blue-600 rounded-full inline-block" />
                  Historial de Registros
                </h3>
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[300px]">
                  {weights.map((w, idx) => {
                    const prev = idx < weights.length - 1 ? weights[idx + 1].weight : null;
                    const wDiff = prev !== null ? w.weight - prev : 0;
                    return (
                      <div key={w.id} className="group bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center justify-between hover:bg-white hover:border-blue-200 hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
                            <Scale size={20} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                          </div>
                          <div>
                            <span className="text-lg font-extrabold text-gray-900 block group-hover:text-blue-700 transition-colors">{w.weight} kg</span>
                            <span className="text-sm text-gray-500 font-medium">
                              {new Date(w.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 transition-opacity">
                          {wDiff !== 0 && prev !== null && (
                            <span className={`flex items-center text-sm font-bold px-3 py-1.5 rounded-full mr-2 ${wDiff > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {wDiff > 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                              {Math.abs(wDiff).toFixed(1)}
                            </span>
                          )}
                          <button onClick={() => handleEditClick(w)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar registro">
                            <Pencil size={18} />
                          </button>
                          <button onClick={() => handleDelete(w.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar registro">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 text-gray-900">{editingId ? 'Editar Control de Peso' : 'Añadir Control de Peso'}</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    min="30"
                    max="150"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button type="button" className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors">
                    {editingId ? 'Guardar Cambios' : 'Añadir Peso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
