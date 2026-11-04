import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DeletePlayerModalProps {
  player: { id: string; name: string };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeletePlayerModal: React.FC<DeletePlayerModalProps> = ({
  player,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Si tenía cuenta de usuario vinculada, desvincular el perfil
      const { data: playerData } = await supabase
        .from('players')
        .select('user_id')
        .eq('id', player.id)
        .single();

      if (playerData?.user_id) {
        await supabase
          .from('profiles')
          .update({ role: 'Pendiente' })
          .eq('id', playerData.user_id);
      }

      // 2. Eliminar definitivamente el jugador de la base de datos
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', player.id);

      if (deleteError) {
        throw new Error(`Error al eliminar: ${deleteError.message}`);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al eliminar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header de peligro */}
        <div className="bg-red-50 dark:bg-red-950/40 p-5 border-b border-red-100 dark:border-red-900/30 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-red-900 dark:text-red-200">
              ¿Eliminar jugador de la plantilla?
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300/80 mt-0.5">
              Esta acción borrará definitivamente la ficha de la base de datos.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido de confirmación */}
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl p-3.5 text-xs text-gray-700 dark:text-gray-300">
            Vas a eliminar a:
            <span className="block text-base font-black text-gray-900 dark:text-white mt-1">
              {player.name}
            </span>
          </div>

          <p className="text-xs text-gray-500">
            ¿Confirmas que deseas eliminar a este jugador? Todos sus datos asociados se eliminarán.
          </p>

          {error && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-900/30">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-md shadow-red-600/20 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Eliminando…
                </>
              ) : (
                <>
                  <Trash2 size={14} /> Sí, eliminar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
