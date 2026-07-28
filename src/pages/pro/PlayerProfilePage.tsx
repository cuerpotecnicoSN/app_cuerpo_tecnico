import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Player } from '../../components/types';
import DashboardView from '../../components/pro/DashboardView';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';
import PlayerImportModal from '../../components/pro/PlayerImportModal';

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: dbPlayers, loading } = useSupabaseData<any>('players');
  const [showEditModal, setShowEditModal] = useState(false);

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

  const handleDelete = async () => {
    if (!activePlayer) return;
    if (!window.confirm(`¿Seguro que quieres eliminar a ${activePlayer.name}? Esta acción no se puede deshacer.`)) return;
    try {
      const { error } = await supabase.from('players').delete().eq('id', activePlayer.id);
      if (error) throw error;
      navigate('/players');
    } catch (err: any) {
      alert('Error al eliminar el jugador: ' + err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-muted">Cargando perfil desde base de datos...</div>;
  }

  if (!activePlayer) {
    return <div className="p-8 text-muted">Jugador no encontrado en la base de datos.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto h-full">
      <DashboardView
        players={players}
        activePlayer={activePlayer}
        activeRole="Entrenador"
        onBack={() => navigate('/players')}
        onEdit={() => setShowEditModal(true)}
        onDelete={handleDelete}
      />

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
