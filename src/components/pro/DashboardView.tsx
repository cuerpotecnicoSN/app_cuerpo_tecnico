import type { Player, DevTask, MedicalRecord, WorkoutLog } from '../types';
import { ArrowLeft, Edit2, Trash2, MapPin, Flag, Coins, Ruler, Weight, Calendar } from 'lucide-react';

interface DashboardViewProps {
  players: Player[];
  activePlayer: Player;
  tasks?: DevTask[];
  medicalData?: Record<string, MedicalRecord>;
  workouts?: WorkoutLog[];
  activeRole?: string;
  onSelectTab?: (tab: string) => void;
  onSelectPlayer?: (id: string) => void;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statCard = (icon: React.ReactNode, label: string, value: string | number) => (
  <div className="card" style={{ padding: '1rem' }}>
    <div className="flex items-center gap-2 text-muted" style={{ marginBottom: '0.4rem' }}>
      {icon}
      <span className="text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{label}</span>
    </div>
    <p className="h3" style={{ margin: 0 }}>{value || '-'}</p>
  </div>
);

export default function DashboardView({ activePlayer, onBack, onEdit, onDelete }: DashboardViewProps) {
  const statusBadge =
    activePlayer.status === 'Apto' ? 'badge-success' :
    activePlayer.status === 'Duda' ? 'badge-warning' : 'badge-danger';

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div className="flex items-center justify-between mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn btn-outline" onClick={onBack}>
          <ArrowLeft size={16} />
          Volver a la plantilla
        </button>
        <div className="flex gap-2">
          {onEdit && (
            <button className="btn btn-outline" onClick={onEdit}>
              <Edit2 size={16} />
              Editar
            </button>
          )}
          {onDelete && (
            <button className="btn btn-danger" onClick={onDelete}>
              <Trash2 size={16} />
              Eliminar jugador
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
        <img
          src={activePlayer.avatar}
          alt={activePlayer.name}
          style={{ width: '120px', height: '120px', borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '2px solid var(--color-border)' }}
        />
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h1 className="h1" style={{ marginBottom: '0.5rem' }}>{activePlayer.name || 'Sin nombre'}</h1>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <span className="badge badge-neutral">{activePlayer.position}</span>
            <span className={`badge ${statusBadge}`}>{activePlayer.status}</span>
            {activePlayer.currentClub && (
              <span className="badge badge-neutral">
                <MapPin size={12} style={{ marginRight: '0.25rem' }} />
                {activePlayer.currentClub}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {statCard(<Calendar size={14} />, 'Edad', activePlayer.age ? `${activePlayer.age} años` : '-')}
        {statCard(<Calendar size={14} />, 'Nacimiento', activePlayer.birthDate && !isNaN(new Date(activePlayer.birthDate).getTime()) ? new Date(activePlayer.birthDate).toLocaleDateString('es-ES') : '-')}
        {statCard(<Ruler size={14} />, 'Altura', activePlayer.height ? `${activePlayer.height} cm` : '-')}
        {statCard(<Weight size={14} />, 'Peso', activePlayer.weight ? `${activePlayer.weight} kg` : '-')}
      </div>

      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div className="flex items-center gap-2 text-muted" style={{ marginBottom: '0.4rem' }}>
            <Flag size={14} />
            <span className="text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Lugar de Nacimiento</span>
          </div>
          <p className="h3 flex items-center gap-2" style={{ margin: 0 }}>
            {activePlayer.birthPlaceFlag && <img src={activePlayer.birthPlaceFlag} alt="Flag" style={{ width: '20px', borderRadius: '2px' }} />}
            {activePlayer.birthPlace || activePlayer.nationality || '-'}
          </p>
        </div>
        {statCard(<div style={{ width: 14, height: 14, border: '2px solid currentColor', borderRadius: '50%' }} />, 'Pie Dominante', activePlayer.dominantFoot || '-')}
        {activePlayer.marketValue && statCard(<Coins size={14} />, 'Valor de mercado', activePlayer.marketValue)}
        {activePlayer.rating != null && statCard(<Flag size={14} />, 'Valoración', activePlayer.rating)}
      </div>

      {(Array.isArray(activePlayer.careerClubs) && activePlayer.careerClubs.length > 0) ? (
        <div className="card">
          <h3 className="h3 mb-4">Trayectoria</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="p-2 font-bold text-secondary text-sm">Temporada</th>
                  <th className="p-2 font-bold text-secondary text-sm">Club</th>
                </tr>
              </thead>
              <tbody>
                {activePlayer.careerClubs.map((club: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-black/5" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="p-2 font-medium">{club.seasons}</td>
                    <td className="p-2 flex items-center gap-2">
                      {club.logo && <img src={club.logo} alt={club.club} width={20} height={20} className="object-contain" />}
                      <span>{club.club}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activePlayer.history ? (
        <div className="card">
          <h3 className="h3 mb-2">Trayectoria</h3>
          <p className="text-secondary" style={{ lineHeight: 1.6 }}>{activePlayer.history}</p>
        </div>
      ) : null}
    </div>
  );
}
