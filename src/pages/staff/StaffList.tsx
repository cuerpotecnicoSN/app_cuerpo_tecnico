import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, ShieldCheck, Users, Calendar } from 'lucide-react';
import './staff.css';

interface StaffProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  created_at?: string;
}

const StaffList: React.FC = () => {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setStaff(data || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando el cuerpo técnico');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-page animate-fade-in">
      <div className="staff-header">
        <div>
          <p className="staff-breadcrumb">Equipo Técnico</p>
          <h1 className="staff-title">Entrenadores</h1>
          <p className="text-muted mt-1">
            Se muestran automáticamente todas las personas que se registran en la app.
          </p>
        </div>
      </div>

      {loading && <p className="text-muted">Cargando cuerpo técnico...</p>}

      {error && (
        <div className="bg-danger-glow border border-danger text-primary p-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}

      {!loading && !error && staff.length === 0 && (
        <div className="card staff-empty">
          <Users size={32} className="text-muted" />
          <p className="h3 mt-4">Todavía no hay entrenadores registrados</p>
          <p className="text-muted mt-2">
            En cuanto alguien cree una cuenta desde la pantalla de inicio de sesión, aparecerá aquí automáticamente.
          </p>
        </div>
      )}

      {!loading && staff.length > 0 && (
        <div className="staff-grid">
          {staff.map((person) => (
            <div key={person.id} className="card staff-card">
              <img
                src={person.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.full_name || person.email)}&background=db0030&color=fff&size=128`}
                alt={person.full_name || person.email}
                className="staff-avatar"
              />
              <h3 className="staff-name">{person.full_name || 'Sin nombre'}</h3>
              <span className={`badge ${person.role === 'Admin' || person.role === 'Administrador' ? 'badge-danger' : 'badge-neutral'} staff-role-badge`}>
                {person.role === 'Admin' || person.role === 'Administrador' ? <ShieldCheck size={12} /> : null}
                {person.role || 'Entrenador'}
              </span>
              <div className="staff-email">
                <Mail size={14} />
                <span>{person.email}</span>
              </div>
              {person.birth_date && (
                <div className="staff-email" style={{ marginTop: '0.25rem' }}>
                  <Calendar size={14} />
                  <span>{new Date(person.birth_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffList;
