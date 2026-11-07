import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import './Login.css';

const TEXTS = {
  it: {
    brandTitle: 'Portale del',
    brandSpan: 'Club',
    hello: 'Ciao,',
    createTitle: 'Crea la tua password',
    enterAs: 'Scegli la password con cui accederai come',
    checking: 'Verifica del link in corso…',
    invalidLink: 'Il link non è valido o è scaduto.',
    askResend: 'Chiedi allo staff tecnico di inviarti un nuovo invito.',
    toLogin: 'Vai al login',
    ready: 'Fatto! Accesso in corso…',
    minLen: 'La password deve contenere almeno 8 caratteri.',
    mismatch: 'Le password non coincidono.',
    newPass: 'Nuova password (min. 8 caratteri)',
    repeatPass: 'Ripeti la password',
    saving: 'Salvataggio…',
    saveAndEnter: 'Salva ed entra',
  },
  en: {
    brandTitle: 'Staff & Team',
    brandSpan: 'Portal',
    hello: 'Hello,',
    createTitle: 'Set your password',
    enterAs: 'Choose the password you will use to log in as',
    checking: 'Checking link…',
    invalidLink: 'The link is invalid or has expired.',
    askResend: 'Ask the coaching staff to resend the invitation.',
    toLogin: 'Go to login',
    ready: 'All set! Logging in…',
    minLen: 'Password must be at least 8 characters long.',
    mismatch: 'Passwords do not match.',
    newPass: 'New password (min. 8 characters)',
    repeatPass: 'Repeat password',
    saving: 'Saving…',
    saveAndEnter: 'Save and continue',
  },
  es: {
    brandTitle: 'Portal del',
    brandSpan: 'Equipo',
    hello: 'Hola,',
    createTitle: 'Crea tu contraseña',
    enterAs: 'Elige la contraseña con la que accederás como',
    checking: 'Verificando enlace…',
    invalidLink: 'El enlace no es válido o ha caducado.',
    askResend: 'Solicita al administrador un nuevo enlace de invitación.',
    toLogin: 'Ir a iniciar sesión',
    ready: '¡Listo! Entrando a la plataforma…',
    minLen: 'La contraseña debe tener al menos 8 caracteres.',
    mismatch: 'Las contraseñas no coinciden.',
    newPass: 'Nueva contraseña (mín. 8 caracteres)',
    repeatPass: 'Repite la contraseña',
    saving: 'Guardando…',
    saveAndEnter: 'Guardar y entrar',
  },
};

const SetPassword: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const lang: 'es' | 'it' | 'en' = i18n.language?.startsWith('es') ? 'es' : i18n.language?.startsWith('en') ? 'en' : 'it';
  const t = TEXTS[lang];

  const toggleLanguage = () => {
    const cycle: ('es' | 'it' | 'en')[] = ['es', 'it', 'en'];
    const next = cycle[(cycle.indexOf(lang) + 1) % cycle.length];
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  const linkError = new URLSearchParams(window.location.hash.slice(1)).get('error_description');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError(t.minLen);
    if (password !== confirm) return setError(t.mismatch);
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) return setError(err.message);
    setDone(true);
    // Si el usuario es staff/entrenador va a la home / dashboard; si es jugador va a /me
    const isStaff = profile?.role && profile.role !== 'Jugador';
    const destination = isStaff ? '/' : '/me';
    setTimeout(() => navigate(destination, { replace: true }), 1200);
  };

  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-glow" />
        <div className="login-brand-content">
          <img src="/escudo.png" alt="" className="login-brand-crest" />
          <h1 className="login-brand-title">{t.brandTitle} <span>{t.brandSpan}</span></h1>
        </div>
        <div className="login-brand-stripe" />
      </div>

      <div className="login-form-panel">
        <div className="login-card relative">
          {/* Botón cambiar idioma en la pantalla de password */}
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-all border border-white/10"
            >
              <Globe size={13} className="text-red-500" />
              <span>{lang === 'es' ? '🇪🇸 ES' : lang === 'it' ? '🇮🇹 IT' : '🇬🇧 EN'}</span>
            </button>
          </div>

          <div className="login-header">
            <img src="/escudo.png" alt="" className="login-mobile-crest" />
            <h2 className="login-title">{firstName ? `${t.hello} ${firstName}` : t.createTitle}</h2>
            <p className="login-subtitle">
              {user ? <>{t.enterAs} <strong>{user.email}</strong></> : ' '}
            </p>
          </div>

          {loading ? (
            <p className="text-center text-muted">{t.checking}</p>
          ) : !user ? (
            <div className="text-center space-y-4">
              <p className="login-error bg-danger-glow border border-danger text-primary p-3 rounded-md text-sm">
                {linkError ? decodeURIComponent(linkError.replace(/\+/g, ' ')) : t.invalidLink}
                <br />{t.askResend}
              </p>
              <button className="btn btn-outline w-full" onClick={() => navigate('/login')}>{t.toLogin}</button>
            </div>
          ) : done ? (
            <div className="text-center py-6">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
              <p className="mt-3 font-bold">{t.ready}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              {error && <div className="login-error bg-danger-glow border border-danger text-primary p-3 rounded-md text-sm">{error}</div>}
              <div className="login-field">
                <Lock size={20} />
                <input type={show ? 'text' : 'password'} placeholder={t.newPass} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
                <button type="button" className="login-field-eye" onClick={() => setShow((v) => !v)} tabIndex={-1} aria-label={show ? 'Hide' : 'Show'}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="login-field">
                <Lock size={20} />
                <input type={show ? 'text' : 'password'} placeholder={t.repeatPass} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
              </div>
              <button type="submit" className="btn btn-primary w-full mt-2 login-submit" disabled={saving}>
                {saving ? t.saving : t.saveAndEnter}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
