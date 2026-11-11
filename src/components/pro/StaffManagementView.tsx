import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Shield, Camera, Upload, Trash2, Edit2, Plus, Search,
  Check, X, Mail, User
} from 'lucide-react';

export interface StaffProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  birth_date?: string | null;
}

const ROLES = [
  'Entrenador',
  'Analista',
  'Preparador físico',
  'Admin',
  'Fisioterapeuta',
  'Médico',
];

export default function StaffManagementView() {
  const { t } = useTranslation();
  const { profile: currentProfile } = useAuth();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);

  // Modal para editar / añadir miembro
  const [editingMember, setEditingMember] = useState<StaffProfile | null>(null);
  const [isNewMember, setIsNewMember] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('Entrenador');
  const [formEmail, setFormEmail] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'Jugador')
        .order('full_name', { ascending: true });

      if (error) throw error;

      // Garantizar que Victor Zandalinas tenga rol 'Analista'
      const updatedList = await Promise.all(
        (data || []).map(async (m: StaffProfile) => {
          const isVictor =
            m.email === 'victorzanpra@hotmail.com' ||
            (m.full_name && m.full_name.toLowerCase().includes('victor zandalinas'));
          if (isVictor && m.role !== 'Analista') {
            await supabase.from('profiles').update({ role: 'Analista' }).eq('id', m.id);
            return { ...m, role: 'Analista' };
          }
          return m;
        })
      );

      setStaff(updatedList);
    } catch (err) {
      console.error('Error fetching staff profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Manejo de subida directa de foto desde la tarjeta
  const handleDirectPhotoClick = (memberId: string) => {
    setUploadingForId(memberId);
    fileInputRef.current?.click();
  };

  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 480;
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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            resolve(dataUrl);
          } else {
            reject(new Error('Canvas context error'));
          }
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingForId) return;

    try {
      const dataUrl = await processImageFile(file);
      await supabase.from('profiles').update({ avatar_url: dataUrl }).eq('id', uploadingForId);
      
      // Actualizar estado local
      setStaff((prev) =>
        prev.map((m) => (m.id === uploadingForId ? { ...m, avatar_url: dataUrl } : m))
      );

      // Si es el usuario activo, recargar suavemente para sincronizar el header
      if (currentProfile?.id === uploadingForId) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error uploading staff photo:', err);
      alert('Error al procesar la imagen.');
    } finally {
      setUploadingForId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleModalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processImageFile(file);
      setFormAvatar(dataUrl);
    } catch (err) {
      console.error('Error processing modal image:', err);
    }
  };

  const openEditModal = (member: StaffProfile) => {
    setIsNewMember(false);
    setEditingMember(member);
    setFormName(member.full_name || '');
    setFormRole(member.role || 'Entrenador');
    setFormEmail(member.email || '');
    setFormAvatar(member.avatar_url || '');
  };

  const openNewModal = () => {
    setIsNewMember(true);
    setEditingMember(null);
    setFormName('');
    setFormRole('Entrenador');
    setFormEmail('');
    setFormAvatar('');
  };

  const handleSaveModal = async () => {
    if (!formName.trim()) {
      alert('Por favor introduce el nombre.');
      return;
    }
    setSaving(true);
    try {
      if (isNewMember) {
        // Crear nuevo miembro
        const newId = crypto.randomUUID();
        const { error } = await supabase.from('profiles').insert({
          id: newId,
          full_name: formName.trim(),
          role: formRole,
          email: formEmail.trim() || null,
          avatar_url: formAvatar || null,
        });
        if (error) throw error;
      } else if (editingMember) {
        // Actualizar miembro existente
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formName.trim(),
            role: formRole,
            email: formEmail.trim() || null,
            avatar_url: formAvatar || null,
          })
          .eq('id', editingMember.id);
        if (error) throw error;

        // Si se actualizó el propio usuario actual
        if (currentProfile?.id === editingMember.id) {
          window.location.reload();
          return;
        }
      }

      setEditingMember(null);
      setIsNewMember(false);
      await fetchStaff();
    } catch (err: any) {
      console.error('Error saving staff member:', err);
      alert('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('analista')) {
      return {
        bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        dot: 'bg-sky-500',
      };
    }
    if (r.includes('entrenador') || r.includes('míster') || r.includes('mister')) {
      return {
        bg: 'bg-red-50 dark:bg-red-950/40 text-[#db0030] dark:text-red-400 border-red-200 dark:border-red-800',
        dot: 'bg-[#db0030]',
      };
    }
    if (r.includes('preparador')) {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
      };
    }
    if (r.includes('admin')) {
      return {
        bg: 'bg-neutral-900 text-amber-300 border-amber-400/40',
        dot: 'bg-amber-400',
      };
    }
    return {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      dot: 'bg-indigo-500',
    };
  };

  const filteredStaff = staff.filter((m) => {
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.full_name?.toLowerCase().includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q);
      const matchRole = m.role?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRole) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Input oculto para subir fotos directo desde las tarjetas */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCardFileChange}
      />

      {/* Barra de herramientas superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('staff.searchPlaceholder', 'Buscar por nombre, cargo o email...')}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#db0030]/20 focus:border-[#db0030] transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#db0030]/20"
          >
            <option value="all">{t('staff.allRoles', 'Todos los roles')} ({staff.length})</option>
            {ROLES.map((r) => {
              const count = staff.filter((s) => s.role === r).length;
              return (
                <option key={r} value={r}>
                  {t('staff.roles.' + r, r)} ({count})
                </option>
              );
            })}
          </select>

          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#db0030] hover:bg-[#b80028] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-[#db0030]/25 transition-all active:scale-95"
          >
            <Plus size={15} strokeWidth={3} />
            <span>{t('staff.addMember', 'Añadir Miembro')}</span>
          </button>
        </div>
      </div>

      {/* Grid de miembros del cuerpo técnico estilo álbum de cromos/jugadores */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm font-bold animate-pulse">
          {t('common.loading', 'Cargando...')}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-gray-200/80 dark:border-white/10 p-8">
          <Shield size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-base font-black text-gray-800 dark:text-white">{t('staff.empty', 'No se encontraron miembros del cuerpo técnico')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredStaff.map((member) => {
            const badge = getRoleBadge(member.role);
            const initials = (member.full_name || 'Staff')
              .split(' ')
              .map((w) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            const translatedRole = t('staff.roles.' + member.role, member.role);

            return (
              <div
                key={member.id}
                className="group relative bg-white dark:bg-neutral-900 rounded-3xl border border-gray-200/80 dark:border-white/10 hover:border-[#db0030]/60 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Cabecera visual con foto */}
                <div className="relative w-full h-64 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-neutral-800 dark:to-neutral-950 flex items-center justify-center overflow-hidden">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.full_name || 'Staff'}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a20] to-black text-white p-4">
                      <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-2xl tracking-wider text-white shadow-inner">
                        {initials}
                      </div>
                      <span className="text-[11px] text-white/50 font-bold uppercase tracking-widest mt-2">
                        {translatedRole}
                      </span>
                    </div>
                  )}

                  {/* Badge de Rol superior */}
                  <div className="absolute top-3 left-3 z-10">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-xs backdrop-blur-md ${badge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {translatedRole}
                    </span>
                  </div>

                  {/* Botón flotante para subir/cambiar foto */}
                  <div className="absolute bottom-3 right-3 z-10">
                    <button
                      type="button"
                      onClick={() => handleDirectPhotoClick(member.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black text-white text-[11px] font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-white/20"
                      title={t('staff.changePhoto', 'Cambiar foto')}
                    >
                      <Camera size={13} className="text-[#ff4d6d]" />
                      <span>{member.avatar_url ? t('staff.changePhoto', 'Cambiar foto') : t('staff.uploadPhoto', 'Subir imagen')}</span>
                    </button>
                  </div>
                </div>

                {/* Información y acciones */}
                <div className="p-4 sm:p-5 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-black text-lg text-gray-900 dark:text-white leading-tight truncate">
                      {member.full_name || 'Staff'}
                    </h3>
                    
                    {member.email && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 truncate">
                        <Mail size={12} className="shrink-0 text-gray-400" />
                        <span className="truncate">{member.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Pie de la tarjeta */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                      AC Milan Staff
                    </span>

                    <button
                      type="button"
                      onClick={() => openEditModal(member)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                      title={t('common.edit', 'Editar')}
                    >
                      <Edit2 size={12} />
                      <span>{t('common.edit', 'Editar')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edición / Creación */}
      {(editingMember || isNewMember) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#18181c] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black">
                  {isNewMember ? t('staff.newStaff', 'Añadir Miembro del Staff') : t('staff.editStaff', 'Editar Miembro del Staff')}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingMember(null);
                  setIsNewMember(false);
                }}
                className="p-2 text-gray-400 hover:text-black dark:hover:text-white rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Foto preview & selector */}
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="relative group w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 shadow-md">
                  {formAvatar ? (
                    <img src={formAvatar} alt="" className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <User size={36} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold transition-opacity cursor-pointer"
                  >
                    <Camera size={18} className="mb-0.5" />
                    <span>{t('staff.changePhoto', 'Cambiar')}</span>
                  </button>
                </div>

                <input
                  ref={modalFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleModalFileChange}
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>{t('staff.uploadPhoto', 'Subir imagen')}</span>
                  </button>
                  {formAvatar && (
                    <button
                      type="button"
                      onClick={() => setFormAvatar('')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-red-500 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>{t('common.delete', 'Eliminar')}</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">{t('staff.fullName', 'Nombre completo')}</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t('staff.fullNamePlaceholder', 'Ej: Roberto Robles')}
                  className="w-full p-2.5 border rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:ring-2 focus:ring-[#db0030]/20 focus:border-[#db0030] outline-none text-sm font-semibold transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">{t('staff.role', 'Rol / Cargo')}</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full p-2.5 border rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-neutral-800 focus:ring-2 focus:ring-[#db0030]/20 focus:border-[#db0030] outline-none text-sm font-semibold transition-all"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t('staff.roles.' + r, r)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">{t('staff.email', 'Correo electrónico')}</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="ejemplo@acmilan.com"
                  className="w-full p-2.5 border rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:ring-2 focus:ring-[#db0030]/20 focus:border-[#db0030] outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3 bg-gray-50/50 dark:bg-black/20">
              <button
                type="button"
                onClick={() => {
                  setEditingMember(null);
                  setIsNewMember(false);
                }}
                className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 transition-colors"
                disabled={saving}
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white rounded-xl bg-[#db0030] hover:bg-[#b80028] flex items-center gap-1.5 shadow-md shadow-[#db0030]/25 transition-all active:scale-95"
                disabled={saving}
              >
                <Check size={15} strokeWidth={3} />
                <span>{saving ? t('common.loading', 'Guardando...') : (isNewMember ? t('staff.addMember', 'Crear miembro') : t('common.save', 'Guardar'))}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

