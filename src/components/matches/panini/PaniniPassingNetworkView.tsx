import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, User, ExternalLink, ArrowRight, ArrowLeft } from 'lucide-react';
import type { PaniniTeamData, PaniniPassingNode } from '../../../types/paniniReport';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

export default function PaniniPassingNetworkView({ homeTeam, awayTeam }: Props) {
  const navigate = useNavigate();
  const [selectedTeamKey, setSelectedTeamKey] = useState<'home' | 'away'>('home');
  const [activePlayerDorsal, setActivePlayerDorsal] = useState<number | null>(null);

  const isHome = selectedTeamKey === 'home';
  const team = isHome ? homeTeam : awayTeam;
  const passingData = team.matriz_pases;
  const players = passingData.jugadores;
  const matrix = passingData.matriz || {};

  const activePlayer = players.find((p) => p.dorsal === activePlayerDorsal);

  // Generate weighted links from matrix
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

  // Encontrar máximos para colorear
  const maxGivenDorsal = Object.entries(passingData.totales_dados).sort((a, b) => b[1] - a[1])[0]?.[0];
  const maxReceivedDorsal = Object.entries(passingData.totales_recibidos).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="space-y-8 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* Selector de Equipo */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
        <div>
          <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Share2 className="text-indigo-600 dark:text-indigo-400" size={18} />
            Flujo de Pases y Asociaciones (Flussi di Gioco)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Campograma de conexiones preferenciales con tabla de matriz cruzada de pases.
          </p>
        </div>

        <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-2xl">
          <button
            onClick={() => { setSelectedTeamKey('home'); setActivePlayerDorsal(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedTeamKey === 'home'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
            {homeTeam.nombre} ({homeTeam.matriz_pases.total_equipo_pases} pases - {homeTeam.matriz_pases.precision_equipo_pct}%)
          </button>
          <button
            onClick={() => { setSelectedTeamKey('away'); setActivePlayerDorsal(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedTeamKey === 'away'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
            {awayTeam.nombre} ({awayTeam.matriz_pases.total_equipo_pases} pases - {awayTeam.matriz_pases.precision_equipo_pct}%)
          </button>
        </div>
      </div>

      {/* Grid: Campograma de Red a la izquierda + Panel de Análisis al lado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Campograma con flechas directas entre jugadores */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
            <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
              <Share2 size={14} className="text-indigo-600" /> Red de Conexiones ({team.nombre})
            </h4>
            <span className="text-xs font-bold text-gray-400">
              {isHome ? 'Ataque hacia la derecha ➔' : '⬅ Ataque hacia la izquierda'}
            </span>
          </div>

          <div className="relative w-full aspect-[100/62] rounded-2xl overflow-hidden border-2 border-gray-300 dark:border-white/20 bg-[#a7d7a9] select-none shadow-inner p-2">
            
            {/* SVG Pitch Markings */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 62" preserveAspectRatio="none">
              <rect x="2" y="2" width="96" height="58" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <line x1="50" y1="2" x2="50" y2="60" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <circle cx="50" cy="31" r="9" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <circle cx="50" cy="31" r="0.6" fill="rgba(255,255,255,0.85)" />

              {/* Left Box */}
              <rect x="2" y="15" width="14" height="32" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <rect x="2" y="22" width="5" height="18" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />

              {/* Right Box */}
              <rect x="84" y="15" width="14" height="32" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <rect x="93" y="22" width="5" height="18" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
            </svg>

            {/* Trademark */}
            <div className="absolute top-1.5 right-3 text-[10px] font-bold text-black pointer-events-none">
              ©Panini Digital
            </div>

            {/* Crest */}
            <div className={`absolute ${isHome ? 'top-2 left-2' : 'bottom-2 right-2'} w-11 h-11 bg-white rounded-lg border border-gray-300 p-1 shadow-md flex items-center justify-center pointer-events-none z-10`}>
              <div className={`w-full h-full ${isHome ? 'bg-red-600' : 'bg-black'} text-white font-black text-[8px] flex items-center justify-center rounded`}>
                {isHome ? 'VV' : 'ACM'}
              </div>
            </div>

            {/* Directed Passing Vectors / Links */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker
                  id="arrow-home"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="4"
                  markerHeight="4"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#000000" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                </marker>
              </defs>

              {links.map((link, idx) => {
                const x1 = link.from.x ?? 50;
                const y1 = link.from.y ?? 50;
                const x2 = link.to.x ?? 50;
                const y2 = link.to.y ?? 50;

                const isFromActive = activePlayerDorsal === link.from.dorsal;
                const isToActive = activePlayerDorsal === link.to.dorsal;
                const isHighlighted = isFromActive || isToActive;
                const isDimmed = activePlayerDorsal !== null && !isHighlighted;

                const strokeWidth = Math.min(Math.max(link.count * 0.45, 1.2), 4.5);
                const strokeColor = isHighlighted ? '#f59e0b' : '#000000';

                return (
                  <line
                    key={idx}
                    x1={`${x1}%`}
                    y1={`${y1}%`}
                    x2={`${x2}%`}
                    y2={`${y2}%`}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    markerEnd={isHighlighted ? 'url(#arrow-active)' : 'url(#arrow-home)'}
                    opacity={isDimmed ? 0.15 : 0.85}
                    className="transition-all duration-200"
                  />
                );
              })}
            </svg>

            {/* Players (Nodes) */}
            {players.slice(0, 11).map((p) => {
              const xPos = p.x ?? 50;
              const yPos = p.y ?? 50;
              const isGK = isHome ? p.dorsal === 35 : p.dorsal === 1;
              const isActive = activePlayerDorsal === p.dorsal;

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
                    isActive ? 'scale-125 z-40' : 'hover:scale-115'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-lg transition-all ${
                      isGK
                        ? 'bg-[#9da3a8] text-black border-2 border-black'
                        : isHome
                        ? 'bg-red-600 text-white border-2 border-white'
                        : 'bg-[#001f7a] text-white border-2 border-white'
                    } ${isActive ? 'ring-4 ring-yellow-400' : ''}`}
                  >
                    {p.dorsal}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel lateral con análisis individual del jugador */}
        <div className="lg:col-span-5 space-y-4">
          {activePlayer ? (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl border border-indigo-500/30 space-y-4 animate-scale-in">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 bg-white/10 text-indigo-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Conexiones de Pases
                  </span>
                  <h4 className="font-extrabold text-xl text-white mt-1">
                    {activePlayer.nombre}
                  </h4>
                  <span className="text-xs text-gray-400">Dorsal #{activePlayer.dorsal}</span>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg ${isHome ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {activePlayer.dorsal}
                </div>
              </div>

              {/* Individual Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 p-3 rounded-2xl border border-white/10">
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Pases Entregados:</span>
                  <span className="font-mono font-black text-lg text-amber-300">
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
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs">
                {players
                  .filter((to) => to.dorsal !== activePlayer.dorsal)
                  .map((to) => {
                    const given = (matrix[activePlayer.dorsal] || {})[to.dorsal] || 0;
                    const received = (matrix[to.dorsal] || {})[activePlayer.dorsal] || 0;
                    if (given === 0 && received === 0) return null;

                    return (
                      <div key={to.dorsal} className="flex items-center justify-between bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                        <span className="font-bold truncate max-w-[130px]">
                          #{to.dorsal} {to.nombre.split(' ').pop()}
                        </span>
                        <div className="flex items-center gap-3 font-mono font-bold">
                          <span className="text-amber-300 flex items-center gap-0.5 text-[11px]" title="Pases dados">
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

              <button
                onClick={() => navigateToPlayerCard(activePlayer.player_id)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md transition-all"
              >
                <User size={14} />
                <span>Ver Tarjeta de Jugador</span>
                <ExternalLink size={13} />
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-3xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 space-y-3">
              <h4 className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Share2 size={16} className="text-indigo-600" /> Intercambios de Balón
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Haz clic en cualquier dorsal sobre el campo o en la tabla matriz inferior para filtrar todas sus asociaciones y porcentaje de éxito.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 2. Tabla Matriz de Pases Cruzada (DE -> A) */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-white/10">
          <h4 className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
            <Share2 size={16} className="text-indigo-600" /> Matriz Cruzada de Pases (DA \ A) - {team.nombre}
          </h4>
          <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-100 dark:bg-red-950/60 border border-red-300 rounded-xs inline-block" /> Frecuencia alta (&gt; 3 pases)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-600 rounded-xs inline-block text-white text-[8px] flex items-center justify-center font-bold">●</span> Máximo pasador</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 dark:border-white/10 rounded-2xl">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 font-extrabold border-b border-gray-200 dark:border-white/10">
                <th className="p-3 text-left bg-gray-200/90 dark:bg-neutral-700 sticky left-0 z-10 min-w-[130px]">
                  DE \ A
                </th>
                {players.map((j) => (
                  <th
                    key={j.dorsal}
                    onClick={() => setActivePlayerDorsal(j.dorsal)}
                    className="p-2 min-w-[40px] border-r border-gray-200 dark:border-white/10 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                  >
                    <div className="font-black text-indigo-700 dark:text-indigo-400">#{j.dorsal}</div>
                    <span className="text-[9px] text-gray-500 font-normal truncate block max-w-[45px]">
                      {j.nombre.split(' ').pop()}
                    </span>
                  </th>
                ))}
                <th className="p-3 bg-gray-200/90 dark:bg-neutral-700 font-black text-gray-900 dark:text-white">TOTAL</th>
                <th className="p-3 bg-gray-200/90 dark:bg-neutral-700 font-black text-emerald-700 dark:text-emerald-400">% ACIERTO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {players.map((origin) => {
                const oDorsal = origin.dorsal;
                const rowPases = matrix[oDorsal] || {};
                const totalOrigin = passingData.totales_dados[oDorsal] || 0;
                const pctOrigin = passingData.precision_individual_pct[oDorsal] || 0;
                const isMaxPasser = String(oDorsal) === String(maxGivenDorsal);

                return (
                  <tr key={oDorsal} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                    <td
                      onClick={() => setActivePlayerDorsal(oDorsal)}
                      className="p-2.5 text-left font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-neutral-800 sticky left-0 z-10 border-r border-gray-200 dark:border-white/10 flex items-center gap-2 cursor-pointer hover:text-indigo-600"
                    >
                      <span className="w-5 h-5 rounded-full bg-gray-700 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                        {oDorsal}
                      </span>
                      <span className="truncate max-w-[120px]">{origin.nombre}</span>
                    </td>

                    {players.map((dest) => {
                      const dDorsal = dest.dorsal;
                      const count = rowPases[dDorsal];
                      const isSelf = oDorsal === dDorsal;

                      let cellBg = '';
                      if (count >= 5) cellBg = 'bg-red-200 dark:bg-red-950/80 font-black text-red-900 dark:text-red-200';
                      else if (count >= 3) cellBg = 'bg-red-100/70 dark:bg-red-950/40 font-bold text-red-800 dark:text-red-300';
                      else if (count > 0) cellBg = 'font-medium text-gray-800 dark:text-gray-200';

                      return (
                        <td
                          key={dDorsal}
                          className={`p-2 border-r border-gray-100 dark:border-white/5 font-mono ${
                            isSelf
                              ? 'bg-gray-100 dark:bg-neutral-800/40 text-gray-300 dark:text-gray-600'
                              : cellBg || 'text-gray-300 dark:text-gray-600'
                          }`}
                        >
                          {isSelf ? '-' : count || '-'}
                        </td>
                      );
                    })}

                    <td className={`p-2 font-mono font-black ${
                      isMaxPasser
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800'
                    }`}>
                      {totalOrigin}
                    </td>

                    <td className="p-2 font-mono font-black text-emerald-700 dark:text-emerald-400 bg-gray-50 dark:bg-neutral-800">
                      {pctOrigin}%
                    </td>
                  </tr>
                );
              })}

              {/* Fila de Totales Recibidos */}
              <tr className="bg-gray-100 dark:bg-neutral-800 font-extrabold border-t-2 border-gray-300 dark:border-white/20">
                <td className="p-2.5 text-left font-black text-gray-900 dark:text-white bg-gray-200/90 dark:bg-neutral-700 sticky left-0 z-10 border-r border-gray-200 dark:border-white/10">
                  TOTALES (A)
                </td>
                {players.map((dest) => {
                  const dDorsal = dest.dorsal;
                  const totalRec = passingData.totales_recibidos[dDorsal] || 0;
                  const isMaxReceiver = String(dDorsal) === String(maxReceivedDorsal);

                  return (
                    <td
                      key={dDorsal}
                      className={`p-2 font-mono font-black border-r border-gray-200 dark:border-white/10 ${
                        isMaxReceiver
                          ? 'bg-red-600 text-white'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {totalRec}
                    </td>
                  );
                })}
                <td className="p-2 font-mono font-black text-base text-gray-900 dark:text-white bg-gray-200/90 dark:bg-neutral-700">
                  {passingData.total_equipo_pases}
                </td>
                <td className="p-2 font-mono font-black text-base text-emerald-700 dark:text-emerald-400 bg-gray-200/90 dark:bg-neutral-700">
                  {passingData.precision_equipo_pct}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
