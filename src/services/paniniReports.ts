import { supabase } from '../lib/supabase';
import type { PaniniMatchReport, PaniniTeamData } from '../types/paniniReport';
import type { MatchDB } from '../components/types';
import { getMatches } from './matches';

const PANINI_PREFIX = '__PANINI_REPORT_JSON__';
/** Bucket privado de Supabase Storage donde se guarda el PDF original de cada partido */
export const PANINI_PDF_BUCKET = 'panini-reports';

/** Nuestro equipo en los informes Panini */
export const isOurTeamName = (name?: string) => !!name && name.toLowerCase().includes('milan');

/** Devuelve [nuestro equipo, rival] del informe y si jugamos en casa */
export function splitTeams(report: PaniniMatchReport, fallbackIsHome = true) {
  const localIsUs = isOurTeamName(report.equipo_local?.nombre);
  const awayIsUs = isOurTeamName(report.equipo_visitante?.nombre);
  const isHome = localIsUs ? true : awayIsUs ? false : fallbackIsHome;
  return {
    isHome,
    our: isHome ? report.equipo_local : report.equipo_visitante,
    rival: isHome ? report.equipo_visitante : report.equipo_local,
  };
}

const parseStoredReport = (notes?: string | null): PaniniMatchReport | null => {
  if (!notes?.startsWith(PANINI_PREFIX)) return null;
  try {
    return JSON.parse(notes.substring(PANINI_PREFIX.length)) as PaniniMatchReport;
  } catch (err) {
    console.warn('Informe Panini corrupto:', err);
    return null;
  }
};

/**
 * Obtiene el informe Panini guardado en un partido (o null si no tiene).
 */
export async function getPaniniReportForMatch(matchId: string): Promise<PaniniMatchReport | null> {
  const { data: match, error } = await supabase
    .from('matches')
    .select('id, scouting_notes')
    .eq('id', matchId)
    .single();
  if (error) {
    console.warn('Error cargando informe Panini:', error);
    return null;
  }
  return parseStoredReport(match?.scouting_notes);
}

/**
 * Guarda el informe Panini en el partido correspondiente en Supabase.
 */
export async function savePaniniReportToMatch(matchId: string, report: PaniniMatchReport): Promise<void> {
  const payload = `${PANINI_PREFIX}${JSON.stringify(report)}`;
  const { error } = await supabase
    .from('matches')
    .update({
      scouting_notes: payload,
      result_home: report.equipo_local.goles,
      result_away: report.equipo_visitante.goles,
      status: 'Finished',
    })
    .eq('id', matchId);
  if (error) throw error;
}

/**
 * Sube el PDF original al almacenamiento del partido. Devuelve la ruta o un
 * mensaje de error (la importación de datos no depende de que esto funcione).
 */
export async function uploadPaniniPdf(matchId: string, file: File): Promise<{ path?: string; error?: string }> {
  const path = `matches/${matchId}.pdf`;
  const { error } = await supabase.storage.from(PANINI_PDF_BUCKET).upload(path, file, {
    upsert: true,
    contentType: 'application/pdf',
  });
  if (error) return { error: error.message };
  return { path };
}

/** URL temporal para abrir el PDF original de un partido */
export async function getPaniniPdfUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(PANINI_PDF_BUCKET).createSignedUrl(path, 60 * 10);
  return error ? null : data.signedUrl;
}

/**
 * Mapea posición abreviada a nombre completo
 */
const mapPosition = (pos: string) => {
  const p = (pos || '').toUpperCase();
  if (p === 'P' || p.includes('POR')) return 'Portero';
  if (p === 'D' || p.includes('DEF')) return 'Defensa';
  if (p === 'C' || p.includes('MED') || p.includes('CEN')) return 'Centrocampista';
  if (p === 'A' || p.includes('DEL') || p.includes('ATT')) return 'Delantero';
  return 'Sin definir';
};

const normalizeName = (s?: string | null) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** true si el rival del partido y el del informe parecen el mismo equipo */
export const sameOpponent = (a?: string | null, b?: string | null) => {
  const x = normalizeName(a);
  const y = normalizeName(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
};

/**
 * Busca el partido del sistema que corresponde al informe: misma fecha y mismo
 * rival. Si solo coincide la fecha con un único partido, también vale. Nunca
 * se asocia solo por rival (ida y vuelta tienen el mismo rival).
 */
export function findMatchForReport<T extends { id: string; date?: string | null; opponent?: string | null }>(
  report: PaniniMatchReport,
  matches: T[],
): { match: T | null; ambiguous: boolean } {
  const { rival } = splitTeams(report);
  const sameDate = matches.filter((m) => m.date === report.fecha);
  const exact = sameDate.filter((m) => sameOpponent(m.opponent, rival.nombre));
  if (exact.length === 1) return { match: exact[0], ambiguous: false };
  if (exact.length > 1) return { match: exact[0], ambiguous: true };
  if (sameDate.length === 1) return { match: sameDate[0], ambiguous: false };
  return { match: null, ambiguous: sameDate.length > 1 };
}

/**
 * Sincroniza un informe Panini:
 * 1. Lo asocia al partido indicado, o busca uno por fecha + rival, o crea uno nuevo.
 * 2. Vincula (o crea sin foto) los jugadores de nuestro equipo en `players`.
 * 3. Guarda el informe en el partido y, si se pasa, sube el PDF original.
 */
export async function syncPaniniReportWithPlayersAndMatch(
  report: PaniniMatchReport,
  targetMatchId?: string,
  pdfFile?: File,
): Promise<{
  success: boolean;
  matchId: string;
  matchTitle: string;
  playersCreated: number;
  playersLinked: number;
  warnings: string[];
  error?: string;
}> {
  const warnings: string[] = [];
  try {
    const { isHome, our: ourTeam, rival } = splitTeams(report);

    // 1. Identificar o crear el partido
    let matchId = targetMatchId;
    if (!matchId) {
      const { data: candidates } = await supabase.from('matches').select('id, date, opponent').eq('date', report.fecha);
      const found = findMatchForReport(report, candidates || []);
      if (found.ambiguous) warnings.push('Había varios partidos posibles en esa fecha: revisa que la asociación sea correcta.');
      matchId = found.match?.id;
    }

    if (!matchId) {
      const { data: newMatch, error: createMatchErr } = await supabase
        .from('matches')
        .insert({
          date: report.fecha,
          opponent: rival.nombre,
          competition: report.competicion || 'Serie D',
          stadium: report.estadio,
          is_home: isHome,
          status: 'Finished',
          result_home: report.equipo_local.goles,
          result_away: report.equipo_visitante.goles,
        })
        .select()
        .single();
      if (createMatchErr) throw createMatchErr;
      matchId = newMatch.id as string;
    }

    report.match_id = matchId;

    // 2. Jugadores de nuestro equipo
    const { data: dbPlayers } = await supabase.from('players').select('*');
    const existingPlayers = dbPlayers || [];
    let playersCreated = 0;
    let playersLinked = 0;
    const playerMap: Record<string, string> = {};

    for (const p of ourTeam.alineacion) {
      const dorsal = p.dorsal;
      const fullName = p.nombre.trim();
      // Panini escribe "Apellido Nombre"
      const parts = fullName.split(' ');
      const lastName = parts[0] || '';
      const firstName = parts.slice(1).join(' ') || parts[0];

      const found = existingPlayers.find((dp: any) => {
        const dpFull = normalizeName(`${dp.first_name || ''} ${dp.last_name || ''}`);
        const dpLast = normalizeName(dp.last_name);
        const target = normalizeName(fullName);
        const dpKit = dp.kit_number || dp.dorsal;
        return (
          (dpKit && Number(dpKit) === dorsal) ||
          dpFull === target ||
          target.split(' ').every((t) => dpFull.includes(t)) ||
          (normalizeName(lastName).length > 3 && dpLast === normalizeName(lastName))
        );
      });

      if (found) {
        p.player_id = found.id;
        playersLinked++;
      } else {
        const pStat = ourTeam.jugadores_stats.find((s) => s.dorsal === dorsal);
        const { data: newPlayer, error: createPlayerErr } = await supabase
          .from('players')
          .insert({
            first_name: firstName,
            last_name: lastName,
            football_name: fullName,
            kit_number: dorsal,
            main_position: mapPosition(p.posicion || p.posicion_desc),
            birth_date: pStat?.anio_nacimiento ? `${pStat.anio_nacimiento}-01-01` : null,
            medical_status: 'Apto',
            photo_url: null,
          })
          .select()
          .single();
        if (createPlayerErr || !newPlayer) {
          warnings.push(`No se pudo crear el jugador ${fullName}: ${createPlayerErr?.message ?? 'error desconocido'}`);
          continue;
        }
        p.player_id = newPlayer.id;
        existingPlayers.push(newPlayer);
        playersCreated++;
      }
      playerMap[`dorsal_${dorsal}`] = p.player_id!;
    }

    // 3. Vincular player_id en el resto de secciones por dorsal
    ourTeam.jugadores_stats = ourTeam.jugadores_stats.map((s) => ({ ...s, player_id: playerMap[`dorsal_${s.dorsal}`] ?? s.player_id }));
    ourTeam.matriz_pases.jugadores = ourTeam.matriz_pases.jugadores.map((j) => ({ ...j, player_id: playerMap[`dorsal_${j.dorsal}`] ?? j.player_id }));

    // 4. PDF original (opcional) y guardado del informe
    if (pdfFile) {
      const upload = await uploadPaniniPdf(matchId, pdfFile);
      if (upload.path && report.fuente) report.fuente = { ...report.fuente, pdf_path: upload.path };
      if (upload.error) warnings.push(`El informe se ha importado, pero no se pudo guardar el PDF original (${upload.error}).`);
    }
    await savePaniniReportToMatch(matchId, report);

    return {
      success: true,
      matchId,
      matchTitle: `${report.equipo_local.nombre} vs ${report.equipo_visitante.nombre} (${report.fecha})`,
      playersCreated,
      playersLinked,
      warnings,
    };
  } catch (err: any) {
    console.error('Error sincronizando Panini report con base de datos:', err);
    return {
      success: false,
      matchId: targetMatchId || '',
      matchTitle: '',
      playersCreated: 0,
      playersLinked: 0,
      warnings,
      error: err.message || 'Error desconocido',
    };
  }
}

/**
 * Extrae el informe de un archivo de Panini Digital Match Analysis.
 *  - PDF: lectura exacta de las figuras y el texto del PDF vectorial.
 *  - JSON: informe ya estructurado (p. ej. exportado previamente).
 * Si el archivo no se puede leer lanza un error: nunca se devuelve otro informe.
 */
export async function extractPaniniReportFromFile(file: File): Promise<PaniniMatchReport> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.json')) {
    const parsed = JSON.parse(await file.text()) as PaniniMatchReport;
    if (!parsed?.equipo_local || !parsed?.equipo_visitante || !parsed?.fecha) {
      throw new Error('El JSON no tiene la estructura de un informe Panini.');
    }
    return parsed;
  }

  if (!fileName.endsWith('.pdf')) throw new Error('Formato no compatible: sube el PDF de Panini Digital.');
  const { extractPaniniReportFromPdf } = await import('./panini/pdf/extractPaniniPdf');
  const { report } = await extractPaniniReportFromPdf(file);
  return report;
}


export interface SeasonPaniniEntry {
  match: MatchDB;
  report: PaniniMatchReport;
  isHome: boolean;
  our: PaniniTeamData;
  rival: PaniniTeamData;
}

/**
 * Carga todos los informes Panini de la temporada activa, ordenados por fecha ascendente,
 * identificando cuál de los dos equipos del informe es el nuestro.
 */
export async function getSeasonPaniniReports(): Promise<SeasonPaniniEntry[]> {
  const matches = await getMatches();
  const entries: SeasonPaniniEntry[] = [];

  for (const match of matches) {
    const report = parseStoredReport(match.scouting_notes);
    if (!report?.equipo_local || !report?.equipo_visitante) continue;
    const { isHome, our, rival } = splitTeams(report, match.is_home);
    entries.push({ match, report, isHome, our, rival });
  }

  return entries.sort((a, b) => (a.match.date < b.match.date ? -1 : a.match.date > b.match.date ? 1 : 0));
}
