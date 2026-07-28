import { useState } from 'react';
import { mockTasks } from '../../data/mockTraining';
import { Search, Plus, Heart, Clock, Users, Copy, Edit3, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TaskFormModal from '../../components/planning/TaskFormModal';

const TaskLibrary = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(t('planning.library.all') || 'Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const categories = [
    t('planning.library.all') || 'Todas', 
    t('planning.library.warmup') || 'Calentamiento', 
    t('planning.library.technique') || 'Técnica', 
    t('planning.library.tactics') || 'Táctica', 
    t('planning.library.physical') || 'Física', 
    t('planning.library.match') || 'Partido', 
    t('planning.library.strategy') || 'Estrategia (ABP)', 
    t('planning.library.recovery') || 'Recuperación'
  ];

  const filteredTasks = mockTasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.objective.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === (t('planning.library.all') || 'Todas') || task.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-fade-in p-6">
      <TaskFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="h1">{t('planning.taskLibrary') || 'Biblioteca de Tareas'}</h1>
          <p className="text-muted mt-1">{t('planning.library.desc') || 'Explora, crea y organiza tus ejercicios de entrenamiento'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          {t('planning.library.newTask') || 'Nueva Tarea'}
        </button>
      </div>

      <div className="flex gap-4 items-center flex-wrap" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={20} />
          <input 
            type="text" 
            placeholder={t('planning.library.search') || 'Buscar por nombre u objetivo...'}
            style={{ width: '100%', paddingLeft: '2.75rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map(cat => (
            <button 
              key={cat}
              className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
              style={{ whiteSpace: 'nowrap', borderRadius: 'var(--radius-full)', padding: '0.25rem 1rem', fontSize: '0.875rem' }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filteredTasks.map(task => (
          <div key={task.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Image Header */}
            <div style={{ height: '160px', position: 'relative', backgroundColor: 'var(--color-border)' }}>
              {task.mediaUrl ? (
                <img src={task.mediaUrl} alt={task.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                  {t('planning.library.noImage') || 'Sin Imagen'}
                </div>
              )}
              <button 
                style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', color: task.isFavorite ? '#ef4444' : 'white', background: 'rgba(0,0,0,0.4)', borderRadius: '50%', padding: '0.4rem', border: 'none', cursor: 'pointer' }}
              >
                <Heart size={18} fill={task.isFavorite ? '#ef4444' : 'none'} />
              </button>
              <span style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                {task.category}
              </span>
            </div>
            
            {/* Body */}
            <div style={{ padding: '1.25rem', flex: '1', display: 'flex', flexDirection: 'column' }}>
              <h3 className="h3" style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{task.name}</h3>
              <p className="text-muted text-sm" style={{ marginBottom: '1rem', flex: '1', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {task.objective}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: 'var(--color-text-secondary)', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} />
                  <span>{task.duration}'</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={16} />
                  <span>{task.playersCount}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{task.load}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem' }}>
                <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-text-secondary)' }} title={t('planning.library.duplicate') || 'Duplicar'}>
                  <Copy size={16} />
                </button>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-primary)' }} title={t('planning.library.edit') || 'Editar'}>
                    <Edit3 size={16} />
                  </button>
                  <button className="btn btn-outline" style={{ padding: '0.4rem', color: '#ef4444', borderColor: '#fee2e2' }} title={t('planning.library.delete') || 'Eliminar'}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskLibrary;
