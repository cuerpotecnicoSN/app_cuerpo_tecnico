import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Weight, Stethoscope, ArrowLeft, Edit2, Target, Users2, FileText, Plus, Trash2 } from 'lucide-react';
import type { Player, PlayerObjective, MeetingDB, SeasonReport } from '../../components/types';
import PlayerWeightTab from '../../components/pro/PlayerWeightTab';
import PlayerInjuriesTab from '../../components/pro/PlayerInjuriesTab';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { getPlayerObjectives, createPlayerObjective, updatePlayerObjective, deletePlayerObjective, getSeasonReports, createSeasonReport, deleteSeasonReport } from '../../services/playerObjectives';
import { getMeetingsForPlayer, createMeeting, deleteMeeting, addMeetingPlayer } from '../../services/meetings';
import { getFlagEmoji } from '../../components/pro/PlayersManagementView';

import PlayerImportModal from '../../components/pro/PlayerImportModal';

type Tab = 'ficha' | 'peso' | 'lesiones' | 'plan' | 'reuniones' | 'informes';

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: dbPlayers, loading } = useSupabaseData<any>('players');
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawViewParam = searchParams.get('view');
  const initialTab = rawViewParam && ['ficha', 'peso', 'lesiones', 'plan', 'reuniones', 'informes', 'evaluations'].includes(rawViewParam)
    ? (rawViewParam === 'evaluations' ? 'informes' : rawViewParam as Tab)
    : 'ficha';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const param = searchParams.get('view');
    if (param && ['ficha', 'peso', 'lesiones', 'plan', 'reuniones', 'informes', 'evaluations'].includes(param)) {
      setActiveTab(param === 'evaluations' ? 'informes' : param as Tab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: Tab) => {
    setActiveTab(newTab);
    setSearchParams({ view: newTab });
  };

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
            onClick={() => handleTabChange('ficha')}
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
            onClick={() => handleTabChange('peso')}
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
            onClick={() => handleTabChange('lesiones')}
          >
            <Stethoscope size={20} className={activeTab === 'lesiones' ? 'text-blue-600' : 'text-gray-400'} />
            Lesiones Médicas
          </button>
          <button
            className={`flex-1 sm:flex-none px-6 py-3 font-bold text-base rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border-2 ${
              activeTab === 'plan'
                ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 shadow-sm'
            }`}
            onClick={() => handleTabChange('plan')}
          >
            <Target size={20} className={activeTab === 'plan' ? 'text-blue-600' : 'text-gray-400'} />
            {t('playerTabs.individualPlan')}
          </button>
          <button
            className={`flex-1 sm:flex-none px-6 py-3 font-bold text-base rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border-2 ${
              activeTab === 'reuniones'
                ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 shadow-sm'
            }`}
            onClick={() => handleTabChange('reuniones')}
          >
            <Users2 size={20} className={activeTab === 'reuniones' ? 'text-blue-600' : 'text-gray-400'} />
            {t('playerTabs.individualMeetings')}
          </button>
          <button
            className={`flex-1 sm:flex-none px-6 py-3 font-bold text-base rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border-2 ${
              activeTab === 'informes'
                ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 shadow-sm'
            }`}
            onClick={() => handleTabChange('informes')}
          >
            <FileText size={20} className={activeTab === 'informes' ? 'text-blue-600' : 'text-gray-400'} />
            {t('playerTabs.pastSeasonReports')}
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
      <div className="bg-white p-6 border border-gray-100 shadow-sm rounded-2xl mb-6 flex flex-col">
        {/* Name centered at the top */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6 pb-6 border-b border-gray-100 w-full text-center">
          {activeDbPlayer?.dorsal && (
            <span className="font-black text-blue-600 text-4xl mr-2">
              #{activeDbPlayer.dorsal}
            </span>
          )}
          <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 leading-tight uppercase tracking-tight">
            {activePlayer.name.split(',')[0]}
          </h2>
          {isPlayerBaja ? (
            <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 text-xs font-black uppercase rounded-lg animate-pulse mt-2 sm:mt-0">Baja</span>
          ) : (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black uppercase rounded-lg mt-2 sm:mt-0">Disponible</span>
          )}
        </div>

        {/* Two column layout below */}
        <div className="flex flex-col md:flex-row gap-8 w-full items-start">
          
          {/* Left: Photo, Full Name, Position */}
          <div className="flex flex-col items-center shrink-0 w-full md:w-64">
            {/* Foto */}
            <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-end justify-center relative mb-4">
              {activePlayer.avatar ? (
                <img src={activePlayer.avatar} alt={activePlayer.name} className="w-full h-full object-cover rounded-2xl shadow-sm border border-gray-100" />
              ) : (
                <div className="w-full h-full rounded-2xl border-2 border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
                  <User className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="text-center w-full bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Nombre Completo</p>
              <p className="text-sm text-gray-800 font-bold mb-4">{activePlayer.name}</p>
              
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Demarcación</p>
              <p className="text-sm text-blue-600 uppercase font-black tracking-wider">{activePlayer.position}</p>
            </div>
          </div>

          {/* Right: Data (Mini stats) */}
          <div className="flex-1 flex flex-col justify-center w-full pt-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 text-center md:text-left">Resumen de Rendimiento</h3>
            {/* Mini stats */}
            <div className="flex flex-wrap gap-8 justify-center md:justify-start">
              <div className="text-center md:text-left bg-white border border-gray-100 shadow-sm p-4 rounded-xl min-w-[120px]">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-1 tracking-wider">Partidos Jugados</span>
                <span className="text-3xl font-extrabold text-gray-800 block leading-none">0</span>
              </div>
              <div className="text-center md:text-left bg-white border border-gray-100 shadow-sm p-4 rounded-xl min-w-[120px]">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-1 tracking-wider">Goles</span>
                <span className="text-3xl font-extrabold text-emerald-600 block leading-none">0</span>
              </div>
              <div className="text-center md:text-left bg-white border border-gray-100 shadow-sm p-4 rounded-xl min-w-[120px]">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-1 tracking-wider">Asistencias</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-left">
              {activeDbPlayer && Object.entries(activeDbPlayer).map(([key, value]) => {
                if (
                  value === null || 
                  value === undefined || 
                  value === '' || 
                  key === 'id' || 
                  key.includes('url') || 
                  key === 'created_at' || 
                  key === 'updated_at' || 
                  key === 'user_id' ||
                  key === 'team_id' ||
                  key === 'career_clubs' ||
                  key === 'history' ||
                  typeof value === 'object'
                ) return null;

                const formatLabel = (str: string) => {
                  const translations: Record<string, string> = {
                    first_name: 'Nombre',
                    last_name: 'Apellidos',
                    main_position: 'Posición Principal',
                    birth_date: 'Fecha de Nac.',
                    weight_kg: 'Peso (kg)',
                    height_cm: 'Altura (cm)',
                    medical_status: 'Estado Médico',
                    nationality: 'Nacionalidad',
                    birth_place: 'Lugar de Nac.',
                    dominant_foot: 'Pie Dominante',
                    current_club: 'Club Actual',
                    market_value: 'Valor de Mercado',
                    rating: 'Valoración',
                    dorsal: 'Dorsal'
                  };
                  return translations[str] || str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                };

                let displayValue: React.ReactNode = String(value);

                if (typeof value === 'boolean') {
                  displayValue = value ? 'Sí' : 'No';
                }

                if (key === 'nationality') {
                  displayValue = (
                    <span className="flex items-center gap-2">
                      {String(value)} <span className="text-lg leading-none">{getFlagEmoji(String(value))}</span>
                    </span>
                  );
                }

                if (key === 'current_club') {
                  const clubs = activeDbPlayer.career_clubs || [];
                  const matchedClub = clubs.find((c: any) => c.club && c.club.toLowerCase() === String(value).toLowerCase());
                  displayValue = (
                    <span className="flex items-center gap-2">
                      {matchedClub?.logo && <img src={matchedClub.logo} alt={String(value)} className="w-5 h-5 object-contain" />}
                      {String(value)}
                    </span>
                  );
                }

                return (
                  <div key={key} className="bg-white border border-gray-100 shadow-sm p-4 rounded-xl transition-all hover:shadow-md hover:border-blue-100 flex flex-col justify-center">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1 tracking-wider text-ellipsis overflow-hidden whitespace-nowrap">
                      {formatLabel(key)}
                    </span>
                    <span className="text-sm font-bold text-gray-800 break-words flex items-center">
                      {displayValue}
                    </span>
                  </div>
                );
              })}
            </div>

            {activeDbPlayer?.career_clubs && Array.isArray(activeDbPlayer.career_clubs) && activeDbPlayer.career_clubs.length > 0 && (
              <div className="bg-white border border-gray-100 shadow-sm p-5 rounded-xl mt-6">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-4 tracking-wider">Historial de Clubes (Trayectoria)</span>
                <div className="flex flex-col gap-3">
                  {[...activeDbPlayer.career_clubs].reverse().map((club: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-4">
                        {club.logo ? (
                           <div className="w-10 h-10 bg-white p-1 rounded-md border border-gray-200 shadow-sm flex items-center justify-center">
                             <img src={club.logo} alt={club.club} className="max-w-full max-h-full object-contain" />
                           </div>
                        ) : (
                           <div className="w-10 h-10 bg-gray-200 p-1 rounded-md border border-gray-300 shadow-sm flex items-center justify-center">
                             <User size={16} className="text-gray-400" />
                           </div>
                        )}
                        <div>
                          <span className="font-bold text-gray-900 block">{club.club}</span>
                          <span className="text-xs font-semibold text-gray-500 uppercase">{club.seasons}</span>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        {club.matches > 0 && <span className="text-xs text-gray-500 font-bold block">PJ: {club.matches}</span>}
                        {club.goals > 0 && <span className="text-xs text-gray-500 font-bold block">Goles: {club.goals}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'peso' && (
          <PlayerWeightTab playerId={activePlayer.id} />
        )}

        {activeTab === 'lesiones' && (
          <PlayerInjuriesTab playerId={activePlayer.id} />
        )}

        {activeTab === 'plan' && <PlayerObjectivesTab playerId={activePlayer.id} />}
        {activeTab === 'reuniones' && <PlayerMeetingsTab playerId={activePlayer.id} />}
        {activeTab === 'informes' && <PlayerReportsTab playerId={activePlayer.id} />}
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

function PlayerObjectivesTab({ playerId }: { playerId: string }) {
  const { t } = useTranslation();
  const [objectives, setObjectives] = useState<PlayerObjective[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const load = () => getPlayerObjectives(playerId).then(setObjectives).catch(() => setObjectives([]));
  useEffect(() => { load(); }, [playerId]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    await createPlayerObjective({ player_id: playerId, title, description, status: 'En progreso', target_date: targetDate || undefined });
    setTitle(''); setDescription(''); setTargetDate(''); setShowForm(false);
    load();
  };

  const statusColor = (s: string) => s === 'Cumplido' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : s === 'No cumplido' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => setShowForm((v) => !v)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">
          <Plus size={16} /> {t('playerTabs.newObjective')}
        </button>
      </div>
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 shadow-sm">
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('common.title') as string} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('common.description') as string} value={description} onChange={(e) => setDescription(e.target.value)} />
          <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">{t('common.save')}</button>
        </div>
      )}
      {objectives.length === 0 && !showForm && <p className="text-sm text-gray-400">{t('playerTabs.noObjectives')}</p>}
      <div className="space-y-2">
        {objectives.map((o) => (
          <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-bold text-gray-800">{o.title}</p>
              {o.description && <p className="text-sm text-gray-500 mt-1">{o.description}</p>}
              {o.target_date && <p className="text-xs text-gray-400 mt-1">{t('playerTabs.targetDate')}: {o.target_date}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <select
                className={`text-xs font-bold rounded-lg px-2 py-1 border ${statusColor(o.status)}`}
                value={o.status}
                onChange={async (e) => { await updatePlayerObjective(o.id, { status: e.target.value as PlayerObjective['status'] }); load(); }}
              >
                <option value="En progreso">{t('playerTabs.inProgress')}</option>
                <option value="Cumplido">{t('playerTabs.achieved')}</option>
                <option value="No cumplido">{t('playerTabs.notAchieved')}</option>
              </select>
              <button onClick={async () => { await deletePlayerObjective(o.id); load(); }} className="text-gray-300 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerMeetingsTab({ playerId }: { playerId: string }) {
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<MeetingDB[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [objective, setObjective] = useState('');
  const [coach, setCoach] = useState('');

  const load = () => getMeetingsForPlayer(playerId, 'individual').then(setMeetings).catch(() => setMeetings([]));
  useEffect(() => { load(); }, [playerId]);

  const handleAdd = async () => {
    if (!date) return;
    const m = await createMeeting({ type: 'individual', date, time, location, objective, created_by: coach });
    await addMeetingPlayer(m.id, playerId);
    setDate(''); setTime(''); setLocation(''); setObjective(''); setCoach(''); setShowForm(false);
    load();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => setShowForm((v) => !v)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">
          <Plus size={16} /> Añadir reunión
        </button>
      </div>
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={time} onChange={(e) => setTime(e.target.value)} />
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Lugar" value={location} onChange={(e) => setLocation(e.target.value)} />
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Entrenador" value={coach} onChange={(e) => setCoach(e.target.value)} />
          </div>
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Objetivo de la reunión" value={objective} onChange={(e) => setObjective(e.target.value)} />
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">{t('common.save')}</button>
        </div>
      )}
      {meetings.length === 0 && !showForm && <p className="text-sm text-gray-400">{t('playerTabs.noMeetings')}</p>}
      <div className="space-y-2">
        {meetings.map((m) => (
          <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-bold text-gray-800">{m.date} {m.time || ''}</span>
                {m.location && <span className="text-xs text-gray-400">{m.location}</span>}
              </div>
              {m.created_by && <div className="mb-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">Entrenador: {m.created_by}</div>}
              {m.objective && <p className="text-sm text-gray-600">{m.objective}</p>}
            </div>
            <button onClick={async () => { await deleteMeeting(m.id); load(); }} className="text-gray-300 hover:text-red-500 shrink-0">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerReportsTab({ playerId }: { playerId: string }) {
  const { t } = useTranslation();
  const [reports, setReports] = useState<SeasonReport[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [summary, setSummary] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const load = () => getSeasonReports(playerId).then(setReports).catch(() => setReports([]));
  useEffect(() => { load(); }, [playerId]);

  const handleAdd = async () => {
    if (!summary.trim()) return;
    await createSeasonReport({ player_id: playerId, summary, file_url: fileUrl || undefined });
    setSummary(''); setFileUrl(''); setShowForm(false);
    load();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => setShowForm((v) => !v)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">
          <Plus size={16} /> {t('playerTabs.newReport')}
        </button>
      </div>
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 shadow-sm">
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('playerTabs.summary') as string} value={summary} onChange={(e) => setSummary(e.target.value)} />
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="URL (opcional)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">{t('common.save')}</button>
        </div>
      )}
      {reports.length === 0 && !showForm && <p className="text-sm text-gray-400">{t('playerTabs.noReports')}</p>}
      <div className="space-y-2">
        {reports.map((r) => (
          <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex justify-between items-start gap-3">
            <div>
              <p className="text-sm text-gray-700">{r.summary}</p>
              {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">{r.file_url}</a>}
            </div>
            <button onClick={async () => { await deleteSeasonReport(r.id); load(); }} className="text-gray-300 hover:text-red-500">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
