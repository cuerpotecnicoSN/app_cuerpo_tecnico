import { useEffect, useState } from 'react';
import { getSeasonPaniniReports } from '../services/paniniReports';
import { buildPlayerLines, type PlayerMatchLine } from '../utils/playerPaniniStats';

/** Líneas partido-jugador de todos los informes Panini de la temporada */
export function usePlayerPaniniLines() {
  const [lines, setLines] = useState<PlayerMatchLine[] | null>(null);
  const [reports, setReports] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    getSeasonPaniniReports()
      .then((entries) => {
        if (!alive) return;
        setReports(entries.length);
        setLines(buildPlayerLines(entries));
      })
      .catch((err) => {
        console.error('Error cargando informes Panini para estadísticas de jugadores:', err);
        if (!alive) return;
        setError(true);
        setLines([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { lines, reports, error, loading: lines === null };
}
