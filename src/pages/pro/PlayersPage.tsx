import React, { useState, useMemo } from 'react';
import type { Player, DevTask, MedicalRecord, SportsStats } from '../../components/types';
import PlayersManagementView from '../../components/pro/PlayersManagementView';
import { useNavigate } from 'react-router-dom';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import PlayerImportModal from '../../components/pro/PlayerImportModal';
import { Plus, Users as UsersIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import '../staff/staff.css';

export default function PlayersPage() {
  const navigate = useNavigate();
  const [showImportModal, setShowImportModal] = useState(false);
  const { data: dbPlayers, loading } = useSupabaseData<any>('players');

  // Mapeamos los datos de la base de datos al formato que espera el frontend
  const players = useMemo<Player[]>(() => {
    return dbPlayers.map(p => ({
      id: p.id,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      position: p.main_position || 'Sin definir',
      age: p.birth_date ? new Date().getFullYear() - new Date(p.birth_date).getFullYear() : 0,
      weight: p.weight_kg || 0,
      height: p.height_cm || 0,
      bodyFat: 0,
      history: 'Información desde base de datos',
      strengths: [],
      weaknesses: [],
      goals: [],
      status: p.medical_status || 'Apto',
      nationality: p.nationality,
      dominantFoot: p.dominant_foot,
      avatar: p.photo_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
    }));
  }, [dbPlayers]);

  const [medicals, setMedicals] = useState<Record<string, MedicalRecord>>({});
  const [stats, setStats] = useState<Record<string, SportsStats>>({});
  const [tasks, setTasks] = useState<DevTask[]>([]);

  const [playerToEdit, setPlayerToEdit] = useState<any>(null);

  const handleDeletePlayer = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar a este jugador?')) {
      try {
        const { error } = await supabase.from('players').delete().eq('id', id);
        if (error) throw error;
        window.location.reload();
      } catch (err) {
        console.error('Error al eliminar jugador:', err);
        alert('Hubo un error al eliminar el jugador.');
      }
    }
  };

  const handleAddPlayer = () => {
    setPlayerToEdit(null);
    setShowImportModal(true);
  };

  const handleEditPlayer = (player: Player) => {
    // Buscar el jugador completo de dbPlayers para tener todos sus datos
    const dbPlayer = dbPlayers.find((p: any) => p.id === player.id);
    if (dbPlayer) {
      setPlayerToEdit(dbPlayer);
      setShowImportModal(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="staff-header" style={{ marginBottom: 0 }}>
        <div>
          <p className="staff-breadcrumb">Jugadores</p>
          <h1 className="staff-title">
            Plantilla {loading && <span className="text-sm text-muted" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(Cargando datos reales...)</span>}
          </h1>
        </div>
        <div className="staff-actions">
          {players.length > 0 && (
            <button
              onClick={() => navigate(`/players/${players[0].id}`)}
              className="btn btn-outline"
            >
              Ver primera ficha
            </button>
          )}
          <button onClick={() => setShowImportModal(true)} className="btn btn-primary">
            <Plus size={16} />
            Añadir jugador
          </button>
        </div>
      </div>

      {!loading && players.length === 0 && (
        <div className="card staff-empty">
          <UsersIcon size={32} className="text-muted" />
          <p className="h3 mt-4">No hay jugadores en la base de datos</p>
          <p className="text-muted mt-2">
            Puedes añadirlos importándolos de BeSoccer o desde el panel de administración.
          </p>
        </div>
      )}

      {showImportModal && (
        <PlayerImportModal
          playerToEdit={playerToEdit}
          onClose={() => {
            setShowImportModal(false);
            setPlayerToEdit(null);
          }}
          onSuccess={() => {
            setShowImportModal(false);
            setPlayerToEdit(null);
            window.location.reload();
          }}
        />
      )}

      {players.length > 0 && (
        <PlayersManagementView 
          players={players}
          onAddPlayer={handleAddPlayer}
          onUpdatePlayer={handleEditPlayer}
          onDeletePlayer={handleDeletePlayer}
          tasks={tasks}
          onAddTask={(task: DevTask) => setTasks([...tasks, task])}
          onUpdateTaskProgress={() => {}}
          onAddTaskComment={() => {}}
          onUpdateTask={(task: DevTask) => setTasks(tasks.map(t => t.id === task.id ? task : t))}
          medicals={medicals}
          onUpdateMedical={(medical: MedicalRecord) => setMedicals({...medicals, [medical.playerId]: medical})}
          stats={stats}
          onUpdateStats={(playerId: string, updatedStats: SportsStats) => setStats({...stats, [playerId]: updatedStats})}
          activeRole="Entrenador"
          language="es"
        />
      )}
    </div>
  );
}
