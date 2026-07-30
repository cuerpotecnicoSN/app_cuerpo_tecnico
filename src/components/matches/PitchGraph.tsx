import React, { useRef } from 'react';
import type { MatchDataPoint } from '../../components/types';

interface PitchGraphProps {
  onPitchClick?: (x: number, y: number) => void;
  events?: MatchDataPoint[];
  interactive?: boolean;
}

const PitchGraph: React.FC<PitchGraphProps> = ({ onPitchClick, events = [], interactive = true }) => {
  const pitchRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onPitchClick || !pitchRef.current) return;

    const rect = pitchRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    onPitchClick(Math.round(x), Math.round(y));
  };

  return (
    <div 
      ref={pitchRef}
      onClick={handleClick}
      style={{
        width: '100%',
        aspectRatio: '1.5',
        backgroundColor: '#4ade80', // Green pitch
        border: '2px solid white',
        position: 'relative',
        cursor: interactive ? 'crosshair' : 'default',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
      }}
    >
      {/* Pitch Lines */}
      {/* Center Line */}
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', backgroundColor: 'white', transform: 'translateX(-50%)' }} />
      {/* Center Circle */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: '15%', aspectRatio: '1', border: '2px solid white', borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: '4px', height: '4px', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />
      
      {/* Penalty Areas */}
      <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '15%', border: '2px solid white', borderLeft: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: '20%', bottom: '20%', width: '15%', border: '2px solid white', borderRight: 'none' }} />
      
      {/* Goal Areas */}
      <div style={{ position: 'absolute', left: 0, top: '35%', bottom: '35%', width: '5%', border: '2px solid white', borderLeft: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: '35%', bottom: '35%', width: '5%', border: '2px solid white', borderRight: 'none' }} />

      {/* Penalty Spots */}
      <div style={{ position: 'absolute', left: '11%', top: '50%', width: '4px', height: '4px', backgroundColor: 'white', borderRadius: '50%', transform: 'translateY(-50%)' }} />
      <div style={{ position: 'absolute', right: '11%', top: '50%', width: '4px', height: '4px', backgroundColor: 'white', borderRadius: '50%', transform: 'translateY(-50%)' }} />

      {/* Render Events */}
      {events.map((ev, idx) => {
        if (!ev.coordinates) return null;
        
        let color = 'white';
        if (ev.outcome === 'Success') color = '#3b82f6';
        if (ev.outcome === 'Failure') color = '#ef4444';
        
        return (
          <div 
            key={ev.id || idx}
            style={{
              position: 'absolute',
              left: `${ev.coordinates.x}%`,
              top: `${ev.coordinates.y}%`,
              width: '12px',
              height: '12px',
              backgroundColor: color,
              border: '2px solid white',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              pointerEvents: 'none' // Don't block clicks on the pitch
            }}
            title={`${ev.type} - ${ev.minute ?? ''}'`}
          />
        );
      })}
    </div>
  );
};

export default PitchGraph;
