import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { ensureContext } from '../../lib/dataService';
import { Plus, Trash2, Columns, LayoutGrid, X } from 'lucide-react';

interface TeamsAnnotationsBoardProps {
  value: string;
  onChange: (value: string) => void;
}

interface BoardItem {
  id: string;
  type: 'player' | 'annotation';
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  color: string;
}

export function TeamsAnnotationsBoard({ value, onChange }: TeamsAnnotationsBoardProps) {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [columnsConfig, setColumnsConfig] = useState<{ count: number; width: number; height: number; x: number; y: number; colors: string[]; names?: string[] }>({
    count: 0,
    width: 60,
    height: 50,
    x: 20,
    y: 20,
    colors: [],
    names: []
  });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const [customText, setCustomText] = useState('');
  const activeColor = '#3b82f6'; // default blue
  
  const boardRef = useRef<HTMLDivElement>(null);
  const dragItemRef = useRef<{ id: string; startX: number; startY: number; itemX: number; itemY: number } | null>(null);
  const tableActionRef = useRef<{ type: 'drag' | 'resize'; startX: number; startY: number; initX: number; initY: number; initW: number; initH: number } | null>(null);

  // Load players
  useEffect(() => {
    async function loadPlayers() {
      try {
        const seasonId = await ensureContext();
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('season_id', seasonId);
        
        if (error) throw error;
        setPlayers(data || []);
      } catch (err) {
        console.error('Error loading players:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPlayers();
  }, []);

  // Parse board value
  useEffect(() => {
    try {
      if (value) {
        const parsed = JSON.parse(value);
        if (parsed && parsed.teamsBoard) {
          if (Array.isArray(parsed.teamsBoard.items)) {
            setBoardItems(parsed.teamsBoard.items);
          } else {
            setBoardItems([]);
          }
          if (parsed.teamsBoard.columnsConfig) {
            const count = parsed.teamsBoard.columnsConfig.count ?? 0;
            const loadedColors = parsed.teamsBoard.columnsConfig.colors || [];
            const loadedNames = parsed.teamsBoard.columnsConfig.names || [];
            
            // Migration for single color:
            const colors = Array.from({ length: count }).map((_, idx) => {
              return loadedColors[idx] || parsed.teamsBoard.columnsConfig.color || '#3b82f6';
            });
            const names = Array.from({ length: count }).map((_, idx) => {
              return loadedNames[idx] || `Equipo ${idx + 1}`;
            });

            setColumnsConfig({
              count,
              width: parsed.teamsBoard.columnsConfig.width ?? 60,
              height: parsed.teamsBoard.columnsConfig.height ?? 50,
              x: parsed.teamsBoard.columnsConfig.x ?? 20,
              y: parsed.teamsBoard.columnsConfig.y ?? 20,
              colors,
              names
            });
          } else if (typeof parsed.teamsBoard.numColumns === 'number') {
            // fallback / migration
            const count = parsed.teamsBoard.numColumns;
            setColumnsConfig({
              count,
              width: 60,
              height: 50,
              x: 20,
              y: 20,
              colors: Array.from({ length: count }).map(() => '#3b82f6'),
              names: Array.from({ length: count }).map((_, idx) => `Equipo ${idx + 1}`)
            });
          } else {
            setColumnsConfig({ count: 0, width: 60, height: 50, x: 20, y: 20, colors: [], names: [] });
          }
        } else {
          setBoardItems([]);
          setColumnsConfig({ count: 0, width: 60, height: 50, x: 20, y: 20, colors: [], names: [] });
        }
      } else {
        setBoardItems([]);
        setColumnsConfig({ count: 0, width: 60, height: 50, x: 20, y: 20, colors: [], names: [] });
      }
    } catch {
      setBoardItems([]);
      setColumnsConfig({ count: 0, width: 60, height: 50, x: 20, y: 20, colors: [], names: [] });
    }
  }, [value]);

  // Save board value
  const saveItems = (items: BoardItem[], config = columnsConfig) => {
    try {
      const parsed = value ? JSON.parse(value) : {};
      const updated = {
        ...parsed,
        teamsBoard: {
          items,
          columnsConfig: config
        }
      };
      onChange(JSON.stringify(updated));
    } catch {
      onChange(JSON.stringify({ teamsBoard: { items, columnsConfig: config } }));
    }
  };

  const formatPlayerName = (player: any) => {
    if (!player) return '';
    const nameToUse = player.football_name || player.footballName || `${player.first_name || ''} ${player.last_name || ''}`.trim() || player.name || '';
    const clean = nameToUse.trim();
    if (!clean) return '';
    const firstWord = clean.split(/\s+/)[0];
    return firstWord.toUpperCase();
  };

  // Add player to board
  const addPlayerToBoard = (player: any) => {
    const formattedName = formatPlayerName(player);
    // Avoid duplicates on board
    if (boardItems.some(item => item.type === 'player' && item.text === formattedName)) return;

    const newItem: BoardItem = {
      id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'player',
      text: formattedName,
      x: 10 + Math.random() * 20,
      y: 10 + Math.random() * 60,
      color: activeColor
    };
    
    const updated = [...boardItems, newItem];
    setBoardItems(updated);
    saveItems(updated);
  };

  // Add all players to board
  const addAllPlayersToBoard = () => {
    const newItems: BoardItem[] = [];
    players.forEach((player, index) => {
      const formattedName = formatPlayerName(player);
      if (!boardItems.some(item => item.type === 'player' && item.text === formattedName)) {
        newItems.push({
          id: `pl-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'player',
          text: formattedName,
          x: 15 + (index % 4) * 20,
          y: 15 + Math.floor(index / 4) * 12,
          color: activeColor
        });
      }
    });

    if (newItems.length > 0) {
      const updated = [...boardItems, ...newItems];
      setBoardItems(updated);
      saveItems(updated);
    }
  };

  // Add custom annotation to board
  const addAnnotation = () => {
    if (!customText.trim()) return;
    const newItem: BoardItem = {
      id: `an-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'annotation',
      text: customText.trim(),
      x: 30,
      y: 30,
      color: activeColor
    };
    
    const updated = [...boardItems, newItem];
    setBoardItems(updated);
    saveItems(updated);
    setCustomText('');
  };

  // Organize items in columns
  const arrangeInColumns = (
    count: number,
    width = columnsConfig.width,
    height = columnsConfig.height,
    x = columnsConfig.x,
    y = columnsConfig.y,
    color = columnsConfig.colors?.[0] || '#3b82f6'
  ) => {
    // Fill columns colors and names arrays
    const colors = Array.from({ length: count }).map((_, idx) => {
      return columnsConfig.colors?.[idx] || color;
    });
    const names = Array.from({ length: count }).map((_, idx) => {
      return columnsConfig.names?.[idx] || `Equipo ${idx + 1}`;
    });

    const newConfig = { count, width, height, x, y, colors, names };
    setColumnsConfig(newConfig);

    const playerItems = boardItems.filter(item => item.type === 'player');
    const nonPlayerItems = boardItems.filter(item => item.type !== 'player');
    
    if (playerItems.length === 0) {
      saveItems(boardItems, newConfig);
      return;
    }

    const colWidth = width / count;

    const updatedPlayers = playerItems.map((item, index) => {
      const colIndex = index % count;
      const rowIndex = Math.floor(index / count);
      const colColor = colors[colIndex] || '#3b82f6';
      return {
        ...item,
        x: x + colIndex * colWidth + colWidth / 2, // Center relative to columns container
        y: y + 14 + rowIndex * 7, // Center relative to columns container, starting lower
        color: colColor // adopt color of column when doing automatic organization
      };
    });

    const updated = [...nonPlayerItems, ...updatedPlayers];
    setBoardItems(updated);
    saveItems(updated, newConfig);
  };

  const updateColumnName = (colIndex: number, newName: string) => {
    setColumnsConfig(prev => {
      const currentNames = [...(prev.names || [])];
      while (currentNames.length < prev.count) {
        currentNames.push('');
      }
      for (let idx = 0; idx < prev.count; idx++) {
        if (!currentNames[idx]) {
          currentNames[idx] = `Equipo ${idx + 1}`;
        }
      }
      currentNames[colIndex] = newName;

      const nextConfig = { ...prev, names: currentNames };
      saveItems(boardItems, nextConfig);
      return nextConfig;
    });
  };

  const realignItemsInColumns = (currentItems: BoardItem[], config = columnsConfig) => {
    if (config.count === 0) return currentItems;

    const startX = config.x;
    const colWidth = config.width / config.count;

    const columnBuckets: BoardItem[][] = Array.from({ length: config.count }).map(() => []);
    const freeItems: BoardItem[] = [];

    currentItems.forEach(item => {
      if (item.type === 'player') {
        const withinX = item.x >= startX && item.x <= startX + config.width;
        const withinY = item.y >= config.y && item.y <= config.y + config.height;
        if (withinX && withinY) {
          const relativeX = item.x - startX;
          const colIndex = Math.floor((relativeX / config.width) * config.count);
          const clampedIndex = Math.max(0, Math.min(config.count - 1, colIndex));
          columnBuckets[clampedIndex].push(item);
        } else {
          freeItems.push(item);
        }
      } else {
        freeItems.push(item);
      }
    });

    const alignedColumnItems: BoardItem[] = [];
    columnBuckets.forEach((bucket, colIdx) => {
      const sortedBucket = [...bucket].sort((a, b) => a.y - b.y);
      const colColor = config.colors?.[colIdx] || '#3b82f6';
      
      sortedBucket.forEach((item, itemIdx) => {
        alignedColumnItems.push({
          ...item,
          x: startX + colIdx * colWidth + colWidth / 2,
          y: config.y + 14 + itemIdx * 7, // start lower to prevent overlap with header
          color: colColor
        });
      });
    });

    return [...freeItems, ...alignedColumnItems];
  };

  const cycleColumnColor = (colIndex: number) => {
    const availableColors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#64748b'];
    setColumnsConfig(prev => {
      const currentColors = [...(prev.colors || [])];
      while (currentColors.length < prev.count) {
        currentColors.push('#3b82f6');
      }
      const currentColor = currentColors[colIndex] || '#3b82f6';
      const currentIndex = availableColors.indexOf(currentColor);
      const nextIndex = (currentIndex + 1) % availableColors.length;
      currentColors[colIndex] = availableColors[nextIndex];

      const nextConfig = { ...prev, colors: currentColors };
      
      // Update color of items already inside this column
      setBoardItems(items => {
        const updated = items.map(item => {
          if (columnsConfig.count > 0) {
            const withinX = item.x >= columnsConfig.x && item.x <= columnsConfig.x + columnsConfig.width;
            const withinY = item.y >= columnsConfig.y && item.y <= columnsConfig.y + columnsConfig.height;
            if (withinX && withinY) {
              const relativeX = item.x - columnsConfig.x;
              const colIdx = Math.floor((relativeX / columnsConfig.width) * columnsConfig.count);
              const clampedIdx = Math.max(0, Math.min(columnsConfig.count - 1, colIdx));
              if (clampedIdx === colIndex) {
                return { ...item, color: currentColors[colIndex] };
              }
            }
          }
          return item;
        });
        saveItems(updated, nextConfig);
        return updated;
      });

      return nextConfig;
    });
  };

  // Clear board
  const clearBoard = () => {
    if (window.confirm('¿Seguro que quieres vaciar la pizarra de Equipos y Anotaciones?')) {
      setBoardItems([]);
      const newConfig = { count: 0, width: 60, height: 50, x: 20, y: 20, colors: [], names: [] };
      setColumnsConfig(newConfig);
      saveItems([], newConfig);
      setSelectedItemId(null);
    }
  };

  // Draggable table window handlers
  const handleTableDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!boardRef.current) return;
    tableActionRef.current = {
      type: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      initX: columnsConfig.x,
      initY: columnsConfig.y,
      initW: columnsConfig.width,
      initH: columnsConfig.height
    };
    boardRef.current.setPointerCapture(e.pointerId);
  };

  const handleTableResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!boardRef.current) return;
    tableActionRef.current = {
      type: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      initX: columnsConfig.x,
      initY: columnsConfig.y,
      initW: columnsConfig.width,
      initH: columnsConfig.height
    };
    boardRef.current.setPointerCapture(e.pointerId);
  };

  // Drag handlers for items
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelectedItemId(id);
    const item = boardItems.find(i => i.id === id);
    if (!item || !boardRef.current) return;

    dragItemRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      itemX: item.x,
      itemY: item.y
    };
    
    boardRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!boardRef.current) return;

    // Handle table dragging/resizing
    if (tableActionRef.current) {
      e.preventDefault();
      const rect = boardRef.current.getBoundingClientRect();
      const w = rect.width || 1;
      const h = rect.height || 1;
      const deltaX = ((e.clientX - tableActionRef.current.startX) / w) * 100;
      const deltaY = ((e.clientY - tableActionRef.current.startY) / h) * 100;

      if (tableActionRef.current.type === 'drag') {
        const newX = Math.max(0, Math.min(100 - columnsConfig.width, tableActionRef.current.initX + deltaX));
        const newY = Math.max(0, Math.min(100 - columnsConfig.height, tableActionRef.current.initY + deltaY));
        setColumnsConfig(prev => ({ ...prev, x: newX, y: newY }));
      } else if (tableActionRef.current.type === 'resize') {
        const newW = Math.max(20, Math.min(100 - columnsConfig.x, tableActionRef.current.initW + deltaX));
        const newH = Math.max(15, Math.min(100 - columnsConfig.y, tableActionRef.current.initH + deltaY));
        setColumnsConfig(prev => ({ ...prev, width: newW, height: newH }));
      }
      return;
    }

    if (!dragItemRef.current || !boardRef.current) return;
    e.preventDefault();

    const rect = boardRef.current.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    const deltaX = ((e.clientX - dragItemRef.current.startX) / w) * 100;
    const deltaY = ((e.clientY - dragItemRef.current.startY) / h) * 100;

    const newX = Math.max(0, Math.min(95, dragItemRef.current.itemX + deltaX));
    const newY = Math.max(0, Math.min(95, dragItemRef.current.itemY + deltaY));

    const itemId = dragItemRef.current.id;
    setBoardItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, x: newX, y: newY };
      }
      return item;
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (tableActionRef.current) {
      if (boardRef.current) boardRef.current.releasePointerCapture(e.pointerId);
      tableActionRef.current = null;
      // Realign all players inside table window to snap to new coordinates
      setBoardItems(prev => {
        const aligned = realignItemsInColumns(prev, columnsConfig);
        saveItems(aligned, columnsConfig);
        return aligned;
      });
      return;
    }

    if (!dragItemRef.current || !boardRef.current) return;
    boardRef.current.releasePointerCapture(e.pointerId);
    
    dragItemRef.current = null;

    // Detect drop zone and inherit column color + snap center align player list
    setBoardItems(prev => {
      const aligned = realignItemsInColumns(prev, columnsConfig);
      saveItems(aligned, columnsConfig);
      return aligned;
    });
  };

  // Update item color
  const updateItemColor = (id: string, color: string) => {
    const updated = boardItems.map(item => item.id === id ? { ...item, color } : item);
    setBoardItems(updated);
    saveItems(updated);
  };

  // Remove item
  const removeItem = (id: string) => {
    const updated = boardItems.filter(item => item.id !== id);
    setBoardItems(updated);
    saveItems(updated);
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const selectedItem = boardItems.find(i => i.id === selectedItemId);

  return (
    <div className="flex h-full bg-slate-900 text-white select-none">
      
      {/* Sidebar de Jugadores y Herramientas */}
      <div className="w-64 border-r border-slate-800 flex flex-col h-full bg-slate-950 shrink-0">
        <div className="p-3 border-b border-slate-800">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Añadir a la Pizarra</h3>
        </div>

        {/* Añadir Anotación */}
        <div className="p-3 border-b border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Nota de Texto</span>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Escribe nota..."
              onKeyDown={(e) => e.key === 'Enter' && addAnnotation()}
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={addAnnotation}
              className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              title="Añadir Nota"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Acciones de Organización */}
        <div className="p-3 border-b border-slate-800 space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Configuración de Tabla</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => arrangeInColumns(2)}
              className={`px-2 py-1.5 rounded text-[10px] font-black flex items-center justify-center gap-1 border transition-colors ${
                columnsConfig.count === 2 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Organizar en 2 columnas"
            >
              <Columns size={12} /> 2 Col.
            </button>
            <button
              type="button"
              onClick={() => arrangeInColumns(3)}
              className={`px-2 py-1.5 rounded text-[10px] font-black flex items-center justify-center gap-1 border transition-colors ${
                columnsConfig.count === 3 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Organizar en 3 columnas"
            >
              <LayoutGrid size={12} /> 3 Col.
            </button>
            <button
              type="button"
              onClick={() => arrangeInColumns(4)}
              className={`px-2 py-1.5 rounded text-[10px] font-black flex items-center justify-center gap-1 border transition-colors ${
                columnsConfig.count === 4 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Organizar en 4 columnas"
            >
              <LayoutGrid size={12} /> 4 Col.
            </button>
            <button
              type="button"
              onClick={() => {
                const newConfig = { ...columnsConfig, count: 0 };
                setColumnsConfig(newConfig);
                saveItems(boardItems, newConfig);
              }}
              className={`px-2 py-1.5 rounded text-[10px] font-black flex items-center justify-center gap-1 border transition-colors ${
                columnsConfig.count === 0 
                  ? 'bg-red-900 border-red-800 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Quitar columnas"
            >
              ❌ Sin Col.
            </button>
          </div>

          {columnsConfig.count > 0 && (
            <>
              {/* Slider de Ancho de Tabla */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                  <span>ANCHO DE TABLA</span>
                  <span>{columnsConfig.width}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={columnsConfig.width}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    arrangeInColumns(columnsConfig.count, val, columnsConfig.height, columnsConfig.x, columnsConfig.y, columnsConfig.colors?.[0] || '#3b82f6');
                  }}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Slider de Alto de Tabla */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                  <span>ALTO DE TABLA</span>
                  <span>{columnsConfig.height}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={columnsConfig.height}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    arrangeInColumns(columnsConfig.count, columnsConfig.width, val, columnsConfig.x, columnsConfig.y, columnsConfig.colors?.[0] || '#3b82f6');
                  }}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Selector de Color de Tabla */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">COLOR BASE DE EQUIPOS</span>
                <div className="flex gap-1.5 flex-wrap">
                  {['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#64748b'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => arrangeInColumns(columnsConfig.count, columnsConfig.width, columnsConfig.height, columnsConfig.x, columnsConfig.y, c)}
                      className={`w-5 h-5 rounded-full border transition-transform ${
                        columnsConfig.colors?.[0] === c ? 'border-white scale-125' : 'border-slate-800 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={addAllPlayersToBoard}
            className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-black border border-slate-700 transition-colors block mt-2 text-center"
          >
            ➕ Añadir Todos
          </button>
        </div>

        {/* Listado de Jugadores */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Plantilla ({players.length})</span>
          </div>
          {loading ? (
            <span className="text-xs text-slate-500 block py-2">Cargando plantilla...</span>
          ) : players.length === 0 ? (
            <span className="text-xs text-slate-500 block py-2">No hay jugadores</span>
          ) : (
            <div className="space-y-1 pt-1.5">
              {players.map(p => {
                const formattedName = formatPlayerName(p);
                const isAlreadyAdded = boardItems.some(item => item.type === 'player' && item.text === formattedName);
                
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addPlayerToBoard(p)}
                    disabled={isAlreadyAdded}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs font-bold transition-all flex items-center justify-between ${
                      isAlreadyAdded
                        ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed border border-transparent'
                        : 'bg-slate-800 hover:bg-blue-600/20 text-slate-200 border border-slate-700/50 hover:border-blue-500/50'
                    }`}
                  >
                    <span>{formattedName}</span>
                    {!isAlreadyAdded && <span className="text-[10px] text-blue-400">➕</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Limpiar Pizarra */}
        <div className="p-3 border-t border-slate-800 bg-slate-950">
          <button
            type="button"
            onClick={clearBoard}
            className="w-full py-2 rounded-lg bg-red-950 hover:bg-red-900 text-red-400 hover:text-red-200 text-xs font-bold border border-red-900/50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 size={14} /> Vaciar pizarra
          </button>
        </div>
      </div>

      {/* Pizarra Táctica de Equipos */}
      <div className="flex-1 flex flex-col h-full bg-slate-900 relative overflow-hidden">
        
        {/* Canvas de la pizarra */}
        <div 
          ref={boardRef}
          className="flex-1 w-full h-full relative cursor-default"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            backgroundColor: '#0f172a'
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Draggable & Resizable Columns Table Window */}
          {/* Draggable & Resizable Columns Table Window */}
          {columnsConfig.count > 0 && (
            <div
              className="absolute border-2 rounded-2xl flex flex-col overflow-hidden bg-slate-900/90 shadow-2xl select-none"
              style={{
                left: `${columnsConfig.x}%`,
                top: `${columnsConfig.y}%`,
                width: `${columnsConfig.width}%`,
                height: `${columnsConfig.height}%`,
                borderColor: columnsConfig.colors?.[0] || '#3b82f6',
                zIndex: 5
              }}
            >
              {/* Header / Window Drag Handle */}
              <div 
                className="px-4 py-2 text-xs font-black uppercase tracking-wider text-center text-white flex items-center justify-between cursor-move shrink-0 select-none"
                style={{ backgroundColor: columnsConfig.colors?.[0] || '#3b82f6' }}
                onPointerDown={handleTableDragStart}
              >
                <span>📋 EQUIPOS ({columnsConfig.count} COL.)</span>
                <span className="text-[9px] opacity-75 font-bold">ARRASTRA DESDE AQUÍ</span>
              </div>

              {/* Columns container content */}
              <div className="flex-1 flex p-2 gap-2 overflow-hidden bg-slate-950/20">
                {Array.from({ length: columnsConfig.count }).map((_, i) => {
                  const colColor = columnsConfig.colors?.[i] || '#3b82f6';
                  return (
                    <div
                      key={i}
                      className="flex-1 border border-dashed rounded-xl flex flex-col pt-0 overflow-hidden"
                      style={{ borderColor: `${colColor}40` }}
                    >
                      {/* Header containing name input and color cycler */}
                      <div 
                        className="flex items-center px-1.5 py-0.5 justify-between gap-1 shadow-sm shrink-0 pointer-events-auto"
                        style={{ backgroundColor: colColor }}
                      >
                        <input
                          type="text"
                          value={columnsConfig.names?.[i] || `Equipo ${i + 1}`}
                          onChange={(e) => updateColumnName(i, e.target.value)}
                          className="flex-1 bg-transparent text-[9px] font-black uppercase tracking-widest text-white border-none outline-none focus:ring-0 px-1 py-0.5 min-w-0"
                          placeholder={`Equipo ${i + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => cycleColumnColor(i)}
                          className="w-3.5 h-3.5 rounded-full border border-white/30 flex items-center justify-center text-[7px] text-white hover:scale-110 active:scale-95 shrink-0 bg-black/25"
                          title="Cambiar color de columna"
                        >
                          🎨
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resize Handle in Bottom Right Corner */}
              <div
                className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-0.5 z-20 pointer-events-auto"
                onPointerDown={handleTableResizeStart}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" className="text-white/40 hover:text-white transition-colors">
                  <path d="M10,0 L0,10 M10,3 L3,10 M10,6 L6,10" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          )}

          {boardItems.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-500 gap-2">
              <span className="text-5xl">📋</span>
              <p className="text-sm font-black uppercase tracking-wider">Pizarra de Equipos / Anotaciones vacía</p>
              <p className="text-xs">Usa la barra lateral para añadir nombres de jugadores o notas de texto</p>
            </div>
          )}

          {/* Renderizado de items de la pizarra */}
          {boardItems.map(item => {
            const isSelected = selectedItemId === item.id;
            
            return (
              <div
                key={item.id}
                onPointerDown={(e) => handlePointerDown(e, item.id)}
                className={`absolute select-none px-3.5 py-2 rounded-xl text-sm font-black tracking-wide border shadow-2xl transition-all ${
                  item.type === 'player'
                    ? 'cursor-grab active:cursor-grabbing font-mono uppercase'
                    : 'cursor-grab active:cursor-grabbing font-sans'
                }`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  backgroundColor: isSelected ? '#1e293b' : '#1e293b/80',
                  borderColor: isSelected ? '#3b82f6' : item.color,
                  color: isSelected ? '#ffffff' : item.color,
                  borderWidth: isSelected ? '2px' : '1.5px',
                  boxShadow: isSelected ? '0 0 15px rgba(59, 130, 246, 0.4)' : '0 10px 25px rgba(0,0,0,0.5)',
                  transform: 'translate(-50%, -50%)',
                  zIndex: isSelected ? 50 : 10
                }}
              >
                {item.text}
              </div>
            );
          })}
        </div>

        {/* Barra de Controles de Elemento Seleccionado */}
        {selectedItem && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur border border-slate-800 rounded-xl p-2.5 flex items-center gap-3 shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-[60] animate-fade-in">
            <span className="text-[10px] font-black uppercase text-slate-400">Edición</span>
            
            {/* Cambiar Color */}
            <div className="flex gap-1.5 items-center">
              {['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#ffffff', '#e2e8f0'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateItemColor(selectedItem.id, c)}
                  className={`w-4 h-4 rounded-full border ${selectedItem.color === c ? 'border-blue-500 scale-125' : 'border-slate-700 hover:scale-105 transition-transform'}`}
                  style={{ backgroundColor: c }}
                  title="Cambiar Color"
                />
              ))}
            </div>

            <div className="w-px h-6 bg-slate-800" />

            {/* Eliminar Elemento */}
            <button
              type="button"
              onClick={() => removeItem(selectedItem.id)}
              className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
              title="Quitar de la pizarra"
            >
              <Trash2 className="w-3.5 h-3.5" /> Quitar
            </button>

            <button
              type="button"
              onClick={() => setSelectedItemId(null)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Deseleccionar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
