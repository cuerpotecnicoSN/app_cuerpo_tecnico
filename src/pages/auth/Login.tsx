import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import './Login.css';

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 137.5) % 100}%`,
  size: 3 + ((i * 7) % 6),
  duration: 10 + ((i * 5) % 12),
  delay: (i * 1.3) % 10,
}));

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: t('auth.loginPage.defaultNewUserName'),
              role: 'Entrenador'
            }
          }
        });
        if (error) throw error;
        alert(t('auth.loginPage.signupSuccess'));
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || t('auth.loginPage.defaultError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-glow" />
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="login-particle"
            style={{
              left: p.left,
              bottom: '-10%',
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
        <div className="login-brand-content">
          <img src="/escudo.png" alt={t('auth.loginPage.crestAlt')} className="login-brand-crest" />
          <h1 className="login-brand-title">Staff<span>Control</span></h1>
          <p className="login-brand-tagline">{t('auth.loginPage.tagline')}</p>
        </div>
        <div className="login-brand-stripe" />
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-header">
            <img src="/escudo.png" alt={t('auth.loginPage.crestAlt')} className="login-mobile-crest" />
            <div className="login-icon-wrap">
              <img src="/icono.png" alt="StaffControl" />
            </div>
            <h2 className="login-title">StaffControl</h2>
            <p className="login-subtitle">
              {isLogin ? t('auth.loginPage.subtitleLogin') : t('auth.loginPage.subtitleSignup')}
            </p>
          </div>

          {error && (
            <div className="login-error bg-danger-glow border border-danger text-primary p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="login-field">
              <Mail size={20} />
              <input
                type="email"
                placeholder={t('auth.loginPage.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <Lock size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.loginPage.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-field-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('auth.loginPage.hidePassword') : t('auth.loginPage.showPassword')}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-2 login-submit"
              disabled={loading}
            >
              {loading ? t('auth.loginPage.loadingButton') : (isLogin ? t('auth.loginPage.loginButton') : t('auth.loginPage.signupButton'))}
            </button>
          </form>

          <div className="mt-6 text-center login-toggle">
            <button
              type="button"
              className="text-sm text-secondary hover:text-primary transition-colors"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin
                ? t('auth.loginPage.noAccount')
                : t('auth.loginPage.hasAccount')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
