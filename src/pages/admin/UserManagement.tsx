import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import {
  UserCog,
  Edit,
  Save,
  X,
  UserPlus,
  Trash2,
  Loader2,
  Send,
  RotateCw,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import PlayerAccessPanel from '../../components/admin/PlayerAccessPanel';
import {
  inviteStaffMember,
  deleteUserAccount,
  getStaffAccessStatus,
  saveStaffEmail,
  type StaffAccessRow,
} from '../../services/playerDevelopment';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

type StaffStatus = 'sin_email' | 'sin_invitar' | 'invitado' | 'activo';

const STATUS_UI: Record<StaffStatus, { label: string; cls: string }> = {
  sin_email: { label: 'Sin email', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  sin_invitar: { label: 'Sin invitar', cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  invitado: { label: 'Invitación enviada', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  activo: { label: 'Activo', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [access, setAccess] = useState<Record<string, StaffAccessRow>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [rowMsg, setRowMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Edición rápida de nombre y rol
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', role: '', avatar_url: '' });

  // Modal para invitar nuevo miembro del staff
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Entrenador');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [{ data, error }, acc] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: true }),
        getStaffAccessStatus().catch(() => [] as StaffAccessRow[]),
      ]);
      if (error) throw error;
      setUsers(data || []);
      setAccess(Object.fromEntries(acc.map((a) => [a.user_id, a])));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusOf = (user: any): StaffStatus => {
    const acc = access[user.id];
    if (acc?.last_sign_in_at) return 'activo';
    if (acc?.email_confirmed_at) return 'activo';
    // Si tiene cuenta en auth pero sin login
    if (acc) return 'invitado';
    // Si no vino en el rpc de auth pero tiene email en profiles
    if (user.email) return 'invitado';
    return 'sin_email';
  };

  const counts = useMemo(() => {
    const c: Record<StaffStatus, number> = { sin_email: 0, sin_invitar: 0, invitado: 0, activo: 0 };
    users.forEach((u) => c[statusOf(u)]++);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, access]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const startEdit = (user: any) => {
    setEditingId(user.id);
    setEditForm({
      full_name: user.full_name || '',
      role: user.role || t('admin.users.roles.coach'),
      avatar_url: user.avatar_url || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          role: editForm.role,
          avatar_url: editForm.avatar_url,
        })
        .eq('id', editingId);

      if (error) throw error;
      setEditingId(null);
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert(t('admin.users.saveError'));
    }
  };

  // Acciones en la fila: Guardar email, Re-invitar/Invitar, o Borrar email/cuenta
  const actStaff = async (user: any, kind: 'save' | 'invite' | 'clear') => {
    if (kind === 'clear') {
      const isSelf = user.role === 'Admin' && user.email === 'cuerpotecnico.sn@gmail.com';
      if (isSelf) {
        alert('No puedes borrar la cuenta del administrador principal.');
        return;
      }
      if (
        !window.confirm(
          `¿Borrar el email y eliminar el acceso de ${user.full_name || user.email || 'este entrenador'}?`
        )
      ) {
        return;
      }
      setBusyUser(user.id);
      setRowMsg(null);
      try {
        await deleteUserAccount({ userId: user.id });
        const { [user.id]: _omit, ...rest } = drafts;
        void _omit;
        setDrafts(rest);
        setRowMsg({ id: user.id, ok: true, text: 'Cuenta y acceso eliminados' });
        await fetchUsers();
      } catch (e: any) {
        // Fallback: si falla edge function, limpiar perfil
        try {
          await supabase.from('profiles').update({ email: null }).eq('id', user.id);
          setRowMsg({ id: user.id, ok: true, text: 'Email eliminado del perfil' });
          await fetchUsers();
        } catch (dbErr: any) {
          setRowMsg({ id: user.id, ok: false, text: e.message || dbErr.message || 'Error' });
        }
      } finally {
        setBusyUser(null);
      }
      return;
    }

    const currentEmail = user.email ?? '';
    const draftEmail = (drafts[user.id] ?? currentEmail).trim().toLowerCase();

    if (draftEmail && !EMAIL_RE.test(draftEmail)) {
      setRowMsg({ id: user.id, ok: false, text: 'Email no válido' });
      return;
    }

    setBusyUser(user.id);
    setRowMsg(null);

    try {
      if (kind === 'save') {
        await saveStaffEmail(user.id, draftEmail || null);
        setRowMsg({ id: user.id, ok: true, text: draftEmail ? 'Email guardado' : 'Email borrado' });
      } else {
        // invite / reinvite
        if (!draftEmail) throw new Error('Añade un email primero');
        const st = statusOf(user);
        const isReinvite = st === 'activo' || st === 'invitado' || draftEmail !== currentEmail;
        if (
          isReinvite &&
          !confirm(`¿Enviar la invitación a ${draftEmail}? Se actualizará el acceso del entrenador a esta dirección.`)
        ) {
          setBusyUser(null);
          return;
        }

        await inviteStaffMember({
          userId: user.id,
          email: draftEmail,
          full_name: user.full_name || undefined,
          role: user.role || 'Entrenador',
        });
        setRowMsg({ id: user.id, ok: true, text: `Invitación enviada a ${draftEmail}` });
      }

      const { [user.id]: _omit, ...rest } = drafts;
      void _omit;
      setDrafts(rest);
      await fetchUsers();
    } catch (e: any) {
      setRowMsg({ id: user.id, ok: false, text: e.message || 'Error al procesar solicitud' });
    } finally {
      setBusyUser(null);
    }
  };

  const handleInviteStaffModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      await inviteStaffMember({
        email: inviteEmail.trim(),
        full_name: inviteName.trim() || undefined,
        role: inviteRole,
      });
      alert(`Invitación enviada con éxito a ${inviteEmail}`);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('Entrenador');
      setShowInviteModal(false);
      await fetchUsers();
    } catch (err: any) {
      setInviteError(err.message || 'Error al enviar la invitación');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* SECCIÓN 1: GESTIÓN DE ENTRENADORES / STAFF */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <UserCog size={28} className="text-primary" />
            <div>
              <h1 className="h2 mb-0.5">{t('admin.users.title')}</h1>
              <p className="text-sm text-muted">
                Registra o cambia el correo de cada entrenador/staff y envíale la invitación cuando quieras.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-full sm:w-52"
                placeholder="Buscar entrenador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              onClick={() => setShowInviteModal(true)}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <UserPlus size={16} />
              <span>Invitar Entrenador / Staff</span>
            </button>

            <button
              onClick={async () => {
                const confirmed = window.confirm(t('admin.users.seedConfirm'));
                if (confirmed) {
                  try {
                    const { seedDatabase, ensureContext } = await import('../../lib/dataService');
                    const seasonId = await ensureContext();
                    await seedDatabase(seasonId);
                    alert(t('admin.users.seedSuccess'));
                  } catch (e: any) {
                    alert(t('admin.users.seedError', { message: e.message }));
                  }
                }
              }}
              className="btn btn-outline border-primary text-primary hover:bg-primary hover:text-white text-xs"
            >
              {t('admin.users.seedButton')}
            </button>
          </div>
        </div>

        {/* Badges de estado de staff */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(STATUS_UI) as StaffStatus[]).map((s) => (
            <span key={s} className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${STATUS_UI[s].cls}`}>
              {STATUS_UI[s].label}: {counts[s]}
            </span>
          ))}
        </div>

        {loading ? (
          <p className="text-muted">{t('admin.users.loading')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-sm font-semibold text-secondary">Entrenador / Staff</th>
                  <th className="p-3 text-sm font-semibold text-secondary">Correo electrónico</th>
                  <th className="p-3 text-sm font-semibold text-secondary">Rol</th>
                  <th className="p-3 text-sm font-semibold text-secondary">Estado</th>
                  <th className="p-3 text-sm font-semibold text-secondary text-right">Comportamiento</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isEditing = editingId === user.id;
                  const st = statusOf(user);
                  const draft = drafts[user.id] ?? user.email ?? '';
                  const dirty = draft.trim().toLowerCase() !== (user.email ?? '').trim().toLowerCase();
                  const isBusy = busyUser === user.id;

                  return (
                    <tr key={user.id} className="border-b border-border hover:bg-bg-hover align-top">
                      {/* Entrenador */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#db0030] text-white flex items-center justify-center font-bold text-sm">
                              {(user.full_name || 'E')
                                .split(' ')
                                .map((n: string) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </div>
                          )}

                          {isEditing ? (
                            <input
                              className="text-sm px-2 py-1 border border-gray-200 rounded-md"
                              value={editForm.full_name}
                              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                              placeholder={t('admin.users.namePlaceholder')}
                            />
                          ) : (
                            <div>
                              <span className="font-semibold text-sm block">
                                {user.full_name || t('admin.users.noName')}
                              </span>
                              <span className="text-[11px] text-muted">{user.role || 'Entrenador'}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Correo electrónico editable en línea */}
                      <td className="p-3">
                        <input
                          type="email"
                          className="text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg w-full max-w-[240px] bg-white focus:ring-1 focus:ring-primary focus:border-primary"
                          placeholder="entrenador@email.com"
                          value={draft}
                          onChange={(e) => setDrafts({ ...drafts, [user.id]: e.target.value })}
                        />
                        {rowMsg && rowMsg.id === user.id && (
                          <p className={`text-xs mt-1 ${rowMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                            {rowMsg.text}
                          </p>
                        )}
                      </td>

                      {/* Rol */}
                      <td className="p-3">
                        {isEditing ? (
                          <select
                            className="text-sm p-1 border border-gray-200 rounded-md"
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          >
                            <option value="Admin">{t('admin.users.roles.admin')}</option>
                            <option value="Entrenador">{t('admin.users.roles.coach')}</option>
                            <option value="Preparador Físico">{t('admin.users.roles.fitnessCoach')}</option>
                            <option value="Analista">{t('admin.users.roles.analyst')}</option>
                            <option value="Jugador">Jugador</option>
                            <option value="Pendiente">Pendiente (sin acceso)</option>
                          </select>
                        ) : (
                          <span
                            className={`badge ${
                              user.role === 'Admin'
                                ? 'badge-danger'
                                : user.role === 'Pendiente'
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {user.role || t('admin.users.roles.coach')}
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${STATUS_UI[st].cls}`}
                        >
                          {st === 'activo' ? <CheckCircle2 size={12} /> : st === 'invitado' ? <Clock size={12} /> : null}
                          {STATUS_UI[st].label}
                        </span>
                        {st === 'activo' && access[user.id]?.last_sign_in_at && (
                          <p className="text-[11px] text-muted mt-1">
                            acceso {fmt(access[user.id].last_sign_in_at!)}
                          </p>
                        )}
                      </td>

                      {/* Acciones / Comportamiento */}
                      <td className="p-3">
                        <div className="flex justify-end gap-1.5 items-center">
                          {isEditing ? (
                            <>
                              <button
                                onClick={saveEdit}
                                className="btn btn-primary"
                                style={{ padding: '0.4rem 0.6rem' }}
                                title="Guardar cambios de nombre o rol"
                              >
                                <Save size={15} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="btn btn-outline"
                                style={{ padding: '0.4rem 0.6rem' }}
                                title="Cancelar edición"
                              >
                                <X size={15} />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Guardar email cuando se cambia el texto */}
                              {dirty ? (
                                <button
                                  className="btn btn-outline text-xs text-blue-600 hover:text-blue-700 bg-blue-50/50 border-blue-200 flex items-center gap-1"
                                  style={{ padding: '0.4rem 0.65rem' }}
                                  title="Guardar nuevo email sin enviar invitación"
                                  disabled={isBusy}
                                  onClick={() => actStaff(user, 'save')}
                                >
                                  <Save size={14} />
                                  <span className="font-semibold">Guardar email</span>
                                </button>
                              ) : null}

                              {/* Editar rol y nombre */}
                              <button
                                onClick={() => startEdit(user)}
                                className="btn btn-outline text-gray-600 hover:text-gray-900 border-gray-200"
                                style={{ padding: '0.4rem 0.6rem' }}
                                title="Editar nombre y rol"
                              >
                                <Edit size={14} />
                              </button>

                              {/* Eliminar cuenta/email */}
                              {user.role !== 'Admin' && (user.email || access[user.id]) && (
                                <button
                                  onClick={() => actStaff(user, 'clear')}
                                  disabled={isBusy}
                                  className="btn btn-outline text-red-500 hover:text-red-700 hover:bg-red-50 border-gray-200"
                                  style={{ padding: '0.4rem 0.6rem' }}
                                  title="Borrar email y cuenta de acceso"
                                >
                                  {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              )}

                              {/* Botón Invitar / Reenviar / Cambiar */}
                              <button
                                className={`btn text-xs flex items-center gap-1.5 ${
                                  st === 'sin_invitar'
                                    ? 'btn-primary'
                                    : dirty
                                    ? 'btn-primary'
                                    : 'btn-outline border-primary text-primary hover:bg-primary hover:text-white'
                                }`}
                                style={{ padding: '0.4rem 0.75rem' }}
                                disabled={isBusy || !draft.trim()}
                                onClick={() => actStaff(user, 'invite')}
                                title={
                                  st === 'activo' || st === 'invitado' || dirty
                                    ? 'Enviar o reenviar invitación con este email'
                                    : 'Enviar invitación'
                                }
                              >
                                {isBusy ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : st === 'activo' || st === 'invitado' ? (
                                  <RotateCw size={14} />
                                ) : (
                                  <Send size={14} />
                                )}
                                <span>
                                  {st === 'activo'
                                    ? 'Reenviar / Cambiar'
                                    : st === 'invitado'
                                    ? 'Reenviar invitación'
                                    : 'Invitar ahora'}
                                </span>
                              </button>
                            </>
                          )}
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

      {/* SECCIÓN 2: ACCESO DE JUGADORES */}
      <PlayerAccessPanel />

      {/* Modal para invitar nuevo entrenador / miembro del staff */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <UserPlus size={18} className="text-primary" />
                Invitar nuevo entrenador / Staff
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError(null);
                }}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInviteStaffModal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Email del entrenador <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="entrenador@equipo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre completo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Roberto De Zerbi"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Rol en el cuerpo técnico
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="Entrenador">Entrenador</option>
                  <option value="Preparador Físico">Preparador Físico</option>
                  <option value="Analista">Analista</option>
                  <option value="Admin">Administrador</option>
                </select>
              </div>

              {inviteError && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">
                  {inviteError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError(null);
                  }}
                  className="btn btn-outline text-xs"
                  disabled={inviting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="btn btn-primary text-xs flex items-center gap-1.5"
                >
                  {inviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{inviting ? 'Enviando invitación...' : 'Enviar invitación'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
