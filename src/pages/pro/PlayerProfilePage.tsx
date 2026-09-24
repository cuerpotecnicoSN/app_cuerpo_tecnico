import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Weight, Stethoscope, ArrowLeft, Edit2, Target, Users2, FileText, Plus, Trash2, CalendarDays, MapPin, BarChart2, Sparkles, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Player, PlayerObjective, MeetingDB, SeasonReport, MeetingInsightCategory } from '../../components/types';
import { MEETING_INSIGHT_CATEGORIES } from '../../components/types';
import { analyzeMeetingWithGemini } from '../../lib/geminiClient';
import PlayerWeightTab from '../../components/pro/PlayerWeightTab';
import PlayerInjuriesTab from '../../components/pro/PlayerInjuriesTab';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { getPlayerObjectives, createPlayerObjective, updatePlayerObjective, deletePlayerObjective, getSeasonReports, createSeasonReport, deleteSeasonReport } from '../../services/playerObjectives';
import { getMeetingsForPlayer, createMeeting, deleteMeeting, addMeetingPlayer, updateMeeting } from '../../services/meetings';
import { getFlagEmoji } from '../../components/pro/PlayersManagementView';
import RichTextEditor from '../../components/common/RichTextEditor';
import { extractFeedbackFromHtml } from '../../utils/feedbackExtractor';
import TranslatedText from '../../components/common/TranslatedText';
import SubNavTabs from '../../components/common/SubNavTabs';

import PlayerImportModal from '../../components/pro/PlayerImportModal';

type Tab = 'ficha' | 'peso' | 'lesiones' | 'plan' | 'reuniones' | 'informes' | 'feedback';

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: dbPlayers, loading } = useSupabaseData<any>('players');
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawViewParam = searchParams.get('view');
  const initialTab = rawViewParam && ['ficha', 'peso', 'lesiones', 'plan', 'reuniones', 'informes', 'evaluations', 'feedback'].includes(rawViewParam)
    ? (rawViewParam === 'evaluations' ? 'informes' : rawViewParam as Tab)
    : 'ficha';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const param = searchParams.get('view');
    if (param && ['ficha', 'peso', 'lesiones', 'plan', 'reuniones', 'informes', 'evaluations', 'feedback'].includes(param)) {
      setActiveTab(param === 'evaluations' ? 'informes' : param as Tab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: Tab) => {
    setActiveTab(newTab);
    setSearchParams({ view: newTab });
  };

  const players = useMemo<Player[]>(() => {
    return (dbPlayers || []).map(p => ({
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
      {/* Modern Sub-Navigation Tabs Bar */}
      <SubNavTabs
        tabs={[
          { id: 'ficha', label: t('playerTabs.technicalSheet', 'Ficha Técnica'), icon: User },
          { id: 'peso', label: t('playerTabs.weightControl', 'Control de Peso'), icon: Weight },
          { id: 'lesiones', label: t('playerTabs.medicalInjuries', 'Lesiones'), icon: Stethoscope },
          { id: 'plan', label: t('playerTabs.individualPlan', 'Plan Individual'), icon: Target },
          { id: 'reuniones', label: t('playerTabs.individualMeetings', 'Reuniones'), icon: Users2 },
          { id: 'informes', label: t('playerTabs.pastSeasonReports', 'Informes Pasados'), icon: FileText },
          { id: 'feedback', label: t('playerTabs.feedbackTab', 'Feedback & Métricas'), icon: BarChart2 },
        ]}
        activeTab={activeTab}
        onChange={(t) => handleTabChange(t as Tab)}
        rightSlot={
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => navigate('/players')} 
              className="px-4 py-2.5 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
            >
              <ArrowLeft size={15} /> {t('playerProfile.backToRoster', 'Volver')}
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2.5 bg-[var(--color-primary,#db0030)] hover:bg-[#b80028] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-[var(--color-primary,#db0030)]/25 transition-all active:scale-95"
            >
              <Edit2 size={15} /> {t('playerProfile.editProfile', 'Editar Ficha')}
            </button>
          </div>
        }
      />

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
            <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 text-xs font-black uppercase rounded-lg animate-pulse mt-2 sm:mt-0">{t('playerProfile.unavailable')}</span>
          ) : (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black uppercase rounded-lg mt-2 sm:mt-0">{t('playerProfile.available')}</span>
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
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">{t('playerProfile.fullName')}</p>
              <p className="text-sm text-gray-800 font-bold mb-4">{activePlayer.name}</p>

              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">{t('playerProfile.position')}</p>
              <p className="text-sm text-blue-600 uppercase font-black tracking-wider">{activePlayer.position}</p>
            </div>
          </div>

          {/* Right: Data (Mini stats) */}
          <div className="flex-1 flex flex-col justify-center w-full pt-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 text-center md:text-left">{t('playerProfile.performanceSummary')}</h3>
            {/* Mini stats */}
            <div className="flex flex-wrap gap-8 justify-center md:justify-start">
              <div className="text-center md:text-left bg-white border border-gray-100 shadow-sm p-4 rounded-xl min-w-[120px]">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-1 tracking-wider">{t('playerProfile.matchesPlayed')}</span>
                <span className="text-3xl font-extrabold text-gray-800 block leading-none">0</span>
              </div>
              <div className="text-center md:text-left bg-white border border-gray-100 shadow-sm p-4 rounded-xl min-w-[120px]">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-1 tracking-wider">{t('playerProfile.goals')}</span>
                <span className="text-3xl font-extrabold text-emerald-600 block leading-none">0</span>
              </div>
              <div className="text-center md:text-left bg-white border border-gray-100 shadow-sm p-4 rounded-xl min-w-[120px]">
                <span className="text-xs text-gray-400 uppercase font-bold block mb-1 tracking-wider">{t('playerProfile.assists')}</span>
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
                  return t(`playerProfile.fields.${str}`, str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
                };

                let displayValue: React.ReactNode = String(value);

                if (typeof value === 'boolean') {
                  displayValue = value ? t('playerProfile.yes') : t('playerProfile.no');
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
                <span className="text-xs text-gray-400 uppercase font-bold block mb-4 tracking-wider">{t('playerProfile.clubHistory')}</span>
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
                        {club.matches > 0 && <span className="text-xs text-gray-500 font-bold block">{t('playerProfile.matchesAbbr')}: {club.matches}</span>}
                        {club.goals > 0 && <span className="text-xs text-gray-500 font-bold block">{t('playerProfile.goals')}: {club.goals}</span>}
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
        {activeTab === 'feedback' && <PlayerFeedbackTab playerId={activePlayer.id} />}
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

const INSIGHT_CATEGORY_COLORS: Record<MeetingInsightCategory, string> = {
  'Actitud y compromiso': '#3b82f6',
  'Físico': '#f97316',
  'Técnico': '#a855f7',
  'Táctico': '#14b8a6',
  'Mental / Confianza': '#ec4899',
  'Social / Grupo': '#22c55e',
  'Regularidad': '#eab308',
};

function sentimentScore(sentiment: 'positive' | 'negative' | 'neutral') {
  if (sentiment === 'positive') return 1;
  if (sentiment === 'negative') return -1;
  return 0;
}

function MeetingInsightsChart({ meetings }: { meetings: MeetingDB[] }) {
  const { t } = useTranslation();
  const analyzed = meetings.filter((m) => m.ai_insights?.items?.length).sort((a, b) => a.date.localeCompare(b.date));
  if (analyzed.length < 2) return null;

  const overallScoreKey = t('playerTabs.aiOverallScore');
  const data = analyzed.map((m) => {
    const row: Record<string, number | string> = { date: m.date };
    MEETING_INSIGHT_CATEGORIES.forEach((cat) => {
      const items = (m.ai_insights?.items || []).filter((i) => i.category === cat);
      if (items.length > 0) {
        row[cat] = items.reduce((sum, i) => sum + sentimentScore(i.sentiment), 0);
      }
    });
    row[overallScoreKey] = m.ai_insights?.overallScore ?? 0;
    return row;
  });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
        <Sparkles size={16} className="text-purple-500" /> {t('playerTabs.aiEvolutionTitle')}
      </h4>
      <p className="text-xs text-gray-400 mb-4">{t('playerTabs.aiEvolutionDesc')}</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {MEETING_INSIGHT_CATEGORIES.map((cat) => (
            <Line key={cat} type="monotone" dataKey={cat} stroke={INSIGHT_CATEGORY_COLORS[cat]} strokeWidth={2} connectNulls dot={{ r: 3 }} />
          ))}
          <Line type="monotone" dataKey={overallScoreKey} stroke="#0f172a" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlayerMeetingsTab({ playerId }: { playerId: string }) {
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<MeetingDB[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [coach, setCoach] = useState('');
  const [objective, setObjective] = useState('');
  const [development, setDevelopment] = useState('');
  
  const [positives, setPositives] = useState<string[]>([]);
  const [negatives, setNegatives] = useState<string[]>([]);
  const [newPositive, setNewPositive] = useState('');
  const [newNegative, setNewNegative] = useState('');

  const load = () => getMeetingsForPlayer(playerId, 'individual').then(setMeetings).catch(() => setMeetings([]));
  useEffect(() => { load(); }, [playerId]);

  const handleEditClick = (m: MeetingDB) => {
    setEditingId(m.id);
    setDate(m.date || new Date().toISOString().split('T')[0]);
    setTime(m.time || '');
    setLocation(m.location || '');
    setCoach(m.created_by || '');
    setObjective(m.objective || '');
    setDevelopment(m.development || '');
    
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]); 
    setTime(''); 
    setLocation(''); 
    setObjective(''); 
    setDevelopment('');
    setCoach(''); 
    setPositives([]);
    setNegatives([]);
    setNewPositive('');
    setNewNegative('');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!date) return;

    if (editingId) {
      await updateMeeting(editingId, {
        date, time, location, objective, development, created_by: coach
      });
    } else {
      const m = await createMeeting({ 
        type: 'individual', date, time, location, objective, development, created_by: coach
      });
      await addMeetingPlayer(m.id, playerId);
    }
    
    resetForm();
    load();
  };

  const handleAnalyze = async (m: MeetingDB, e: React.MouseEvent) => {
    e.stopPropagation();
    if (analyzingId) return;
    setAnalyzingId(m.id);
    try {
      const insights = await analyzeMeetingWithGemini({ objective: m.objective, development: m.development });
      if (insights) {
        await updateMeeting(m.id, { ai_insights: insights });
        load();
      }
    } catch (err) {
      console.error(err);
      window.alert(t('playerTabs.aiAnalyzeError') as string);
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <MeetingInsightsChart meetings={meetings} />
      <div className="flex justify-end mt-2">
        <button 
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }} 
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all transform hover:scale-[1.02]"
        >
          <Plus size={18} className={showForm ? 'rotate-45 transition-transform' : 'transition-transform'} />
          {showForm ? t('common.cancel') : t('playerTabs.scheduleMeeting')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xl shadow-blue-900/5 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Users2 className="text-blue-500" size={20} />
            {editingId ? t('playerTabs.editMeeting') : t('playerTabs.newMeeting')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('common.date')} *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('common.time')}</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('playerTabs.location')}</label>
              <input
                type="text"
                placeholder={t('playerTabs.locationPlaceholder') as string}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('playerTabs.coachInCharge')}</label>
              <input
                type="text"
                placeholder={t('playerTabs.coachPlaceholder') as string}
                value={coach}
                onChange={(e) => setCoach(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex flex-col gap-1.5 h-full">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('playerTabs.mainTopic')}</label>
              <div className="h-full min-h-[250px]">
                <RichTextEditor
                  value={objective}
                  onChange={setObjective}
                  placeholder={t('playerTabs.meetingReasonPlaceholder') as string}
                  className="h-full"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 h-full">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('playerTabs.notes')}</label>
              <div className="h-full min-h-[250px]">
                <RichTextEditor
                  value={development}
                  onChange={setDevelopment}
                  placeholder={t('playerTabs.notesPlaceholder') as string}
                  className="h-full"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Puntos Positivos */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-emerald-600">{t('playerTabs.positivePoints')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPositive}
                  onChange={(e) => setNewPositive(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newPositive.trim()) { setPositives([...positives, newPositive.trim()]); setNewPositive(''); }
                    }
                  }}
                  className="flex-1 border border-emerald-200 bg-emerald-50/50 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder={t('playerTabs.addPositivePlaceholder') as string}
                />
                <button 
                  type="button"
                  onClick={() => { if (newPositive.trim()) { setPositives([...positives, newPositive.trim()]); setNewPositive(''); } }}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-2 rounded-xl"
                >
                  <Plus size={20} />
                </button>
              </div>
              <ul className="space-y-2 mt-2">
                {positives.map((p, idx) => (
                  <li key={idx} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-2 rounded-lg text-sm text-emerald-800">
                    <span>{p}</span>
                    <button type="button" onClick={() => setPositives(positives.filter((_, i) => i !== idx))} className="text-emerald-400 hover:text-emerald-600"><Trash2 size={14}/></button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Puntos Negativos / A Mejorar */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-red-600">{t('playerTabs.improvementPoints')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNegative}
                  onChange={(e) => setNewNegative(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newNegative.trim()) { setNegatives([...negatives, newNegative.trim()]); setNewNegative(''); }
                    }
                  }}
                  className="flex-1 border border-red-200 bg-red-50/50 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder={t('playerTabs.addImprovementPlaceholder') as string}
                />
                <button 
                  type="button"
                  onClick={() => { if (newNegative.trim()) { setNegatives([...negatives, newNegative.trim()]); setNewNegative(''); } }}
                  className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-xl"
                >
                  <Plus size={20} />
                </button>
              </div>
              <ul className="space-y-2 mt-2">
                {negatives.map((p, idx) => (
                  <li key={idx} className="flex items-center justify-between bg-red-50 border border-red-100 p-2 rounded-lg text-sm text-red-800">
                    <span>{p}</span>
                    <button type="button" onClick={() => setNegatives(negatives.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-100 mt-4">
            {editingId ? (
              <button
                onClick={async () => {
                  if (window.confirm(t('playerTabs.confirmDeleteMeeting') as string)) {
                    await deleteMeeting(editingId);
                    resetForm();
                    load();
                  }
                }}
                className="px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} /> {t('common.delete')}
              </button>
            ) : <div></div>}
            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!date}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                {editingId ? t('playerTabs.saveChanges') : t('playerTabs.scheduleMeeting')}
              </button>
            </div>
          </div>
        </div>
      )}

      {meetings.length === 0 && !showForm ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{t('playerTabs.noMeetingsTitle')}</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {t('playerTabs.noMeetingsDesc')}
          </p>
          <button onClick={() => setShowForm(true)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors">
            <Plus size={18} /> {t('playerTabs.scheduleFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
          {meetings.map((m) => (
            <div 
              key={m.id} 
              onClick={() => handleEditClick(m)}
              className={`bg-white border cursor-pointer ${editingId === m.id ? 'border-blue-400 shadow-md ring-2 ring-blue-50' : 'border-gray-100 hover:border-blue-300 hover:shadow-md'} rounded-2xl p-5 shadow-sm transition-all group relative overflow-hidden flex flex-col h-full`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <CalendarDays size={16} className="text-blue-500"/>
                    {m.date} {m.time ? `- ${m.time}` : ''}
                  </h4>
                  {m.location && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                      <MapPin size={12} className="text-rose-500"/> {m.location}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {m.created_by && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                    {t('playerTabs.ledBy')}: {m.created_by}
                  </div>
                )}

                {m.objective && m.objective !== '<p><br></p>' && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('playerTabs.content')}</p>
                    <TranslatedText
                      html={m.objective}
                      className="text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none"
                    />
                  </div>
                )}

                {m.development && m.development !== '<p><br></p>' && (
                  <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-100/50 mt-2">
                    <p className="text-[11px] font-bold text-blue-600/70 uppercase tracking-wider mb-1">{t('playerTabs.observations')}</p>
                    <TranslatedText
                      html={m.development}
                      className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                    />
                  </div>
                )}

                {m.ai_insights ? (
                  <div className="mt-2 border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-bold text-purple-500 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={12} /> {t('playerTabs.aiInsight')}
                      </p>
                      <span className="text-[11px] font-bold text-gray-500">{m.ai_insights.overallScore}/10</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mb-2">{m.ai_insights.summary}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.ai_insights.items.map((item, idx) => (
                        <span
                          key={idx}
                          title={item.text}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            item.sentiment === 'positive'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : item.sentiment === 'negative'
                              ? 'bg-red-50 text-red-700 border-red-100'
                              : 'bg-gray-50 text-gray-600 border-gray-100'
                          }`}
                        >
                          {item.category}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleAnalyze(m, e)}
                    disabled={analyzingId === m.id}
                    className="mt-2 w-full flex items-center justify-center gap-2 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 disabled:opacity-60 border border-purple-100 rounded-xl py-2 transition-colors"
                  >
                    {analyzingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {analyzingId === m.id ? t('playerTabs.analyzing') : t('playerTabs.analyzeWithAI')}
                  </button>
                )}

                </div>
            </div>
          ))}
        </div>
      )}
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
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('playerTabs.urlOptional') as string} value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
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

function PlayerFeedbackTab({ playerId }: { playerId: string }) {
  const { t, i18n } = useTranslation();
  const [meetings, setMeetings] = useState<MeetingDB[]>([]);

  useEffect(() => {
    getMeetingsForPlayer(playerId, 'individual').then(setMeetings).catch(() => setMeetings([]));
  }, [playerId]);

  const feedbackData = useMemo(() => {
    let totalPositives = 0;
    let totalNegatives = 0;
    const items: { date: string; type: 'positive' | 'negative'; text: string; meetingId: string }[] = [];

    meetings.forEach(m => {
      const extracted = extractFeedbackFromHtml(m.objective || '', m.development || '');

      if (extracted.positives.length > 0) {
        totalPositives += extracted.positives.length;
        extracted.positives.forEach(text => items.push({ date: m.date, type: 'positive', text, meetingId: m.id }));
      }
      if (extracted.negatives.length > 0) {
        totalNegatives += extracted.negatives.length;
        extracted.negatives.forEach(text => items.push({ date: m.date, type: 'negative', text, meetingId: m.id }));
      }
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Group by date
    const grouped: Record<string, typeof items> = {};
    items.forEach(i => {
      if (!grouped[i.date]) grouped[i.date] = [];
      grouped[i.date].push(i);
    });

    return { totalPositives, totalNegatives, grouped };
  }, [meetings]);

  const total = feedbackData.totalPositives + feedbackData.totalNegatives;
  const posPercent = total > 0 ? (feedbackData.totalPositives / total) * 100 : 0;
  const negPercent = total > 0 ? (feedbackData.totalNegatives / total) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <BarChart2 className="text-blue-500" />
          {t('playerTabs.statsSummaryTitle')}
        </h3>

        {total === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('playerTabs.noFeedbackYet')}</p>
        ) : (
          <div className="space-y-8">
            {/* Gráfica de Barras */}
            <div>
              <div className="flex justify-between mb-2 text-sm font-bold">
                <span className="text-emerald-600">{feedbackData.totalPositives} {t('playerTabs.positives')} ({Math.round(posPercent)}%)</span>
                <span className="text-red-600">{feedbackData.totalNegatives} {t('playerTabs.toImprove')} ({Math.round(negPercent)}%)</span>
              </div>
              <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${posPercent}%` }} className="bg-emerald-500 transition-all duration-1000"></div>
                <div style={{ width: `${negPercent}%` }} className="bg-red-500 transition-all duration-1000"></div>
              </div>
            </div>

            {/* Timeline Agrupado */}
            <div className="space-y-6">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Línea Temporal de Feedback</h4>
              {Object.entries(feedbackData.grouped).map(([date, items]) => (
                <div key={date} className="relative pl-6 border-l-2 border-gray-100 pb-2">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500"></div>
                  <h5 className="font-bold text-gray-900 mb-3">{new Date(date).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })}</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {items.filter(i => i.type === 'positive').length > 0 && (
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                        <span className="text-xs font-bold uppercase text-emerald-600 block mb-2">{t('playerTabs.positive', 'Positivo')}</span>
                        <ul className="space-y-2">
                          {items.filter(i => i.type === 'positive').map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-emerald-500 mt-1">•</span> <TranslatedText text={item.text} as="span" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {items.filter(i => i.type === 'negative').length > 0 && (
                      <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                        <span className="text-xs font-bold uppercase text-red-600 block mb-2">{t('playerTabs.toImprove', 'A Mejorar')}</span>
                        <ul className="space-y-2">
                          {items.filter(i => i.type === 'negative').map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-red-500 mt-1">•</span> <TranslatedText text={item.text} as="span" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
