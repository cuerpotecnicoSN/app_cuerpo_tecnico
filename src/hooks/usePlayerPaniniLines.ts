import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyPaniniReports, getSeasonPaniniReports } from '../services/paniniReports';
import { buildPlayerLines, type PlayerMatchLine } from '../utils/playerPaniniStats';

/** Líneas partido-jugador de la temporada: de toda la plantilla para el staff, solo las propias para un jugador */
export function usePlayerPaniniLines() {
  const { isPlayer } = useAuth();
  const [lines, setLines] = useState<PlayerMatchLine[] | null>(null);
  const [reports, setReports] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (isPlayer ? getMyPaniniReports() : getSeasonPaniniReports())
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
  }, [isPlayer]);

  return { lines, reports, error, loading: lines === null };
}
