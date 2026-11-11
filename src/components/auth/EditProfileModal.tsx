import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Camera, Upload, Trash2, User } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setBirthDate(profile.birth_date || '');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX) {
          h = Math.round((h * MAX) / w);
          w = MAX;
        } else if (h > MAX) {
          w = Math.round((w * MAX) / h);
          h = MAX;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(dataUrl);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl }
      });

      if (profile?.id) {
        await supabase
          .from('profiles')
          .update({ 
            full_name: fullName,
            avatar_url: avatarUrl,
            birth_date: birthDate || null
          })
          .eq('id', profile.id);
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#18181c] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="text-lg font-black">Mi Perfil</h3>
            <p className="text-xs text-gray-500">Actualiza tu nombre y foto de entrenador/staff</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-black dark:hover:text-white rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 space-y-5">
          {/* Avatar Preview & Upload */}
          <div className="flex flex-col items-center justify-center gap-3 py-2">
            <div className="relative group w-24 h-24 rounded-full overflow-hidden p-1 bg-gradient-to-br from-[#db0030] to-black shadow-lg">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 flex items-center justify-center text-white">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={38} className="text-gray-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold transition-opacity cursor-pointer"
              >
                <Camera size={20} className="mb-1" />
                <span>Cambiar</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <Upload size={13} />
                <span>Subir foto</span>
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-red-500 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                  title="Quitar foto"
                >
                  <Trash2 size={13} />
                  <span>Quitar</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Nombre y Apellidos</label>
            <input
              type="text"
              className="w-full p-3 border rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:ring-2 focus:ring-[#db0030]/20 focus:border-[#db0030] outline-none text-sm font-semibold transition-all"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">O pegar URL de imagen</label>
            <input
              type="url"
              className="w-full p-2.5 border rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:ring-2 focus:ring-[#db0030]/20 focus:border-[#db0030] outline-none text-xs transition-all"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://ejemplo.com/mifoto.jpg"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Fecha de Nacimiento</label>
            <input
              type="date"
              className="w-full p-2.5 border rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:ring-2 focus:ring-[#db0030]/20 focus:border-[#db0030] outline-none text-xs transition-all"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3 bg-gray-50/50 dark:bg-black/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white rounded-xl bg-[#db0030] hover:bg-[#b80028] flex items-center gap-2 shadow-md shadow-[#db0030]/25 transition-all active:scale-95"
            disabled={loading}
          >
            <Save size={15} />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
