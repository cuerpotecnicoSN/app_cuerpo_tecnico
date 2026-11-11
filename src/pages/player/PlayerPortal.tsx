import { useEffect, useState } from 'react';
import { LogOut, Target, Loader2, Globe, Menu, X, ArrowLeft, Flame, ChevronRight, User, Sparkles, Layers, BarChart2, ClipboardList } from 'lucide-react';
import PlayerForms from '../../components/forms/PlayerForms';
import NotificationBell from '../../components/notifications/NotificationBell';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { usePlayerSeasonStats } from '../../hooks/usePlayerSeasonStats';
import { translatePosition } from '../../utils/positionTranslations';
import type { Player } from '../../components/types';
import type { DevItem, DevItemComment, DevSectionType } from '../../services/playerDevelopmentSections';
import { getDevItems, getDevItemComments } from '../../services/playerDevelopmentSections';
import PlayerDevelopmentSectionsList, { DEV_SECTIONS_CONFIG } from '../../components/players/development/PlayerDevelopmentSectionsList';
import PlayerMatchStatsTab from '../../components/players/stats/PlayerMatchStatsTab';
import MilanJerseyDorsal from '../../components/common/MilanJerseyDorsal';

type Tab = 'hub' | 'partidos' | 'forms';

export default function PlayerPortal() {
  const { playerId, profile, user, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [player, setPlayer] = useState<Record<string, any> | null>(null);
  const [staff, setStaff] = useState<{ id: string; full_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('hub');
  const [menuOpen, setMenuOpen] = useState(false);

  // Secciones interactivas de desarrollo (Objetivos, Focos, Plan de acción, Análisis competición, Características personales)
  const [devItems, setDevItems] = useState<DevItem[]>([]);
  const [devComments, setDevComments] = useState<DevItemComment[]>([]);
  const [selectedDevSection, setSelectedDevSection] = useState<DevSectionType | 'all'>('all');

  // Si el idioma actual no es ni 'it' ni 'en', forzar 'it' por defecto para el jugador
  const activeLang: 'it' | 'en' = i18n.language?.startsWith('en') ? 'en' : 'it';

  const selectTab = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDevSection = (sec: DevSectionType | 'all') => {
    setSelectedDevSection(sec);
    setTab('hub');
    setTimeout(() => document.getElementById('dev-sections')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const toggleLanguage = () => {
    const next = activeLang === 'it' ? 'en' : 'it';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  const loadDevData = async () => {
    if (!playerId) return;
    try {
      const items = await getDevItems(playerId);
      setDevItems(items);
      if (items.length > 0) {
        const comms = await getDevItemComments(items.map((i) => i.id));
        setDevComments(comms);
      } else {
        setDevComments([]);
      }
    } catch (err) {
      console.error('Error loading dev data in portal', err);
    }
  };

  useEffect(() => {
    if (!i18n.language || (!i18n.language.startsWith('it') && !i18n.language.startsWith('en'))) {
      i18n.changeLanguage('it');
      localStorage.setItem('language', 'it');
    }
  }, [i18n]);

  useEffect(() => {
    if (!playerId) { setLoading(false); return; }
    supabase.from('players').select('*').eq('id', playerId).single()
      .then(({ data }) => { setPlayer(data); setLoading(false); });

    supabase.from('profiles').select('id, full_name, role').neq('role', 'Jugador').neq('role', 'Pendiente')
      .then(({ data }) => setStaff(data ?? []));

    loadDevData();
  }, [playerId]);

  const name = player ? `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() : profile?.full_name ?? '';
  const dorsal = player?.dorsal ?? (player?.kit_number || undefined);
  const tutorName = staff.find((s) => s.id === player?.tutor_id)?.full_name;
  const stats = usePlayerSeasonStats(player as { id: string } | null);

  const playerForStats: Player | undefined = player ? {
    id: player.id,
    name,
    position: player.main_position ?? '',
    age: 0,
    weight: player.weight_kg ?? 0,
    height: player.height_cm ?? 0,
    bodyFat: 0,
    history: '',
    strengths: [],
    weaknesses: [],
    goals: [],
    status: (player.medical_status as 'Apto' | 'Duda' | 'Baja') ?? 'Apto',
    avatar: player.photo_url ?? '',
  } : undefined;

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900 pb-24 sm:pb-12">
      {/* HEADER PRINCIPAL */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md text-white border-b border-white/10 px-3 sm:px-6 py-2.5 sm:py-3 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div
            onClick={() => selectTab('hub')}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity min-w-0 group"
          >
            <img
              src="/escudo.png"
              alt="Escudo"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff4d6d]">
                {t('playerPortal.title', 'Area Giocatore')}
              </p>
              <p className="font-extrabold text-sm sm:text-base leading-tight break-words sm:truncate group-hover:text-white/90">
                {name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <NotificationBell
              audience="player"
              dark
              onOpen={(n) => selectTab(n.kind === 'form_assigned' ? 'forms' : 'hub')}
            />
            {/* Selector de idioma sólo IT / EN para el jugador */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black uppercase tracking-wider text-white transition-all active:scale-95"
              title="Cambia lingua / Switch language"
            >
              <Globe size={13} className="text-[#ff4d6d]" />
              <span>{activeLang === 'it' ? 'IT' : 'EN'}</span>
            </button>

            {/* Menú de 3 rayas (hamburguesa) */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1.5 ${menuOpen ? 'bg-white/15 text-white' : ''}`}
                aria-label="Menu"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 max-h-[85vh] overflow-y-auto rounded-2xl bg-[#18181c] border border-white/10 shadow-2xl p-2 z-40 animate-fade-in text-white divide-y divide-white/10">
                    <div className="px-3 py-2.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff4d6d]">{t('playerPortal.title', 'Area Giocatore')}</p>
                      <p className="text-sm font-extrabold truncate text-white mt-0.5">{name}</p>
                    </div>

                    <div className="py-1.5 space-y-0.5">
                      <button
                        onClick={() => { openDevSection('all'); setMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                          tab === 'hub' ? 'bg-[#db0030] text-white shadow-md font-extrabold' : 'text-white/75 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Layers size={16} className={tab === 'hub' ? 'text-white' : 'text-[#ff4d6d]'} />
                        <span className="truncate">{t('playerPlan.badge', 'Piano Individuale di Sviluppo')}</span>
                      </button>

                      <button
                        onClick={() => {
                          selectTab('partidos');
                          setMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                          tab === 'partidos' ? 'bg-[#db0030] text-white shadow-md font-extrabold' : 'text-white/75 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <BarChart2 size={16} className={tab === 'partidos' ? 'text-white' : 'text-[#ff4d6d]'} />
                        <span className="truncate">{activeLang === 'it' ? 'Statistiche Panini & Partite' : 'Panini & Match Stats'}</span>
                      </button>

                      <button
                        onClick={() => {
                          selectTab('forms');
                          setMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                          tab === 'forms' ? 'bg-[#db0030] text-white shadow-md font-extrabold' : 'text-white/75 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <ClipboardList size={16} className={tab === 'forms' ? 'text-white' : 'text-[#ff4d6d]'} />
                        <span className="truncate">{t('playerPortal.tabs.forms')}</span>
                      </button>

                      <div className="pt-2 pb-1 border-t border-white/10 mt-1">
                        <p className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/40">
                          {activeLang === 'it' ? 'Sezioni di Sviluppo' : 'Development Sections'}
                        </p>
                        {DEV_SECTIONS_CONFIG.map((sec) => {
                          const Icon = sec.icon;
                          const active = tab === 'hub' && selectedDevSection === sec.id;
                          return (
                            <button
                              key={sec.id}
                              onClick={() => {
                                openDevSection(sec.id);
                                setMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                                active ? 'bg-[#db0030] text-white shadow-md font-extrabold' : 'text-white/75 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <Icon size={15} className={active ? 'text-white' : 'text-[#ff4d6d]'} />
                              <span className="truncate">{t(sec.labelKey)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-1.5">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/20 transition-all text-left"
                      >
                        <LogOut size={16} />
                        <span>{t('playerPortal.exit', 'Uscita')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : !player || !playerId ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
            {t('playerPortal.notLinked', 'Il tuo account non è ancora collegato alla scheda di un giocatore.')}
          </div>
        ) : (
          <>
            {/* VISTA HUB PRINCIPAL */}
            {tab === 'hub' ? (
              <div className="space-y-6 animate-fade-in">
                {/* HERO CARD ROSSONERO */}
                <section className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-black text-white shadow-2xl border border-white/10">
                  <div
                    aria-hidden
                    className="absolute inset-y-0 right-0 w-3/4 sm:w-2/3 pointer-events-none"
                    style={{
                      background: 'repeating-linear-gradient(90deg, #db0030 0 36px, #000 36px 72px)',
                      maskImage: 'linear-gradient(to left, rgba(0,0,0,.95), transparent)',
                      WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,.95), transparent)',
                    }}
                  />
                  {dorsal ? (
                    <div
                      aria-hidden="true"
                      className="absolute right-2 sm:right-10 top-1/2 -translate-y-1/2 select-none pointer-events-none flex items-center justify-center z-0 opacity-40 sm:opacity-95"
                    >
                      <MilanJerseyDorsal dorsal={dorsal} size="hero" />
                    </div>
                  ) : null}

                  <div className="relative z-10 p-4 sm:p-8">
                    <div className="flex flex-row items-center sm:items-end gap-4 sm:gap-6 text-left">
                      <div className="w-20 h-26 sm:w-40 sm:h-52 shrink-0 rounded-2xl overflow-hidden bg-white shadow-2xl border-2 border-white/60 flex items-center justify-center">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={name}
                            className="w-full h-full object-cover object-top bg-white"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white">
                            <User size={44} className="text-gray-300" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-[11px] font-black uppercase tracking-wider mb-1">
                          <Sparkles size={12} className="text-[#ff4d6d]" />
                          <span>{t('playerPlan.badge', 'Piano Individuale di Sviluppo')}</span>
                        </span>
                        <h1 className="text-xl sm:text-4xl font-black tracking-tight text-white mt-1 leading-tight break-words">
                          {name}
                        </h1>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-sm">
                          <span className="font-bold bg-white/10 px-3 py-1 rounded-full">
                            {player.main_position ? translatePosition(player.main_position, i18n.language) : t('playerPlan.noPosition', 'Posizione')}
                          </span>
                          {player.category && (
                            <span className="font-bold bg-white/10 px-3 py-1 rounded-full">
                              {player.category}
                            </span>
                          )}
                          <span className="text-white/70">
                            {t('playerPlan.tutor', 'Tutor')}: <strong className="text-white">{tutorName || t('playerPlan.unassigned', 'Non assegnato')}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fila de estadísticas clave del jugador y acceso a Panini */}
                    <div className="mt-5 sm:mt-6 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="w-full sm:w-auto grid grid-cols-4 gap-2 sm:gap-8 text-center sm:text-left">
                        <div className="bg-white/5 sm:bg-transparent rounded-xl py-2 px-1">
                          <p className="text-2xl sm:text-3xl font-black leading-none">{stats?.matches ?? 0}</p>
                          <p className="text-[10px] sm:text-xs text-white/70 mt-1 uppercase tracking-wider">{t('playerPlan.matches', 'Partite')}</p>
                        </div>
                        <div className="bg-white/5 sm:bg-transparent rounded-xl py-2 px-1">
                          <p className="text-2xl sm:text-3xl font-black leading-none">{stats?.minutes ?? 0}'</p>
                          <p className="text-[10px] sm:text-xs text-white/70 mt-1 uppercase tracking-wider">{t('playerPlan.minutes', 'Minuti')}</p>
                        </div>
                        <div className="bg-white/5 sm:bg-transparent rounded-xl py-2 px-1">
                          <p className="text-2xl sm:text-3xl font-black leading-none">{stats?.total.goals ?? 0}</p>
                          <p className="text-[10px] sm:text-xs text-white/70 mt-1 uppercase tracking-wider">{t('playerPlan.goals', 'Gol')}</p>
                        </div>
                        <div className="bg-white/5 sm:bg-transparent rounded-xl py-2 px-1">
                          <p className="text-2xl sm:text-3xl font-black leading-none">{stats?.total.assists ?? 0}</p>
                          <p className="text-[10px] sm:text-xs text-white/70 mt-1 uppercase tracking-wider">{t('playerPlan.assists', 'Assist')}</p>
                        </div>
                      </div>

                      {/* Botón para ver estadísticas de Panini Digital */}
                      <button
                        type="button"
                        onClick={() => selectTab('partidos')}
                        className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#db0030] to-[#990022] hover:from-[#f00035] hover:to-[#b80028] text-white text-xs font-black transition-all active:scale-95 shadow-lg shadow-[#db0030]/25 group"
                      >
                        <BarChart2 size={16} className="text-white/90 group-hover:scale-110 transition-transform" />
                        <span>{activeLang === 'it' ? 'Statistiche Panini & Partite' : 'Panini & Match Stats'}</span>
                        <ChevronRight size={14} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </section>

                <div id="dev-sections" className="scroll-mt-20">
                  <PlayerDevelopmentSectionsList
                    playerId={playerId}
                    items={devItems}
                    comments={devComments}
                    isStaff={false}
                    myId={user?.id}
                    playerName={name}
                    onRefresh={loadDevData}
                    initialSection={selectedDevSection}
                  />
                </div>
              </div>
            ) : tab === 'partidos' ? (
              /* VISTA DE ESTADÍSTICAS PANINI DIGITAL & PARTIDOS */
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <button
                    onClick={() => selectTab('hub')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:border-black text-xs font-bold text-gray-700 hover:text-black active:scale-95 transition-all shadow-xs"
                  >
                    <ArrowLeft size={16} />
                    <span>{activeLang === 'it' ? 'Torna al Menù' : 'Back to Menu'}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-black text-white text-xs font-black uppercase tracking-wider">
                      Panini Digital
                    </span>
                  </div>
                </div>

                <PlayerMatchStatsTab
                  playerId={playerId}
                  playerName={name}
                  playerDbInfo={playerForStats}
                />
              </div>
            ) : tab === 'forms' ? (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <button
                    onClick={() => selectTab('hub')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:border-black text-xs font-bold text-gray-700 hover:text-black active:scale-95 transition-all shadow-xs"
                  >
                    <ArrowLeft size={16} />
                    <span>{activeLang === 'it' ? 'Torna al Menù' : 'Back to Menu'}</span>
                  </button>
                  <span className="px-3 py-1 rounded-full bg-black text-white text-xs font-black uppercase tracking-wider">
                    {t('playerPortal.tabs.forms')}
                  </span>
                </div>
                <PlayerForms playerId={playerId} mode="player" />
              </div>
            ) : null}
          </>
        )}
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR (MÓVIL) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[#111114]/95 backdrop-blur-md border-t border-white/10 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] grid grid-cols-5 shadow-2xl">
        {([
          { key: 'all', icon: Layers, label: activeLang === 'it' ? 'Piano' : 'Plan', active: tab === 'hub' && selectedDevSection === 'all', go: () => openDevSection('all') },
          { key: 'objectives', icon: Target, label: activeLang === 'it' ? 'Obiettivi' : 'Goals', active: tab === 'hub' && selectedDevSection === 'objectives', go: () => openDevSection('objectives') },
          { key: 'focuses', icon: Flame, label: 'Focus', active: tab === 'hub' && selectedDevSection === 'focuses', go: () => openDevSection('focuses') },
          { key: 'stats', icon: BarChart2, label: activeLang === 'it' ? 'Statistiche' : 'Stats', active: tab === 'partidos', go: () => selectTab('partidos') },
          { key: 'forms', icon: ClipboardList, label: t('playerPortal.tabs.forms'), active: tab === 'forms', go: () => selectTab('forms') },
        ] as const).map(({ key, icon: Icon, label, active, go }) => (
          <button key={key} onClick={go} className={`flex flex-col items-center gap-0.5 py-1 rounded-xl transition-colors ${active ? 'text-[#ff4d6d]' : 'text-white/60'}`}>
            <span className={`w-10 h-7 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-[#db0030]/20' : ''}`}><Icon size={19} /></span>
            <span className="text-[10px] font-black">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
