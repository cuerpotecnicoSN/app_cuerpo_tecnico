export interface PaniniTimelineEvent {
  minute: string;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution_in' | 'substitution_out';
  team: 'home' | 'away';
  player: string;
}

export interface PaniniPlayerLineup {
  dorsal: number;
  nombre: string;
  posicion: 'P' | 'D' | 'C' | 'A';
  posicion_desc: string;
  minutos_jugados: number;
  es_titular: boolean;
  minuto_entrada?: number;
  minuto_salida?: number;
  tarjetas_amarillas?: string[];
  tarjetas_rojas?: string[];
  player_id?: string;
  /** Coordenadas relativas en el campograma táctico (0-100%) */
  x?: number;
  y?: number;
}

export interface PaniniPeriodStats {
  posesion_tiempo: string;
  posesion_pct: number;
  balones_jugados_total: number;
  balones_jugados_pct: number;
  pases_acertados_total: number;
  pases_acertados_pct_sobre_total_partido: number;
  precision_pases_pct: number;
  acciones_utiles_total: number;
  acciones_utiles_pct: number;
  baricentro_altura_m: number;
  supremacia_territorial_tiempo: string;
  supremacia_territorial_pct: number;
  faltas_cerca_area_propia: string;
  fueras_juego_provocados: number;
  altura_pressing_m: number;
  recuperacion_fin_accion_rival_pct: number;
  recuperaciones_efectivas_pct: number;
  recuperaciones_temporales_pct: number;
  balones_area_propia_rival: number;
  proteccion_area_pct: number;
  salidas_portero: number;
  paradas_portero: number;
  salto_linea_largo_pct: number;
  elaboracion_desde_atras_pct: number;
  pases_rasos_campo_rival: string;
  pases_largos_utiles: string;
  cambios_orientacion: number;
  centros_desde_fondo: string;
  centros_derecha_pct: number;
  centros_izquierda_pct: number;
  regates_utiles: string;
  aceleraciones: number;
  balones_en_area_rival: number;
  ataque_porteria_pct: number;
  eficacia_abp_ofensivo_pct: number;
  tiros_a_puerta: string;
  ocasiones_gol: number;
}

export interface PaniniTeamScoreStats {
  primer_tiempo: PaniniPeriodStats;
  segundo_tiempo: PaniniPeriodStats;
  total_partido: PaniniPeriodStats;
}

export interface PaniniTacticalBlock {
  sistema: string;
  longitud_m: number;
  anchura_m: number;
  densidad_defensa_pct: number;
  densidad_medio_pct: number;
  densidad_ataque_pct: number;
  /** En el PDF son imágenes de texto girado: no se extraen del informe */
  carril_izquierdo_pct?: number;
  carril_central_pct?: number;
  carril_derecho_pct?: number;
}

export interface PaniniSpatialCategory {
  defensa_pct: number;
  medio_pct: number;
  ataque_pct: number;
  izquierda_pct: number;
  centro_pct: number;
  derecha_pct: number;
}

export interface PaniniShotEvent {
  id: string;
  dorsal: number;
  jugador: string;
  player_id?: string;
  minuto: string;
  resultado: 'gol' | 'a_puerta' | 'bloqueado' | 'fuera';
  tipo: 'pie_raso' | 'cabeza' | 'acrobacia';
  origen: 'jugada' | 'abp_indirecto' | 'abp_directo' | 'fuera_area';
  zona: 'area_pequena' | 'area_penalti' | 'fuera_area';
  /** Coordenadas relativas en medio campo de ataque (x: 0-100%, y: 0-100% hacia portería) */
  x: number;
  y: number;
  xg?: number;
}

export type PaniniTeamData = PaniniMatchReport['equipo_local'];

export interface PaniniFinishingStats {
  tiros_totales: number;
  tiros_a_puerta: number;
  goles: number;
  ocasiones: number;
  llegada_jugada: number;
  llegada_abp_indirecto: number;
  llegada_abp_directo: number;
  zona_area_pequena: number;
  zona_area_penalti: number;
  zona_fuera_area: number;
  remate_pie_raso: number;
  remate_acrobacia: number;
  remate_cabeza: number;
  resultado_a_puerta: number;
  resultado_bloqueado: number;
  resultado_fuera: number;
  abp_faltas_derecha: number;
  abp_faltas_centrales: number;
  abp_faltas_izquierda: number;
  abp_corners_derecha: number;
  abp_corners_izquierda: number;
  abp_saques_banda_derecha: number;
  abp_saques_banda_izquierda: number;
  remates_detalle?: PaniniShotEvent[];
}

export interface PaniniPassingNode {
  dorsal: number;
  nombre: string;
  player_id?: string;
  posicion?: string;
  /** Coordenadas promedio en el campograma (0-100%) */
  x: number;
  y: number;
  pases_dados?: number;
  pases_recibidos?: number;
  precision_pct?: number;
}

export interface PaniniPassingLink {
  origen_dorsal: number;
  destino_dorsal: number;
  pases: number;
}

export interface PaniniPlayerStats {
  dorsal: number;
  nombre: string;
  anio_nacimiento: number;
  posicion: string;
  minutos: string;
  player_id?: string;
  balones_jugados: number;
  posesion_tiempo: string;
  pases_acertados: number;
  acciones_utiles: number;
  perdidas_efectivas: number;
  recuperaciones_efectivas: string;
  recuperaciones_aereas: number;
  recuperaciones_area: number;
  intercepciones: number;
  anticipaciones_efectivas: string;
  duelos_efectivos: string;
  faltas_cometidas: number;
  faltas_recibidas: number;
  pases_largos_utiles: string;
  regates_utiles: string;
  centros_utiles: string;
  asistencias_pases_clave: string;
  tiros_a_puerta: string;
  tiros_derecha?: string;
  tiros_izquierda?: string;
  tiros_cabeza?: string;
  balones_jugados_en_area?: number;
  cabezazos_ofensivos?: number;
  descargas_primer_toque?: string;
  paradas?: number;
  paradas_ocasion?: number;
  goles_encajados?: number;
  salidas_altas?: number;
  salidas_bajas?: number;
  salidas_centro_jugada?: number;
  salidas_balon_parado?: number;
  saques_largos_utiles?: string;
  distribucion_1t?: { defensa_pct: number; medio_pct: number; ataque_pct: number; izq_pct?: number; cen_pct?: number; dcha_pct?: number };
  distribucion_2t?: { defensa_pct: number; medio_pct: number; ataque_pct: number; izq_pct?: number; cen_pct?: number; dcha_pct?: number };
  /** Coordenadas estimadas de posición media en el campograma */
  posicion_media_x?: number;
  posicion_media_y?: number;
  tiros_a_puerta_recibidos?: string;
  recuperaciones_ataque?: number;
  /** Toques del jugador (mapas verticales del PDF), en coordenadas de ataque */
  toques_1t?: PaniniMapEvent[];
  toques_2t?: PaniniMapEvent[];
  /** Métricas del PDF sin campo propio (etiqueta original en italiano → valor) */
  otros?: Record<string, string>;
}

export interface PaniniPassingMatrix {
  jugadores: PaniniPassingNode[];
  matriz: { [dorsal_origen: number]: { [dorsal_destino: number]: number } };
  totales_dados: { [dorsal: number]: number };
  totales_recibidos: { [dorsal: number]: number };
  precision_individual_pct: { [dorsal: number]: number };
  total_equipo_pases: number;
  precision_equipo_pct: number;
  enlaces?: PaniniPassingLink[];
}

/**
 * Convención de coordenadas de los mapas extraídos del PDF ("coordenadas de ataque"):
 *  - x: 0 = línea de gol propia → 100 = línea de gol rival (el equipo ataca hacia la derecha)
 *  - y: 0 = banda izquierda → 100 = banda derecha, desde el punto de vista del equipo
 * Los datos de ambos equipos usan la misma convención, cada uno respecto a su ataque.
 */
export interface PaniniPitchPoint {
  x: number;
  y: number;
}

export type PaniniPeriodo = '1T' | '2T' | 'PR';

/** Evento posicionado (recuperación, falta, toque...). Círculo = 1T, cuadrado = 2T en el PDF */
export interface PaniniMapEvent extends PaniniPitchPoint {
  periodo: PaniniPeriodo;
  /** Tono claro en el PDF: acción a balón parado */
  balon_parado: boolean;
}

export interface PaniniDensityCell {
  /** 0 = fila superior (banda izquierda) */
  fila: number;
  /** 0 = columna junto a la portería propia */
  columna: number;
  /** Nivel de densidad de balones jugados: 0 (mínimo) → 15 (máximo), escala de 16 verdes del PDF */
  nivel: number;
  /** Intensidad continua 0-1 calculada a partir del tono exacto */
  intensidad: number;
  /** Color exacto de la celda en el PDF */
  color: string;
  /** true si en el PDF la celda es una trama (rayas sobre blanco) en vez de color sólido */
  trama: boolean;
}

export interface PaniniDensityPlayer extends PaniniPitchPoint {
  dorsal?: number;
  nombre: string;
  rol: 'P' | 'D' | 'C' | 'A';
}

export interface PaniniDensityMap {
  periodo: '1T' | '2T';
  /** Duración del periodo ("45'") y tiempo efectivo ("23':27''") de la cabecera del PDF */
  duracion?: string;
  tiempo_efectivo?: string;
  sistema: string;
  longitud_m: number;
  anchura_m: number;
  filas: number;
  columnas: number;
  celdas: PaniniDensityCell[];
  /** Posición de cada jugador en el bloque durante el periodo */
  jugadores: PaniniDensityPlayer[];
  zonas_pct: { defensa: number; medio: number; ataque: number };
}

export interface PaniniEventMaps {
  recuperaciones: PaniniMapEvent[];
  faltas: PaniniMapEvent[];
  acciones_utiles: PaniniMapEvent[];
  pases_largos: PaniniMapEvent[];
  regates: PaniniMapEvent[];
  centros: PaniniMapEvent[];
}

export interface PaniniShotMarker extends PaniniPitchPoint {
  periodo: PaniniPeriodo;
  balon_parado: boolean;
  /** El PDF dibuja los goles con un marcador mayor */
  gol?: boolean;
}

export interface PaniniGoalMarker {
  orden: number;
  minuto: string;
  jugador: string;
  /** Posición en la imagen de la portería del PDF (0-100): x izquierda → derecha, y arriba → abajo */
  x: number;
  y: number;
}

export interface PaniniSetPieceEfficacy {
  categoria: 'faltas_derecha' | 'faltas_centrales' | 'faltas_izquierda' | 'corners_derecha' | 'corners_izquierda' | 'saques_banda_derecha' | 'saques_banda_izquierda';
  total: number;
  exitosas: number;
}

export interface PaniniPassNetwork {
  nodos: (PaniniPitchPoint & { dorsal: number })[];
  enlaces: { origen_dorsal: number; destino_dorsal: number; pases: number }[];
}

export interface PaniniMatchReport {
  id?: string;
  match_id?: string;
  /** Origen de los datos: extracción exacta del PDF vectorial */
  fuente?: { tipo: 'pdf_vectorial'; archivo: string; extraido_en: string; version_parser: number; avisos: string[]; pdf_path?: string };
  fecha: string; // YYYY-MM-DD
  competicion: string;
  jornada: string;
  estadio: string;
  arbitro: string;
  duracion_total: string;
  tiempo_efectivo: string;
  
  equipo_local: {
    nombre: string;
    goles: number;
    entrenador: string;
    xg: number;
    ims: number;
    alineacion: PaniniPlayerLineup[];
    suplentes_no_utilizados: { dorsal: number; nombre: string; posicion: string }[];
    estadisticas: PaniniTeamScoreStats;
    bloque_tactico_1t: PaniniTacticalBlock;
    bloque_tactico_2t: PaniniTacticalBlock;
    cobertura_recuperaciones: PaniniSpatialCategory;
    cobertura_faltas: PaniniSpatialCategory;
    cobertura_acciones_utiles: PaniniSpatialCategory;
    cobertura_pases_largos: PaniniSpatialCategory;
    cobertura_regates: PaniniSpatialCategory;
    cobertura_centros: PaniniSpatialCategory;
    finalizacion: PaniniFinishingStats;
    matriz_pases: PaniniPassingMatrix;
    jugadores_stats: PaniniPlayerStats[];
    rankings_top: { [categoria: string]: { dorsal: number; nombre: string; valor: number }[] };
    /** Datos espaciales exactos extraídos del PDF vectorial */
    densidad_1t?: PaniniDensityMap;
    densidad_2t?: PaniniDensityMap;
    mapas_eventos?: PaniniEventMaps;
    mapa_tiros?: PaniniShotMarker[];
    minutos_tiros?: { minuto: number; periodo: PaniniPeriodo; balon_parado: boolean }[];
    goles_porteria?: PaniniGoalMarker[];
    eficacia_balon_parado?: PaniniSetPieceEfficacy[];
    red_pases?: PaniniPassNetwork;
  };

  equipo_visitante: {
    nombre: string;
    goles: number;
    entrenador: string;
    xg: number;
    ims: number;
    alineacion: PaniniPlayerLineup[];
    suplentes_no_utilizados: { dorsal: number; nombre: string; posicion: string }[];
    estadisticas: PaniniTeamScoreStats;
    bloque_tactico_1t: PaniniTacticalBlock;
    bloque_tactico_2t: PaniniTacticalBlock;
    cobertura_recuperaciones: PaniniSpatialCategory;
    cobertura_faltas: PaniniSpatialCategory;
    cobertura_acciones_utiles: PaniniSpatialCategory;
    cobertura_pases_largos: PaniniSpatialCategory;
    cobertura_regates: PaniniSpatialCategory;
    cobertura_centros: PaniniSpatialCategory;
    finalizacion: PaniniFinishingStats;
    matriz_pases: PaniniPassingMatrix;
    jugadores_stats: PaniniPlayerStats[];
    rankings_top: { [categoria: string]: { dorsal: number; nombre: string; valor: number }[] };
    /** Datos espaciales exactos extraídos del PDF vectorial */
    densidad_1t?: PaniniDensityMap;
    densidad_2t?: PaniniDensityMap;
    mapas_eventos?: PaniniEventMaps;
    mapa_tiros?: PaniniShotMarker[];
    minutos_tiros?: { minuto: number; periodo: PaniniPeriodo; balon_parado: boolean }[];
    goles_porteria?: PaniniGoalMarker[];
    eficacia_balon_parado?: PaniniSetPieceEfficacy[];
    red_pases?: PaniniPassNetwork;
  };

  goleadores: { minuto: string; jugador: string; equipo: 'home' | 'away' }[];
  timeline_eventos: PaniniTimelineEvent[];
}

