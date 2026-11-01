import { useMemo } from 'react';
import { usePlayerPaniniLines } from './usePlayerPaniniLines';
import { aggregatePlayer, normalize } from '../utils/playerPaniniStats';

/**
 * Agregado de temporada (Panini) para un jugador de la tabla `players`.
 * Empareja por player_id, luego dorsal y por último por nombre.
 */
export function usePlayerSeasonStats(dbPlayer: { id: string; dorsal?: number; first_name?: string; last_name?: string } | null | undefined) {
  const { lines } = usePlayerPaniniLines();

  return useMemo(() => {
    if (!lines || !dbPlayer) return null;
    let matched = lines.filter((l) => l.playerId === dbPlayer.id);
    if (!matched.length && dbPlayer.dorsal) {
      const byDorsal = lines.filter((l) => l.dorsal === dbPlayer.dorsal);
      if (byDorsal.length) matched = byDorsal;
    }
    const name = `${dbPlayer.first_name ?? ''} ${dbPlayer.last_name ?? ''}`.trim();
    if (!matched.length && name) {
      const tokens = normalize(name).split(' ').filter((t) => t.length > 2);
      matched = lines.filter((l) => !l.playerId && tokens.length > 0 && tokens.every((t) => normalize(l.stats?.nombre ?? l.name).includes(t)));
    }
    if (!matched.length) return null;
    return aggregatePlayer(matched);
  }, [lines, dbPlayer]);
}
