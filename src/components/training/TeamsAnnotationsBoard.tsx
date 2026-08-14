import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { ensureContext } from '../../lib/dataService';
import { Plus, Trash2, Columns, LayoutGrid, X } from 'lucide-react';

interface TeamsAnnotationsBoardProps {
  value: string;
  onChange: (value: string) => void;
  undoTrigger?: number;
  clearTrigger?: number;
}

interface BoardItem {
  id: string;
  type: 'player' | 'annotation';
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  color: string;
  hasCustomColor?: boolean;
  tableId?: string;
  colIndex?: number;
}

interface TableConfig {
  id: string;
  count: number;
  width: number;
  height: number;
  x: number;
  y: number;
  colors: string[];
  names?: string[];
}

export function TeamsAnnotationsBoard({ value, onChange, undoTrigger = 0, clearTrigger = 0 }: TeamsAnnotationsBoardProps) {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const tablesRef = useRef<TableConfig[]>([]);
  const boardItemsRef = useRef<BoardItem[]>([]);

  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  useEffect(() => {
    boardItemsRef.current = boardItems;
  }, [boardItems]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  
  // History stack for Undo
  const [history, setHistory] = useState<{ items: BoardItem[]; tables: TableConfig[] }[]>([]);
  
  // For the player selector popup
  const [activeAssignTableId, setActiveAssignTableId] = useState<string | null>(null);
  const [activeAssignColIndex, setActiveAssignColIndex] = useState<number | null>(null);
  
  const [customText, setCustomText] = useState('');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const activeColor = '#3b82f6'; // default blue
  
  const boardRef = useRef<HTMLDivElement>(null);
  const dragItemRef = useRef<{ 
    id: string; 
    startX: number; 
    startY: number; 
    itemX: number; 
    itemY: number;
    items?: { id: string; initX: number; initY: number }[];
  } | null>(null);
  const tableActionRef = useRef<{ type: 'drag' | 'resize'; tableId: string; startX: number; startY: number; initX: number; initY: number; initW: number; initH: number } | null>(null);

  const pushHistory = (currentItems = boardItems, currentTables = tables) => {
    setHistory(prev => {
      const next = [...prev, { items: JSON.parse(JSON.stringify(currentItems)), tables: JSON.parse(JSON.stringify(currentTables)) }];
      if (next.length > 50) next.shift();
      return next;
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(prevHist => prevHist.slice(0, -1));
    setBoardItems(prev.items);
    setTables(prev.tables);
    saveItems(prev.items, prev.tables);
  };

  useEffect(() => {
    if (undoTrigger > 0) {
      handleUndo();
    }
  }, [undoTrigger]);

  useEffect(() => {
    if (clearTrigger > 0) {
      pushHistory();
      setBoardItems([]);
      setTables([]);
      saveItems([], []);
    }
  }, [clearTrigger]);

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

  // Parse board value ONLY ONCE on mount to prevent state race condition resets
  useEffect(() => {
    try {
      if (value) {
        const parsed = JSON.parse(value);
        if (parsed && parsed.teamsBoard) {
          const loadedItems = Array.isArray(parsed.teamsBoard.items) ? parsed.teamsBoard.items : [];
          let loadedTables = Array.isArray(parsed.teamsBoard.tables) ? parsed.teamsBoard.tables : [];
          
          if (loadedTables.length === 0 && parsed.teamsBoard.columnsConfig && parsed.teamsBoard.columnsConfig.count > 0) {
            // Migration for single table config
            const singleTable: TableConfig = {
              id: 'table-default',
              count: parsed.teamsBoard.columnsConfig.count ?? 0,
              width: parsed.teamsBoard.columnsConfig.width ?? 60,
              height: parsed.teamsBoard.columnsConfig.height ?? 50,
              x: parsed.teamsBoard.columnsConfig.x ?? 20,
              y: parsed.teamsBoard.columnsConfig.y ?? 20,
              colors: parsed.teamsBoard.columnsConfig.colors || [],
              names: parsed.teamsBoard.columnsConfig.names || []
            };
            
            if (singleTable.colors.length === 0) {
              singleTable.colors = Array.from({ length: singleTable.count }).map(() => '#000000');
            }
            if (!singleTable.names || singleTable.names.length === 0) {
              singleTable.names = Array.from({ length: singleTable.count }).map((_, idx) => `Equipo ${idx + 1}`);
            }
            loadedTables = [singleTable];
          }

          // Force column colors in loaded tables to default to black if they were blue
          loadedTables = loadedTables.map((tbl: any) => ({
            ...tbl,
            colors: tbl.colors?.map((col: string) => col === '#3b82f6' ? '#000000' : col) || Array.from({ length: tbl.count }).map(() => '#000000')
          }));

          // Realign immediately to resolve tableId/colIndex assignments!
          const aligned = realignItemsInColumns(loadedItems, loadedTables);
          setBoardItems(aligned);
          boardItemsRef.current = aligned;
          setTables(loadedTables);
          tablesRef.current = loadedTables;

          if (loadedTables.length > 0 && !selectedTableId) {
            setSelectedTableId(loadedTables[0].id);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing teams board value:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save board value
  const saveItems = (items: BoardItem[], currentTables = tables) => {
    try {
      const parsed = value ? JSON.parse(value) : {};
      const updated = {
        ...parsed,
        teamsBoard: {
          items,
          tables: currentTables
        }
      };
      onChange(JSON.stringify(updated));
    } catch {
      onChange(JSON.stringify({ teamsBoard: { items, tables: currentTables } }));
    }
  };

  const formatPlayerName = (player: any) => {
    if (!player) return '';
    const nameToUse = player.football_name || player.footballName || player.last_name || player.lastName || player.name || '';
    const clean = nameToUse.trim();
    if (!clean) return '';
    
    const words = clean.split(/\s+/);
    const particles = ['di', 'de', 'da', 'la', 'el', 'le', 'van', 'del', 'dos', 'von', 'der', 'san', 'al'];
    
    const resultWords = [];
    if (words.length > 0) {
      resultWords.push(words[0]);
      let i = 0;
      while (i < words.length - 1 && (particles.includes(words[i].toLowerCase()) || words[i].length <= 3)) {
        resultWords.push(words[i + 1]);
        i++;
      }
    }
    
    return resultWords.join(' ').toUpperCase();
  };

  // Add player to board
  const addPlayerToBoard = (player: any) => {
    const formattedName = formatPlayerName(player);
    const currentItems = boardItemsRef.current;

    pushHistory(currentItems, tablesRef.current);
    const newItem: BoardItem = {
      id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'player',
      text: formattedName,
      x: 10 + Math.random() * 20,
      y: 10 + Math.random() * 60,
      color: '#000000'
    };
    
    const updated = [...currentItems, newItem];
    const aligned = realignItemsInColumns(updated, tablesRef.current);
    setBoardItems(aligned);
    boardItemsRef.current = aligned;
    saveItems(aligned, tablesRef.current);
  };

  // Add all players to board
  const addAllPlayersToBoard = () => {
    const newItems: BoardItem[] = [];
    const currentItems = boardItemsRef.current;
    const currentTables = tablesRef.current;
    players.forEach((player, index) => {
      const formattedName = formatPlayerName(player);
      if (!currentItems.some(item => item.type === 'player' && item.text === formattedName)) {
        newItems.push({
          id: `pl-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'player',
          text: formattedName,
          x: 15 + (index % 4) * 20,
          y: 15 + Math.floor(index / 4) * 12,
          color: '#000000'
        });
      }
    });

    if (newItems.length > 0) {
      pushHistory(currentItems, currentTables);
      const updated = [...currentItems, ...newItems];
      const aligned = realignItemsInColumns(updated, currentTables);
      setBoardItems(aligned);
      boardItemsRef.current = aligned;
      saveItems(aligned, currentTables);
    }
  };

  const handlePasteTeams = (text: string, mode: 'replace' | 'add') => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    pushHistory();

    let newTables: TableConfig[] = [];
    let newItems: BoardItem[] = [];

    // Check if it is Excel-style (tab-separated columns)
    const hasTabs = lines.some(line => line.includes('\t'));

    if (hasTabs) {
      const grid = lines.map(line => line.split('\t').map(cell => cell.trim()));
      const colCount = Math.max(...grid.map(row => row.length));
      
      const colNames: string[] = [];
      const colPlayers: string[][] = Array.from({ length: colCount }).map(() => []);

      let startRow = 0;
      if (grid.length > 1 && grid[0].every(cell => !!cell && cell.length < 25)) {
        grid[0].forEach(cell => colNames.push(cell.toUpperCase()));
        startRow = 1;
      } else {
        for (let i = 0; i < colCount; i++) {
          colNames.push(`EQUIPO ${i + 1}`);
        }
      }

      for (let r = startRow; r < grid.length; r++) {
        grid[r].forEach((cell, colIdx) => {
          if (cell) {
            colPlayers[colIdx].push(cell);
          }
        });
      }

      const tableId = `table-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const tableWidth = Math.min(80, colCount * 22);
      const newTable: TableConfig = {
        id: tableId,
        count: colCount,
        width: tableWidth,
        height: 50,
        x: 10,
        y: 15,
        colors: Array.from({ length: colCount }).map(() => '#000000'),
        names: colNames
      };
      newTables.push(newTable);

      colPlayers.forEach((playersInCol, colIdx) => {
        playersInCol.forEach((pName, pIdx) => {
          newItems.push({
            id: `pl-${Date.now()}-${colIdx}-${pIdx}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'player',
            text: pName.toUpperCase(),
            x: newTable.x + colIdx * (tableWidth / colCount) + (tableWidth / colCount) / 2,
            y: newTable.y + 11 + pIdx * 5.2,
            color: '#000000',
            tableId: tableId,
            colIndex: colIdx
          });
        });
      });

    } else {
      const columns: { name: string; players: string[] }[] = [];
      let currentColumn: { name: string; players: string[] } | null = null;

      const headerRegex = /^(equipo|grupo|squad|team|peto|rojos|azules|verdes|amarillos|blancos|negros|gris|sin peto|con peto|petos)\b|:$/i;

      lines.forEach(line => {
        const isHeader = headerRegex.test(line) || line.endsWith(':');
        if (isHeader) {
          const name = line.replace(/:$/, '').trim();
          currentColumn = { name: name.toUpperCase(), players: [] };
          columns.push(currentColumn);
        } else {
          const splitByComma = line.split(',').map(p => p.trim()).filter(Boolean);
          if (splitByComma.length > 1) {
            if (!currentColumn) {
              currentColumn = { name: 'JUGADORES', players: [] };
              columns.push(currentColumn);
            }
            currentColumn.players.push(...splitByComma);
          } else {
            if (!currentColumn) {
              currentColumn = { name: 'JUGADORES', players: [] };
              columns.push(currentColumn);
            }
            currentColumn.players.push(line);
          }
        }
      });

      if (columns.length > 0) {
        const colCount = columns.length;
        const tableId = `table-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const tableWidth = Math.min(80, colCount * 22);
        const newTable: TableConfig = {
          id: tableId,
          count: colCount,
          width: tableWidth,
          height: 50,
          x: 10,
          y: 15,
          colors: Array.from({ length: colCount }).map(() => '#000000'),
          names: columns.map(c => c.name)
        };
        newTables.push(newTable);

        columns.forEach((col, colIdx) => {
          col.players.forEach((pName, pIdx) => {
            newItems.push({
              id: `pl-${Date.now()}-${colIdx}-${pIdx}-${Math.random().toString(36).substr(2, 5)}`,
              type: 'player',
              text: pName.toUpperCase(),
              x: newTable.x + colIdx * (tableWidth / colCount) + (tableWidth / colCount) / 2,
              y: newTable.y + 11 + pIdx * 5.2,
              color: '#000000',
              tableId: tableId,
              colIndex: colIdx
            });
          });
        });
      }
    }

    if (newTables.length === 0) return;

    if (mode === 'replace') {
      setTables(newTables);
      setBoardItems(newItems);
      saveItems(newItems, newTables);
      setSelectedTableId(newTables[0].id);
    } else {
      const shiftedTables = newTables.map((t, idx) => ({
        ...t,
        x: Math.min(80, 10 + tables.length * 15 + idx * 10),
        y: Math.min(60, 15 + tables.length * 10)
      }));
      
      const shiftedItems = newItems.map(item => {
        const tbl = shiftedTables.find(t => t.id === item.tableId);
        if (tbl && item.colIndex !== undefined) {
          const colWidth = tbl.width / tbl.count;
          const pIdx = Math.round((item.y - 15 - 11) / 5.2);
          return {
            ...item,
            x: tbl.x + item.colIndex * colWidth + colWidth / 2,
            y: tbl.y + 11 + (pIdx >= 0 ? pIdx : 0) * 5.2
          };
        }
        return item;
      });

      const nextTables = [...tables, ...shiftedTables];
      const nextItems = [...boardItems, ...shiftedItems];
      setTables(nextTables);
      setBoardItems(nextItems);
      saveItems(nextItems, nextTables);
    }
  };

  // Add custom annotation to board
  const addAnnotation = () => {
    if (!customText.trim()) return;
    const currentItems = boardItemsRef.current;
    pushHistory(currentItems, tablesRef.current);
    const newItem: BoardItem = {
      id: `an-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'annotation',
      text: customText.trim(),
      x: 30,
      y: 30,
      color: activeColor
    };
    
    const updated = [...currentItems, newItem];
    setBoardItems(updated);
    boardItemsRef.current = updated;
    saveItems(updated, tablesRef.current);
    setCustomText('');
  };

  // Add a new Table Config to the board
  const addTable = (count: number) => {
    pushHistory();
    const id = `table-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newTable: TableConfig = {
      id,
      count,
      width: 50,
      height: 40,
      x: 15 + Math.random() * 15,
      y: 15 + Math.random() * 15,
      colors: Array.from({ length: count }).map(() => '#000000'),
      names: Array.from({ length: count }).map(() => '')
    };
    
    const nextTables = [...tables, newTable];
    setTables(nextTables);
    setSelectedTableId(id);
    
    const aligned = realignItemsInColumns(boardItems, nextTables);
    setBoardItems(aligned);
    saveItems(aligned, nextTables);
  };

  // Update config of the selected table
  const updateSelectedTableConfig = (updater: (prev: TableConfig) => TableConfig) => {
    if (!selectedTableId) return;
    pushHistory();
    const nextTables = tables.map(t => t.id === selectedTableId ? updater(t) : t);
    setTables(nextTables);
    
    const oldTable = tables.find(t => t.id === selectedTableId);
    const newTable = nextTables.find(t => t.id === selectedTableId);
    const colorsChanged = oldTable && newTable && JSON.stringify(oldTable.colors) !== JSON.stringify(newTable.colors);

    let nextItems = boardItems;
    if (colorsChanged && newTable) {
      nextItems = boardItems.map(item => {
        const withinX = item.x >= newTable.x && item.x <= newTable.x + newTable.width;
        const withinY = item.y >= newTable.y && item.y <= newTable.y + newTable.height;
        if (withinX && withinY) {
          return { ...item, hasCustomColor: false };
        }
        return item;
      });
    }

    const aligned = realignItemsInColumns(nextItems, nextTables);
    setBoardItems(aligned);
    saveItems(aligned, nextTables);
  };

  // Update specific column name
  const updateColumnName = (tableId: string, colIndex: number, newName: string) => {
    pushHistory();
    const nextTables = tables.map(t => {
      if (t.id === tableId) {
        const currentNames = [...(t.names || [])];
        while (currentNames.length < t.count) {
          currentNames.push('');
        }
        currentNames[colIndex] = newName;
        return { ...t, names: currentNames };
      }
      return t;
    });
    setTables(nextTables);
    saveItems(boardItems, nextTables);
  };

  // cycle color for column
  const cycleColumnColor = (tableId: string, colIndex: number) => {
    pushHistory();
    const availableColors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#64748b'];
    const nextTables = tables.map(t => {
      if (t.id === tableId) {
        const currentColors = [...(t.colors || [])];
        while (currentColors.length < t.count) {
          currentColors.push('#3b82f6');
        }
        const currentColor = currentColors[colIndex] || '#3b82f6';
        const currentIndex = availableColors.indexOf(currentColor);
        const nextIndex = (currentIndex + 1) % availableColors.length;
        currentColors[colIndex] = availableColors[nextIndex];
        return { ...t, colors: currentColors };
      }
      return t;
    });

    setTables(nextTables);
    
    // update colors of items in this column
    const targetTable = nextTables.find(t => t.id === tableId);
    if (targetTable) {
      setBoardItems(items => {
        const updated = items.map(item => {
          const withinX = item.x >= targetTable.x && item.x <= targetTable.x + targetTable.width;
          const withinY = item.y >= targetTable.y && item.y <= targetTable.y + targetTable.height;
          if (withinX && withinY) {
            const relativeX = item.x - targetTable.x;
            const colIdx = Math.floor((relativeX / targetTable.width) * targetTable.count);
            const clampedIdx = Math.max(0, Math.min(targetTable.count - 1, colIdx));
            if (clampedIdx === colIndex) {
              return { ...item, color: targetTable.colors[colIndex], hasCustomColor: false };
            }
          }
          return item;
        });
        saveItems(updated, nextTables);
        return updated;
      });
    } else {
      saveItems(boardItems, nextTables);
    }
  };

  const getTableAssignment = (x: number, y: number, currentTables = tables) => {
    for (const t of currentTables) {
      const withinX = x >= t.x && x <= t.x + t.width;
      const withinY = y >= t.y && y <= t.y + t.height;
      if (withinX && withinY) {
        const relX = x - t.x;
        const colIdx = Math.floor((relX / t.width) * t.count);
        const clampedIndex = Math.max(0, Math.min(t.count - 1, colIdx));
        return { tableId: t.id, colIndex: clampedIndex };
      }
    }
    return { tableId: undefined, colIndex: undefined };
  };

  // Realign all players inside table window to snap to new coordinates
  const realignItemsInColumns = (currentItems: BoardItem[], currentTables = tables) => {
    if (currentTables.length === 0) {
      return currentItems.map(item => ({ ...item, tableId: undefined, colIndex: undefined }));
    }

    // Create buckets for each table and column
    const buckets: { [tableId: string]: BoardItem[][] } = {};
    currentTables.forEach(t => {
      buckets[t.id] = Array.from({ length: t.count }).map(() => []);
    });

    const freeItems: BoardItem[] = [];

    currentItems.forEach(item => {
      if (item.type === 'player') {
        let assigned = false;

        // If it already has an explicit table assignment, use it
        if (item.tableId) {
          const t = currentTables.find(tbl => tbl.id === item.tableId);
          if (t) {
            const colIdx = item.colIndex ?? 0;
            const clampedColIdx = Math.max(0, Math.min(t.count - 1, colIdx));
            buckets[t.id][clampedColIdx].push({ ...item, colIndex: clampedColIdx });
            assigned = true;
          }
        }

        // Fallback: evaluate coordinates dynamically (e.g. on load or initial drops)
        if (!assigned) {
          const assignment = getTableAssignment(item.x, item.y, currentTables);
          if (assignment.tableId) {
            const t = currentTables.find(tbl => tbl.id === assignment.tableId)!;
            buckets[t.id][assignment.colIndex!].push({
              ...item,
              tableId: t.id,
              colIndex: assignment.colIndex
            });
            assigned = true;
          }
        }

        if (!assigned) {
          freeItems.push({
            ...item,
            tableId: undefined,
            colIndex: undefined,
            color: item.hasCustomColor ? item.color : '#000000'
          });
        }
      } else {
        freeItems.push(item);
      }
    });

    const alignedColumnItems: BoardItem[] = [];
    currentTables.forEach(t => {
      buckets[t.id].forEach((bucket, colIdx) => {
        const sortedBucket = [...bucket].sort((a, b) => a.y - b.y);
        const colColor = t.colors?.[colIdx] || '#000000';
        const colWidth = t.width / t.count;
        
        sortedBucket.forEach((item, itemIdx) => {
          alignedColumnItems.push({
            ...item,
            x: t.x + colIdx * colWidth + colWidth / 2,
            y: t.y + 11 + itemIdx * 5.2, // row distance
            color: item.hasCustomColor ? item.color : colColor,
            tableId: t.id,
            colIndex: colIdx
          });
        });
      });
    });

    return [...freeItems, ...alignedColumnItems];
  };

  // Clear board
  const clearBoard = () => {
    if (window.confirm('¿Seguro que quieres vaciar la pizarra de Equipos y Anotaciones?')) {
      pushHistory();
      setBoardItems([]);
      setTables([]);
      saveItems([], []);
      setSelectedItemIds([]);
      setSelectedTableId(null);
    }
  };

  // Draggable table window handlers
  const handleTableDragStart = (e: React.PointerEvent, tableId: string) => {
    pushHistory();
    e.stopPropagation();
    setSelectedTableId(tableId);
    const table = tablesRef.current.find(t => t.id === tableId);
    if (!table || !boardRef.current) return;
    
    tableActionRef.current = {
      type: 'drag',
      tableId,
      startX: e.clientX,
      startY: e.clientY,
      initX: table.x,
      initY: table.y,
      initW: table.width,
      initH: table.height
    };
    boardRef.current.setPointerCapture(e.pointerId);
  };

  const handleTableResizeStart = (e: React.PointerEvent, tableId: string) => {
    pushHistory();
    e.stopPropagation();
    setSelectedTableId(tableId);
    const table = tablesRef.current.find(t => t.id === tableId);
    if (!table || !boardRef.current) return;

    tableActionRef.current = {
      type: 'resize',
      tableId,
      startX: e.clientX,
      startY: e.clientY,
      initX: table.x,
      initY: table.y,
      initW: table.width,
      initH: table.height
    };
    boardRef.current.setPointerCapture(e.pointerId);
  };

  // Selection marquee box pointer handler on background
  const handleBoardPointerDown = (e: React.PointerEvent) => {
    if (!boardRef.current) return;
    
    // Only start selection box if clicked directly on the canvas background
    if (e.target !== boardRef.current) return;
    
    e.preventDefault();
    pushHistory();
    
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
      setSelectedItemIds([]);
      setSelectedTableId(null);
    }
    
    const rect = boardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionBox({
      startX: x,
      startY: y,
      endX: x,
      endY: y
    });
    
    boardRef.current.setPointerCapture(e.pointerId);
  };

  // Drag handlers for items
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    pushHistory();
    e.stopPropagation();
    
    let nextSelected = [...selectedItemIds];
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedItemIds.includes(id)) {
        nextSelected = selectedItemIds.filter(x => x !== id);
      } else {
        nextSelected = [...selectedItemIds, id];
      }
    } else {
      if (!selectedItemIds.includes(id)) {
        nextSelected = [id];
      }
    }
    setSelectedItemIds(nextSelected);

    const item = boardItemsRef.current.find(i => i.id === id);
    if (!item || !boardRef.current) return;

    // Record start positions for all items that will be dragged together
    const dragStartItems = boardItemsRef.current
      .filter(i => nextSelected.includes(i.id))
      .map(i => ({
        id: i.id,
        initX: i.x,
        initY: i.y
      }));

    // Clear table assignments during drag so it can be recalculated on drop
    const nextItems = boardItemsRef.current.map(i => 
      nextSelected.includes(i.id) 
        ? { ...i, tableId: undefined, colIndex: undefined } 
        : i
    );
    setBoardItems(nextItems);
    boardItemsRef.current = nextItems;

    dragItemRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      itemX: item.x,
      itemY: item.y,
      items: dragStartItems
    };
    
    boardRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!boardRef.current) return;

    // Handle background selection marquee box
    if (selectionBox) {
      e.preventDefault();
      const rect = boardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setSelectionBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
      return;
    }

    // Handle table dragging/resizing
    if (tableActionRef.current) {
      e.preventDefault();
      const rect = boardRef.current.getBoundingClientRect();
      const w = rect.width || 1;
      const h = rect.height || 1;
      const deltaX = ((e.clientX - tableActionRef.current.startX) / w) * 100;
      const deltaY = ((e.clientY - tableActionRef.current.startY) / h) * 100;
      const tableId = tableActionRef.current.tableId;

      const targetTable = tablesRef.current.find(t => t.id === tableId);
      if (!targetTable) return;

      if (tableActionRef.current.type === 'drag') {
        const newX = Math.max(0, Math.min(100 - targetTable.width, tableActionRef.current.initX + deltaX));
        const newY = Math.max(0, Math.min(100 - targetTable.height, tableActionRef.current.initY + deltaY));
        
        const actualDeltaX = newX - targetTable.x;
        const actualDeltaY = newY - targetTable.y;

        const nextTables = tablesRef.current.map(t => t.id === tableId ? { ...t, x: newX, y: newY } : t);
        setTables(nextTables);
        tablesRef.current = nextTables;

        // Move players nested in this table relative to it
        if (actualDeltaX !== 0 || actualDeltaY !== 0) {
          const nextItems = boardItemsRef.current.map(item => {
            if (item.type === 'player' && item.tableId === tableId) {
              return { ...item, x: item.x + actualDeltaX, y: item.y + actualDeltaY };
            }
            return item;
          });
          setBoardItems(nextItems);
          boardItemsRef.current = nextItems;
        }
      } else if (tableActionRef.current.type === 'resize') {
        const newW = Math.max(20, Math.min(100 - targetTable.x, tableActionRef.current.initW + deltaX));
        const newH = Math.max(15, Math.min(100 - targetTable.y, tableActionRef.current.initH + deltaY));
        const nextTables = tablesRef.current.map(t => t.id === tableId ? { ...t, width: newW, height: newH } : t);
        setTables(nextTables);
        tablesRef.current = nextTables;
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

    const draggedItemsInfo = dragItemRef.current.items || [{ id: dragItemRef.current.id, initX: dragItemRef.current.itemX, initY: dragItemRef.current.itemY }];

    const nextItems = boardItemsRef.current.map(item => {
      const dragInfo = draggedItemsInfo.find(di => di.id === item.id);
      if (dragInfo) {
        return {
          ...item,
          x: Math.max(0, Math.min(95, dragInfo.initX + deltaX)),
          y: Math.max(0, Math.min(95, dragInfo.initY + deltaY))
        };
      }
      return item;
    });
    setBoardItems(nextItems);
    boardItemsRef.current = nextItems;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!boardRef.current) return;

    // Handle selection marquee box finish
    if (selectionBox) {
      boardRef.current.releasePointerCapture(e.pointerId);
      const rect = boardRef.current.getBoundingClientRect();
      const w = rect.width || 1;
      const h = rect.height || 1;
      
      const leftPct = (Math.min(selectionBox.startX, selectionBox.endX) / w) * 100;
      const rightPct = (Math.max(selectionBox.startX, selectionBox.endX) / w) * 100;
      const topPct = (Math.min(selectionBox.startY, selectionBox.endY) / h) * 100;
      const bottomPct = (Math.max(selectionBox.startY, selectionBox.endY) / h) * 100;
      
      const newlySelectedIds: string[] = [];
      boardItems.forEach(item => {
        if (item.x >= leftPct && item.x <= rightPct && item.y >= topPct && item.y <= bottomPct) {
          newlySelectedIds.push(item.id);
        }
      });
      
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        setSelectedItemIds(prev => Array.from(new Set([...prev, ...newlySelectedIds])));
      } else {
        setSelectedItemIds(newlySelectedIds);
      }
      setSelectionBox(null);
      return;
    }

    if (tableActionRef.current) {
      boardRef.current.releasePointerCapture(e.pointerId);
      tableActionRef.current = null;
      
      const currentItems = boardItemsRef.current;
      const currentTables = tablesRef.current;
      const aligned = realignItemsInColumns(currentItems, currentTables);
      setBoardItems(aligned);
      boardItemsRef.current = aligned;
      saveItems(aligned, currentTables);
      return;
    }

    if (!dragItemRef.current) return;
    boardRef.current.releasePointerCapture(e.pointerId);
    dragItemRef.current = null;

    const currentItems = boardItemsRef.current;
    const currentTables = tablesRef.current;
    const aligned = realignItemsInColumns(currentItems, currentTables);
    setBoardItems(aligned);
    boardItemsRef.current = aligned;
    saveItems(aligned, currentTables);
  };

  // Update item color (supports single or multi-selected items)
  // const updateItemColor = (id: string, color: string) => {
  //   pushHistory();
  //   const targets = selectedItemIds.includes(id) ? selectedItemIds : [id];
  //   const updated = boardItems.map(item => targets.includes(item.id) ? { ...item, color, hasCustomColor: true } : item);
  //   setBoardItems(updated);
  //   saveItems(updated);
  // };

  const updateSelectedItemsColor = (color: string) => {
    pushHistory();
    const updated = boardItems.map(item => selectedItemIds.includes(item.id) ? { ...item, color, hasCustomColor: true } : item);
    setBoardItems(updated);
    saveItems(updated);
  };

  // Remove item (supports single or multi-selected items)
  // const removeItem = (id: string) => {
  //   pushHistory();
  //   const targets = selectedItemIds.includes(id) ? selectedItemIds : [id];
  //   const updated = boardItems.filter(item => !targets.includes(item.id));
  //   setBoardItems(updated);
  //   saveItems(updated);
  //   setSelectedItemIds(prev => prev.filter(x => !targets.includes(x)));
  // };

  const removeSelectedItems = () => {
    pushHistory();
    const updated = boardItems.filter(item => !selectedItemIds.includes(item.id));
    setBoardItems(updated);
    saveItems(updated);
    setSelectedItemIds([]);
  };

  // const selectedItem = boardItems.find(i => selectedItemIds.includes(i.id));
  const selectedTable = tables.find(t => t.id === selectedTableId) || tables[0];

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
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Añadir Tabla de Equipos</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => addTable(1)}
              className="px-2 py-1.5 rounded text-[10px] font-black flex items-center justify-center gap-1 border bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 transition-colors"
              title="Añadir tabla de 1 columna"
            >
              <Columns size={12} /> +1 Col.
            </button>
            <button
              type="button"
              onClick={() => addTable(2)}
              className="px-2 py-1.5 rounded text-[10px] font-black flex items-center justify-center gap-1 border bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 transition-colors"
              title="Añadir tabla de 2 columnas"
            >
              <Columns size={12} /> +2 Col.
            </button>
            <button
              type="button"
              onClick={() => addTable(3)}
              className="px-2 py-1.5 rounded text-[10px] font-black flex items-center justify-center gap-1 border bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 transition-colors"
              title="Añadir tabla de 3 columnas"
            >
              <LayoutGrid size={12} /> +3 Col.
            </button>
            <button
              type="button"
              onClick={() => addTable(4)}
              className="px-2 py-1.5 rounded text-[10px] font-black flex items-center justify-center gap-1 border bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 transition-colors"
              title="Añadir tabla de 4 columnas"
            >
              <LayoutGrid size={12} /> +4 Col.
            </button>
          </div>

          {selectedTable && (
            <div className="pt-2 border-t border-slate-800/60 space-y-3">
              <span className="text-[9px] font-black text-blue-400 uppercase block">Editar tabla seleccionada</span>
              
              {/* Slider de Ancho de Tabla */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                  <span>ANCHO DE TABLA</span>
                  <span>{selectedTable.width}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={selectedTable.width}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateSelectedTableConfig(t => ({ ...t, width: val }));
                  }}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Slider de Alto de Tabla */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                  <span>ALTO DE TABLA</span>
                  <span>{selectedTable.height}%</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="100"
                  step="5"
                  value={selectedTable.height}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateSelectedTableConfig(t => ({ ...t, height: val }));
                  }}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Selector de Color de Tabla */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">COLOR BASE DE TABLA</span>
                <div className="flex gap-1.5 flex-wrap">
                  {['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#64748b'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateSelectedTableConfig(t => ({ ...t, colors: Array.from({ length: t.count }).map(() => c) }))}
                      className={`w-5 h-5 rounded-full border transition-transform ${
                        selectedTable.colors?.[0] === c ? 'border-white scale-125' : 'border-slate-800 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={addAllPlayersToBoard}
            className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-black border border-slate-700 transition-colors block mt-2 text-center cursor-pointer"
          >
            ➕ Añadir Todos los Jugadores
          </button>
          <button
            type="button"
            onClick={() => { setPasteText(''); setIsPasteModalOpen(true); }}
            className="w-full py-1.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-black border border-blue-500/30 transition-colors block mt-2 text-center cursor-pointer"
          >
            📋 Pegar Equipos / Tabla
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
                
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addPlayerToBoard(p)}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", formattedName);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs font-bold transition-all flex items-center justify-between cursor-grab active:cursor-grabbing bg-slate-800 hover:bg-blue-600/20 text-slate-200 border border-slate-700/50 hover:border-blue-500/50 cursor-pointer"
                  >
                    <span>{formattedName}</span>
                    <span className="text-[10px] text-blue-400">➕</span>
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
      <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
        
        {/* Canvas de la pizarra */}
        <div 
          ref={boardRef}
          className="flex-1 w-full h-full relative cursor-default border border-slate-100"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            backgroundColor: '#ffffff'
          }}
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!boardRef.current) return;
            const rect = boardRef.current.getBoundingClientRect();
            const dropX = ((e.clientX - rect.left) / rect.width) * 100;
            const dropY = ((e.clientY - rect.top) / rect.height) * 100;
            const name = e.dataTransfer.getData("text/plain");
            if (!name) return;
            
            const currentItems = boardItemsRef.current;
            const currentTables = tablesRef.current;
            
            pushHistory(currentItems, currentTables);
            const newItem: BoardItem = {
              id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              type: 'player',
              text: name,
              x: Math.max(0, Math.min(95, dropX)),
              y: Math.max(0, Math.min(95, dropY)),
              color: '#000000'
            };
            const updated = [...currentItems, newItem];
            const finalAligned = realignItemsInColumns(updated, currentTables);
            setBoardItems(finalAligned);
            boardItemsRef.current = finalAligned;
            saveItems(finalAligned, currentTables);
          }}
        >
          {/* Selection Box overlay */}
          {selectionBox && (
            <div 
              className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-50 border-dashed"
              style={{
                left: `${Math.min(selectionBox.startX, selectionBox.endX)}px`,
                top: `${Math.min(selectionBox.startY, selectionBox.endY)}px`,
                width: `${Math.abs(selectionBox.endX - selectionBox.startX)}px`,
                height: `${Math.abs(selectionBox.endY - selectionBox.startY)}px`
              }}
            />
          )}

          {/* Render all tables */}
          {tables.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTableId(t.id)}
              onPointerDown={(e) => handleTableDragStart(e, t.id)}
              className={`absolute flex flex-col overflow-visible select-none transition-all rounded-2xl border cursor-move bg-transparent ${
                selectedTableId === t.id ? 'border-blue-500/20 ring-1 ring-blue-500/10' : 'border-transparent'
              }`}
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                width: `${t.width}%`,
                height: `${t.height}%`,
                zIndex: selectedTableId === t.id ? 8 : 5
              }}
            >
              {/* Columns container content (no outer table header / borderless) */}
              <div className="flex-1 flex p-2 gap-2 overflow-hidden bg-transparent">
                {Array.from({ length: t.count }).map((_, i) => {
                  const colColor = t.colors?.[i] || '#000000';
                  const hasName = !!t.names?.[i];
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col pt-0 overflow-hidden bg-transparent"
                    >
                      {/* Header containing name input and color cycler - acts as drag handle */}
                      <div 
                        className="flex items-center px-1.5 py-0.5 justify-between gap-1 shadow-sm shrink-0 pointer-events-auto rounded-lg overflow-hidden transition-all cursor-move"
                        style={{ 
                          backgroundColor: hasName ? colColor : 'transparent',
                          border: hasName ? `1px solid ${colColor}` : '1px dashed transparent'
                        }}
                        onPointerDown={(e) => handleTableDragStart(e, t.id)}
                      >
                        <input
                          type="text"
                          value={t.names?.[i] || ''}
                          onChange={(e) => updateColumnName(t.id, i, e.target.value)}
                          onPointerDown={(e) => e.stopPropagation()}
                          className={`flex-1 bg-transparent text-[8.5px] font-black uppercase tracking-widest border-none outline-none focus:ring-0 px-1 py-0.5 min-w-0 ${
                            hasName ? 'text-white' : 'text-slate-800'
                          } placeholder-slate-400`}
                          placeholder="Añadir título..."
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAssignTableId(t.id);
                            setActiveAssignColIndex(i);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[7.5px] hover:scale-110 active:scale-95 shrink-0 font-bold transition-all ${
                            hasName
                              ? 'bg-black/25 text-white border-white/30'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 shadow-sm'
                          }`}
                          title="Asignar jugadores"
                        >
                          ➕
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleColumnColor(t.id, i);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[7.5px] hover:scale-110 active:scale-95 shrink-0 font-bold transition-all ${
                            hasName
                              ? 'bg-black/25 text-white border-white/30'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 shadow-sm'
                          }`}
                          title="Cambiar color de columna"
                        >
                          🎨
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resize Handle in Bottom Right Corner (Visible only when selected) */}
              {selectedTableId === t.id && (
                <div
                  className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-0.5 z-20 pointer-events-auto"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleTableResizeStart(e, t.id);
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" className="text-blue-500/60 hover:text-blue-500 transition-colors">
                    <path d="M10,0 L0,10 M10,3 L3,10 M10,6 L6,10" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
              )}
            </div>
          ))}

          {boardItems.length === 0 && tables.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-500 gap-2">
              <span className="text-5xl">📋</span>
              <p className="text-sm font-black uppercase tracking-wider">Pizarra de Equipos / Anotaciones vacía</p>
              <p className="text-xs">Usa la barra lateral para añadir notas de texto o tablas de equipos</p>
            </div>
          )}

          {/* Render board items (players & annotations) */}
          {boardItems.map(item => {
            const isSelected = selectedItemIds.includes(item.id);
            
            // Limit width if inside a table column to prevent name spilling
            let colWidthPercent = 90;
            if (item.type === 'player') {
              for (const t of tables) {
                const withinX = item.x >= t.x && item.x <= t.x + t.width;
                const withinY = item.y >= t.y && item.y <= t.y + t.height;
                if (withinX && withinY) {
                  colWidthPercent = (t.width / t.count) - 1.2;
                  break;
                }
              }
            }

            return (
              <div
                key={item.id}
                onPointerDown={(e) => handlePointerDown(e, item.id)}
                className={`absolute select-none text-[11px] font-extrabold tracking-wide transition-all text-center truncate ${
                  item.type === 'player'
                    ? 'cursor-grab active:cursor-grabbing font-mono uppercase whitespace-nowrap overflow-hidden px-1.5 py-0.5 rounded'
                    : 'cursor-grab active:cursor-grabbing font-sans max-w-[200px] whitespace-pre-wrap px-2 py-1 bg-slate-900/80 border border-slate-700 rounded-xl shadow-lg'
                }`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  width: undefined,
                  maxWidth: item.type === 'player' ? `calc(${colWidthPercent}% - 4px)` : '250px',
                  backgroundColor: item.type === 'player' ? (isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent') : undefined,
                  borderColor: item.type === 'player' ? (isSelected ? '#3b82f6' : 'transparent') : undefined,
                  color: isSelected ? '#ffffff' : item.color,
                  borderWidth: isSelected ? '1.5px' : '0px',
                  borderStyle: isSelected ? 'dashed' : 'none',
                  boxShadow: item.type === 'player' ? 'none' : undefined,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isSelected ? 50 : 10
                }}
                title={item.text}
              >
                {item.text}
              </div>
            );
          })}
        </div>

        {/* Barra de Controles de Elemento Seleccionado */}
        {selectedItemIds.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur border border-slate-800 rounded-xl p-2.5 flex items-center gap-3 shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-[60] animate-fade-in">
            <span className="text-[10px] font-black uppercase text-slate-400">Edición ({selectedItemIds.length})</span>
            
            {/* Cambiar Color */}
            <div className="flex gap-1.5 items-center">
              {['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#ffffff', '#e2e8f0'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateSelectedItemsColor(c)}
                  className="w-4 h-4 rounded-full border border-slate-700 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  title="Cambiar Color de Selección"
                />
              ))}
            </div>

            <div className="w-px h-6 bg-slate-800" />

            {/* Eliminar Elemento */}
            <button
              type="button"
              onClick={removeSelectedItems}
              className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
              title="Quitar seleccionados de la pizarra"
            >
              <Trash2 className="w-3.5 h-3.5" /> Quitar
            </button>

            <button
              type="button"
              onClick={() => setSelectedItemIds([])}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Deseleccionar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Pop up Player Assignment Selector */}
      {activeAssignTableId !== null && activeAssignColIndex !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-black uppercase tracking-wider">
                Asignar a {(tables.find(tbl => tbl.id === activeAssignTableId)?.names?.[activeAssignColIndex]) || `Grupo ${activeAssignColIndex + 1}`}
              </h3>
              <button type="button" onClick={() => { setActiveAssignTableId(null); setActiveAssignColIndex(null); }} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-3 pr-1 custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {players.map(p => {
                const formattedName = formatPlayerName(p);
                
                // check if currently inside this specific column of this specific table
                const isInThisCol = boardItems.some(item =>
                  item.type === 'player' &&
                  item.text === formattedName &&
                  item.tableId === activeAssignTableId &&
                  item.colIndex === activeAssignColIndex
                );

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const currentItems = boardItemsRef.current;
                      const currentTables = tablesRef.current;
                      pushHistory(currentItems, currentTables);

                      if (isInThisCol) {
                        const updated = currentItems.filter(item => !(
                          item.type === 'player' &&
                          item.text === formattedName &&
                          item.tableId === activeAssignTableId &&
                          item.colIndex === activeAssignColIndex
                        ));
                        setBoardItems(updated);
                        boardItemsRef.current = updated;
                        saveItems(updated, currentTables);
                      } else {
                        const targetT = currentTables.find(tbl => tbl.id === activeAssignTableId);
                        if (!targetT) return;

                        const colWidth = targetT.width / targetT.count;
                        const colColor = targetT.colors?.[activeAssignColIndex] || '#000000';
                        
                        // Count existing in this column
                        const columnItemsCount = currentItems.filter(item => 
                          item.type === 'player' && 
                          item.tableId === activeAssignTableId && 
                          item.colIndex === activeAssignColIndex
                        ).length;

                        const newItem: BoardItem = {
                          id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                          type: 'player',
                          text: formattedName,
                          x: targetT.x + activeAssignColIndex * colWidth + colWidth / 2,
                          y: targetT.y + 11 + columnItemsCount * 5.2,
                          color: colColor,
                          tableId: activeAssignTableId,
                          colIndex: activeAssignColIndex
                        };

                        const updated = [...currentItems, newItem];
                        setBoardItems(updated);
                        boardItemsRef.current = updated;
                        saveItems(updated, currentTables);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-extrabold transition-all flex items-center justify-between border cursor-pointer ${
                      isInThisCol
                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-800 border-slate-700/50 text-slate-200 hover:bg-slate-750 hover:border-slate-600'
                    }`}
                  >
                    <span>{formattedName}</span>
                    <span className="text-xs">{isInThisCol ? '✅' : '⬜'}</span>
                  </button>
                );
              })}
            </div>
            
            <button
              type="button"
              onClick={() => { setActiveAssignTableId(null); setActiveAssignColIndex(null); }}
              className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Pop up Paste Teams Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl flex flex-col text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                📋 Pegar Equipos y Jugadores
              </h3>
              <button type="button" onClick={() => setIsPasteModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="py-4 space-y-3">
              <p className="text-[11px] text-slate-400">
                Puedes pegar columnas directamente de un Excel, o copiar un texto del tipo:
              </p>
              <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[9px] text-slate-300 space-y-1.5 border border-slate-800">
                <div><strong>Opción A (Excel):</strong> Copia celdas/columnas de tu hoja y pégalas aquí.</div>
                <div><strong>Opción B (Lista con encabezados):</strong><br/>
                EQUIPO ROJO:<br/>
                Valeri, Silvano, Eletu<br/>
                EQUIPO AZUL:<br/>
                Pagliei, Zukic</div>
              </div>

              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Pega aquí tu lista o celdas de Excel..."
                rows={8}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 resize-none font-mono"
              />
            </div>
            
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handlePasteTeams(pasteText, 'replace');
                  setIsPasteModalOpen(false);
                }}
                disabled={!pasteText.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                Reemplazar Pizarra
              </button>
              <button
                type="button"
                onClick={() => {
                  handlePasteTeams(pasteText, 'add');
                  setIsPasteModalOpen(false);
                }}
                disabled={!pasteText.trim()}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Añadir al lado
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
