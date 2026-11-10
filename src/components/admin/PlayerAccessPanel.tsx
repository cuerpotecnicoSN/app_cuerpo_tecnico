import { useEffect, useMemo, useState } from 'react';
import { Mail, Send, RotateCw, CheckCircle2, Clock, Search, Loader2, Save, User, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ensureContext } from '../../lib/dataService';
import { getPlayerAccessStatus, invitePlayer, savePlayerEmail, deleteUserAccount, type PlayerAccessRow } from '../../services/playerDevelopment';
import { translatePosition } from '../../utils/positionTranslations';
import { useTranslation } from 'react-i18next';

interface Row {
  id: string;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  main_position: string | null;
  email: string | null;
  user_id: string | null;
  invited_at: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

type Status = 'sin_email' | 'sin_invitar' | 'invitado' | 'activo';

const STATUS_UI: Record<Status, { label: string; cls: string }> = {
  sin_email: { label: 'Sin email', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  sin_invitar: { label: 'Sin invitar', cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  invitado: { label: 'Invitación enviada', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  activo: { label: 'Activo', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function PlayerAccessPanel() {
  const { i18n } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [access, setAccess] = useState<Record<string, PlayerAccessRow>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    const seasonId = await ensureContext();
    const [{ data }, acc] = await Promise.all([
      supabase.from('players').select('id, first_name, last_name, photo_url, main_position, email, user_id, invited_at').eq('season_id', seasonId).order('last_name'),
      getPlayerAccessStatus().catch(() => [] as PlayerAccessRow[]),
    ]);
    const filteredData = ((data as Row[]) ?? []).filter(r => {
      const pos = (r.main_position || '').toLowerCase();
      const isStaff = pos.includes('entrenador') || pos.includes('preparador') || pos.includes('analista') || pos.includes('fisioterapeuta') || pos.includes('médico') || pos.includes('medico');
      return !isStaff;
    });
    setRows(filteredData);
    setAccess(Object.fromEntries(acc.map((a) => [a.player_id, a])));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const statusOf = (r: Row): Status => {
    if (r.user_id && access[r.id]?.last_sign_in_at) return 'activo';
    if (r.user_id) return 'invitado';
    return r.email ? 'sin_invitar' : 'sin_email';
  };

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? rows.filter((r) => `${r.first_name} ${r.last_name} ${r.email ?? ''}`.toLowerCase().includes(n)) : rows;
  }, [rows, q]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { sin_email: 0, sin_invitar: 0, invitado: 0, activo: 0 };
    rows.forEach((r) => c[statusOf(r)]++);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, access]);

  const act = async (r: Row, kind: 'save' | 'invite' | 'clear') => {
    if (kind === 'clear') {
      if (!confirm(`¿Borrar el email y eliminar el usuario y acceso de ${r.first_name ?? 'este jugador'}?`)) return;
      setBusy(r.id); setMsg(null);
      try {
        await deleteUserAccount({ playerId: r.id, userId: r.user_id || undefined, email: r.email || undefined });
        await supabase.from('players').update({ email: null, user_id: null, invited_at: null }).eq('id', r.id);
        const { [r.id]: _omit, ...rest } = drafts; void _omit; setDrafts(rest);
        setMsg({ id: r.id, ok: true, text: 'Cuenta y acceso eliminados' });
        await load();
      } catch (e) {
        setMsg({ id: r.id, ok: false, text: e instanceof Error ? e.message : 'Error' });
      } finally {
        setBusy(null);
      }
      return;
    }

    const email = (drafts[r.id] ?? r.email ?? '').trim().toLowerCase();
    if (email && !EMAIL_RE.test(email)) { setMsg({ id: r.id, ok: false, text: 'Email no válido' }); return; }
    setBusy(r.id); setMsg(null);
    try {
      if (kind === 'save') {
        const oldEmail = r.email?.trim().toLowerCase();
        // Si se cambia o se borra el email anterior, limpiar credenciales previas de auth
        if (oldEmail && oldEmail !== email) {
          try {
            await deleteUserAccount({ playerId: r.id, userId: r.user_id || undefined, email: oldEmail });
          } catch (_e) {
            // ignore if not found in auth
          }
        }
        await savePlayerEmail(r.id, email || null);
        if (!email) {
          // Si guardó en blanco, eliminar cuenta de usuario también
          await deleteUserAccount({ playerId: r.id, userId: r.user_id || undefined, email: oldEmail });
          await supabase.from('players').update({ user_id: null, invited_at: null }).eq('id', r.id);
        }
        setMsg({ id: r.id, ok: true, text: email ? 'Email guardado' : 'Email borrado' });
      } else {
        if (!email) throw new Error('Añade un email primero');
        const isReinvite = !!r.user_id || (r.email && r.email !== email);
        if (isReinvite && !confirm(`¿Enviar la invitación a ${email}? Se actualizará el acceso del jugador a esta nueva dirección.`)) return;
        await invitePlayer(r.id, email);
        setMsg({ id: r.id, ok: true, text: `Invitación enviada a ${email}` });
      }
      const { [r.id]: _omit, ...rest } = drafts; void _omit; setDrafts(rest);
      await load();
    } catch (e) {
      setMsg({ id: r.id, ok: false, text: e instanceof Error ? e.message : 'Error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-extrabold flex items-center gap-2"><Mail size={20} className="text-primary" /> Acceso de jugadores</h2>
          <p className="text-sm text-muted">Registra el email de cada jugador y envíale la invitación a su portal.</p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full sm:w-56" placeholder="Buscar jugador" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(STATUS_UI) as Status[]).map((s) => (
          <span key={s} className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${STATUS_UI[s].cls}`}>{STATUS_UI[s].label}: {counts[s]}</span>
        ))}
      </div>

      {loading ? <p className="text-muted">Cargando…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-sm font-semibold text-secondary">Jugador</th>
                <th className="p-3 text-sm font-semibold text-secondary">Email</th>
                <th className="p-3 text-sm font-semibold text-secondary">Estado</th>
                <th className="p-3 text-sm font-semibold text-secondary text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const st = statusOf(r);
                const draft = drafts[r.id] ?? r.email ?? '';
                const dirty = draft.trim().toLowerCase() !== (r.email ?? '');
                return (
                  <tr key={r.id} className="border-b border-border hover:bg-bg-hover align-top">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {r.photo_url
                          ? <img src={r.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                          : <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"><User size={16} className="text-gray-400" /></span>}
                        <div>
                          <p className="font-semibold text-sm">{`${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()}</p>
                          <p className="text-xs text-muted">{r.main_position ? translatePosition(r.main_position, i18n.language) : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="email"
                        className="text-sm px-2 py-1.5 border border-gray-200 rounded-lg w-full max-w-[260px] bg-white focus:ring-1 focus:ring-primary focus:border-primary"
                        placeholder="jugador@email.com"
                        value={draft}
                        onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })}
                      />
                      {msg?.id === r.id && <p className={`text-xs mt-1 ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${STATUS_UI[st].cls}`}>
                        {st === 'activo' ? <CheckCircle2 size={12} /> : st === 'invitado' ? <Clock size={12} /> : null}
                        {STATUS_UI[st].label}
                      </span>
                      {st === 'invitado' && r.invited_at && <p className="text-[11px] text-muted mt-1">el {fmt(r.invited_at)}</p>}
                      {st === 'activo' && access[r.id]?.last_sign_in_at && <p className="text-[11px] text-muted mt-1">último acceso {fmt(access[r.id].last_sign_in_at!)}</p>}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1.5 items-center">
                        {dirty ? (
                          <button
                            className="btn btn-outline text-xs text-blue-600 hover:text-blue-700 bg-blue-50/50 border-blue-200 flex items-center gap-1"
                            style={{ padding: '0.4rem 0.65rem' }}
                            title="Guardar email en la ficha sin enviar invitación todavía"
                            disabled={busy === r.id}
                            onClick={() => act(r, 'save')}
                          >
                            <Save size={14} />
                            <span className="font-semibold">Guardar email</span>
                          </button>
                        ) : null}

                        {(r.email || r.user_id) && (
                          <button
                            className="btn btn-outline text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border-gray-200"
                            style={{ padding: '0.4rem 0.6rem' }}
                            title="Borrar email y cuenta de usuario"
                            disabled={busy === r.id}
                            onClick={() => act(r, 'clear')}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        <button
                          className={`btn text-xs flex items-center gap-1.5 ${st === 'sin_invitar' ? 'btn-primary' : dirty ? 'btn-primary' : 'btn-outline border-primary text-primary hover:bg-primary hover:text-white'}`}
                          style={{ padding: '0.4rem 0.75rem' }}
                          disabled={busy === r.id || !draft.trim()}
                          onClick={() => act(r, 'invite')}
                          title={st === 'activo' || st === 'invitado' || dirty ? 'Enviar o reenviar invitación con este email' : 'Enviar invitación'}
                        >
                          {busy === r.id ? <Loader2 size={14} className="animate-spin" /> : st === 'activo' || st === 'invitado' ? <RotateCw size={14} /> : <Send size={14} />}
                          <span>{st === 'activo' ? 'Reenviar / Cambiar' : st === 'invitado' ? 'Reenviar invitación' : 'Invitar ahora'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
