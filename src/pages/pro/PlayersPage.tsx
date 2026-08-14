import { useState, useMemo } from 'react';
import type { Player, DevTask, MedicalRecord, SportsStats } from '../../components/types';
import PlayersManagementView from '../../components/pro/PlayersManagementView';
import GlobalIndividualMeetingsView from '../../components/pro/GlobalIndividualMeetingsView';
import { useSearchParams } from 'react-router-dom';

import { useSupabaseData } from '../../hooks/useSupabaseData';
import PlayerImportModal from '../../components/pro/PlayerImportModal';
import { Plus, Users as UsersIcon, Grid, List, Filter, Globe, Search, Download, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './players-grid.css';

const getPositionOrder = (pos: string) => {
  const lowerPos = (pos || '').toLowerCase();
  if (lowerPos.includes('portero') || lowerPos.includes('arquero')) return 1;
  if (lowerPos.includes('delantero') || lowerPos.includes('extremo') || lowerPos.includes('punta') || lowerPos.includes('atacante')) return 4;
  if (lowerPos.includes('defensa') || lowerPos.includes('lateral') || lowerPos.includes('central') || lowerPos.includes('carrilero')) return 2;
  if (lowerPos.includes('centrocampista') || lowerPos.includes('medio') || lowerPos.includes('pivote') || lowerPos.includes('mediapunta') || lowerPos.includes('volante') || lowerPos.includes('centro')) return 3;
  return 5;
};

export default function PlayersPage() {
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [positionFilter, setPositionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ageRange, setAgeRange] = useState<[number, number]>([15, 45]);
  const [showFilters, setShowFilters] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'roster';
  
  const { data: dbPlayers, loading } = useSupabaseData<any>('players');

  const thumbStyles = 'age-range-thumb';

  // Mapeamos los datos de la base de datos al formato que espera el frontend
  const players = useMemo<Player[]>(() => {
    return dbPlayers.map(p => ({
      id: p.id,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      footballName: p.football_name || '',
      position: p.main_position || 'Sin definir',
      age: p.birth_date ? new Date().getFullYear() - new Date(p.birth_date).getFullYear() : 0,
      weight: p.weight_kg || 0,
      height: p.height_cm || 0,
      bodyFat: 0,
      history: 'Información desde base de datos',
      strengths: [],
      weaknesses: [],
      goals: [],
      status: p.medical_status || 'Apto',
      nationality: p.nationality || '',
      dominantFoot: p.dominant_foot,
      avatar: p.photo_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
    }));
  }, [dbPlayers]);

  const filteredPlayers = useMemo(() => {
    const filtered = players.filter(p => {
      // Filtro por nombre
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filtro por posición
      if (positionFilter) {
        const pos = (p.position || '').toLowerCase();
        if (positionFilter === 'Portero' && !pos.includes('portero') && !pos.includes('arquero')) return false;
        if (positionFilter === 'Defensa' && !pos.includes('defensa') && !pos.includes('lateral') && !pos.includes('central') && !pos.includes('carrilero')) return false;
        if (positionFilter === 'Centrocampista' && !pos.includes('centrocampista') && !pos.includes('medio') && !pos.includes('pivote') && !pos.includes('mediapunta') && !pos.includes('volante')) return false;
        if (positionFilter === 'Delantero' && !pos.includes('delantero') && !pos.includes('extremo') && !pos.includes('punta') && !pos.includes('atacante')) return false;
      }

      // Filtro por edad
      if (p.age > 0) {
        if (p.age < ageRange[0] || p.age > ageRange[1]) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const orderA = getPositionOrder(a.position);
      const orderB = getPositionOrder(b.position);
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [players, positionFilter, ageRange, searchQuery]);

  const summaryStats = useMemo(() => {
    const totalPlayers = players.length;
    const nationalities = new Set(players.filter(p => p.nationality || '').map(p => p.nationality || ''.toLowerCase().trim())).size;
    const positions = players.reduce((acc, p) => {
       const pos = (p.position || 'Sin definir').toLowerCase();
       if (pos.includes('portero') || pos.includes('arquero')) acc.porteros = (acc.porteros || 0) + 1;
       else if (pos.includes('delantero') || pos.includes('extremo') || pos.includes('punta') || pos.includes('atacante')) acc.delanteros = (acc.delanteros || 0) + 1;
       else if (pos.includes('defensa') || pos.includes('lateral') || pos.includes('central') || pos.includes('carrilero')) acc.defensas = (acc.defensas || 0) + 1;
       else if (pos.includes('centrocampista') || pos.includes('medio') || pos.includes('pivote') || pos.includes('mediapunta') || pos.includes('volante') || pos.includes('centro')) acc.medios = (acc.medios || 0) + 1;
       return acc;
    }, { porteros: 0, defensas: 0, medios: 0, delanteros: 0 });

    return { totalPlayers, nationalities, positions };
  }, [players]);

  const [medicals, setMedicals] = useState<Record<string, MedicalRecord>>({});
  const [stats, setStats] = useState<Record<string, SportsStats>>({});
  const [tasks, setTasks] = useState<DevTask[]>([]);

  const [playerToEdit, setPlayerToEdit] = useState<any>(null);

  const handleDeletePlayer = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar a este jugador?')) {
      try {
        const { error } = await supabase.from('players').delete().eq('id', id);
        if (error) throw error;
        window.location.reload();
      } catch (err) {
        console.error('Error al eliminar jugador:', err);
        alert('Hubo un error al eliminar el jugador.');
      }
    }
  };

  const handleAddPlayer = () => {
    setPlayerToEdit(null);
    setShowImportModal(true);
  };

  const handleEditPlayer = (player: Player) => {
    // Buscar el jugador completo de dbPlayers para tener todos sus datos
    const dbPlayer = dbPlayers.find((p: any) => p.id === player.id);
    if (dbPlayer) {
      setPlayerToEdit(dbPlayer);
      setShowImportModal(true);
    }
  };

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Cabecera negra y roja
      doc.setFillColor(20, 20, 24); // Negro oscuro
      doc.rect(0, 0, 210, 45, 'F');
      doc.setFillColor(220, 38, 38); // Rojo vibrante
      doc.rect(0, 45, 210, 5, 'F');

      const img = new Image();
      img.src = '/escudo.png'; // Fallback a equipo.png si la pide
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Continue even if image fails
      });

      if (img.width > 0) {
         const canvas = document.createElement('canvas');
         canvas.width = img.width;
         canvas.height = img.height;
         const ctx = canvas.getContext('2d');
         if (ctx) {
           ctx.drawImage(img, 0, 0);
           const dataUrl = canvas.toDataURL('image/png');
           doc.addImage(dataUrl, 'PNG', 15, 7, 30, 30);
         }
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(26);
      doc.setFont("helvetica", "bold");
      doc.text("PLANTILLA DEL EQUIPO", 55, 22);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 200, 200);
      doc.text(`Generado el ${new Date().toLocaleDateString()} | Total Jugadores: ${players.length}`, 55, 32);

      // Pre-load player images
      const playerImages: Record<string, string | null> = {};
      await Promise.all(players.map(async p => {
         if (!p.avatar || p.avatar.includes('unsplash.com')) {
            playerImages[p.id] = null;
            return;
         }
         try {
            const imgUrl = p.avatar.startsWith('data:') ? p.avatar : `https://corsproxy.io/?${encodeURIComponent(p.avatar)}`;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const dataUrl = await new Promise<string>((resolve, reject) => {
               img.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                     ctx.drawImage(img, 0, 0);
                     resolve(canvas.toDataURL('image/png'));
                  } else reject(new Error('No canvas context'));
               };
               img.onerror = () => reject(new Error('Image load failed'));
               img.src = imgUrl;
            });
            playerImages[p.id] = dataUrl;
         } catch (e) {
            playerImages[p.id] = null;
         }
      }));

      // Ordenamos todos los jugadores por nombre
      const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));

      let y = 60;
      let x = 15;

      doc.setTextColor(0, 0, 0);

      sortedPlayers.forEach(p => {
        if (y > 282) {
          if (x === 15) { x = 110; y = 60; }
          else { doc.addPage(); x = 15; y = 60; }
        }

        const base64Img = playerImages[p.id];
        if (base64Img) {
          doc.addImage(base64Img, 'PNG', x, y - 5, 8, 8);
        } else {
          doc.setFillColor(220, 220, 220);
          doc.rect(x, y - 5, 8, 8, 'F');
        }

        doc.setTextColor(30, 30, 30);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        const name = p.name.length > 25 ? p.name.substring(0, 23) + '...' : p.name;
        doc.text(name, x + 10, y - 1);

        let info = [];
        if (p.position && p.position !== 'Sin definir') info.push(p.position);
        if (p.age) info.push(`${p.age} años`);
        if (p.nationality || '') info.push(p.nationality || '');
        
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(info.join(' - '), x + 10, y + 3);

        y += 13;
      });

      // Pie de página
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
      }

      doc.save("Plantilla_Club.pdf");
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Hubo un error al generar el PDF.");
    }
  };


  return (
    <div className="w-full mx-auto h-full space-y-6 animate-fade-in">
      <div className="staff-header" style={{ marginBottom: 0 }}>
        <div>
          <p className="staff-breadcrumb">Jugadores</p>
          <h1 className="staff-title">
            {currentView === 'meetings' ? 'Reuniones Individuales' : 'Plantilla'} {loading && <span className="text-sm text-muted" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(Cargando datos reales...)</span>}
          </h1>
        </div>
        
        {currentView === 'roster' && (
          <div className="staff-actions">
          {players.length > 0 && (
            <div className="flex gap-2 mr-4">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl flex items-center justify-center transition-all border-2 ${viewMode === 'grid' ? 'bg-white border-red-500 text-red-600 shadow-sm' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
                title="Vista de cuadrícula"
              >
                <Grid size={22} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl flex items-center justify-center transition-all border-2 ${viewMode === 'list' ? 'bg-white border-red-500 text-red-600 shadow-sm' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
                title="Vista de lista"
              >
                <List size={22} />
              </button>
            </div>
          )}
          <button 
             onClick={() => setShowFilters(!showFilters)} 
             className={`btn flex items-center gap-2 ${showFilters ? 'bg-gray-800 text-white border-gray-800 hover:bg-gray-700' : 'btn-outline bg-white hover:bg-gray-50 border-gray-300 text-gray-700'}`}
          >
             <Filter size={16} />
             Filtrar
          </button>
          <button onClick={exportToPDF} className="btn btn-outline flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700">
             <Download size={16} />
             Exportar PDF
          </button>
          <button 
             onClick={() => setIsEditMode(!isEditMode)} 
             className={`btn flex items-center gap-2 transition-colors ${isEditMode ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'btn-outline bg-white hover:bg-gray-50 border-gray-300 text-gray-700'}`}
          >
             <Edit2 size={16} />
             Editar jugador
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn btn-primary">
            <Plus size={16} />
            Añadir jugador
          </button>
        </div>
        )}
      </div>

      {players.length > 0 && currentView === 'roster' && (
        <div className="grid grid-cols-3 gap-4 overflow-x-auto pb-2">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <UsersIcon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Jugadores</p>
              <p className="text-2xl font-bold">{summaryStats.totalPlayers}</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <Globe size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Nacionalidades</p>
              <p className="text-2xl font-bold">{summaryStats.nationalities}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
             <p className="text-sm text-gray-500 font-medium mb-2">Desglose por Posición</p>
             <div className="flex flex-wrap justify-between items-center text-[11px] xl:text-sm font-medium text-gray-700 gap-1 mt-1">
                <span className="flex items-center gap-1.5" title="Porteros"><span className="w-2 h-2 rounded-full bg-amber-400"></span> POR: {summaryStats.positions.porteros}</span>
                <span className="flex items-center gap-1.5" title="Defensas"><span className="w-2 h-2 rounded-full bg-blue-400"></span> DEF: {summaryStats.positions.defensas}</span>
                <span className="flex items-center gap-1.5" title="Centrocampistas"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> MED: {summaryStats.positions.medios}</span>
                <span className="flex items-center gap-1.5" title="Delanteros"><span className="w-2 h-2 rounded-full bg-rose-400"></span> DEL: {summaryStats.positions.delanteros}</span>
             </div>
          </div>
        </div>
      )}

      {players.length > 0 && currentView === 'roster' && showFilters && (
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mt-4 animate-fade-in">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter size={18} />
            <span className="font-medium text-sm">Filtros:</span>
          </div>
          
          <select 
            value={positionFilter} 
            onChange={(e) => setPositionFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-gray-50 hover:bg-white transition-colors focus:ring-2 focus:ring-blue-500/20 outline-none"
          >
            <option value="">Todas las demarcaciones</option>
            <option value="Portero">Porteros</option>
            <option value="Defensa">Defensas</option>
            <option value="Centrocampista">Centrocampistas</option>
            <option value="Delantero">Delanteros</option>
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar jugador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="!pl-10 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 hover:bg-white focus:bg-white transition-colors focus:ring-2 focus:ring-blue-500/20 outline-none w-48"
            />
          </div>

          <div className="flex items-center gap-3 bg-gradient-to-br from-[#1e1e24] to-[#16161b] px-4 py-2.5 rounded-xl text-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.03)] border border-white/5">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">Edad</span>

            <span className="text-sm font-bold min-w-[26px] text-right bg-red-500/20 text-red-200 rounded-md px-1.5 py-0.5">{ageRange[0]}</span>

            <div className="relative w-48 h-6 flex items-center mx-1">
              {/* Track background */}
              <div className="absolute w-full h-1.5 bg-[#2a2c3a] rounded-full pointer-events-none"></div>
              {/* Active track */}
              <div
                className="absolute h-1.5 bg-gradient-to-r from-red-600 to-red-400 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.6)] pointer-events-none"
                style={{
                  left: `${((ageRange[0] - 15) / (45 - 15)) * 100}%`,
                  right: `${100 - ((ageRange[1] - 15) / (45 - 15)) * 100}%`
                }}
              ></div>
              {/* Min thumb */}
              <input
                type="range"
                min={15}
                max={45}
                value={ageRange[0]}
                onChange={(e) => setAgeRange([Math.min(parseInt(e.target.value), ageRange[1] - 1), ageRange[1]])}
                className={`absolute w-full appearance-none bg-transparent pointer-events-none cursor-pointer m-0 ${thumbStyles}`}
                style={{ zIndex: ageRange[0] >= ageRange[1] - 1 ? 30 : 20 }}
              />
              {/* Max thumb */}
              <input
                type="range"
                min={15}
                max={45}
                value={ageRange[1]}
                onChange={(e) => setAgeRange([ageRange[0], Math.max(parseInt(e.target.value), ageRange[0] + 1)])}
                className={`absolute w-full appearance-none bg-transparent pointer-events-none cursor-pointer m-0 ${thumbStyles}`}
                style={{ zIndex: 25 }}
              />
            </div>

            <span className="text-sm font-bold min-w-[26px] bg-red-500/20 text-red-200 rounded-md px-1.5 py-0.5">{ageRange[1]}</span>
          </div>

          <style>{`
            .age-range-thumb::-webkit-slider-thumb {
              pointer-events: auto;
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              background: #ffffff;
              border: 3px solid #f87171;
              border-radius: 9999px;
              box-shadow: 0 0 0 4px rgba(248,113,113,0.25), 0 2px 6px rgba(0,0,0,0.5);
              cursor: pointer;
              transition: transform 0.15s ease;
              margin-top: 0;
            }
            .age-range-thumb::-webkit-slider-thumb:hover { transform: scale(1.15); }
            .age-range-thumb::-webkit-slider-thumb:active { transform: scale(1.3); }
            .age-range-thumb::-moz-range-thumb {
              pointer-events: auto;
              width: 18px;
              height: 18px;
              background: #ffffff;
              border: 3px solid #f87171;
              border-radius: 9999px;
              box-shadow: 0 0 0 4px rgba(248,113,113,0.25), 0 2px 6px rgba(0,0,0,0.5);
              cursor: pointer;
            }
            .age-range-thumb::-moz-range-track {
              appearance: none;
              background: transparent;
              border: none;
            }
          `}</style>

          {(positionFilter || ageRange[0] > 15 || ageRange[1] < 45) && (
            <button 
              onClick={() => { setPositionFilter(''); setAgeRange([15, 45]); }}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors ml-auto flex-shrink-0"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {!loading && players.length === 0 && (
        <div className="card staff-empty">
          <UsersIcon size={32} className="text-muted" />
          <p className="h3 mt-4">No hay jugadores en la base de datos</p>
          <p className="text-muted mt-2">
            Puedes añadirlos importándolos de BeSoccer o desde el panel de administración.
          </p>
        </div>
      )}

      {showImportModal && (
        <PlayerImportModal
          playerToEdit={playerToEdit}
          onClose={() => {
            setShowImportModal(false);
            setPlayerToEdit(null);
          }}
          onSuccess={() => {
            setShowImportModal(false);
            setPlayerToEdit(null);
            window.location.reload();
          }}
        />
      )}

      {players.length > 0 && currentView === 'roster' && (
        <>
          {filteredPlayers.length === 0 ? (
            <div className="card staff-empty mt-6">
              <UsersIcon size={32} className="text-muted" />
              <p className="h3 mt-4">No hay jugadores que coincidan con los filtros</p>
              <button 
                onClick={() => { setPositionFilter(''); setAgeRange([15, 45]); }}
                className="btn btn-outline mt-4"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <PlayersManagementView 
              players={filteredPlayers}
              viewMode={viewMode}
              onAddPlayer={handleAddPlayer}
              onUpdatePlayer={handleEditPlayer}
              onDeletePlayer={handleDeletePlayer}
              tasks={tasks}
              onAddTask={(task: DevTask) => setTasks([...tasks, task])}
              onUpdateTaskProgress={() => {}}
              onAddTaskComment={() => {}}
              onUpdateTask={(task: DevTask) => setTasks(tasks.map(t => t.id === task.id ? task : t))}
              medicals={medicals}
              onUpdateMedical={(medical: MedicalRecord) => setMedicals({...medicals, [medical.playerId]: medical})}
              stats={stats}
              onUpdateStats={(playerId: string, updatedStats: SportsStats) => setStats({...stats, [playerId]: updatedStats})}
              activeRole="Entrenador"
              language="es"
              isEditMode={isEditMode}
            />
          )}
        </>
      )}

      {currentView === 'meetings' && (
        <GlobalIndividualMeetingsView players={players} />
      )}
    </div>
  );
}
