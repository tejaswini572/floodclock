import type { SimulationInput, SimulationResult, CellResult, Cell, DrainComparison } from '../shared/types';

/**
 * Routing fraction coefficient: at most 25% of stored surface water in a cell
 * can be transferred outward during a single timestep.
 */
const ROUTING_FRACTION = 0.25;

/**
 * Numerical safety threshold for floating-point precision comparisons.
 */
const EPSILON = 1e-12;

/**
 * Pure, deterministic surface-water simulation engine for FloodClock.
 * 
 * MODEL DISCLAIMER & ASSUMPTIONS:
 * This simulation is a simplified illustrative surface-water model built for a hackathon prototype.
 * It is NOT a full 2D hydrodynamic hydraulic model, validated flood forecast, or real-world urban
 * drainage network model. Key simplifying assumptions include:
 * 1. Uniform constant rainfall rate applied across all grid cells.
 * 2. Simplified cell-to-cell transfer driven by total surface hydraulic head (elevation + water depth).
 * 3. 4-orthogonal neighbor routing with conservative volume fraction caps.
 * 4. Closed domain boundaries (water cannot exit grid edges; drains are sole outlets).
 * 5. Instantaneous, capacity-capped drain removal without pipe network backwater effects.
 * 
 * @param input Complete simulation scenario inputs.
 * @returns Deterministic simulation output results.
 */
export function simulate(input: SimulationInput): SimulationResult {
  validateInput(input);

  const { ward, rainfallRate, duration, timeStep, blockedDrainIds, floodThreshold } = input;
  const { rows, cols, cellArea, cells, drains } = ward;
  const totalCells = cells.length;

  // Build cell lookups for efficient 4-neighbor spatial routing
  const cellMap = new Map<string, Cell>();
  const cellIndexMap = new Map<string, number>();
  const grid: (Cell | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));

  for (let i = 0; i < totalCells; i++) {
    const cell = cells[i];
    cellMap.set(cell.id, cell);
    cellIndexMap.set(cell.id, i);
    grid[cell.row][cell.col] = cell;
  }

  // Build 4-orthogonal neighbor lists per cell index
  const neighborsList: number[][] = new Array(totalCells);
  for (let i = 0; i < totalCells; i++) {
    const cell = cells[i];
    const r = cell.row;
    const c = cell.col;
    const neighbors: number[] = [];

    // Orthogonal directions: North, South, East, West
    const candidates = [
      { r: r - 1, c: c },
      { r: r + 1, c: c },
      { r: r, c: c + 1 },
      { r: r, c: c - 1 },
    ];

    for (const cand of candidates) {
      if (cand.r >= 0 && cand.r < rows && cand.c >= 0 && cand.c < cols) {
        const nCell = grid[cand.r][cand.c];
        if (nCell) {
          const nIdx = cellIndexMap.get(nCell.id);
          if (nIdx !== undefined) {
            neighbors.push(nIdx);
          }
        }
      }
    }
    neighborsList[i] = neighbors;
  }

  // Blocked drains set for fast lookup
  const blockedDrainSet = new Set(blockedDrainIds);

  // Internal mutable simulation state
  const volumes = new Float64Array(totalCells); // Initial surface volume is ZERO m³
  const peakDepths = new Float64Array(totalCells);
  const firstFloodTimes: (number | null)[] = new Array(totalCells).fill(null);

  let totalRainfallVolume = 0;
  let totalDrainedVolume = 0;
  let peakFloodedCellCount = 0;

  // Rainfall volume added to EACH cell per timestep (m³)
  const rainfallMps = rainfallRate / 1000 / 3600; // mm/h -> m/s
  const rainVolumePerCell = rainfallMps * cellArea * timeStep;

  const totalSteps = Math.round(duration / timeStep);

  // Run simulation timesteps (t = timeStep, 2*timeStep, ... duration)
  for (let step = 1; step <= totalSteps; step++) {
    const currentTime = step * timeStep;

    // ------------------------------------------------------------------------
    // Step 1: Add constant rainfall to every cell
    // ------------------------------------------------------------------------
    if (rainVolumePerCell > 0) {
      for (let i = 0; i < totalCells; i++) {
        volumes[i] += rainVolumePerCell;
      }
      totalRainfallVolume += rainVolumePerCell * totalCells;
    }

    // ------------------------------------------------------------------------
    // Step 2: Route surface water between neighboring cells
    // ------------------------------------------------------------------------
    // Snapshot state before calculating transfers to eliminate cell iteration order bias
    const snapshotVolumes = new Float64Array(volumes);
    const snapshotSurfaceHeights = new Float64Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      const depth = snapshotVolumes[i] / cellArea;
      snapshotSurfaceHeights[i] = cells[i].elevation + depth;
    }

    // Compute outgoing transfers from snapshot
    const netVolumeChanges = new Float64Array(totalCells);

    for (let i = 0; i < totalCells; i++) {
      const sourceVol = snapshotVolumes[i];
      if (sourceVol <= EPSILON) continue;

      const sourceHead = snapshotSurfaceHeights[i];
      const nIndices = neighborsList[i];

      // Identify neighbors with strictly lower snapshot surface height
      let sumPositiveDiffs = 0;
      const lowerNeighbors: { index: number; diff: number }[] = [];

      for (const nIdx of nIndices) {
        const neighborHead = snapshotSurfaceHeights[nIdx];
        const diff = sourceHead - neighborHead;
        if (diff > EPSILON) {
          lowerNeighbors.push({ index: nIdx, diff });
          sumPositiveDiffs += diff;
        }
      }

      if (lowerNeighbors.length === 0 || sumPositiveDiffs <= EPSILON) continue;

      // Routable volume capped at 25% of source's snapshot volume
      const routableVolume = sourceVol * ROUTING_FRACTION;

      // Distribute volume proportionally to head difference
      for (const lower of lowerNeighbors) {
        const share = lower.diff / sumPositiveDiffs;
        const transfer = routableVolume * share;

        netVolumeChanges[i] -= transfer;
        netVolumeChanges[lower.index] += transfer;
      }
    }

    // Apply all surface water routing transfers simultaneously
    for (let i = 0; i < totalCells; i++) {
      const newVol = snapshotVolumes[i] + netVolumeChanges[i];

      if (newVol < 0) {
        if (newVol >= -EPSILON) {
          volumes[i] = 0;
        } else {
          throw new Error(`Mass conservation violated: negative water volume (${newVol}) at cell ${cells[i].id}`);
        }
      } else {
        volumes[i] = newVol;
      }
    }

    // ------------------------------------------------------------------------
    // Step 3: Apply drain discharge
    // ------------------------------------------------------------------------
    for (const drain of drains) {
      if (blockedDrainSet.has(drain.id)) continue;

      const cellIdx = cellIndexMap.get(drain.cellId);
      if (cellIdx === undefined) continue;

      const currentVol = volumes[cellIdx];
      if (currentVol <= 0) continue;

      const maxDrainVol = drain.capacity * timeStep; // m³
      const actualDrainVol = Math.min(maxDrainVol, currentVol);

      volumes[cellIdx] -= actualDrainVol;
      if (volumes[cellIdx] < 0) {
        if (volumes[cellIdx] >= -EPSILON) {
          volumes[cellIdx] = 0;
        } else {
          throw new Error(`Mass conservation violated: negative water volume after drain discharge at cell ${drain.cellId}`);
        }
      }

      totalDrainedVolume += actualDrainVol;
    }

    // ------------------------------------------------------------------------
    // Step 4: Measure flood state and metrics at end of timestep
    // ------------------------------------------------------------------------
    let stepFloodedCount = 0;

    for (let i = 0; i < totalCells; i++) {
      const currentDepth = volumes[i] / cellArea;

      if (currentDepth > peakDepths[i]) {
        peakDepths[i] = currentDepth;
      }

      if (currentDepth >= floodThreshold) {
        stepFloodedCount++;
        if (firstFloodTimes[i] === null) {
          firstFloodTimes[i] = currentTime;
        }
      }
    }

    if (stepFloodedCount > peakFloodedCellCount) {
      peakFloodedCellCount = stepFloodedCount;
    }
  }

  // ------------------------------------------------------------------------
  // Summarize Output Results
  // ------------------------------------------------------------------------
  const cellResults: CellResult[] = new Array(totalCells);
  let finalFloodedCellCount = 0;
  let finalStoredVolume = 0;
  let earliestFloodTime: number | null = null;

  for (let i = 0; i < totalCells; i++) {
    const finalDepth = volumes[i] / cellArea;
    finalStoredVolume += volumes[i];

    if (finalDepth >= floodThreshold) {
      finalFloodedCellCount++;
    }

    const cellFirstFlood = firstFloodTimes[i];
    if (cellFirstFlood !== null) {
      if (earliestFloodTime === null || cellFirstFlood < earliestFloodTime) {
        earliestFloodTime = cellFirstFlood;
      }
    }

    cellResults[i] = {
      cellId: cells[i].id,
      finalDepth,
      peakDepth: peakDepths[i],
      firstFloodTime: cellFirstFlood,
    };
  }

  // Water-balance error: (Initial + Total Rain) - (Final Stored + Total Drained)
  // Initial storage is 0 m³
  const waterBalanceError = totalRainfallVolume - (finalStoredVolume + totalDrainedVolume);

  return {
    input,
    cellResults,
    finalFloodedCellCount,
    peakFloodedCellCount,
    earliestFloodTime,
    totalRainfallVolume,
    totalDrainedVolume,
    finalStoredVolume,
    waterBalanceError,
  };
}

/**
 * Validates scenario input parameters before running the simulation.
 */
function validateInput(input: SimulationInput): void {
  if (!input) {
    throw new Error('SimulationInput must be provided');
  }

  const { ward, rainfallRate, duration, timeStep, blockedDrainIds, floodThreshold } = input;

  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid duration: must be a positive number (got ${duration})`);
  }

  if (typeof timeStep !== 'number' || !Number.isFinite(timeStep) || timeStep <= 0) {
    throw new Error(`Invalid timeStep: must be a positive number (got ${timeStep})`);
  }

  if (typeof rainfallRate !== 'number' || !Number.isFinite(rainfallRate) || rainfallRate < 0) {
    throw new Error(`Invalid rainfallRate: must be a non-negative number (got ${rainfallRate})`);
  }

  if (typeof floodThreshold !== 'number' || !Number.isFinite(floodThreshold) || floodThreshold < 0) {
    throw new Error(`Invalid floodThreshold: must be a non-negative number (got ${floodThreshold})`);
  }

  const stepCount = duration / timeStep;
  if (!Number.isInteger(stepCount) && Math.abs(stepCount - Math.round(stepCount)) > 1e-9) {
    throw new Error(`Invalid duration and timeStep: duration (${duration}s) must be an exact multiple of timeStep (${timeStep}s)`);
  }

  if (!ward) {
    throw new Error('Ward must be provided in SimulationInput');
  }

  if (typeof ward.rows !== 'number' || ward.rows <= 0 || !Number.isInteger(ward.rows)) {
    throw new Error(`Invalid ward.rows: must be a positive integer (got ${ward.rows})`);
  }

  if (typeof ward.cols !== 'number' || ward.cols <= 0 || !Number.isInteger(ward.cols)) {
    throw new Error(`Invalid ward.cols: must be a positive integer (got ${ward.cols})`);
  }

  if (typeof ward.cellArea !== 'number' || !Number.isFinite(ward.cellArea) || ward.cellArea <= 0) {
    throw new Error(`Invalid ward.cellArea: must be a positive number (got ${ward.cellArea})`);
  }

  if (!Array.isArray(ward.cells) || ward.cells.length !== ward.rows * ward.cols) {
    throw new Error(`Invalid ward.cells length: expected ${ward.rows * ward.cols} cells, got ${ward.cells?.length}`);
  }

  // Cell validation
  const cellIds = new Set<string>();
  const cellCoords = new Set<string>();

  for (const cell of ward.cells) {
    if (!cell || typeof cell.id !== 'string' || cell.id.trim() === '') {
      throw new Error('Invalid cell: cell.id must be a non-empty string');
    }
    if (cellIds.has(cell.id)) {
      throw new Error(`Duplicate cell ID found: ${cell.id}`);
    }
    cellIds.add(cell.id);

    if (cell.row < 0 || cell.row >= ward.rows || !Number.isInteger(cell.row)) {
      throw new Error(`Cell ${cell.id} row (${cell.row}) is out of bounds for ward rows (${ward.rows})`);
    }

    if (cell.col < 0 || cell.col >= ward.cols || !Number.isInteger(cell.col)) {
      throw new Error(`Cell ${cell.id} col (${cell.col}) is out of bounds for ward cols (${ward.cols})`);
    }

    const coordKey = `${cell.row},${cell.col}`;
    if (cellCoords.has(coordKey)) {
      throw new Error(`Duplicate cell coordinates found: row ${cell.row}, col ${cell.col}`);
    }
    cellCoords.add(coordKey);

    if (typeof cell.elevation !== 'number' || !Number.isFinite(cell.elevation)) {
      throw new Error(`Cell ${cell.id} elevation must be a finite number (got ${cell.elevation})`);
    }
  }

  // Drain validation
  if (!Array.isArray(ward.drains)) {
    throw new Error('ward.drains must be an array');
  }

  const drainIds = new Set<string>();

  for (const drain of ward.drains) {
    if (!drain || typeof drain.id !== 'string' || drain.id.trim() === '') {
      throw new Error('Invalid drain: drain.id must be a non-empty string');
    }
    if (drainIds.has(drain.id)) {
      throw new Error(`Duplicate drain ID found: ${drain.id}`);
    }
    drainIds.add(drain.id);

    if (!cellIds.has(drain.cellId)) {
      throw new Error(`Drain ${drain.id} references non-existent cell ID: ${drain.cellId}`);
    }

    if (typeof drain.capacity !== 'number' || !Number.isFinite(drain.capacity) || drain.capacity < 0) {
      throw new Error(`Drain ${drain.id} capacity must be a non-negative number (got ${drain.capacity})`);
    }
  }

  // Blocked drains validation
  if (!Array.isArray(blockedDrainIds)) {
    throw new Error('blockedDrainIds must be an array of drain ID strings');
  }

  for (const blockedId of blockedDrainIds) {
    if (!drainIds.has(blockedId)) {
      throw new Error(`blockedDrainIds contains invalid or unknown drain ID: ${blockedId}`);
    }
  }
}

/**
 * Counterfactual drain-clearing comparison.
 *
 * For each blocked drain in input.blockedDrainIds, reruns the identical simulation scenario
 * with ONLY that one drain cleared (unblocked), keeping all other blocked drains unchanged.
 *
 * Sign convention for deltas:
 *   delta = clearedResult metric - baselineResult metric
 *
 * A negative delta for flooded-cell counts indicates fewer flooded cells when the drain is cleared.
 * A positive delta for drainedVolume indicates more water removed when the drain is cleared.
 *
 * Returns [] if there are no blocked drains — no counterfactual is possible.
 * Duplicate drain IDs in blockedDrainIds are deduplicated; each drain is compared only once,
 * in first-occurrence order.
 *
 * Does NOT mutate: input, input.blockedDrainIds, input.ward, or any ward sub-objects.
 */
export function compareDrains(input: SimulationInput): DrainComparison[] {
  // Early return: no blocked drains means no counterfactual comparisons to make.
  if (!input.blockedDrainIds || input.blockedDrainIds.length === 0) {
    return [];
  }

  // Deduplicate blocked drain IDs while preserving first-occurrence order.
  // The original input.blockedDrainIds array is never mutated.
  const seen = new Set<string>();
  const uniqueBlockedIds: string[] = [];
  for (const id of input.blockedDrainIds) {
    if (!seen.has(id)) {
      seen.add(id);
      uniqueBlockedIds.push(id);
    }
  }

  // Run the baseline scenario ONCE with the original input, unchanged.
  const baselineResult = simulate(input);

  const comparisons: DrainComparison[] = [];

  for (const clearedDrainId of uniqueBlockedIds) {
    // Build a new blockedDrainIds array that excludes the cleared drain.
    // This does NOT mutate input.blockedDrainIds.
    const counterfactualBlockedIds = input.blockedDrainIds.filter(id => id !== clearedDrainId);

    // Build a new SimulationInput preserving every field except blockedDrainIds.
    // The ward reference is shared (not cloned) — ward data is readonly and never mutated.
    const counterfactualInput: SimulationInput = {
      ward: input.ward,
      rainfallRate: input.rainfallRate,
      duration: input.duration,
      timeStep: input.timeStep,
      floodThreshold: input.floodThreshold,
      blockedDrainIds: counterfactualBlockedIds,
    };

    // Run the counterfactual simulation.
    const clearedResult = simulate(counterfactualInput);

    // Compute deltas: cleared metric minus baseline metric.
    // Negative flooded-cell delta = fewer flooded cells after clearing.
    // Positive drained-volume delta = more water removed after clearing.
    const deltaFinalFloodedCellCount =
      clearedResult.finalFloodedCellCount - baselineResult.finalFloodedCellCount;

    const deltaPeakFloodedCellCount =
      clearedResult.peakFloodedCellCount - baselineResult.peakFloodedCellCount;

    const deltaTotalDrainedVolume =
      clearedResult.totalDrainedVolume - baselineResult.totalDrainedVolume;

    comparisons.push({
      clearedDrainId,
      baselineResult,
      clearedResult,
      deltaFinalFloodedCellCount,
      deltaPeakFloodedCellCount,
      deltaTotalDrainedVolume,
    });
  }

  return comparisons;
}
