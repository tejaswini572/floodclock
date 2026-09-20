import { useState } from 'react';
import './App.css';
import Map from './components/Map';
import DrainPanel from './components/DrainPanel';
import SummaryMetrics from './components/SummaryMetrics';

export type DrainStatus = {
  id: string;
  blocked: boolean;
};

function App() {
  const [rainfall, setRainfall] = useState(85);
  const [drains, setDrains] = useState<Record<string, DrainStatus>>({
    D1: { id: 'D1', blocked: true },
    D2: { id: 'D2', blocked: true },
    D3: { id: 'D3', blocked: false },
  });
  const [selectedDrainId, setSelectedDrainId] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const handleDrainToggle = (id: string) => {
    setDrains(prev => ({
      ...prev,
      [id]: { ...prev[id], blocked: !prev[id].blocked }
    }));
    setHasRun(false); // invalidate results
  };

  const resetState = () => {
    setRainfall(85);
    setDrains({
      D1: { id: 'D1', blocked: true },
      D2: { id: 'D2', blocked: true },
      D3: { id: 'D3', blocked: false },
    });
    setSelectedDrainId(null);
    setHasRun(false);
  };

  const runSimulation = () => {
    setHasRun(true);
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
                setHasRun(false);
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
          <Map drains={drains} selectedDrainId={selectedDrainId} onSelectDrain={setSelectedDrainId} />
        </div>
        
        <aside className="sidebar">
          <div className="panel">
            <h2>Recommendations</h2>
            <p>
              {hasRun 
                ? "Simulation engine pending integration." 
                : "Run the simulation to compare drain-clearing options."}
            </p>
          </div>

          <DrainPanel 
            drains={drains} 
            selectedDrainId={selectedDrainId}
            onSelect={setSelectedDrainId}
            onToggle={handleDrainToggle}
          />

          <button className="primary-button" onClick={runSimulation}>
            {hasRun ? "Simulation engine pending integration" : "Run Simulation"}
          </button>
        </aside>
      </main>

      <SummaryMetrics hasRun={hasRun} />

      <footer className="footer">
        <p>This is a synthetic model for demonstration purposes. Not for real-world flood prediction.</p>
      </footer>
    </div>
  );
}

export default App;
