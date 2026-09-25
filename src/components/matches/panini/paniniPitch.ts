/**
 * Utilidades comunes de los campogramas Panini.
 *
 * Los datos del informe vienen en "coordenadas de ataque" (cada equipo ataca
 * hacia la derecha: x 0→100 portería propia → rival, y 0→100 banda izquierda →
 * derecha). En un campo compartido el local ataca hacia la derecha y el
 * visitante hacia la izquierda, así que al visitante se le gira 180º.
 */
import type { PaniniPitchPoint, PaniniPlayerLineup, PaniniTeamData } from '../../../types/paniniReport';

export type PitchLine = 'gk' | 'def' | 'med' | 'att';

export const toSharedPitch = (p: PaniniPitchPoint, isHome: boolean): PaniniPitchPoint =>
  isHome ? { x: p.x, y: p.y } : { x: 100 - p.x, y: 100 - p.y };

export const lineOf = (posicion?: string): PitchLine => {
  const p = (posicion || '').toUpperCase();
  if (p.startsWith('P')) return 'gk';
  if (p.startsWith('D')) return 'def';
  if (p.startsWith('A')) return 'att';
  return 'med';
};

/** Panini escribe "Apellido Nombre": la etiqueta corta es el apellido */
export const shortName = (nombre: string) => nombre.split(' ')[0] ?? nombre;

export interface AveragePosition {
  x: number;
  y: number;
  label: string;
  line: PitchLine;
}

/** Posición media de los titulares, lista para un campo compartido (local → derecha) */
export function averagePositions(team: PaniniTeamData, isHome: boolean): Record<number, AveragePosition> {
  const out: Record<number, AveragePosition> = {};
  for (const p of team.alineacion) {
    if (!p.es_titular || p.x === undefined || p.y === undefined) continue;
    const pos = toSharedPitch({ x: p.x, y: p.y }, isHome);
    out[p.dorsal] = { ...pos, label: shortName(p.nombre), line: lineOf(p.posicion) };
  }
  return out;
}

export const hasAveragePositions = (team: PaniniTeamData) => team.alineacion.some((p: PaniniPlayerLineup) => p.x !== undefined);

/** Aviso común para informes antiguos, importados antes del lector exacto de PDF */
export const MISSING_SPATIAL_DATA_MESSAGE =
  'Este informe no incluye datos espaciales exactos. Vuelve a importar el PDF original de Panini para ver este campograma.';
