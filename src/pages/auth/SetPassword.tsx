import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

/**
 * Destino del enlace de invitación y de "olvidé mi contraseña".
 * supabase-js recoge la sesión del enlace automáticamente; aquí el usuario
 * solo elige su contraseña.
 */
const SetPassword: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const linkError = new URLSearchParams(window.location.hash.slice(1)).get('error_description');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) return setError(err.message);
    setDone(true);
    setTimeout(() => navigate('/', { replace: true }), 1200);
  };

  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-glow" />
        <div className="login-brand-content">
          <img src="/escudo.png" alt="" className="login-brand-crest" />
          <h1 className="login-brand-title">Portal del <span>Jugador</span></h1>
        </div>
        <div className="login-brand-stripe" />
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-header">
            <img src="/escudo.png" alt="" className="login-mobile-crest" />
            <h2 className="login-title">{firstName ? `Hola, ${firstName}` : 'Crea tu contraseña'}</h2>
            <p className="login-subtitle">
              {user ? <>Elige la contraseña con la que entrarás como <strong>{user.email}</strong></> : ' '}
            </p>
          </div>

          {loading ? (
            <p className="text-center text-muted">Comprobando enlace…</p>
          ) : !user ? (
            <div className="text-center space-y-4">
              <p className="login-error bg-danger-glow border border-danger text-primary p-3 rounded-md text-sm">
                {linkError ? decodeURIComponent(linkError.replace(/\+/g, ' ')) : 'El enlace no es válido o ha caducado.'}
                <br />Pide al cuerpo técnico que te reenvíe la invitación.
              </p>
              <button className="btn btn-outline w-full" onClick={() => navigate('/login')}>Ir al inicio de sesión</button>
            </div>
          ) : done ? (
            <div className="text-center py-6">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
              <p className="mt-3 font-bold">¡Listo! Entrando…</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              {error && <div className="login-error bg-danger-glow border border-danger text-primary p-3 rounded-md text-sm">{error}</div>}
              <div className="login-field">
                <Lock size={20} />
                <input type={show ? 'text' : 'password'} placeholder="Nueva contraseña (mín. 8)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
                <button type="button" className="login-field-eye" onClick={() => setShow((v) => !v)} tabIndex={-1} aria-label={show ? 'Ocultar' : 'Mostrar'}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="login-field">
                <Lock size={20} />
                <input type={show ? 'text' : 'password'} placeholder="Repite la contraseña" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
              </div>
              <button type="submit" className="btn btn-primary w-full mt-2 login-submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar y entrar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
