import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, User, ExternalLink, ArrowRight, ArrowLeft } from 'lucide-react';
import type { PaniniPassingMatrix, PaniniPassingNode } from '../../../types/paniniReport';

interface Props {
  passingDataHome: PaniniPassingMatrix;
  passingDataAway: PaniniPassingMatrix;
  homeTeamName: string;
  awayTeamName: string;
}

export default function PassNetworkPitch({
  passingDataHome,
  passingDataAway,
  homeTeamName,
  awayTeamName,
}: Props) {
  const navigate = useNavigate();
  const [selectedTeamKey, setSelectedTeamKey] = useState<'away' | 'home'>('away');
  const [activePlayerDorsal, setActivePlayerDorsal] = useState<number | null>(null);

  const passingData = selectedTeamKey === 'away' ? passingDataAway : passingDataHome;
  const isHome = selectedTeamKey === 'home';
  const players = passingData.jugadores;
  const matrix = passingData.matriz || {};

  const activePlayer = players.find((p) => p.dorsal === activePlayerDorsal);

  // Generate list of links from the passing matrix
  const links: { from: PaniniPassingNode; to: PaniniPassingNode; count: number }[] = [];
  players.forEach((pFrom) => {
    const row = matrix[pFrom.dorsal] || {};
    players.forEach((pTo) => {
      if (pFrom.dorsal !== pTo.dorsal) {
        const count = row[pTo.dorsal] || 0;
        if (count >= 2) {
          links.push({ from: pFrom, to: pTo, count });
        }
      }
    });
  });

  const navigateToPlayerCard = (playerId?: string) => {
    if (playerId) {
      navigate(`/players/${playerId}?view=ficha`);
    } else {
      navigate(`/players?view=ficha`);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
        <div>
          <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
            <Share2 className="text-indigo-600 dark:text-indigo-400" size={20} />
            Campograma: Red de Pases e Intercambios (Flussi di Gioco)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Volumen e intensidad de asociaciones entre jugadores sobre el terreno de juego
          </p>
        </div>

        {/* Team Selector */}
        <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-2xl">
          <button
            onClick={() => { setSelectedTeamKey('away'); setActivePlayerDorsal(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedTeamKey === 'away'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
            {awayTeamName} ({passingDataAway.total_equipo_pases} pases - {passingDataAway.precision_equipo_pct}%)
          </button>
          <button
            onClick={() => { setSelectedTeamKey('home'); setActivePlayerDorsal(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedTeamKey === 'home'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
            {homeTeamName} ({passingDataHome.total_equipo_pases} pases - {passingDataHome.precision_equipo_pct}%)
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Pass Network Visualizer (Horizontal Pitch + Weighted SVG Links + Nodes) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="relative w-full aspect-[105/68] max-w-[660px] rounded-3xl overflow-hidden shadow-2xl border-4 border-emerald-950/30 bg-[#a7d7a9] select-none p-4">
            
            {/* Pitch Markings SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 105 68" preserveAspectRatio="none">
              <rect x="6" y="4" width="93" height="60" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" rx="1.5" />
              <line x1="52.5" y1="4" x2="52.5" y2="64" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" />
              <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" />
              <rect x="6" y="16" width="16.5" height="36" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" />
              <rect x="82.5" y="16" width="16.5" height="36" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" />
            </svg>

            {/* SVG Connecting Links */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {links.map((link, idx) => {
                const x1 = link.from.x ?? 50;
                const y1 = link.from.y ?? 50;
                const x2 = link.to.x ?? 50;
                const y2 = link.to.y ?? 50;

                const isFromActive = activePlayerDorsal === link.from.dorsal;
                const isToActive = activePlayerDorsal === link.to.dorsal;
                const isHighlighted = isFromActive || isToActive;
                const isDimmed = activePlayerDorsal !== null && !isHighlighted;

                const strokeWidth = Math.min(Math.max(link.count * 0.45, 0.9), 4.5);
                const strokeColor = isHighlighted
                  ? isFromActive
                    ? '#0284c7' // Outbound pass from active player
                    : '#16a34a' // Inbound pass to active player
                  : isHome
                  ? 'rgba(220, 38, 38, 0.55)'
                  : 'rgba(29, 78, 216, 0.55)';

                return (
                  <g key={idx}>
                    <line
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      opacity={isDimmed ? 0.15 : isHighlighted ? 1 : 0.75}
                      className="transition-all duration-200"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Nodes (Players) */}
            {players.map((p) => {
              const xPos = p.x ?? 50;
              const yPos = p.y ?? 50;
              const isActive = activePlayerDorsal === p.dorsal;
              const totalGiven = passingData.totales_dados[p.dorsal] || 0;
              const surname = p.nombre.split(' ').pop() || p.nombre;

              return (
                <div
                  key={p.dorsal}
                  onClick={() => setActivePlayerDorsal(isActive ? null : p.dorsal)}
                  style={{
                    left: `${xPos}%`,
                    top: `${yPos}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute z-30 flex flex-col items-center cursor-pointer transition-all duration-200 ${
                    isActive ? 'scale-125 z-40' : 'hover:scale-110'
                  }`}
                >
                  {/* Player Circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-xl border-2 transition-all ${
                      isActive
                        ? 'bg-amber-400 text-black border-white ring-4 ring-amber-300'
                        : isHome
                        ? 'bg-red-700 text-white border-white hover:bg-red-600'
                        : 'bg-blue-900 text-white border-white hover:bg-blue-800'
                    }`}
                  >
                    {p.dorsal}
                  </div>

                  {/* Name + Pass Count Pill */}
                  <div className="mt-0.5 px-1.5 py-0.5 bg-black/85 backdrop-blur-sm text-white rounded text-[9px] font-extrabold whitespace-nowrap shadow-md border border-white/10 flex items-center gap-1">
                    <span>{surname}</span>
                    <span className="text-amber-300 font-mono font-black">({totalGiven})</span>
                  </div>
                </div>
              );
            })}

            {/* Top HUD */}
            <div className="absolute top-2 left-3 right-3 flex justify-between items-center text-[10px] font-bold text-gray-900 z-20 pointer-events-none">
              <span className="bg-white/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-black/10 shadow-sm">
                Pases Totales: {passingData.total_equipo_pases}
              </span>
              <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-black shadow-sm">
                Precisión: {passingData.precision_equipo_pct}%
              </span>
            </div>
          </div>

          <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            💡 Pulsa en un jugador para aislar sus pases dados (azul) y recibidos (verde).
          </span>
        </div>

        {/* Selected Player Pass Analysis / Direct Card */}
        <div className="lg:col-span-4 space-y-4">
          {activePlayer ? (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl border border-indigo-500/30 space-y-4 animate-scale-in">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 bg-white/10 text-indigo-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Análisis de Pases
                  </span>
                  <h4 className="font-extrabold text-xl text-white mt-1">
                    {activePlayer.nombre}
                  </h4>
                  <span className="text-xs text-gray-400">Dorsal #{activePlayer.dorsal}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black text-2xl shadow-lg">
                  {activePlayer.dorsal}
                </div>
              </div>

              {/* Individual Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 p-3 rounded-2xl border border-white/10">
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Pases Realizados:</span>
                  <span className="font-mono font-black text-lg text-cyan-300">
                    {passingData.totales_dados[activePlayer.dorsal] || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Precisión:</span>
                  <span className="font-mono font-black text-lg text-emerald-300">
                    {passingData.precision_individual_pct[activePlayer.dorsal] || 0}%
                  </span>
                </div>
              </div>

              {/* Connections breakdown */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                  Principales Asociaciones:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {players
                    .filter((to) => to.dorsal !== activePlayer.dorsal)
                    .map((to) => {
                      const given = (matrix[activePlayer.dorsal] || {})[to.dorsal] || 0;
                      const received = (matrix[to.dorsal] || {})[activePlayer.dorsal] || 0;
                      if (given === 0 && received === 0) return null;

                      return (
                        <div key={to.dorsal} className="flex items-center justify-between text-xs bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                          <span className="font-bold truncate max-w-[120px]">
                            #{to.dorsal} {to.nombre.split(' ').pop()}
                          </span>
                          <div className="flex items-center gap-3 font-mono font-bold">
                            <span className="text-cyan-300 flex items-center gap-0.5 text-[11px]" title="Pases dados">
                              <ArrowRight size={11} /> {given}
                            </span>
                            <span className="text-emerald-300 flex items-center gap-0.5 text-[11px]" title="Pases recibidos">
                              <ArrowLeft size={11} /> {received}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Direct Profile Link */}
              <button
                onClick={() => navigateToPlayerCard(activePlayer.player_id)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs py-3 px-4 rounded-xl shadow-lg transition-all"
              >
                <User size={15} />
                <span>Ver Tarjeta de Jugador en Datos</span>
                <ExternalLink size={14} />
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-3xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 space-y-3">
              <h4 className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Share2 size={16} className="text-indigo-600" /> Dinámica Colectiva
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Pulsa en cualquier nodo de jugador para ver el desglose de pases enviados y recibidos con cada compañero y acceder a su perfil oficial.
              </p>
            </div>
          )}

          {/* Key Passers Summary */}
          <div className="bg-gray-50 dark:bg-neutral-800/40 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 pb-2 border-b border-gray-200 dark:border-white/10">
              Líderes en Pases Completados
            </h4>
            <div className="space-y-2">
              {players
                .slice()
                .sort((a, b) => (passingData.totales_dados[b.dorsal] || 0) - (passingData.totales_dados[a.dorsal] || 0))
                .slice(0, 4)
                .map((p, idx) => (
                  <div
                    key={p.dorsal}
                    onClick={() => setActivePlayerDorsal(p.dorsal)}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-neutral-800 border border-gray-100 dark:border-white/5 cursor-pointer hover:border-indigo-400 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-black text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        #{p.dorsal} {p.nombre}
                      </span>
                    </div>
                    <div className="font-mono font-bold">
                      <span className="text-indigo-600 dark:text-indigo-400">{passingData.totales_dados[p.dorsal] || 0}</span>
                      <span className="text-gray-400 text-[10px] ml-1">({passingData.precision_individual_pct[p.dorsal] || 0}%)</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
