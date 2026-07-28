import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockPlayers, mockMeetings, mockAssessments } from '../../data/mockPlayers';
import { ArrowLeft, User, Activity, Target, PieChart, Plus, TrendingUp, ShieldAlert, Zap } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, Tooltip as RechartsTooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import '../../components/players/players.css';

import MeetingFormModal from '../../components/meetings/MeetingFormModal';

const loadEvolutionData = [
  { name: 'Sem 1', value: 70 },
  { name: 'Sem 2', value: 75 },
  { name: 'Sem 3', value: 85 },
  { name: 'Sem 4', value: 80 },
  { name: 'Sem 5', value: 95 },
  { name: 'Sem 6', value: 90 },
];

const PlayerProfile = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ficha');
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);

  const player = mockPlayers.find(p => p.id === id);

  if (!player) {
    return (
      <div className="p-6 text-center">
        <h2 className="h2 mb-4">{t('players.notFound') || 'Jugador no encontrado'}</h2>
        <button className="btn btn-primary" onClick={() => navigate('/team')}>{t('players.backToTeam') || 'Volver al equipo'}</button>
      </div>
    );
  }

  const assessment = mockAssessments.find(a => a.playerId === player.id);
  const radarData = assessment ? [
    { subject: 'Técnica', A: assessment.scores.technique, fullMark: 10 },
    { subject: 'Táctica', A: assessment.scores.tactics, fullMark: 10 },
    { subject: 'Físico', A: assessment.scores.physical, fullMark: 10 },
    { subject: 'Mental', A: assessment.scores.mental, fullMark: 10 },
    { subject: 'Social', A: assessment.scores.social, fullMark: 10 },
    { subject: 'Decisión', A: assessment.scores.decisionMaking, fullMark: 10 },
  ] : [];

  return (
    <div className="animate-fade-in p-6">
      <MeetingFormModal 
        isOpen={isMeetingModalOpen} 
        onClose={() => setIsMeetingModalOpen(false)} 
        preselectedPlayerId={player.id} 
      />

      {/* Hero Profile Header (High Performance UX) */}
      <div className="card glass-panel mb-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-secondary rounded-full blur-[100px] opacity-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-stretch gap-6">
          <div className="flex items-center gap-6">
            <button className="btn btn-outline" style={{ borderRadius: 'var(--radius-full)' }} onClick={() => navigate('/team')}>
              <ArrowLeft size={20} />
            </button>
            <div className="relative">
              <img src={player.photoUrl} alt={player.firstName} className="w-32 h-32 rounded-full border-4 border-primary shadow-glow object-cover bg-hover" />
              <div className="absolute -bottom-2 -right-2 bg-surface border border-zinc-700 text-white font-display font-bold w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md">
                {player.kitNumber}
              </div>
            </div>
            <div>
              <h1 className="h1 mb-1">{player.firstName} {player.lastName}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className="badge badge-primary bg-primary-glow text-primary">{player.mainPosition}</span>
                <span className="text-muted">{player.team}</span>
                <span className="text-xs text-secondary flex items-center gap-1"><ShieldAlert size={14}/> Alta Médica</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col justify-center items-center gap-2 bg-surface/50 p-4 rounded-xl border border-zinc-800 min-w-[200px]">
             <span className="text-xs uppercase font-bold text-muted tracking-wider">Score Global</span>
             <div className="h1 text-primary font-display flex items-baseline gap-1">
               8.4 <span className="text-sm text-secondary flex items-center"><TrendingUp size={14}/> +0.2</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid-3 mb-6">
        <div className="card glass-panel flex items-center gap-4">
          <div className="bg-primary-glow p-3 rounded-xl"><Zap className="text-primary" size={24}/></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase">Estado de Forma</p>
            <p className="h3 font-display">Excelente</p>
          </div>
        </div>
        <div className="card glass-panel flex items-center gap-4">
          <div className="bg-secondary-glow p-3 rounded-xl"><Activity className="text-secondary" size={24}/></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase">Minutos Jugados</p>
            <p className="h3 font-display">{player.minutesPlayed} <span className="text-sm font-sans text-muted">min</span></p>
          </div>
        </div>
        <div className="card glass-panel flex items-center gap-4">
          <div className="bg-accent-glow p-3 rounded-xl"><Target className="text-accent" size={24}/></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase">Goles / Asist.</p>
            <p className="h3 font-display">{player.goals} / {player.assists}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-surface p-1 rounded-lg border border-zinc-800 w-fit">
        <button className={`px-4 py-2 rounded-md font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'ficha' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => setActiveTab('ficha')}>
          <User size={16} /> Ficha Técnica
        </button>
        <button className={`px-4 py-2 rounded-md font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'evaluacion' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => setActiveTab('evaluacion')}>
          <PieChart size={16} /> Rendimiento
        </button>
        <button className={`px-4 py-2 rounded-md font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'seguimiento' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'}`} onClick={() => setActiveTab('seguimiento')}>
          <Activity size={16} /> Historial
        </button>
      </div>

      {/* Content */}
      <div className={activeTab === 'ficha' ? 'block' : 'hidden'}>
        <div className="grid-2">
          <div className="card glass-panel">
             <h3 className="h3 font-display mb-6 border-b border-zinc-800 pb-2 text-primary">Datos Personales</h3>
             <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center"><span className="text-muted">Fecha Nacimiento</span> <span className="font-semibold">{new Date(player.birthDate).toLocaleDateString()}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted">Nacionalidad</span> <span className="font-semibold">{player.nationality}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted">Altura</span> <span className="font-semibold">{player.height} cm</span></div>
                <div className="flex justify-between items-center"><span className="text-muted">Peso</span> <span className="font-semibold">{player.weight} kg</span></div>
                <div className="flex justify-between items-center"><span className="text-muted">Pierna Dominante</span> <span className="font-semibold">{player.dominantFoot}</span></div>
             </div>
          </div>
          <div className="card glass-panel">
             <h3 className="h3 font-display mb-6 border-b border-zinc-800 pb-2 text-primary">Datos Contractuales</h3>
             <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center"><span className="text-muted">Categoría</span> <span className="font-semibold">{player.category}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted">Equipo</span> <span className="font-semibold">{player.team}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted">Temporada</span> <span className="font-semibold">{player.season}</span></div>
             </div>
          </div>
        </div>
      </div>

      <div className={activeTab === 'evaluacion' ? 'block' : 'hidden'}>
        <div className="grid-2">
          <div className="card glass-panel">
            <h3 className="h3 font-display mb-4 text-center">Perfil de Atributos</h3>
             {radarData.length > 0 ? (
               <div className="w-full h-[350px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                     <PolarGrid stroke="var(--color-border)" />
                     <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                     <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
                     <Radar name="Scouting" dataKey="A" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.5} />
                   </RadarChart>
                 </ResponsiveContainer>
               </div>
             ) : (
               <p className="text-center text-muted">No hay evaluaciones disponibles.</p>
             )}
          </div>
          
          <div className="card glass-panel">
            <h3 className="h3 font-display mb-4">Evolución de Carga Fisiológica</h3>
            <div className="w-full h-[300px] mt-4">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={loadEvolutionData}>
                   <defs>
                      <linearGradient id="lineColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                   <XAxis dataKey="name" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} fontSize={12} />
                   <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} />
                   <Line type="monotone" dataKey="value" stroke="var(--color-secondary)" strokeWidth={3} dot={{ fill: 'var(--color-bg-surface)', stroke: 'var(--color-secondary)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: 'var(--color-secondary)' }} />
                 </LineChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className={activeTab === 'seguimiento' ? 'block' : 'hidden'}>
        <div className="card glass-panel">
          <div className="flex justify-between items-center mb-6">
            <h3 className="h3 font-display">Timeline de Intervenciones</h3>
            <button className="btn btn-primary" onClick={() => setIsMeetingModalOpen(true)}>
              <Plus size={16} /> Nueva
            </button>
          </div>
          <div className="flex flex-col gap-6">
            {mockMeetings.filter(m => m.playerIds.includes(player.id)).map(meeting => (
              <div key={meeting.id} className="relative pl-6 border-l-2 border-zinc-800">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary shadow-glow"></div>
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <span className="font-bold text-lg text-primary mr-2">{meeting.type}</span>
                     {meeting.playerIds.length > 1 && (
                       <span className="badge badge-secondary">Grupal</span>
                     )}
                   </div>
                   <span className="text-muted text-sm">{new Date(meeting.date).toLocaleDateString()} a las {meeting.time}</span>
                </div>
                <p className="font-semibold mb-2">{meeting.objective}</p>
                <p className="text-sm text-secondary mb-3 bg-surface p-3 rounded border border-zinc-800">{meeting.development}</p>
                
                <div className="flex gap-2 flex-wrap">
                   {meeting.topics.map(topic => (
                     <span key={topic} className="badge badge-neutral bg-hover">
                       {topic}
                     </span>
                   ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
