import { useState } from 'react';
import { 
  BarChart2, 
  ShieldCheck, 
  Flame, 
  Activity, 
  Compass, 
  Zap, 
  Target,
  Clock
} from 'lucide-react';
import type { PaniniTeamData } from '../../../types/paniniReport';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

interface StatRow {
  label: string;
  homeDisplay: string;
  awayDisplay: string;
  homeScore: number;
  awayScore: number;
  unit?: string;
  isInverse?: boolean; // if lower is better
}

export default function PaniniGeneralStatsView({ homeTeam, awayTeam }: Props) {
  const [period, setPeriod] = useState<'total_partido' | 'primer_tiempo' | 'segundo_tiempo'>('total_partido');

  const hStats = homeTeam.estadisticas[period];
  const aStats = awayTeam.estadisticas[period];

  // 1. Datos Generales
  const volumeStats: StatRow[] = [
    {
      label: 'Posesión de Balón',
      homeDisplay: `${hStats.posesion_tiempo} (${hStats.posesion_pct}%)`,
      awayDisplay: `${aStats.posesion_tiempo} (${aStats.posesion_pct}%)`,
      homeScore: hStats.posesion_pct,
      awayScore: aStats.posesion_pct,
    },
    {
      label: 'Balones Jugados',
      homeDisplay: `${hStats.balones_jugados_total} (${hStats.balones_jugados_pct}%)`,
      awayDisplay: `${aStats.balones_jugados_total} (${aStats.balones_jugados_pct}%)`,
      homeScore: hStats.balones_jugados_pct,
      awayScore: aStats.balones_jugados_pct,
    },
  ];

  const qualityStats: StatRow[] = [
    {
      label: 'Pases Completados',
      homeDisplay: `${hStats.pases_acertados_total} (${hStats.pases_acertados_pct_sobre_total_partido}%)`,
      awayDisplay: `${aStats.pases_acertados_total} (${aStats.pases_acertados_pct_sobre_total_partido}%)`,
      homeScore: hStats.pases_acertados_pct_sobre_total_partido,
      awayScore: aStats.pases_acertados_pct_sobre_total_partido,
    },
    {
      label: '% Precisión de Pases',
      homeDisplay: `${hStats.precision_pases_pct}%`,
      awayDisplay: `${aStats.precision_pases_pct}%`,
      homeScore: hStats.precision_pases_pct,
      awayScore: aStats.precision_pases_pct,
    },
    {
      label: 'Jugadas Útiles (Eliminan rival)',
      homeDisplay: `${hStats.acciones_utiles_total} (${hStats.acciones_utiles_pct}%)`,
      awayDisplay: `${aStats.acciones_utiles_total} (${aStats.acciones_utiles_pct}%)`,
      homeScore: hStats.acciones_utiles_pct,
      awayScore: aStats.acciones_utiles_pct,
    },
  ];

  const positionStats: StatRow[] = [
    {
      label: 'Baricentro (Altura Media Bloque)',
      homeDisplay: `${hStats.baricentro_altura_m} m`,
      awayDisplay: `${aStats.baricentro_altura_m} m`,
      homeScore: hStats.baricentro_altura_m,
      awayScore: aStats.baricentro_altura_m,
    },
    {
      label: 'Supremacía Territorial (Campo Rival)',
      homeDisplay: `${hStats.supremacia_territorial_tiempo} (${hStats.supremacia_territorial_pct}%)`,
      awayDisplay: `${aStats.supremacia_territorial_tiempo} (${aStats.supremacia_territorial_pct}%)`,
      homeScore: hStats.supremacia_territorial_pct,
      awayScore: aStats.supremacia_territorial_pct,
    },
  ];

  // 2. Fase Defensiva
  const attitudeStats: StatRow[] = [
    {
      label: 'Faltas cerca del área propia',
      homeDisplay: `${hStats.faltas_cerca_area_propia}`,
      awayDisplay: `${aStats.faltas_cerca_area_propia}`,
      homeScore: parseInt(hStats.faltas_cerca_area_propia.split('/')[0] || '0'),
      awayScore: parseInt(aStats.faltas_cerca_area_propia.split('/')[0] || '0'),
      isInverse: true,
    },
    {
      label: 'Fueras de juego rivales provocados',
      homeDisplay: `${hStats.fueras_juego_provocados}`,
      awayDisplay: `${aStats.fueras_juego_provocados}`,
      homeScore: hStats.fueras_juego_provocados,
      awayScore: aStats.fueras_juego_provocados,
    },
    {
      label: 'Altura de Pressing (Recuperación)',
      homeDisplay: `${hStats.altura_pressing_m} m`,
      awayDisplay: `${aStats.altura_pressing_m} m`,
      homeScore: hStats.altura_pressing_m,
      awayScore: aStats.altura_pressing_m,
    },
  ];

  const recoveryStats: StatRow[] = [
    {
      label: '% Recuperación por fin de acción rival',
      homeDisplay: `${hStats.recuperacion_fin_accion_rival_pct}%`,
      awayDisplay: `${aStats.recuperacion_fin_accion_rival_pct}%`,
      homeScore: hStats.recuperacion_fin_accion_rival_pct,
      awayScore: aStats.recuperacion_fin_accion_rival_pct,
    },
    {
      label: '% Recuperaciones efectivas',
      homeDisplay: `${hStats.recuperaciones_efectivas_pct}%`,
      awayDisplay: `${aStats.recuperaciones_efectivas_pct}%`,
      homeScore: hStats.recuperaciones_efectivas_pct,
      awayScore: aStats.recuperaciones_efectivas_pct,
    },
    {
      label: '% Recuperaciones temporales',
      homeDisplay: `${hStats.recuperaciones_temporales_pct}%`,
      awayDisplay: `${aStats.recuperaciones_temporales_pct}%`,
      homeScore: hStats.recuperaciones_temporales_pct,
      awayScore: aStats.recuperaciones_temporales_pct,
    },
  ];

  const goalDefenseStats: StatRow[] = [
    {
      label: 'Balones en área propia por el rival',
      homeDisplay: `${hStats.balones_area_propia_rival}`,
      awayDisplay: `${aStats.balones_area_propia_rival}`,
      homeScore: hStats.balones_area_propia_rival,
      awayScore: aStats.balones_area_propia_rival,
      isInverse: true,
    },
    {
      label: '% Protección de área',
      homeDisplay: `${hStats.proteccion_area_pct}%`,
      awayDisplay: `${aStats.proteccion_area_pct}%`,
      homeScore: hStats.proteccion_area_pct,
      awayScore: aStats.proteccion_area_pct,
    },
    {
      label: 'Salidas del portero',
      homeDisplay: `${hStats.salidas_portero}`,
      awayDisplay: `${aStats.salidas_portero}`,
      homeScore: hStats.salidas_portero,
      awayScore: aStats.salidas_portero,
    },
    {
      label: 'Paradas del portero',
      homeDisplay: `${hStats.paradas_portero}`,
      awayDisplay: `${aStats.paradas_portero}`,
      homeScore: hStats.paradas_portero,
      awayScore: aStats.paradas_portero,
    },
  ];

  // 3. Fase Ofensiva
  const buildUpStats: StatRow[] = [
    {
      label: '% Salto de línea / Balones en largo',
      homeDisplay: `${hStats.salto_linea_largo_pct}%`,
      awayDisplay: `${aStats.salto_linea_largo_pct}%`,
      homeScore: hStats.salto_linea_largo_pct,
      awayScore: aStats.salto_linea_largo_pct,
    },
    {
      label: '% Acciones elaboradas desde atrás',
      homeDisplay: `${hStats.elaboracion_desde_atras_pct}%`,
      awayDisplay: `${aStats.elaboracion_desde_atras_pct}%`,
      homeScore: hStats.elaboracion_desde_atras_pct,
      awayScore: aStats.elaboracion_desde_atras_pct,
    },
  ];

  const depthStats: StatRow[] = [
    {
      label: 'Pases rasos útiles en campo rival',
      homeDisplay: `${hStats.pases_rasos_campo_rival}`,
      awayDisplay: `${aStats.pases_rasos_campo_rival}`,
      homeScore: parseInt(hStats.pases_rasos_campo_rival.split('/')[0] || '0'),
      awayScore: parseInt(aStats.pases_rasos_campo_rival.split('/')[0] || '0'),
    },
    {
      label: 'Pases largos útiles',
      homeDisplay: `${hStats.pases_largos_utiles}`,
      awayDisplay: `${aStats.pases_largos_utiles}`,
      homeScore: parseInt(hStats.pases_largos_utiles.split('/')[0] || '0'),
      awayScore: parseInt(aStats.pases_largos_utiles.split('/')[0] || '0'),
    },
  ];

  const widthStats: StatRow[] = [
    {
      label: 'Cambios de juego / orientación',
      homeDisplay: `${hStats.cambios_orientacion}`,
      awayDisplay: `${aStats.cambios_orientacion}`,
      homeScore: hStats.cambios_orientacion,
      awayScore: aStats.cambios_orientacion,
    },
    {
      label: 'Centros desde el fondo',
      homeDisplay: `${hStats.centros_desde_fondo}`,
      awayDisplay: `${aStats.centros_desde_fondo}`,
      homeScore: parseInt(hStats.centros_desde_fondo.split('/')[0] || '0'),
      awayScore: parseInt(aStats.centros_desde_fondo.split('/')[0] || '0'),
    },
    {
      label: '% Centros desde la derecha',
      homeDisplay: `${hStats.centros_derecha_pct}%`,
      awayDisplay: `${aStats.centros_derecha_pct}%`,
      homeScore: hStats.centros_derecha_pct,
      awayScore: aStats.centros_derecha_pct,
    },
    {
      label: '% Centros desde la izquierda',
      homeDisplay: `${hStats.centros_izquierda_pct}%`,
      awayDisplay: `${aStats.centros_izquierda_pct}%`,
      homeScore: hStats.centros_izquierda_pct,
      awayScore: aStats.centros_izquierda_pct,
    },
  ];

  const individualStats: StatRow[] = [
    {
      label: 'Regates útiles completados',
      homeDisplay: `${hStats.regates_utiles}`,
      awayDisplay: `${aStats.regates_utiles}`,
      homeScore: parseInt(hStats.regates_utiles.split('/')[0] || '0'),
      awayScore: parseInt(aStats.regates_utiles.split('/')[0] || '0'),
    },
    {
      label: 'Aceleraciones',
      homeDisplay: `${hStats.aceleraciones}`,
      awayDisplay: `${aStats.aceleraciones}`,
      homeScore: hStats.aceleraciones,
      awayScore: aStats.aceleraciones,
    },
  ];

  const dangerStats: StatRow[] = [
    {
      label: 'Balones jugados en área rival',
      homeDisplay: `${hStats.balones_en_area_rival}`,
      awayDisplay: `${aStats.balones_en_area_rival}`,
      homeScore: hStats.balones_en_area_rival,
      awayScore: aStats.balones_en_area_rival,
    },
    {
      label: '% Ataque a portería',
      homeDisplay: `${hStats.ataque_porteria_pct}%`,
      awayDisplay: `${aStats.ataque_porteria_pct}%`,
      homeScore: hStats.ataque_porteria_pct,
      awayScore: aStats.ataque_porteria_pct,
    },
    {
      label: '% Eficacia ABP en ataque',
      homeDisplay: `${hStats.eficacia_abp_ofensivo_pct}%`,
      awayDisplay: `${aStats.eficacia_abp_ofensivo_pct}%`,
      homeScore: hStats.eficacia_abp_ofensivo_pct,
      awayScore: aStats.eficacia_abp_ofensivo_pct,
    },
    {
      label: 'Tiros a puerta / Totales',
      homeDisplay: `${hStats.tiros_a_puerta}`,
      awayDisplay: `${aStats.tiros_a_puerta}`,
      homeScore: parseInt(hStats.tiros_a_puerta.split('/')[0] || '0'),
      awayScore: parseInt(aStats.tiros_a_puerta.split('/')[0] || '0'),
    },
    {
      label: 'Ocasiones de gol generadas',
      homeDisplay: `${hStats.ocasiones_gol}`,
      awayDisplay: `${aStats.ocasiones_gol}`,
      homeScore: hStats.ocasiones_gol,
      awayScore: aStats.ocasiones_gol,
    },
  ];

  const renderComparisonBar = (row: StatRow) => {
    const total = (row.homeScore + row.awayScore) || 1;
    let homePct = Math.round((row.homeScore / total) * 100);
    let awayPct = 100 - homePct;

    // Normalizar para no dejar barras invisibles si hay datos
    if (row.homeScore > 0 && homePct < 8) homePct = 8;
    if (row.awayScore > 0 && awayPct < 8) awayPct = 8;

    return (
      <div key={row.label} className="p-3 bg-white dark:bg-neutral-800/80 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-xs">
        <div className="flex items-center justify-between text-xs">
          {/* Valor Local (Rojo) */}
          <span className="font-mono font-black text-red-600 dark:text-red-400 text-sm">
            {row.homeDisplay}
          </span>

          {/* Etiqueta Central */}
          <span className="font-bold text-gray-700 dark:text-gray-200 text-center px-2 text-[11px]">
            {row.label}
          </span>

          {/* Valor Visitante (Azul) */}
          <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
            {row.awayDisplay}
          </span>
        </div>

        {/* Gráfica de Barras Horizontales Modernas */}
        <div className="flex items-center gap-1.5 h-2.5 w-full bg-gray-100 dark:bg-neutral-900 rounded-full overflow-hidden p-0.5">
          {/* Barra Izquierda (Local - Rojo) */}
          <div className="flex-1 flex justify-end">
            <div
              style={{ width: `${homePct}%` }}
              className="h-full bg-gradient-to-l from-red-600 to-red-500 rounded-l-full transition-all duration-500"
            />
          </div>

          {/* Centro Separador */}
          <div className="w-1 h-full bg-gray-300 dark:bg-neutral-700 rounded-full shrink-0" />

          {/* Barra Derecha (Visitante - Azul) */}
          <div className="flex-1 flex justify-start">
            <div
              style={{ width: `${awayPct}%` }}
              className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-r-full transition-all duration-500"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* Selector de Periodo */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-indigo-600" />
          <span className="font-extrabold text-sm text-gray-800 dark:text-gray-200">Periodo Analizado:</span>
          <div className="flex bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-inner">
            <button
              onClick={() => setPeriod('total_partido')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                period === 'total_partido'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
              }`}
            >
              Total Partido
            </button>
            <button
              onClick={() => setPeriod('primer_tiempo')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                period === 'primer_tiempo'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
              }`}
            >
              1º Tiempo
            </button>
            <button
              onClick={() => setPeriod('segundo_tiempo')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                period === 'segundo_tiempo'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
              }`}
            >
              2º Tiempo
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-black">
          <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <span className="w-3 h-3 rounded-full bg-red-600"></span> {homeTeam.nombre} (Local)
          </span>
          <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <span className="w-3 h-3 rounded-full bg-blue-600"></span> {awayTeam.nombre} (Visitante)
          </span>
        </div>
      </div>

      {/* TRAMO 1: DATOS GENERALES (DATI GENERALI) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-white/10">
          <BarChart2 className="text-indigo-600 dark:text-indigo-400" size={20} />
          <h3 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-wider">
            1. Datos Generales (Dati Generali)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Volumen de Juego */}
          <div className="bg-gray-50/70 dark:bg-neutral-900/60 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-white/10">
              <Activity size={14} /> Volumen de Juego
            </h4>
            <div className="space-y-2">
              {volumeStats.map(renderComparisonBar)}
            </div>
          </div>

          {/* Calidad de Juego */}
          <div className="bg-gray-50/70 dark:bg-neutral-900/60 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-white/10">
              <Zap size={14} /> Calidad de Juego
            </h4>
            <div className="space-y-2">
              {qualityStats.map(renderComparisonBar)}
            </div>
          </div>

          {/* Posición en el Terreno */}
          <div className="bg-gray-50/70 dark:bg-neutral-900/60 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-white/10">
              <Compass size={14} /> Posición en el Terreno
            </h4>
            <div className="space-y-2">
              {positionStats.map(renderComparisonBar)}
            </div>
          </div>
        </div>
      </div>

      {/* TRAMO 2: FASE DEFENSIVA */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-white/10">
          <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={20} />
          <h3 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-wider">
            2. Fase Defensiva (Fase Difensiva)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Actitud */}
          <div className="bg-gray-50/70 dark:bg-neutral-900/60 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-white/10">
              <ShieldCheck size={14} /> Actitud Defensiva
            </h4>
            <div className="space-y-2">
              {attitudeStats.map(renderComparisonBar)}
            </div>
          </div>

          {/* Recuperación de Balón */}
          <div className="bg-gray-50/70 dark:bg-neutral-900/60 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-white/10">
              <Activity size={14} /> Recuperación de Balón
            </h4>
            <div className="space-y-2">
              {recoveryStats.map(renderComparisonBar)}
            </div>
          </div>

          {/* Defensa de la Portería */}
          <div className="bg-gray-50/70 dark:bg-neutral-900/60 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-white/10">
              <Target size={14} /> Defensa de Portería
            </h4>
            <div className="space-y-2">
              {goalDefenseStats.map(renderComparisonBar)}
            </div>
          </div>
        </div>
      </div>

      {/* TRAMO 3: FASE OFENSIVA */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-white/10">
          <Flame className="text-amber-500" size={20} />
          <h3 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-wider">
            3. Fase Ofensiva (Fase Offensiva)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Inicio de Acción */}
          <div className="bg-gray-50/70 dark:bg-neutral-900/60 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-white/10">
              <Zap size={14} /> Inicio de Acción
            </h4>
            <div className="space-y-2">
              {buildUpStats.map(renderComparisonBar)}
            </div>
          </div>

          {/* Búsqueda de Profundidad */}
          <div className="bg-gray-50/70 dark:bg-neutral-900/60 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-white/10">
              <Compass size={14} /> Búsqueda de Profundidad
            </h4>
            <div className="space-y-2">
              {depthStats.map(renderComparisonBar)}
            </div>
          </div>

          {/* Uso de la Amplitud */}
          <div className="bg-gray-50/70 dark:bg-neutral-900/60 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-white/10">
              <Activity size={14} /> Uso de la Amplitud
            </h4>
            <div className="space-y-2">
              {widthStats.map(renderComparisonBar)}
            </div>
          </div>

          {/* Iniciativas Personales */}
          <div className="bg-gray-50/70 dark:bg-neutral-900/60 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-white/10">
              <Zap size={14} /> Iniciativas Personales
            </h4>
            <div className="space-y-2">
              {individualStats.map(renderComparisonBar)}
            </div>
          </div>

          {/* Peligrosidad y Finalización */}
          <div className="lg:col-span-2 bg-gray-50/70 dark:bg-neutral-900/60 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-white/10">
              <Flame size={14} /> Peligrosidad y Llegadas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dangerStats.map(renderComparisonBar)}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
