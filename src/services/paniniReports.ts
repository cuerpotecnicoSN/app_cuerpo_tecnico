import { supabase } from '../lib/supabase';
import type { PaniniMatchReport } from '../types/paniniReport';
import sampleReport from '../data/panini_reports/report_2026-09-20_villa_valle_milan_futuro.json';

const PANINI_PREFIX = '__PANINI_REPORT_JSON__';

/**
 * Obtiene el informe Panini de un partido.
 * Busca primero en las notas estructuradas del partido en Supabase,
 * luego en la fecha correspondiente y finalmente en los archivos de muestra locales.
 */
export async function getPaniniReportForMatch(matchId: string, matchDate?: string): Promise<PaniniMatchReport | null> {
  try {
    // 1. Consultar el partido en Supabase
    const { data: match, error } = await supabase
      .from('matches')
      .select('id, date, scouting_notes')
      .eq('id', matchId)
      .single();

    if (!error && match?.scouting_notes?.startsWith(PANINI_PREFIX)) {
      const jsonStr = match.scouting_notes.substring(PANINI_PREFIX.length);
      const parsed = JSON.parse(jsonStr);
      return parsed as PaniniMatchReport;
    }

    // 2. Si coincide con la fecha del informe cargado localmente (ej: 2026-09-20)
    const effectiveDate = matchDate || match?.date;
    if (effectiveDate === '2026-09-20' || sampleReport.fecha === effectiveDate) {
      return sampleReport as unknown as PaniniMatchReport;
    }

    return null;
  } catch (err) {
    console.warn('Error cargando Panini report:', err);
    if (matchDate === '2026-09-20') {
      return sampleReport as unknown as PaniniMatchReport;
    }
    return null;
  }
}

/**
 * Guarda o actualiza el informe Panini en el partido correspondiente en Supabase.
 */
export async function savePaniniReportToMatch(matchId: string, report: PaniniMatchReport): Promise<boolean> {
  try {
    const payload = `${PANINI_PREFIX}${JSON.stringify(report)}`;
    const { error } = await supabase
      .from('matches')
      .update({
        scouting_notes: payload,
        result_home: report.equipo_local.goles,
        result_away: report.equipo_visitante.goles,
        status: 'Finished'
      })
      .eq('id', matchId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error guardando informe Panini en Supabase:', err);
    return false;
  }
}
