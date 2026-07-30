import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setBirthDate(profile.birth_date || '');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {

      await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      // 2. Try to update profiles table if it exists
      if (profile?.id) {
        await supabase
          .from('profiles')
          .update({ 
            full_name: fullName,
            avatar_url: avatarUrl,
            birth_date: birthDate || null
          })
          .eq('id', profile.id)
          .then(({ error }) => { if (error) console.error(error); });
      }
      
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden" style={{ backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}>
        <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-lg font-bold">Editar Mi Perfil</h3>
          <button onClick={onClose} style={{ color: 'var(--color-text-secondary)' }} className="hover:text-primary">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Nombre a mostrar (Display Name)</label>
            <input
              type="text"
              className="w-full p-2 border rounded focus:outline-none"
              style={{ backgroundColor: 'var(--color-bg-base)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Foto de Perfil (URL)</label>
            <input
              type="url"
              className="w-full p-2 border rounded focus:outline-none"
              style={{ backgroundColor: 'var(--color-bg-base)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://ejemplo.com/mifoto.jpg"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Fecha de Nacimiento</label>
            <input
              type="date"
              className="w-full p-2 border rounded focus:outline-none"
              style={{ backgroundColor: 'var(--color-bg-base)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-base)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border rounded"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white rounded flex items-center gap-2"
            style={{ backgroundColor: 'var(--color-primary)' }}
            disabled={loading}
          >
            <Save size={16} />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
