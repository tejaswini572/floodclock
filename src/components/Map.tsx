import React, { useState } from 'react';
import type { DrainStatus } from '../App';
import type { CellResult, Ward } from '../shared/types';

interface MapProps {
  drains: Record<string, DrainStatus>;
  selectedDrainId: string | null;
  onSelectDrain: (id: string) => void;
  cellResults: readonly CellResult[] | null;
  ward: Ward;
}

const Map: React.FC<MapProps> = ({ drains, selectedDrainId, onSelectDrain, cellResults, ward }) => {
  const [showGrid, setShowGrid] = useState(false);

  const getDrainColor = (id: string) => {
    if (!drains[id]) return '#94a3b8';
    return drains[id].blocked ? '#ef4444' : '#10b981';
  };

  // Convert cellResults array to a map by cellId for easy lookup
  const resultMap = React.useMemo(() => {
    if (!cellResults) return null;
    const map = new globalThis.Map<string, CellResult>();
    for (const res of cellResults) {
      map.set(res.cellId, res);
    }
    return map;
  }, [cellResults]);

  // Determine flood visual based on final depth and 0.05 threshold
  const getFloodStyle = (cellId: string) => {
    if (!resultMap) return { opacity: 0, fill: '#3b82f6' };
    const res = resultMap.get(cellId);
    if (!res || res.finalDepth < 0.01) return { opacity: 0, fill: '#3b82f6' };
    
    // Very subtle if below threshold but has some water
    if (res.finalDepth < 0.05) {
      return { opacity: 0.15, fill: '#60a5fa' }; 
    }
    // Moderate if just above threshold
    if (res.finalDepth < 0.15) {
      return { opacity: 0.4, fill: '#3b82f6' };
    }
    // Severe
    return { opacity: 0.5, fill: '#d97706' }; // amber
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
          <rect x="0" y="320" width="800" height="60" fill="#e2e8f0" />
          <rect x="420" y="0" width="60" height="800" fill="#e2e8f0" />
          <rect x="220" y="0" width="40" height="800" fill="#e2e8f0" />

          {/* School (Upper left) */}
          <rect x="40" y="40" width="140" height="120" rx="4" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
          <text x="110" y="105" textAnchor="middle" fill="#854d0e" fontWeight="bold">School</text>

          {/* Clinic (Lower left) */}
          <rect x="40" y="640" width="100" height="100" rx="4" fill="#fee2e2" stroke="#dc2626" strokeWidth="2" />
          <text x="90" y="695" textAnchor="middle" fill="#991b1b" fontWeight="bold">Clinic</text>
          <path d="M 80 655 L 100 655 L 100 645 L 80 645 Z" fill="#dc2626" />
          <path d="M 85 640 L 95 640 L 95 670 L 85 670 Z" fill="#dc2626" />

          {/* Generic blocks */}
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

          {/* Flood Overlay */}
          <g className="flood-overlay" style={{ pointerEvents: 'none' }}>
            {ward.cells.map((cell) => {
              const { fill, opacity } = getFloodStyle(cell.id);
              return (
                <rect 
                  key={`flood-${cell.id}`}
                  x={cell.col * 100} 
                  y={cell.row * 100} 
                  width="100" 
                  height="100" 
                  fill={fill} 
                  opacity={opacity}
                  style={{ transition: 'all 0.3s ease' }}
                />
              );
            })}
          </g>

          {/* Grid Overlay */}
          {showGrid && (
            <g className="grid-overlay" style={{ pointerEvents: 'none' }}>
              {ward.cells.map((cell) => (
                <rect 
                  key={`grid-${cell.id}`}
                  x={cell.col * 100} 
                  y={cell.row * 100} 
                  width="100" 
                  height="100" 
                  fill="none" 
                  stroke="#94a3b8" 
                  strokeWidth="1" 
                  strokeDasharray="4 4"
                />
              ))}
              {ward.cells.map((cell) => (
                <text 
                  key={`coord-${cell.id}`}
                  x={cell.col * 100 + 5} 
                  y={cell.row * 100 + 15} 
                  fontSize="10" 
                  fill="#64748b"
                >
                  {cell.row},{cell.col}
                </text>
              ))}
            </g>
          )}
        </svg>

        {/* Drain Markers */}
        {ward.drains.map((drainModel) => {
          const drainId = drainModel.id;
          const drain = drains[drainId];
          if (!drain) return null;
          
          const cell = ward.cells.find(c => c.id === drainModel.cellId);
          if (!cell) return null;

          const leftPercent = ((cell.col * 100 + 50) / 800) * 100;
          const topPercent = ((cell.row * 100 + 50) / 800) * 100;
          const isSelected = selectedDrainId === drainId;

          return (
            <button
              key={drainId}
              className="map-drain-marker"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                backgroundColor: getDrainColor(drainId),
                outline: isSelected ? '4px solid #3b82f6' : 'none',
                outlineOffset: '2px',
                zIndex: isSelected ? 10 : 5
              }}
              onClick={() => onSelectDrain(drainId)}
              aria-label={`${drain.label} - ${drain.blocked ? 'Blocked' : 'Clear'}`}
            >
              {drain.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Map;
