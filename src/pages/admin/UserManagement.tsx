import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { UserCog, Edit, Save, X, Plus, UserPlus, Trash2, Loader2, Send } from 'lucide-react';
import PlayerAccessPanel from '../../components/admin/PlayerAccessPanel';
import { inviteStaffMember, deleteUserAccount } from '../../services/playerDevelopment';

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', role: '', avatar_url: '' });

  // Estado para invitar nuevo miembro del staff
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Entrenador');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: any) => {
    setEditingId(user.id);
    setEditForm({
      full_name: user.full_name || '',
      role: user.role || t('admin.users.roles.coach'),
      avatar_url: user.avatar_url || ''
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
          avatar_url: editForm.avatar_url
        })
        .eq('id', editingId);

      if (error) throw error;
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert(t('admin.users.saveError'));
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
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

  const handleDeleteStaffUser = async (user: any) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la cuenta de ${user.full_name || user.email}? Se borrará su usuario de acceso y su perfil.`)) {
      return;
    }
    setDeletingUserId(user.id);
    try {
      // 1. Intentar borrar mediante Edge Function para limpiar Auth + Profile
      try {
        await deleteUserAccount({ userId: user.id });
      } catch (fnErr) {
        console.warn('Edge Function delete-user no disponible o error, aplicando fallback en profiles:', fnErr);
        // 2. Si la Edge function no está desplegada aún en Supabase Cloud, borramos el perfil directamente
        const { error: dbErr } = await supabase.from('profiles').delete().eq('id', user.id);
        if (dbErr) throw dbErr;
      }
      await fetchUsers();
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message || 'Error desconocido'}`);
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserCog size={28} className="text-primary" />
          <h1 className="h2">{t('admin.users.title')}</h1>
        </div>

        <div className="flex items-center gap-2">
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

      <div className="card">
        {loading ? (
          <p className="text-muted">{t('admin.users.loading')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-sm font-semibold text-secondary">{t('admin.users.columns.user')}</th>
                  <th className="p-3 text-sm font-semibold text-secondary">{t('admin.users.columns.email')}</th>
                  <th className="p-3 text-sm font-semibold text-secondary">{t('admin.users.columns.role')}</th>
                  <th className="p-3 text-sm font-semibold text-secondary text-right">{t('admin.users.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const isEditing = editingId === user.id;

                  return (
                    <tr key={user.id} className="border-b border-border hover:bg-bg-hover">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img 
                            src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name || 'U'}&background=db0030&color=fff`}
                            alt={t('admin.users.avatarAlt')}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {isEditing ? (
                            <input
                              className="text-sm p-1"
                              value={editForm.full_name}
                              onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                              placeholder={t('admin.users.namePlaceholder')}
                            />
                          ) : (
                            <span className="font-semibold text-sm">{user.full_name || t('admin.users.noName')}</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-3 text-sm text-muted">
                        {user.email}
                      </td>

                      <td className="p-3">
                        {isEditing ? (
                          <select 
                            className="text-sm p-1"
                            value={editForm.role}
                            onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                          >
                            <option value="Admin">{t('admin.users.roles.admin')}</option>
                            <option value="Entrenador">{t('admin.users.roles.coach')}</option>
                            <option value="Preparador Físico">{t('admin.users.roles.fitnessCoach')}</option>
                            <option value="Analista">{t('admin.users.roles.analyst')}</option>
                            <option value="Jugador">Jugador</option>
                            <option value="Pendiente">Pendiente (sin acceso)</option>
                          </select>
                        ) : (
                          <span className={`badge ${user.role === 'Admin' ? 'badge-danger' : user.role === 'Pendiente' ? 'badge-warning' : 'badge-neutral'}`}>
                            {user.role || t('admin.users.roles.coach')}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={saveEdit} className="btn btn-primary" style={{ padding: '0.4rem 0.6rem' }} title="Guardar">
                              <Save size={16} />
                            </button>
                            <button onClick={cancelEdit} className="btn btn-outline" style={{ padding: '0.4rem 0.6rem' }} title="Cancelar">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end items-center gap-1.5">
                            <button onClick={() => startEdit(user)} className="btn btn-outline text-gray-600 hover:text-gray-900" style={{ padding: '0.4rem 0.6rem' }} title="Editar rol y nombre">
                              <Edit size={16} />
                            </button>
                            {user.role !== 'Admin' && (
                              <button
                                onClick={() => handleDeleteStaffUser(user)}
                                disabled={deletingUserId === user.id}
                                className="btn btn-outline text-red-500 hover:text-red-700 hover:bg-red-50 border-gray-200"
                                style={{ padding: '0.4rem 0.6rem' }}
                                title="Eliminar usuario y acceso"
                              >
                                {deletingUserId === user.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PlayerAccessPanel />

      {/* Modal para invitar entrenador / miembro del staff */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <UserPlus size={18} className="text-primary" />
                Invitar nuevo entrenador / Staff
              </h3>
              <button
                onClick={() => { setShowInviteModal(false); setInviteError(null); }}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInviteStaff} className="p-5 space-y-4">
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
                  onClick={() => { setShowInviteModal(false); setInviteError(null); }}
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
