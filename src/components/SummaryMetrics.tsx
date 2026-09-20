import React from 'react';
import type { SimulationResult } from '../shared/types';

interface SummaryMetricsProps {
  result: SimulationResult | null;
}

const SummaryMetrics: React.FC<SummaryMetricsProps> = ({ result }) => {
  let firstFloodDisplay = "--";
  let floodedZonesDisplay = "--";
  let waterDrainedDisplay = "--";

  if (result) {
    if (result.earliestFloodTime !== null) {
      firstFloodDisplay = `${Math.round(result.earliestFloodTime / 60)} min`;
    } else {
      firstFloodDisplay = "No flooding";
    }
    
    floodedZonesDisplay = `${result.finalFloodedCellCount} / 64`;
    waterDrainedDisplay = `${result.totalDrainedVolume.toFixed(1)} m³`;
  }

  return (
    <div className="metrics-container">
      <div className="metric-card">
        <span className="metric-label">First Flooding</span>
        <span className="metric-value">
          {firstFloodDisplay}
        </span>
      </div>
      <div className="metric-card">
        <span className="metric-label">Flooded Zones</span>
        <span className="metric-value">
          {floodedZonesDisplay}
        </span>
      </div>
      <div className="metric-card">
        <span className="metric-label">Water Drained</span>
        <span className="metric-value">
          {waterDrainedDisplay}
        </span>
      </div>
    </div>
  );
};

export default SummaryMetrics;
