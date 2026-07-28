import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserCog, Edit, Save, X } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', role: '', avatar_url: '' });

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
      role: user.role || 'Entrenador',
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
      alert('Error guardando los cambios.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserCog size={28} className="text-primary" />
          <h1 className="h2">Gestión de Staff</h1>
        </div>
        
        <button 
          onClick={async () => {
            const confirmed = window.confirm('¿Estás seguro de que quieres poblar la base de datos con jugadores falsos? Esto podría duplicar datos si ya lo hiciste.');
            if (confirmed) {
              try {
                const { seedDatabase, ensureContext } = await import('../../lib/dataService');
                const seasonId = await ensureContext();
                await seedDatabase(seasonId);
                alert('¡Base de datos poblada con éxito!');
              } catch (e: any) {
                alert('Error al poblar base de datos: ' + e.message);
              }
            }
          }}
          className="btn btn-outline border-primary text-primary hover:bg-primary hover:text-white text-xs"
        >
          Poblar BD (Mock Data)
        </button>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-muted">Cargando usuarios...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-sm font-semibold text-secondary">Usuario</th>
                  <th className="p-3 text-sm font-semibold text-secondary">Email</th>
                  <th className="p-3 text-sm font-semibold text-secondary">Rol</th>
                  <th className="p-3 text-sm font-semibold text-secondary text-right">Acciones</th>
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
                            alt="Avatar" 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {isEditing ? (
                            <input 
                              className="text-sm p-1"
                              value={editForm.full_name}
                              onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                              placeholder="Nombre Completo"
                            />
                          ) : (
                            <span className="font-semibold text-sm">{user.full_name || 'Sin Nombre'}</span>
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
                            <option value="Admin">Admin</option>
                            <option value="Entrenador">Entrenador</option>
                            <option value="Preparador Físico">Preparador Físico</option>
                            <option value="Analista">Analista</option>
                          </select>
                        ) : (
                          <span className={`badge ${user.role === 'Admin' ? 'badge-danger' : 'badge-neutral'}`}>
                            {user.role || 'Entrenador'}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={saveEdit} className="btn btn-primary" style={{ padding: '0.4rem 0.6rem' }}>
                              <Save size={16} />
                            </button>
                            <button onClick={cancelEdit} className="btn btn-outline" style={{ padding: '0.4rem 0.6rem' }}>
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(user)} className="btn btn-outline" style={{ padding: '0.4rem 0.6rem' }}>
                            <Edit size={16} />
                          </button>
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
    </div>
  );
};

export default UserManagement;
