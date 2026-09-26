import { readFileSync } from 'fs';
const P = await import('../src/utils/playerPaniniStats.ts');
const rows = JSON.parse(readFileSync('.tmpdump/matches.json', 'utf8'));
const entries = rows.map((m: any) => {
  const r = JSON.parse(m.scouting_notes.slice('__PANINI_REPORT_JSON__'.length));
  const isHome = /milan/i.test(r.equipo_local.nombre);
  return { match: m, report: r, isHome, our: isHome ? r.equipo_local : r.equipo_visitante, rival: isHome ? r.equipo_visitante : r.equipo_local };
});
const lines = P.buildPlayerLines(entries);
const aggs = P.aggregatePlayers(lines);
console.log('lines', lines.length, 'players', aggs.length, 'unlinked', aggs.filter(a => !a.playerId).map(a => a.name));
for (const a of aggs.slice(0, 25)) console.log(a.dorsal, a.name.padEnd(24), a.role, a.matches, a.minutes, 'G', a.total.goals, 'A', a.total.assists, 'rec', a.total.recoveries, 'pass%', a.total.pass_acc?.toFixed(0), 'touches', a.lines.reduce((s, l) => s + l.touches.length, 0));
for (const k of ['goals', 'useful', 'recoveries', 'pass_acc', 'saves']) {
  const m = P.metricDef(k)!;
  console.log(k, P.rankPlayers(aggs, m, 'per90', 90).slice(0, 4).map(r => `${r.rank}.${r.player.name} ${P.formatMetric(r.value, m, 'per90')}`).join(' | '));
}
