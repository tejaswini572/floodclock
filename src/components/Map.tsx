import React, { useState } from 'react';
import type { DrainStatus } from '../App';

interface MapProps {
  drains: Record<string, DrainStatus>;
  selectedDrainId: string | null;
  onSelectDrain: (id: string) => void;
}

const Map: React.FC<MapProps> = ({ drains, selectedDrainId, onSelectDrain }) => {
  const [showGrid, setShowGrid] = useState(false);

  // 8x8 Grid definition
  const grid = Array.from({ length: 8 }, (_, row) => 
    Array.from({ length: 8 }, (_, col) => ({ row, col }))
  );

  const drainPositions: Record<string, {row: number, col: number}> = {
    D1: { row: 3, col: 2 },
    D2: { row: 3, col: 5 },
    D3: { row: 6, col: 4 },
  };

  const getDrainColor = (id: string) => {
    if (!drains[id]) return '#94a3b8';
    return drains[id].blocked ? '#ef4444' : '#10b981';
  };

  return (
    <div className="map-wrapper">
      <div className="map-controls">
        <label className="grid-toggle">
          <input 
            type="checkbox" 
            checked={showGrid} 
            onChange={(e) => setShowGrid(e.target.checked)} 
          />
          Show Grid
        </label>
        <div className="map-legend">
          <span className="legend-item"><span className="legend-color school-color"></span> School</span>
          <span className="legend-item"><span className="legend-color clinic-color"></span> Clinic</span>
          <span className="legend-item"><span className="legend-color park-color"></span> Park</span>
        </div>
      </div>
      
      <div className="svg-container">
        <svg viewBox="0 0 800 800" className="ward-map">
          {/* Background */}
          <rect width="800" height="800" fill="#fdfbf7" />

          {/* River (Right edge cols 6, 7) */}
          <path d="M 650 0 C 670 200, 620 400, 680 600 S 650 800, 650 800 L 800 800 L 800 0 Z" fill="#bae6fd" />
          <text x="730" y="400" fill="#0284c7" fontWeight="bold" transform="rotate(90 730 400)">Flood River</text>

          {/* Park (Upper right, col 4,5 row 0,1) */}
          <rect x="420" y="20" width="160" height="160" rx="8" fill="#dcfce7" />
          <text x="500" y="105" textAnchor="middle" fill="#166534" fontWeight="bold">Park</text>

          {/* Roads */}
          <rect x="0" y="320" width="800" height="60" fill="#e2e8f0" /> {/* Main horizontal */}
          <rect x="420" y="0" width="60" height="800" fill="#e2e8f0" /> {/* Main vertical */}
          <rect x="220" y="0" width="40" height="800" fill="#e2e8f0" /> {/* Minor vertical */}

          {/* School (Upper left) */}
          <rect x="40" y="40" width="140" height="120" rx="4" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
          <text x="110" y="105" textAnchor="middle" fill="#854d0e" fontWeight="bold">School</text>

          {/* Clinic (Lower left) */}
          <rect x="40" y="640" width="100" height="100" rx="4" fill="#fee2e2" stroke="#dc2626" strokeWidth="2" />
          <text x="90" y="695" textAnchor="middle" fill="#991b1b" fontWeight="bold">Clinic</text>
          <path d="M 80 655 L 100 655 L 100 645 L 80 645 Z" fill="#dc2626" />
          <path d="M 85 640 L 95 640 L 95 670 L 85 670 Z" fill="#dc2626" />

          {/* Generic blocks (residential/commercial) */}
          <rect x="30" y="200" width="60" height="60" rx="4" fill="#f1f5f9" />
          <rect x="110" y="200" width="60" height="60" rx="4" fill="#f1f5f9" />
          <rect x="30" y="420" width="80" height="60" rx="4" fill="#f1f5f9" />
          <rect x="130" y="420" width="80" height="60" rx="4" fill="#f1f5f9" />
          <rect x="300" y="100" width="80" height="80" rx="4" fill="#f1f5f9" />
          <rect x="300" y="220" width="80" height="60" rx="4" fill="#f1f5f9" />
          <rect x="300" y="420" width="80" height="120" rx="4" fill="#f1f5f9" />
          <rect x="300" y="580" width="80" height="80" rx="4" fill="#f1f5f9" />
          <rect x="520" y="240" width="80" height="60" rx="4" fill="#f1f5f9" />
          <rect x="520" y="420" width="80" height="80" rx="4" fill="#f1f5f9" />
          <rect x="520" y="560" width="80" height="80" rx="4" fill="#f1f5f9" />
          <rect x="520" y="680" width="80" height="80" rx="4" fill="#f1f5f9" />

          {/* Flood Overlay (Invisible for now, prepares for integration) */}
          <g className="flood-overlay" style={{ pointerEvents: 'none', opacity: 0 }}>
            {grid.flat().map(({ row, col }) => (
              <rect 
                key={`flood-${row}-${col}`}
                x={col * 100} 
                y={row * 100} 
                width="100" 
                height="100" 
                fill="#3b82f6" 
                opacity="0.4" 
              />
            ))}
          </g>

          {/* Grid Overlay */}
          {showGrid && (
            <g className="grid-overlay" style={{ pointerEvents: 'none' }}>
              {grid.flat().map(({ row, col }) => (
                <rect 
                  key={`grid-${row}-${col}`}
                  x={col * 100} 
                  y={row * 100} 
                  width="100" 
                  height="100" 
                  fill="none" 
                  stroke="#94a3b8" 
                  strokeWidth="1" 
                  strokeDasharray="4 4"
                />
              ))}
              {grid.flat().map(({ row, col }) => (
                <text 
                  key={`coord-${row}-${col}`}
                  x={col * 100 + 5} 
                  y={row * 100 + 15} 
                  fontSize="10" 
                  fill="#64748b"
                >
                  {row},{col}
                </text>
              ))}
            </g>
          )}
        </svg>

        {/* Drain Markers */}
        {Object.entries(drainPositions).map(([id, pos]) => {
          const drain = drains[id];
          if (!drain) return null;
          
          const leftPercent = ((pos.col * 100 + 50) / 800) * 100;
          const topPercent = ((pos.row * 100 + 50) / 800) * 100;
          const isSelected = selectedDrainId === id;

          return (
            <button
              key={id}
              className="map-drain-marker"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                backgroundColor: getDrainColor(id),
                outline: isSelected ? '4px solid #3b82f6' : 'none',
                outlineOffset: '2px',
                zIndex: isSelected ? 10 : 5
              }}
              onClick={() => onSelectDrain(id)}
              aria-label={`${id} - ${drain.blocked ? 'Blocked' : 'Clear'}`}
            >
              {id}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Map;
