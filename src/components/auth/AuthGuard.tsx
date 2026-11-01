import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * - Rutas del staff (por defecto): los jugadores se redirigen a /me.
 * - `playerOnly`: portal del jugador; el staff se redirige a /.
 * - Cuentas 'Pendiente' (alta sin aprobar) ven un aviso y no acceden a nada.
 */
export const AuthGuard: React.FC<{ children: React.ReactNode; requireAdmin?: boolean; playerOnly?: boolean }> = ({
  children,
  requireAdmin = false,
  playerOnly = false,
}) => {
  const { user, profile, loading, isAdmin, isPlayer, isPending, signOut } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  // Mientras llega el perfil no sabemos el rol: no mostrar nada todavía
  if (loading || (user && !profile)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-base">
        <div className="text-muted">{t('auth.guard.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <img src="/escudo.png" alt="" className="w-16 h-16 mx-auto mb-4 object-contain" />
          <Clock className="mx-auto text-amber-500 mb-2" />
          <h1 className="text-lg font-extrabold text-gray-900">Cuenta pendiente de aprobación</h1>
          <p className="text-sm text-gray-500 mt-2">Un administrador debe asignarte un rol antes de que puedas acceder.</p>
          <button onClick={signOut} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#db0030]">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (playerOnly && !isPlayer) return <Navigate to="/" replace />;
  if (!playerOnly && isPlayer) return <Navigate to="/me" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
