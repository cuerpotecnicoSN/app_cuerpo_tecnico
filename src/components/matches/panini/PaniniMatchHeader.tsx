import { useTranslation } from 'react-i18next';
import { 
  Award, 
  Calendar, 
  MapPin, 
  UserCheck, 
  Clock, 
  Timer
} from 'lucide-react';
import type { PaniniMatchReport } from '../../../types/paniniReport';
import type { MatchDB } from '../../../components/types';

interface Props {
  report: PaniniMatchReport;
  match?: MatchDB;
  homeLogo?: string;
  awayLogo?: string;
}

export default function PaniniMatchHeader({ report, match, homeLogo, awayLogo }: Props) {
  const { i18n } = useTranslation();
  const home = report.equipo_local;
  const away = report.equipo_visitante;

  const formatJornada = (jornadaStr?: string) => {
    if (!jornadaStr) return '';
    const matchNumber = jornadaStr.match(/\d+/);
    if (matchNumber) {
      const num = parseInt(matchNumber[0], 10);
      const currentLang = i18n.language || 'es';
      if (currentLang.startsWith('en')) {
        return `Matchday ${num}`;
      }
      if (currentLang.startsWith('it')) {
        return `Giornata ${num}`;
      }
      if (currentLang.startsWith('fr')) {
        return `Journée ${num}`;
      }
      return `Jornada ${num}`;
    }
    return jornadaStr;
  };

  // Resolved logos: prefer scraped logos from match card, then report, then fallback
  const resolvedHomeLogo = homeLogo || match?.home_logo || (home as any).logo || (home.nombre.toLowerCase().includes('milan') ? '/escudo.png' : undefined);
  const resolvedAwayLogo = awayLogo || match?.away_logo || (away as any).logo || (away.nombre.toLowerCase().includes('milan') ? '/escudo.png' : undefined);

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner: Competencia, Jornada y Fecha */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3.5 py-1 bg-amber-400 text-black rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-md">
            <Award size={14} /> PANINI DIGITAL MATCH ANALYSIS
          </span>
          <span className="text-xs font-bold text-indigo-200 bg-white/10 px-3 py-1 rounded-full border border-white/10">
            {report.competicion} • {formatJornada(report.jornada)}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-gray-300 flex-wrap">
          <span className="flex items-center gap-1"><Calendar size={13} className="text-indigo-400" /> {report.fecha}</span>
          <span className="flex items-center gap-1"><MapPin size={13} className="text-indigo-400" /> {report.estadio}</span>
          <span className="flex items-center gap-1"><UserCheck size={13} className="text-indigo-400" /> Árb: {report.arbitro}</span>
        </div>
      </div>

      {/* Main Scoreboard with Team Crests & Scorers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Teams and Result Box */}
        <div className="lg:col-span-7 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between gap-4">
            
            {/* Equipo Local */}
            <div className="flex flex-col items-center flex-1 text-center">
              {/* Crest Escudo Local */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/95 backdrop-blur-md p-2 shadow-xl border-2 border-red-500/60 mb-2 flex items-center justify-center transition-transform hover:scale-105 overflow-hidden">
                {resolvedHomeLogo ? (
                  <img 
                    src={resolvedHomeLogo} 
                    alt={home.nombre} 
                    className="w-full h-full object-contain drop-shadow-sm" 
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-red-600 to-amber-600 p-1 flex flex-col items-center justify-center text-white font-black text-xs uppercase shadow-inner">
                    <span>{home.nombre.substring(0, 4)}</span>
                  </div>
                )}
              </div>
              <h3 className="font-black text-lg md:text-xl text-red-400 leading-tight uppercase tracking-wide">
                {home.nombre}
              </h3>
              <span className="text-xs text-gray-400 mt-0.5">Entrenador: {home.entrenador || 'Marco Sgrò'}</span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center px-4">
              <div className="flex items-center gap-3 font-mono font-black text-5xl md:text-6xl tracking-tight">
                <span className="text-red-400 drop-shadow-md">{home.goles}</span>
                <span className="text-gray-500 text-3xl font-light">-</span>
                <span className="text-blue-400 drop-shadow-md">{away.goles}</span>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest bg-emerald-500/20 border border-emerald-500/30 px-3 py-0.5 rounded-full mt-2 shadow-sm">
                Finalizado
              </span>
            </div>

            {/* Equipo Visitante */}
            <div className="flex flex-col items-center flex-1 text-center">
              {/* Crest Escudo Visitante */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/95 backdrop-blur-md p-2 shadow-xl border-2 border-blue-500/60 mb-2 flex items-center justify-center transition-transform hover:scale-105 overflow-hidden">
                {resolvedAwayLogo ? (
                  <img 
                    src={resolvedAwayLogo} 
                    alt={away.nombre} 
                    className="w-full h-full object-contain drop-shadow-sm" 
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-700 to-slate-900 p-1 flex flex-col items-center justify-center text-white font-black text-xs uppercase shadow-inner">
                    <span>{away.nombre.substring(0, 4)}</span>
                  </div>
                )}
              </div>
              <h3 className="font-black text-lg md:text-xl text-blue-400 leading-tight uppercase tracking-wide">
                {away.nombre}
              </h3>
              <span className="text-xs text-gray-400 mt-0.5">Entrenador: {away.entrenador || 'Sergio Navarro'}</span>
            </div>

          </div>

          {/* Goleadores */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10 text-xs font-semibold">
            {/* Goles Local */}
            <div className="space-y-1">
              {report.goleadores.filter(g => g.equipo === 'home').map((g, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-red-300">
                  <span className="text-amber-400">⚽</span>
                  <span className="font-bold">{g.minuto}</span>
                  <span className="truncate">{g.jugador}</span>
                </div>
              ))}
              {report.goleadores.filter(g => g.equipo === 'home').length === 0 && (
                <span className="text-gray-500 text-[11px]">- Sin goles -</span>
              )}
            </div>

            {/* Goles Visitante */}
            <div className="space-y-1 text-right">
              {report.goleadores.filter(g => g.equipo === 'away').map((g, idx) => (
                <div key={idx} className="flex items-center justify-end gap-1.5 text-blue-300">
                  <span className="truncate">{g.jugador}</span>
                  <span className="font-bold">{g.minuto}</span>
                  <span className="text-amber-400">⚽</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panini Advanced Index Cards: IVS, xPG & Match Timings */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
          
          {/* IVS Circle Badge */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-3xl flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <span className="text-[11px] font-black text-gray-300 uppercase tracking-wider mb-2">
              Índice IVS (Panini)
            </span>
            <div className="flex items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-200 text-red-600 font-mono font-black text-2xl flex items-center justify-center shadow-lg border-2 border-red-500/60">
                {home.ims || 57}
              </div>
              <span className="font-black text-xs text-amber-400 tracking-wider">IVS</span>
              <div className="w-14 h-14 rounded-full bg-gray-200 text-blue-800 font-mono font-black text-2xl flex items-center justify-center shadow-lg border-2 border-blue-500/60">
                {away.ims || 43}
              </div>
            </div>
            <span className="text-[10px] text-gray-400 mt-2 font-medium">Índice de valoración colectiva</span>
          </div>

          {/* xPG Circle Badge */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-3xl flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <span className="text-[11px] font-black text-gray-300 uppercase tracking-wider mb-2">
              Métrica xPG (Expected Goals)
            </span>
            <div className="flex items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-200 text-red-600 font-mono font-black text-xl flex items-center justify-center shadow-lg border-2 border-red-500/60">
                {home.xg ? String(home.xg).replace('.', ',') : '3,19'}
              </div>
              <span className="font-black text-xs text-emerald-400 tracking-wider">xPG</span>
              <div className="w-14 h-14 rounded-full bg-gray-200 text-blue-800 font-mono font-black text-xl flex items-center justify-center shadow-lg border-2 border-blue-500/60">
                {away.xg ? String(away.xg).replace('.', ',') : '0,94'}
              </div>
            </div>
            <span className="text-[10px] text-gray-400 mt-2 font-medium">Goles esperados del encuentro</span>
          </div>

          {/* Match Durations */}
          <div className="col-span-2 bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                <Clock size={18} />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Tiempo Total Jugado</span>
                <span className="font-mono font-black text-white text-sm">{report.duracion_total || "96' (45+51)"}</span>
              </div>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <Timer size={18} />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Tiempo Efectivo</span>
                <span className="font-mono font-black text-emerald-300 text-sm">{report.tiempo_efectivo || "48':31''"}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Events Timeline */}
      <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="font-black text-gray-400 shrink-0 uppercase tracking-wider flex items-center gap-1 text-[11px]">
          <Clock size={13} /> Línea de Eventos:
        </span>
        {report.timeline_eventos && report.timeline_eventos.map((ev, idx) => {
          const isHome = ev.team === 'home';
          const isGoal = ev.type === 'goal';
          const isYellow = ev.type === 'yellow_card';
          const isRed = ev.type === 'red_card';
          const isSub = ev.type === 'substitution_in';

          return (
            <span
              key={idx}
              className={`shrink-0 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm border ${
                isHome
                  ? 'bg-red-500/20 text-red-200 border-red-500/40'
                  : 'bg-blue-500/20 text-blue-200 border-blue-500/40'
              }`}
            >
              {isGoal && <span>⚽</span>}
              {isYellow && <span className="w-2.5 h-3.5 bg-amber-400 rounded-xs inline-block" />}
              {isRed && <span className="w-2.5 h-3.5 bg-red-600 rounded-xs inline-block" />}
              {isSub && <span className="text-emerald-400 font-black">🔄</span>}
              <span>{ev.minute}</span>
              <span className="font-medium">{ev.player}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
