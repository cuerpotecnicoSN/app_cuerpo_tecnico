import React, { useState, useEffect } from 'react';
import { getPlayerInjuries, createPlayerInjury, updatePlayerInjury, deletePlayerInjury } from '../../services/playerHealth';
import type { PlayerInjury } from '../types';
import { Stethoscope, Plus, AlertTriangle, Edit2, Trash2, Calendar, Activity } from 'lucide-react';

import BodyMap, { BodyZoneMarker, BODY_ZONES_FRONT, BODY_ZONES_BACK } from './BodyMap';

export default function PlayerInjuriesTab({ playerId }: { playerId: string }) {
  const [injuries, setInjuries] = useState<PlayerInjury[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInjury, setEditingInjury] = useState<PlayerInjury | null>(null);

  // Form states
  const [bodyZone, setBodyZone] = useState('');
  const [bodySide, setBodySide] = useState<'frontal' | 'posterior'>('frontal');
  const [severity, setSeverity] = useState<'Leve' | 'Moderada' | 'Grave'>('Moderada');
  const [status, setStatus] = useState<'Activa' | 'En tratamiento' | 'Recuperado' | 'Baja'>('Activa');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [injuryDate, setInjuryDate] = useState(new Date().toISOString().split('T')[0]);
  const [bajaDate, setBajaDate] = useState('');
  const [estReturn, setEstReturn] = useState('');

  const loadInjuries = async () => {
    try {
      setLoading(true);
      const data = await getPlayerInjuries(playerId);
      setInjuries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInjuries();
  }, [playerId]);

  const resetForm = () => {
    setBodyZone('');
    setBodySide('frontal');
    setSeverity('Moderada');
    setStatus('Activa');
    setDiagnosis('');
    setTreatment('');
    setInjuryDate(new Date().toISOString().split('T')[0]);
    setBajaDate('');
    setEstReturn('');
  };

  const handleOpenModal = (injury?: PlayerInjury) => {
    if (injury) {
      setEditingInjury(injury);
      setBodyZone(injury.body_zone);
      setBodySide(injury.body_side);
      setSeverity(injury.severity);
      setStatus(injury.status);
      setDiagnosis(injury.diagnosis);
      setTreatment(injury.treatment || '');
      setInjuryDate(injury.injury_date);
      setBajaDate(injury.baja_date || '');
      setEstReturn(injury.estimated_return || '');
    } else {
      setEditingInjury(null);
      resetForm();
    }
    setShowModal(true);
  };

  const handleZoneClick = (zone: string, side: 'frontal' | 'posterior') => {
    setEditingInjury(null);
    resetForm();
    setBodyZone(zone);
    setBodySide(side);
    setShowModal(true);
  };

  const handleMarkerClick = (marker: BodyZoneMarker) => {
    const injury = injuries.find((i) => i.id === marker.id);
    if (injury) handleOpenModal(injury);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis || !bodyZone || !injuryDate) return;

    const payload = {
      player_id: playerId,
      body_zone: bodyZone,
      body_side: bodySide,
      severity,
      status,
      diagnosis,
      treatment: treatment || undefined,
      injury_date: injuryDate,
      baja_date: status === 'Baja' ? (bajaDate || injuryDate) : undefined,
      estimated_return: estReturn || undefined,
    };

    try {
      if (editingInjury) {
        await updatePlayerInjury(editingInjury.id, payload);
      } else {
        await createPlayerInjury(payload);
      }
      setShowModal(false);
      loadInjuries();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la lesión');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro de lesión?')) return;
    try {
      await deletePlayerInjury(id);
      loadInjuries();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'Recuperado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Baja': return 'bg-red-100 text-red-700 border-red-200';
      case 'En tratamiento': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const severityBadge = (s: string) => {
    switch (s) {
      case 'Grave': return 'text-red-700 bg-red-100 border-red-200';
      case 'Moderada': return 'text-orange-700 bg-orange-100 border-orange-200';
      default: return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    }
  };

  const markers: BodyZoneMarker[] = injuries
    .filter((i) => i.status !== 'Recuperado')
    .map((i) => ({ 
      id: i.id, 
      zone: i.body_zone, 
      side: i.body_side, 
      severity: i.severity, 
      status: i.status,
      diagnosis: i.diagnosis,
      date: i.injury_date
    }));

  return (
    <div className="animate-fade-in text-gray-900 mt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h2 className="text-2xl font-black flex items-center gap-3 text-gray-900 tracking-tight">
          <Stethoscope className="text-blue-600 w-8 h-8" />
          Registro Médico y Lesiones
        </h2>
        <button
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} /> Registrar Lesión
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 text-lg">Cargando datos...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <p className="text-xs text-gray-500 mb-4">
              Haz clic en el maniquí para registrar una lesión en esa zona, o sobre un punto marcado para editarla.
            </p>
            <BodyMap markers={markers} onZoneClick={handleZoneClick} onMarkerClick={handleMarkerClick} />
            <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#facc15' }} />Leve</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f97316' }} />Moderada</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#ef4444' }} />Grave</span>
            </div>
          </div>

          <div className="lg:col-span-3">
            {injuries.length === 0 ? (
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 text-center text-gray-500 h-full flex flex-col items-center justify-center">
                <AlertTriangle size={32} className="mx-auto mb-3 text-emerald-500" />
                <p>No hay lesiones registradas. ¡El jugador está al 100%!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {injuries.map((injury) => (
                  <div key={injury.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row gap-5 hover:border-blue-200 hover:shadow-md transition-all">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="text-lg font-extrabold text-gray-900">{injury.diagnosis}</h3>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border tracking-wide ${statusBadge(injury.status)}`}>{injury.status}</span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border tracking-wide ${severityBadge(injury.severity)}`}>{injury.severity}</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
                        <div>
                          <div className="text-gray-400 font-semibold mb-1 text-[10px] uppercase flex items-center gap-1">
                            <Activity size={12} /> Zona
                          </div>
                          <div className="font-medium text-gray-800">{injury.body_zone}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 font-semibold mb-1 text-[10px] uppercase flex items-center gap-1">
                            <Calendar size={12} /> Fecha Lesión
                          </div>
                          <div className="font-medium text-gray-800">{new Date(injury.injury_date).toLocaleDateString('es-ES')}</div>
                        </div>
                        {injury.estimated_return && (
                          <div>
                            <div className="text-gray-400 font-semibold mb-1 text-[10px] uppercase flex items-center gap-1">
                              <Calendar size={12} /> Est. Regreso
                            </div>
                            <div className="font-medium text-gray-800">{new Date(injury.estimated_return).toLocaleDateString('es-ES')}</div>
                          </div>
                        )}
                      </div>

                      {injury.treatment && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="text-gray-400 font-semibold mb-1 text-[10px] uppercase">Tratamiento</div>
                          <p className="text-sm text-gray-600">{injury.treatment}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-row sm:flex-col gap-2 justify-end sm:justify-start">
                      <button onClick={() => handleOpenModal(injury)} className="p-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-xl transition-colors shadow-sm" title="Editar">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(injury.id)} className="p-3 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-600 hover:text-red-500 rounded-xl transition-colors shadow-sm" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 text-gray-900">{editingInjury ? 'Editar Lesión' : 'Registrar Lesión'}</h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Zona Afectada</label>
                    <select
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={bodyZone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBodyZone(val);
                        if (BODY_ZONES_FRONT.find(z => z.key === val)) {
                          setBodySide('frontal');
                        } else if (BODY_ZONES_BACK.find(z => z.key === val)) {
                          setBodySide('posterior');
                        }
                      }}
                    >
                      <option value="" disabled>Selecciona una zona...</option>
                      <optgroup label="Frontal">
                        {BODY_ZONES_FRONT.map(z => (
                          <option key={z.key} value={z.key}>{z.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Posterior">
                        {BODY_ZONES_BACK.map(z => (
                          <option key={z.key} value={z.key}>{z.label}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Lado</label>
                    <select
                      disabled
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                      value={bodySide}
                      onChange={(e) => setBodySide(e.target.value as any)}
                    >
                      <option value="frontal">Frontal</option>
                      <option value="posterior">Posterior</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Diagnóstico *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Esguince Grado II"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Gravedad</label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                    >
                      <option value="Leve">Leve</option>
                      <option value="Moderada">Moderada</option>
                      <option value="Grave">Grave</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                    >
                      <option value="Activa">Activa</option>
                      <option value="En tratamiento">En tratamiento</option>
                      <option value="Baja">Baja</option>
                      <option value="Recuperado">Recuperado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de Lesión *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={injuryDate}
                      onChange={(e) => setInjuryDate(e.target.value)}
                    />
                  </div>
                </div>

                {status === 'Baja' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de Baja Médica</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={bajaDate}
                      onChange={(e) => setBajaDate(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Regreso Estimado</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={estReturn}
                    onChange={(e) => setEstReturn(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tratamiento o Notas</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors">
                    Guardar
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
