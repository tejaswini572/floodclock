import React from 'react';

interface SummaryMetricsProps {
  hasRun: boolean;
}

const SummaryMetrics: React.FC<SummaryMetricsProps> = ({ hasRun }) => {
  return (
    <div className="metrics-container">
      <div className="metric-card">
        <span className="metric-label">First Flooding</span>
        <span className="metric-value">
          {hasRun ? "Engine Pending" : "--"}
        </span>
      </div>
      <div className="metric-card">
        <span className="metric-label">Flooded Zones</span>
        <span className="metric-value">
          {hasRun ? "Engine Pending" : "--"}
        </span>
      </div>
      <div className="metric-card">
        <span className="metric-label">Water Drained</span>
        <span className="metric-value">
          {hasRun ? "Engine Pending" : "--"}
        </span>
      </div>
    </div>
  );
};

export default SummaryMetrics;
