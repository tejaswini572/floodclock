import { useState } from 'react';
import './App.css';
import Map from './components/Map';
import DrainPanel from './components/DrainPanel';
import SummaryMetrics from './components/SummaryMetrics';
import { demoWard } from './simulation/ward';
import { simulate, compareDrains } from './simulation/engine';
import type { SimulationInput, SimulationResult, DrainComparison } from './shared/types';

export type DrainStatus = {
  id: string;
  label: string;
  blocked: boolean;
};

function App() {
  const [rainfall, setRainfall] = useState(85);
  const [drains, setDrains] = useState<Record<string, DrainStatus>>({
    'drain-a': { id: 'drain-a', label: 'D1', blocked: true },
    'drain-b': { id: 'drain-b', label: 'D2', blocked: true },
    'drain-c': { id: 'drain-c', label: 'D3', blocked: false },
  });
  const [selectedDrainId, setSelectedDrainId] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [comparisons, setComparisons] = useState<DrainComparison[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidateResults = () => {
    setSimResult(null);
    setComparisons(null);
    setError(null);
  };

  const handleDrainToggle = (id: string) => {
    setDrains(prev => ({
      ...prev,
      [id]: { ...prev[id], blocked: !prev[id].blocked }
    }));
    invalidateResults();
  };

  const resetState = () => {
    setRainfall(85);
    setDrains({
      'drain-a': { id: 'drain-a', label: 'D1', blocked: true },
      'drain-b': { id: 'drain-b', label: 'D2', blocked: true },
      'drain-c': { id: 'drain-c', label: 'D3', blocked: false },
    });
    setSelectedDrainId(null);
    invalidateResults();
  };

  const runSimulation = () => {
    setError(null);
    try {
      const blockedDrainIds = Object.values(drains)
        .filter(d => d.blocked)
        .map(d => d.id);

      const input: SimulationInput = {
        ward: demoWard,
        rainfallRate: rainfall,
        duration: 3600,
        timeStep: 10,
        blockedDrainIds,
        floodThreshold: 0.05,
      };

      const result = simulate(input);
      const comps = compareDrains(input);
      setSimResult(result);
      setComparisons(comps);
    } catch (err: any) {
      setError(err.message || 'Simulation failed');
      setSimResult(null);
      setComparisons(null);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <span className="badge">Synthetic Demo</span>
          <h1>See where water builds up.</h1>
          <p>Adjust the rainfall and clear drains to see the impact.</p>
          
          <div className="slider-container">
            <div className="slider-header">
              <label htmlFor="rainfall">Rainfall intensity</label>
              <span>{rainfall} mm/hour</span>
            </div>
            <input 
              id="rainfall"
              type="range" 
              min="0" 
              max="150" 
              value={rainfall} 
              onChange={(e) => {
                setRainfall(Number(e.target.value));
                invalidateResults();
              }} 
            />
          </div>
        </div>
        <div>
          <button className="button" onClick={resetState}>Reset Scenario</button>
        </div>
      </header>

      <main className="main-content">
        <div className="map-container">
          <Map 
            drains={drains} 
            selectedDrainId={selectedDrainId} 
            onSelectDrain={setSelectedDrainId} 
            cellResults={simResult?.cellResults || null}
            ward={demoWard}
          />
        </div>
        
        <aside className="sidebar">
          <div className="panel">
            <h2>Recommendations</h2>
            {error ? (
              <p style={{ color: 'red' }}>{error}</p>
            ) : !simResult ? (
              <p>Run the simulation to compare drain-clearing options.</p>
            ) : comparisons && comparisons.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {comparisons.map(comp => {
                  const label = drains[comp.clearedDrainId]?.label || comp.clearedDrainId;
                  const delta = comp.deltaFinalFloodedCellCount;
                  let text = 'no change in flooded zones';
                  if (delta < 0) {
                    text = `${Math.abs(delta)} fewer flooded zone${Math.abs(delta) !== 1 ? 's' : ''}`;
                  } else if (delta > 0) {
                    text = `${delta} more flooded zone${delta !== 1 ? 's' : ''}`;
                  }
                  return (
                    <li key={comp.clearedDrainId} style={{ marginBottom: '8px' }}>
                      <strong>{label}:</strong> {text}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No drains are currently blocked. No counterfactuals to run.</p>
            )}
          </div>

          <DrainPanel 
            drains={drains} 
            selectedDrainId={selectedDrainId}
            onSelect={setSelectedDrainId}
            onToggle={handleDrainToggle}
          />

          <button className="primary-button" onClick={runSimulation}>
            Run Simulation
          </button>
        </aside>
      </main>

      <SummaryMetrics result={simResult} />

      <footer className="footer">
        <p>This is a synthetic model for demonstration purposes. Not for real-world flood prediction.</p>
      </footer>
    </div>
  );
}

export default App;
