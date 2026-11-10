import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Target, UserCheck, Flame, Trophy, CheckSquare, Plus, MessageSquare,
  Calendar, Clock, User, Trash2, Send, ChevronDown, CheckCircle2,
  ExternalLink, Link2, Shield, ArrowLeft,
  Edit2, Save, X
} from 'lucide-react';
import type { DevItem, DevItemComment, DevSectionType } from '../../../services/playerDevelopmentSections';
import {
  createDevItem,
  updateDevItem,
  deleteDevItem,
  createDevItemComment,
  updateDevItemComment,
  deleteDevItemComment
} from '../../../services/playerDevelopmentSections';
import TranslatedText from '../../common/TranslatedText';

export interface SectionConfigItem {
  id: DevSectionType;
  labelKey: string;
  icon: typeof Target;
  accentColor: string;
  badgeBg: string;
  textColor: string;
  categories: { id: string; labelKey: string }[];
}

export const DEV_SECTIONS_CONFIG: SectionConfigItem[] = [
  {
    id: 'objectives',
    labelKey: 'devSections.objectives.title',
    icon: Target,
    accentColor: '#db0030',
    badgeBg: 'bg-red-50 text-[#db0030] border-red-200',
    textColor: 'text-[#db0030]',
    categories: [
      { id: 'futbol', labelKey: 'devSections.objectives.futbol' },
      { id: 'fisico', labelKey: 'devSections.objectives.fisico' },
      { id: 'personal', labelKey: 'devSections.objectives.personal' },
    ],
  },
  {
    id: 'focuses',
    labelKey: 'devSections.focuses.title',
    icon: Flame,
    accentColor: '#ea580c',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    textColor: 'text-amber-600',
    categories: [
      { id: 'entrenamiento', labelKey: 'devSections.focuses.training' },
      { id: 'partido', labelKey: 'devSections.focuses.match' },
      { id: 'fuera_del_campo', labelKey: 'devSections.focuses.offPitch' },
    ],
  },
  {
    id: 'action_plan',
    labelKey: 'devSections.actionPlan.title',
    icon: CheckSquare,
    accentColor: '#16a34a',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    textColor: 'text-emerald-600',
    categories: [
      { id: 'tareas', labelKey: 'devSections.actionPlan.tasks' },
      { id: 'habitos', labelKey: 'devSections.actionPlan.habits' },
    ],
  },
  {
    id: 'competition_analysis',
    labelKey: 'devSections.competitionAnalysis.title',
    icon: Trophy,
    accentColor: '#2563eb',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    textColor: 'text-blue-600',
    categories: [
      { id: 'partido_jugadas', labelKey: 'devSections.competitionAnalysis.matchPlays' },
      { id: 'analisis_tactico', labelKey: 'devSections.competitionAnalysis.tactical' },
    ],
  },
  {
    id: 'personal_traits',
    labelKey: 'devSections.personalTraits.title',
    icon: UserCheck,
    accentColor: '#4f46e5',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    textColor: 'text-indigo-600',
    categories: [
      { id: 'en_el_juego', labelKey: 'devSections.personalTraits.game' },
      { id: 'a_nivel_personal', labelKey: 'devSections.personalTraits.personal' },
    ],
  },
];

interface Props {
  playerId: string;
  items: DevItem[];
  comments: DevItemComment[];
  isStaff: boolean;
  myId?: string;
  playerName: string;
  onRefresh: () => Promise<void>;
  initialSection?: DevSectionType | 'all';
  initialStatusFilter?: 'all' | 'pending' | 'completed';
  initialOpenAdd?: boolean;
  onBackToHub?: () => void;
}

export default function PlayerDevelopmentSectionsList({
  playerId,
  items,
  comments,
  isStaff,
  myId,
  playerName,
  onRefresh,
  initialSection,
  initialStatusFilter,
  initialOpenAdd,
  onBackToHub,
}: Props) {
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = useState<DevSectionType | 'all'>(initialSection ?? 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>(initialStatusFilter ?? 'all');
  const [addingToSection, setAddingToSection] = useState<DevSectionType | null>(
    initialOpenAdd && initialSection && initialSection !== 'all' ? initialSection : null
  );

  useEffect(() => {
    if (initialSection) setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (initialStatusFilter) setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  useEffect(() => {
    if (initialOpenAdd && initialSection && initialSection !== 'all') {
      const sec = DEV_SECTIONS_CONFIG.find((s) => s.id === initialSection);
      setFormData({
        category: sec?.categories[0]?.id || '',
        title: '',
        description: '',
        match_name: '',
        match_date: '',
        deadline: '',
        links: [],
      });
      setAddingToSection(initialSection);
    }
  }, [initialOpenAdd, initialSection]);

  // Formulario de nueva fila
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    match_name: '',
    match_date: '',
    deadline: '',
    links: [] as { url: string; label?: string }[],
  });
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  // Edición de fila existente
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    category: '',
    title: '',
    description: '',
    match_name: '',
    match_date: '',
    deadline: '',
    links: [] as { url: string; label?: string }[],
  });
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editLinkLabel, setEditLinkLabel] = useState('');
  const [updatingItem, setUpdatingItem] = useState(false);

  // Edición de comentario
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState('');
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);

  // Comentarios / Incisos
  const [openCommentsForItem, setOpenCommentsForItem] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const sectionsConfig = DEV_SECTIONS_CONFIG;

  const handleStartEdit = (item: DevItem) => {
    setEditingItemId(item.id);
    setEditFormData({
      category: item.category || '',
      title: item.title || '',
      description: item.description || '',
      match_name: item.match_name || '',
      match_date: item.match_date || '',
      deadline: item.deadline || '',
      links: item.links || [],
    });
    setEditLinkUrl('');
    setEditLinkLabel('');
  };

  const handleUpdateItem = async (itemId: string) => {
    if (!editFormData.title.trim()) return;
    setUpdatingItem(true);
    try {
      await updateDevItem(itemId, {
        category: editFormData.category,
        title: editFormData.title.trim(),
        description: editFormData.description.trim() || null,
        match_name: editFormData.match_name.trim() || null,
        match_date: editFormData.match_date || null,
        deadline: editFormData.deadline || null,
        links: editFormData.links,
      });
      setEditingItemId(null);
      await onRefresh();
    } catch (err) {
      console.error('Error updating dev item', err);
    } finally {
      setUpdatingItem(false);
    }
  };

  const handleAddEditLink = () => {
    if (!editLinkUrl.trim()) return;
    setEditFormData((prev) => ({
      ...prev,
      links: [...prev.links, { url: editLinkUrl.trim(), label: editLinkLabel.trim() || undefined }],
    }));
    setEditLinkUrl('');
    setEditLinkLabel('');
  };

  const handleStartEditComment = (comment: DevItemComment) => {
    setEditingCommentId(comment.id);
    setEditCommentDraft(comment.content);
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editCommentDraft.trim()) return;
    setSavingCommentEdit(true);
    try {
      await updateDevItemComment(commentId, editCommentDraft.trim());
      setEditingCommentId(null);
      await onRefresh();
    } catch (err) {
      console.error('Error updating comment', err);
    } finally {
      setSavingCommentEdit(false);
    }
  };

  const handleOpenAddForm = (secId: DevSectionType, defaultCat?: string) => {
    const sec = sectionsConfig.find((s) => s.id === secId);
    setFormData({
      category: defaultCat || sec?.categories[0]?.id || '',
      title: '',
      description: '',
      match_name: '',
      match_date: '',
      deadline: '',
      links: [],
    });
    setNewLinkUrl('');
    setNewLinkLabel('');
    setAddingToSection(secId);
  };

  const handleSaveItem = async (secId: DevSectionType) => {
    if (!formData.title.trim()) return;
    setSavingItem(true);
    try {
      await createDevItem({
        player_id: playerId,
        section: secId,
        category: formData.category,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        match_name: formData.match_name.trim() || null,
        match_date: formData.match_date || null,
        deadline: formData.deadline || null,
        links: formData.links,
        created_by_player: !isStaff,
        status: 'pending',
      });
      setAddingToSection(null);
      await onRefresh();
    } catch (err) {
      console.error('Error saving dev item', err);
    } finally {
      setSavingItem(false);
    }
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      links: [...prev.links, { url: newLinkUrl.trim(), label: newLinkLabel.trim() || undefined }],
    }));
    setNewLinkUrl('');
    setNewLinkLabel('');
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm(t('common.confirmDelete', '¿Deseas eliminar este registro?'))) return;
    try {
      await deleteDevItem(itemId);
      await onRefresh();
    } catch (err) {
      console.error('Error deleting dev item', err);
    }
  };

  const handleToggleStatus = async (item: DevItem) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateDevItem(item.id, { status: nextStatus });
      await onRefresh();
    } catch (err) {
      console.error('Error updating status', err);
    }
  };

  const handleSendComment = async (itemId: string) => {
    if (!commentDraft.trim()) return;
    setSendingComment(true);
    try {
      await createDevItemComment(itemId, commentDraft.trim());
      setCommentDraft('');
      await onRefresh();
    } catch (err) {
      console.error('Error sending comment', err);
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm(t('common.confirmDeleteComment', '¿Eliminar este comentario?'))) return;
    try {
      await deleteDevItemComment(commentId);
      await onRefresh();
    } catch (err) {
      console.error('Error deleting comment', err);
    }
  };

  const visibleSections = sectionsConfig.filter(
    (s) => activeSection === 'all' || activeSection === s.id
  );

  return (
    <div className="space-y-6">
      {onBackToHub && (
        <button
          onClick={onBackToHub}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:border-black text-xs font-bold text-gray-700 hover:text-black active:scale-95 transition-all shadow-xs w-fit"
        >
          <ArrowLeft size={16} />
          <span>{t('playerPortal.backToHub', 'Volver al Menú')}</span>
        </button>
      )}

      {/* Secciones: chips con el color de cada una, scroll horizontal en móvil */}
      <div className="-mx-3 sm:mx-0 px-3 sm:px-0 flex gap-2 overflow-x-auto snap-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setActiveSection('all')}
          className={`snap-start shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black border transition-all active:scale-95 ${
            activeSection === 'all' ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
          }`}
        >
          {t('devSections.all', 'Todas las Secciones')}
          <span className={`text-[10px] px-1.5 rounded-full ${activeSection === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>{items.length}</span>
        </button>
        {sectionsConfig.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          const count = items.filter((i) => i.section === sec.id).length;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`snap-start shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black border transition-all active:scale-95 ${
                isActive ? 'text-white shadow-md border-transparent' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
              style={isActive ? { backgroundColor: sec.accentColor } : undefined}
            >
              <Icon size={14} style={isActive ? undefined : { color: sec.accentColor }} />
              <span>{t(sec.labelKey)}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full ${isActive ? 'bg-white/25' : 'bg-gray-100'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Renderizado de cada sección */}
      <div className="space-y-8">
        {visibleSections.map((sec) => {
          const Icon = sec.icon;
          const sectionItems = items.filter((i) => {
            if (i.section !== sec.id) return false;
            if (statusFilter === 'pending') return i.status !== 'completed';
            if (statusFilter === 'completed') return i.status === 'completed';
            return true;
          });

          return (
            <div
              key={sec.id}
              className="relative overflow-hidden bg-white border border-gray-200/80 rounded-3xl shadow-sm p-4 sm:p-6 transition-all"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: sec.accentColor }} />
              {/* Header de la sección */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${sec.accentColor}15`, color: sec.accentColor }}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg sm:text-xl text-black">
                      {t(sec.labelKey)}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {sec.categories.map((c) => t(c.labelKey)).join(' · ')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAddForm(sec.id)}
                  aria-label={t('devSections.addRow', 'Añadir Registro')}
                  className="shrink-0 flex items-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto justify-center sm:px-3.5 sm:py-2 text-white rounded-full sm:rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 hover:brightness-110"
                  style={{ backgroundColor: sec.accentColor }}
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">{t('devSections.addRow', 'Añadir Registro')}</span>
                </button>
              </div>

              {/* 1. CONTENIDO DE LO RELLENADO POR JUGADOR Y ENTRENADOR */}
              {sectionItems.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  {t('devSections.empty', 'No hay registros en esta sección. Pulsa en "Añadir Registro" para comenzar.')}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {sectionItems.map((item) => {
                    const itemComments = comments.filter((c) => c.item_id === item.id);
                    const isCommentsOpen = openCommentsForItem === item.id;
                    const catObj = sec.categories.find((c) => c.id === item.category);
                    const formattedDate = new Date(item.created_at).toLocaleDateString(
                      i18n.language === 'it' ? 'it-IT' : i18n.language === 'en' ? 'en-GB' : 'es-ES',
                      { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                    );

                    const isMyItem = (isStaff && !item.created_by_player) || (!isStaff && item.created_by_player) || (myId && item.created_by === myId);
                    const isCompleted = item.status === 'completed';

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-xl p-4 transition-all ${
                          isCompleted
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Cabecera del registro */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black text-white">
                              {catObj ? t(catObj.labelKey) : item.category}
                            </span>

                            {item.created_by_player ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                                <User size={11} />
                                {playerName} ({t('devSections.player', 'Jugador')})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#db0030] bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                <Shield size={11} />
                                {item.author?.full_name || t('devSections.coach', 'Entrenador / Staff')}
                              </span>
                            )}

                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Clock size={11} />
                              {formattedDate}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <button
                              onClick={() => handleToggleStatus(item)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
                                isCompleted
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300'
                              }`}
                              title={isCompleted ? t('devSections.completed', 'Completado') : t('devSections.markCompleted', 'Completar')}
                            >
                              <CheckCircle2 size={14} className={isCompleted ? 'text-white' : 'text-emerald-600'} />
                              <span>{isCompleted ? t('devSections.completed', 'Completado ✓') : t('devSections.markCompleted', 'Completar')}</span>
                            </button>

                            {/* Solo editable y borrable lo que uno ha puesto */}
                            {isMyItem && (
                              <>
                                <button
                                  onClick={() => handleStartEdit(item)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-600 hover:text-black hover:bg-gray-100 border border-gray-200 transition-all shadow-xs active:scale-95"
                                  title={t('common.edit', 'Editar')}
                                >
                                  <Edit2 size={13} className="text-gray-500" />
                                  <span className="hidden sm:inline">{t('common.edit', 'Editar')}</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 transition-all shadow-xs active:scale-95"
                                  title={t('common.delete', 'Eliminar')}
                                >
                                  <Trash2 size={13} />
                                  <span className="hidden sm:inline">{t('common.delete', 'Borrar')}</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Si la fila está en modo edición */}
                        {editingItemId === item.id ? (
                          <div className="mt-3 p-3 bg-gray-50/90 rounded-xl border border-gray-200 space-y-3 animate-fade-in">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                                  {t('devSections.category', 'Categoría')}
                                </label>
                                <select
                                  value={editFormData.category}
                                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                                  className="w-full text-xs font-semibold p-2 rounded-lg border border-gray-200 bg-white"
                                >
                                  {sec.categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {t(c.labelKey)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                                  {t('devSections.entryTitle', 'Título / Asunto')}
                                </label>
                                <input
                                  type="text"
                                  value={editFormData.title}
                                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                  className="w-full text-xs font-semibold p-2 rounded-lg border border-gray-200 bg-white"
                                  autoFocus
                                />
                              </div>
                            </div>

                            {sec.id === 'competition_analysis' && (
                              <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                                    {t('devSections.matchName', 'Partido / Rival')}
                                  </label>
                                  <input
                                    type="text"
                                    value={editFormData.match_name}
                                    onChange={(e) => setEditFormData({ ...editFormData, match_name: e.target.value })}
                                    className="w-full text-xs font-semibold p-2 rounded-lg border border-gray-200 bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                                    {t('devSections.matchDate', 'Fecha del Partido')}
                                  </label>
                                  <input
                                    type="date"
                                    value={editFormData.match_date}
                                    onChange={(e) => setEditFormData({ ...editFormData, match_date: e.target.value })}
                                    className="w-full text-xs font-semibold p-2 rounded-lg border border-gray-200 bg-white"
                                  />
                                </div>
                              </div>
                            )}

                            {sec.id === 'action_plan' && (
                              <div>
                                <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                                  {t('devSections.deadline', 'Fecha Límite / Meta')}
                                </label>
                                <input
                                  type="date"
                                  value={editFormData.deadline}
                                  onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                                  className="w-full text-xs font-semibold p-2 rounded-lg border border-gray-200 bg-white"
                                />
                              </div>
                            )}

                            <div>
                              <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                                {t('devSections.description', 'Detalles, jugadas o comentarios iniciales')}
                              </label>
                              <textarea
                                rows={3}
                                value={editFormData.description}
                                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white"
                              />
                            </div>

                            {/* Enlaces en edición */}
                            <div className="space-y-1.5 pt-1 border-t border-gray-200/60">
                              <label className="text-[11px] font-bold text-gray-500 block">
                                {t('devSections.links', 'Enlaces / Vídeos de soporte (opcional)')}
                              </label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  type="url"
                                  value={editLinkUrl}
                                  onChange={(e) => setEditLinkUrl(e.target.value)}
                                  placeholder="https://..."
                                  className="flex-1 text-xs p-2 rounded-lg border border-gray-200 bg-white"
                                />
                                <input
                                  type="text"
                                  value={editLinkLabel}
                                  onChange={(e) => setEditLinkLabel(e.target.value)}
                                  placeholder={t('devSections.linkLabelPlaceholder', 'Nombre del vídeo')}
                                  className="sm:w-48 text-xs p-2 rounded-lg border border-gray-200 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddEditLink}
                                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold"
                                >
                                  {t('common.add', 'Añadir')}
                                </button>
                              </div>
                              {editFormData.links.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {editFormData.links.map((lnk, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 text-gray-700 text-xs rounded-lg"
                                    >
                                      <Link2 size={12} className="text-[#db0030]" />
                                      <span>{lnk.label || lnk.url}</span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditFormData((prev) => ({
                                            ...prev,
                                            links: prev.links.filter((_, i) => i !== idx),
                                          }))
                                        }
                                        className="text-gray-400 hover:text-red-500 ml-1"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
                              >
                                <X size={13} />
                                <span>{t('common.cancel', 'Cancelar')}</span>
                              </button>
                              <button
                                type="button"
                                disabled={!editFormData.title.trim() || updatingItem}
                                onClick={() => handleUpdateItem(item.id)}
                                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#db0030] hover:bg-[#b80028] text-white text-xs font-bold disabled:opacity-50 shadow-xs"
                              >
                                <Save size={13} />
                                <span>{updatingItem ? t('common.loading', 'Guardando...') : t('common.saveChanges', 'Guardar cambios')}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Contenido principal en modo visualización */
                          <div className="mt-2.5">
                            <h4
                              className={`text-base font-extrabold text-black ${
                                isCompleted ? 'line-through text-gray-500' : ''
                              }`}
                            >
                              {item.title}
                            </h4>

                            {item.description && (
                              <TranslatedText
                                text={item.description}
                                as="p"
                                className="text-xs sm:text-sm text-gray-700 mt-1 whitespace-pre-line leading-relaxed"
                              />
                            )}

                            {/* Info extra de Competición o Plazos */}
                            {(item.match_name || item.match_date || item.deadline) && (
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                                {item.match_name && (
                                  <span className="font-semibold text-gray-800">
                                    ⚽ {item.match_name}
                                  </span>
                                )}
                                {item.match_date && (
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <Calendar size={12} /> {item.match_date}
                                  </span>
                                )}
                                {item.deadline && (
                                  <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    🎯 {t('devSections.deadline', 'Meta')}: {item.deadline}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Enlaces adjuntos */}
                            {item.links && item.links.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {item.links.map((l, lIdx) => (
                                  <a
                                    key={lIdx}
                                    href={l.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-800 hover:text-[#db0030] hover:border-[#db0030] transition-colors"
                                  >
                                    <ExternalLink size={12} />
                                    <span>{l.label || l.url}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Barra de Incisos / Comentarios */}
                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                          <button
                            onClick={() =>
                              setOpenCommentsForItem(isCommentsOpen ? null : item.id)
                            }
                            className="flex items-center gap-1.5 text-xs font-extrabold text-[#db0030] hover:text-[#b80028] transition-colors"
                          >
                            <MessageSquare size={14} />
                            <span>
                              {t('devSections.commentsAndFeedback', 'Incisos y Comentarios')}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-full bg-[#db0030]/10 text-[#db0030] text-[11px] font-black">
                              {itemComments.length}
                            </span>
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-200 ${
                                isCommentsOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>

                        {/* Desplegable de comentarios e incisos */}
                        {isCommentsOpen && (
                          <div className="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-3 animate-fade-in">
                            {/* Historial de comentarios */}
                            {itemComments.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">
                                {t('devSections.noCommentsYet', 'Aún no hay comentarios ni incisos sobre este punto.')}
                              </p>
                            ) : (
                              <div className="space-y-2.5">
                                {itemComments.map((c) => {
                                  const isCoachComment = c.author?.role !== 'Jugador';
                                  const isMyComment = (myId && c.author_id === myId) || (isStaff && c.author?.role !== 'Jugador') || (!isStaff && c.author?.role === 'Jugador');
                                  const cDate = new Date(c.created_at).toLocaleDateString(
                                    i18n.language === 'it' ? 'it-IT' : i18n.language === 'en' ? 'en-GB' : 'es-ES',
                                    { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
                                  );

                                  return (
                                    <div
                                      key={c.id}
                                      className={`p-3 rounded-xl border text-xs ${
                                        isCoachComment
                                          ? 'bg-amber-50/70 border-amber-200/90 text-amber-950'
                                          : 'bg-sky-50/70 border-sky-200/90 text-sky-950'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-1.5">
                                          {isCoachComment ? (
                                            <span className="inline-flex items-center gap-1 font-black text-amber-800 text-[11px]">
                                              <Shield size={12} className="text-amber-700" />
                                              {c.author?.full_name || t('devSections.coach', 'Entrenador')} ({c.author?.role || 'Staff'})
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 font-black text-sky-800 text-[11px]">
                                              <User size={12} className="text-sky-700" />
                                              {c.author?.full_name || playerName} ({t('devSections.player', 'Jugador')})
                                            </span>
                                          )}
                                          <span className="text-[10px] text-gray-500">· {cDate}</span>
                                        </div>

                                        {isMyComment && (
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              onClick={() => handleStartEditComment(c)}
                                              className="text-gray-400 hover:text-black transition-colors p-0.5"
                                              title={t('common.edit', 'Editar')}
                                            >
                                              <Edit2 size={12} />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteComment(c.id)}
                                              className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                                              title={t('common.delete', 'Eliminar')}
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {editingCommentId === c.id ? (
                                        <div className="mt-2 space-y-2 animate-fade-in">
                                          <textarea
                                            rows={2}
                                            value={editCommentDraft}
                                            onChange={(e) => setEditCommentDraft(e.target.value)}
                                            className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#db0030]"
                                            autoFocus
                                          />
                                          <div className="flex justify-end gap-1.5">
                                            <button
                                              onClick={() => setEditingCommentId(null)}
                                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                                            >
                                              {t('common.cancel', 'Cancelar')}
                                            </button>
                                            <button
                                              disabled={!editCommentDraft.trim() || savingCommentEdit}
                                              onClick={() => handleSaveCommentEdit(c.id)}
                                              className="px-3 py-1 text-[11px] font-bold rounded-lg bg-[#db0030] text-white hover:bg-[#b80028] disabled:opacity-50"
                                            >
                                              {savingCommentEdit ? t('common.loading', 'Guardando...') : t('common.save', 'Guardar')}
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <TranslatedText
                                          text={c.content}
                                          as="p"
                                          className="whitespace-pre-line leading-relaxed font-medium"
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Caja de redactar nuevo inciso */}
                            <div className="flex gap-2 items-start mt-2 pt-2 border-t border-gray-100">
                              <textarea
                                rows={2}
                                value={openCommentsForItem === item.id ? commentDraft : ''}
                                onChange={(e) => setCommentDraft(e.target.value)}
                                placeholder={
                                  isStaff
                                    ? t('devSections.coachCommentPlaceholder', 'Añadir inciso del entrenador (saldrá destacado en color entrenador)...')
                                    : t('devSections.playerCommentPlaceholder', 'Añadir comentario o aclaración del jugador...')
                                }
                                className="flex-1 text-xs p-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#db0030]"
                              />
                              <button
                                disabled={!commentDraft.trim() || sendingComment}
                                onClick={() => handleSendComment(item.id)}
                                className="px-3 py-2 bg-[#db0030] hover:bg-[#b80028] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50 self-end"
                              >
                                <Send size={12} />
                                <span>{t('common.send', 'Enviar')}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. SECCIÓN A RELLENAR (NUEVO REGISTRO) */}
              {/* Formulario para añadir nueva fila */}
              {addingToSection === sec.id && (
                <div className="mt-4 p-4 bg-gray-50/80 border border-gray-200 rounded-xl space-y-3 animate-fade-in">
                  <p className="text-xs font-black uppercase text-gray-700 tracking-wider">
                    {t('devSections.newEntryTitle', 'Nueva fila en')} {t(sec.labelKey)}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                        {t('devSections.category', 'Categoría')}
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full text-xs font-semibold p-2 rounded-lg border border-gray-200 bg-white"
                      >
                        {sec.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {t(c.labelKey)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                        {t('devSections.entryTitle', 'Título / Asunto')}
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder={t('devSections.entryPlaceholder', 'Ej: Mejora de pase con zurda, Intensidad en duelos...')}
                        className="w-full text-xs font-semibold p-2 rounded-lg border border-gray-200 bg-white"
                        autoFocus
                      />
                    </div>
                  </div>

                  {sec.id === 'competition_analysis' && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                          {t('devSections.matchName', 'Partido / Rival')}
                        </label>
                        <input
                          type="text"
                          value={formData.match_name}
                          onChange={(e) => setFormData({ ...formData, match_name: e.target.value })}
                          placeholder={t('devSections.matchPlaceholder', 'Ej: vs Inter de Milán')}
                          className="w-full text-xs font-semibold p-2 rounded-lg border border-gray-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                          {t('devSections.matchDate', 'Fecha del Partido')}
                        </label>
                        <input
                          type="date"
                          value={formData.match_date}
                          onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                          className="w-full text-xs font-semibold p-2 rounded-lg border border-gray-200 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {sec.id === 'action_plan' && (
                    <div className="sm:w-1/2">
                      <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                        {t('devSections.deadline', 'Fecha Límite / Meta')}
                      </label>
                      <input
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        className="w-full text-xs font-semibold p-2 rounded-lg border border-gray-200 bg-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                      {t('devSections.description', 'Detalles, jugadas o comentarios iniciales')}
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('devSections.descriptionPlaceholder', 'Describe las conclusiones, jugadas a revisar o tareas concretas...')}
                      className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white"
                    />
                  </div>

                  {/* Enlaces de video / documentación */}
                  <div className="space-y-1.5 pt-1 border-t border-gray-200/60">
                    <label className="text-[11px] font-bold text-gray-500 block">
                      {t('devSections.links', 'Enlaces / Vídeos de soporte (opcional)')}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 text-xs p-2 rounded-lg border border-gray-200 bg-white"
                      />
                      <input
                        type="text"
                        value={newLinkLabel}
                        onChange={(e) => setNewLinkLabel(e.target.value)}
                        placeholder={t('devSections.linkLabelPlaceholder', 'Nombre del vídeo')}
                        className="sm:w-48 text-xs p-2 rounded-lg border border-gray-200 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold"
                      >
                        {t('common.add', 'Añadir')}
                      </button>
                    </div>
                    {formData.links.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {formData.links.map((lnk, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 text-gray-700 text-xs rounded-lg"
                          >
                            <Link2 size={12} className="text-[#db0030]" />
                            <span>{lnk.label || lnk.url}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  links: prev.links.filter((_, i) => i !== idx),
                                }))
                              }
                              className="text-gray-400 hover:text-red-500 ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAddingToSection(null)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
                    >
                      {t('common.cancel', 'Cancelar')}
                    </button>
                    <button
                      type="button"
                      disabled={!formData.title.trim() || savingItem}
                      onClick={() => handleSaveItem(sec.id)}
                      className="px-4 py-1.5 rounded-lg bg-[#db0030] hover:bg-[#b80028] text-white text-xs font-bold disabled:opacity-50"
                    >
                      {savingItem ? t('common.loading', 'Guardando...') : t('common.save', 'Guardar')}
                    </button>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}

