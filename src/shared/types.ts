/**
 * FloodClock Canonical Shared Contract Types
 * 
 * Shared interfaces between the pure TypeScript simulation engine and Danyl's React frontend.
 * All units are explicit (metres, seconds, square metres, cubic metres, mm/hour).
 */

/**
 * Represents a single grid cell in the ward.
 */
export interface Cell {
  /** Stable unique identifier for the cell (e.g. "cell_0_0"). */
  readonly id: string;
  /** Zero-indexed row position in the grid (0 to rows - 1). */
  readonly row: number;
  /** Zero-indexed column position in the grid (0 to cols - 1). */
  readonly col: number;
  /** Ground surface elevation in metres (m) above reference datum. */
  readonly elevation: number;
}

/**
 * Represents a physical stormwater drain in the ward.
 * Note: Blockage status is specified per scenario in SimulationInput,
 * allowing the physical Ward definition to remain reusable.
 */
export interface Drain {
  /** Stable unique identifier for the drain (e.g. "drain_1"). */
  readonly id: string;
  /** ID of the cell where this drain is located. */
  readonly cellId: string;
  /** Maximum water discharge capacity in cubic metres per second (m³/s). */
  readonly capacity: number;
}

/**
 * Represents the physical ward layout (grid + terrain + drain infrastructure).
 */
export interface Ward {
  /** Number of rows in the grid (e.g. 8). */
  readonly rows: number;
  /** Number of columns in the grid (e.g. 8). */
  readonly cols: number;
  /** Ground surface area of a single cell in square metres (m²). */
  readonly cellArea: number;
  /** List of all cells comprising the ward grid. */
  readonly cells: readonly Cell[];
  /** List of all physical drains installed in the ward. */
  readonly drains: readonly Drain[];
}

/**
 * Complete input scenario for running a deterministic simulation.
 */
export interface SimulationInput {
  /** Physical ward definition. */
  readonly ward: Ward;
  /** Uniform rainfall intensity in millimetres per hour (mm/h). */
  readonly rainfallRate: number;
  /** Total simulation run duration in seconds (s). */
  readonly duration: number;
  /** Simulation time step increment in seconds (s). */
  readonly timeStep: number;
  /** List of drain IDs that are blocked in this simulation scenario. */
  readonly blockedDrainIds: readonly string[];
  /** Water depth threshold for a cell to be considered flooded, in metres (m). */
  readonly floodThreshold: number;
}

/**
 * Per-cell simulation output results.
 */
export interface CellResult {
  /** ID of the cell corresponding to this result. */
  readonly cellId: string;
  /** Final surface water depth at the end of the simulation in metres (m). */
  readonly finalDepth: number;
  /** Maximum (peak) surface water depth reached during simulation in metres (m). */
  readonly peakDepth: number;
  /** 
   * Time in seconds (s) when water depth first reached or exceeded floodThreshold.
   * `null` if the cell never flooded during the simulation.
   */
  readonly firstFloodTime: number | null;
}

/**
 * Complete summary results for a single simulation run.
 */
export interface SimulationResult {
  /** Input scenario parameters used for this run. */
  readonly input: SimulationInput;
  /** Array of individual cell simulation outcomes. */
  readonly cellResults: readonly CellResult[];
  /** Number of cells flooded (water depth >= floodThreshold) at simulation end. */
  readonly finalFloodedCellCount: number;
  /** Maximum number of simultaneously flooded cells recorded at any single time step. */
  readonly peakFloodedCellCount: number;
  /** 
   * Earliest time in seconds (s) when any cell in the ward first reached floodThreshold.
   * `null` if no cells flooded in the ward.
   */
  readonly earliestFloodTime: number | null;
  /** Total water volume introduced into the ward via rainfall in cubic metres (m³). */
  readonly totalRainfallVolume: number;
  /** Total water volume removed from the ward via active drains in cubic metres (m³). */
  readonly totalDrainedVolume: number;
  /** Total water volume remaining on cell surfaces at simulation end in cubic metres (m³). */
  readonly finalStoredVolume: number;
  /** 
   * Numerical water-balance error in cubic metres (m³).
   * Computed as: (Initial Surface Volume + Total Rainfall Volume) - (Final Stored Volume + Total Drained Volume).
   */
  readonly waterBalanceError: number;
}

/**
 * Counterfactual experiment comparing a baseline scenario against an identical scenario
 * where one blocked drain has been cleared (unblocked).
 * 
 * Sign convention for deltas:
 *   delta = clearedResult metric - baselineResult metric
 * 
 * Example: A negative `deltaPeakFloodedCellCount` indicates that clearing the drain
 * reduced the peak count of flooded cells compared to the baseline scenario.
 */
export interface DrainComparison {
  /** Identifier of the single blocked drain that was cleared in this experiment. */
  readonly clearedDrainId: string;
  /** Full simulation result for the original baseline scenario. */
  readonly baselineResult: SimulationResult;
  /** Full simulation result for the scenario with the specified drain cleared. */
  readonly clearedResult: SimulationResult;
  /** 
   * Delta in final flooded cell count (clearedResult - baselineResult).
   * Negative value indicates fewer flooded cells at simulation end.
   */
  readonly deltaFinalFloodedCellCount: number;
  /** 
   * Delta in peak simultaneously flooded cell count (clearedResult - baselineResult).
   * Negative value indicates lower peak flooded cell count.
   */
  readonly deltaPeakFloodedCellCount: number;
  /** 
   * Delta in total volume drained in m³ (clearedResult - baselineResult).
   * Positive value indicates more total water was drained.
   */
  readonly deltaTotalDrainedVolume: number;
}
