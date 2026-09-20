import React from 'react';
import type { DrainStatus } from '../App';

interface MapProps {
  drains: Record<string, DrainStatus>;
  selectedDrainId: string | null;
  onSelectDrain: (id: string) => void;
}

const Map: React.FC<MapProps> = ({ drains, selectedDrainId, onSelectDrain }) => {
  // Create an 8x8 grid
  const grid = Array.from({ length: 8 }, (_, row) => 
    Array.from({ length: 8 }, (_, col) => ({ row, col }))
  );

  const isRoad = (row: number, col: number) => {
    return row === 3 || col === 4;
  };

  // Fixed positions for drains in this demo map
  const drainPositions: Record<string, {row: number, col: number}> = {
    D1: { row: 3, col: 2 },
    D2: { row: 3, col: 6 },
    D3: { row: 6, col: 4 },
  };

  return (
    <div className="map-grid">
      {grid.flat().map(({ row, col }) => {
        const key = `${row}-${col}`;
        const road = isRoad(row, col);
        
        // Check if there's a drain here
        const drainEntry = Object.entries(drainPositions).find(
          ([_, pos]) => pos.row === row && pos.col === col
        );
        const drainId = drainEntry ? drainEntry[0] : null;

        return (
          <div 
            key={key} 
            className={`map-cell ${road ? 'road' : 'building'}`}
          >
            {drainId && drains[drainId] && (
              <button 
                className={`drain-marker ${drains[drainId].blocked ? 'blocked' : 'clear'}`}
                onClick={() => onSelectDrain(drainId)}
                title={`Drain ${drainId}`}
                style={{
                  outline: selectedDrainId === drainId ? '3px solid #2563eb' : 'none',
                  outlineOffset: '2px'
                }}
              >
                {drainId}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Map;
