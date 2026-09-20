import React from 'react';
import type { DrainStatus } from '../App';

interface DrainPanelProps {
  drains: Record<string, DrainStatus>;
  selectedDrainId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

const DrainPanel: React.FC<DrainPanelProps> = ({ drains, selectedDrainId, onSelect, onToggle }) => {
  return (
    <div className="panel">
      <h2>Drain Status</h2>
      <div className="drain-list">
        {Object.values(drains).map(drain => (
          <div 
            key={drain.id} 
            className={`drain-item ${selectedDrainId === drain.id ? 'selected' : ''}`}
            onClick={() => onSelect(drain.id)}
          >
            <div className="drain-status">
              <div className={`status-dot ${drain.blocked ? 'blocked' : 'clear'}`}></div>
              <span>{drain.label}</span>
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                {drain.blocked ? 'Blocked' : 'Clear'}
              </span>
            </div>
            <button 
              className="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(drain.id);
              }}
            >
              {drain.blocked ? 'Clear' : 'Block'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DrainPanel;
