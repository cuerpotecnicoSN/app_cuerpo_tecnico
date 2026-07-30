import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Weight, Stethoscope, ArrowLeft, Edit2 } from 'lucide-react';
import type { Player } from '../../components/types';
import PlayerWeightTab from '../../components/pro/PlayerWeightTab';
import PlayerInjuriesTab from '../../components/pro/PlayerInjuriesTab';
import { useSupabaseData } from '../../hooks/useSupabaseData';

import PlayerImportModal from '../../components/pro/PlayerImportModal';

type Tab = 'ficha' | 'peso' | 'lesiones';

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: dbPlayers, loading } = useSupabaseData<any>('players');
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('ficha');

  const players = useMemo<Player[]>(() => {
    return dbPlayers.map(p => ({
      id: p.id,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      position: p.main_position || 'Sin definir',
      age: p.birth_date ? new Date().getFullYear() - new Date(p.birth_date).getFullYear() : 0,
      weight: p.weight_kg || 0,
      height: p.height_cm || 0,
      bodyFat: 0,
      history: p.history || '',
      strengths: [],
      weaknesses: [],
      goals: [],
      status: p.medical_status || 'Apto',
      nationality: p.nationality || '',
      birthDate: p.birth_date,
      birthPlace: p.birth_place,
      birthPlaceFlag: p.birth_place_flag,
      dominantFoot: p.dominant_foot,
      currentClub: p.current_club || '',
      marketValue: p.market_value || '',
      rating: p.rating ?? undefined,
      careerClubs: p.career_clubs,
      avatar: p.photo_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
    }));
  }, [dbPlayers]);

  const activePlayer = players.find(p => p.id === id) || players[0];
  const activeDbPlayer = dbPlayers.find((p: any) => p.id === activePlayer?.id);

  if (loading) {
    return <div className="p-8 text-muted">Cargando perfil desde base de datos...</div>;
  }

  if (!activePlayer) {
    return <div className="p-8 text-muted">Jugador no encontrado en la base de datos.</div>;
  }

  const isPlayerBaja = activePlayer?.status === 'Baja';

  return (
    <div className="w-full h-full space-y-6">
      {/* Action Bar & Tabs */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        {/* Main Tabs */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <button
            className={`flex-1 sm:flex-none px-6 py-3 font-bold text-base rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border-2 ${
              activeTab === 'ficha'
                ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 shadow-sm'
            }`}
            onClick={() => setActiveTab('ficha')}
          >
            <User size={20} className={activeTab === 'ficha' ? 'text-blue-600' : 'text-gray-400'} />
            Ficha Técnica
          </button>
          <button
            className={`flex-1 sm:flex-none px-6 py-3 font-bold text-base rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border-2 ${
              activeTab === 'peso'
                ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 shadow-sm'
            }`}
            onClick={() => setActiveTab('peso')}
          >
            <Weight size={20} className={activeTab === 'peso' ? 'text-blue-600' : 'text-gray-400'} />
            Control de Peso
          </button>
          <button
            className={`flex-1 sm:flex-none px-6 py-3 font-bold text-base rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border-2 ${
              activeTab === 'lesiones'
                ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 shadow-sm'
            }`}
            onClick={() => setActiveTab('lesiones')}
          >
            <Stethoscope size={20} className={activeTab === 'lesiones' ? 'text-blue-600' : 'text-gray-400'} />
            Lesiones Médicas
          </button>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full xl:w-auto justify-start xl:justify-end">
          <button onClick={() => navigate('/players')} className="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
            <ArrowLeft size={16} /> Volver a Plantilla
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Edit2 size={16} /> Editar Perfil
          </button>
        </div>
      </div>

      {/* Header Info (Ficha) */}
      <div className="bg-white p-6 border border-gray-100 shadow-sm rounded-2xl mb-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Foto */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-end justify-center shrink-0 mx-auto sm:mx-0 relative">
            {activePlayer.avatar ? (
              <img src={activePlayer.avatar} alt={activePlayer.name} className="w-full h-full object-cover rounded-2xl shadow-sm border border-gray-100" />
            ) : (
              <div className="w-full h-full rounded-2xl border-2 border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
                <User className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left flex flex-col justify-center">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2 justify-center sm:justify-start">
              {activeDbPlayer?.dorsal && (
                <span className="font-black text-blue-600 text-4xl mr-2">
                  #{activeDbPlayer.dorsal}
                </span>
              )}
              <div className="flex items-center gap-3">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight uppercase tracking-tight">
                  {activePlayer.name.split(',')[0]}
                </h2>
                {isPlayerBaja ? (
                  <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 text-xs font-black uppercase rounded-lg animate-pulse">Baja</span>
                ) : (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black uppercase rounded-lg">Disponible</span>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              Nombre completo: <span className="text-gray-700 font-bold">{activePlayer.name}</span>
            </p>
            <p className="text-sm text-gray-500 uppercase font-black tracking-wider mb-6">
              {activePlayer.position}
            </p>

            {/* Mini stats */}
            <div className="flex gap-8 justify-center sm:justify-start">
              <div className="text-center sm:text-left">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-1">PJ</span>
                <span className="text-3xl font-extrabold text-gray-800 block leading-none">0</span>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Goles</span>
                <span className="text-3xl font-extrabold text-emerald-600 block leading-none">0</span>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Asistencias</span>
                <span className="text-3xl font-extrabold text-blue-600 block leading-none">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Contenido de Pestañas */}
      <div className="pt-2">
        {activeTab === 'ficha' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
              {[
                { label: 'Pie Dominante', value: activePlayer.dominantFoot || 'No definido', icon: <User className="w-4 h-4 text-blue-500" /> },
                { label: 'Estatura', value: activePlayer.height ? `${activePlayer.height} cm` : 'No definido', icon: <User className="w-4 h-4 text-blue-500" /> },
                { label: 'Peso Actual', value: activePlayer.weight ? `${activePlayer.weight} kg` : 'No definido', icon: <Weight className="w-4 h-4 text-blue-500" /> },
                { label: 'Nacionalidad', value: activePlayer.nationality || 'No definido', icon: <User className="w-4 h-4 text-blue-500" /> },
                { label: 'Club Actual', value: activePlayer.currentClub || 'No definido', icon: <User className="w-4 h-4 text-blue-500" /> },
                { label: 'Estado', value: activePlayer.status, icon: <Stethoscope className="w-4 h-4 text-blue-500" /> },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-gray-100 shadow-sm p-5 rounded-xl transition-all hover:shadow-md hover:border-blue-100">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1.5 tracking-wider">{item.label}</span>
                  <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    {item.icon} {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'peso' && (
          <PlayerWeightTab playerId={activePlayer.id} />
        )}

        {activeTab === 'lesiones' && (
          <PlayerInjuriesTab playerId={activePlayer.id} />
        )}
      </div>

      {showEditModal && (
        <PlayerImportModal
          playerToEdit={activeDbPlayer}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
