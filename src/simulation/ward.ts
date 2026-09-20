import type { Ward, Cell, Drain } from '../shared/types';

/**
 * Fictional 8x8 Synthetic Ward terrain elevation matrix (in metres above reference datum).
 * 
 * DISCLAIMER:
 * This terrain is entirely synthetic and illustrative for hackathon prototype demonstration.
 * Elevations are fictitious values designed to model surface runoff and local pooling,
 * and do not represent surveyed or real-world topographic data.
 * 
 * Overall slope: North-West (higher ~10.0m) to South-East (lower ~1.5m),
 * containing mild local depressions near drain locations.
 */
const ELEVATION_MATRIX: readonly (readonly number[])[] = [
  [10.0,  9.6,  9.2,  8.8,  8.5,  8.2,  7.8,  7.5],
  [ 9.5,  9.0,  8.6,  8.2,  7.9,  7.5,  7.2,  6.8],
  [ 9.0,  8.5,  8.0,  7.6,  7.2,  6.8,  6.5,  6.1],
  [ 8.4,  7.9,  7.4,  6.8,  6.5,  6.0,  5.8,  5.4],
  [ 7.8,  7.3,  6.7,  6.1,  5.7,  5.2,  4.9,  4.6],
  [ 7.2,  6.6,  6.0,  5.4,  4.8,  4.2,  4.0,  3.7],
  [ 6.5,  5.9,  5.2,  4.6,  3.9,  3.4,  3.0,  2.7],
  [ 5.8,  5.1,  4.4,  3.7,  3.0,  2.4,  1.8,  1.5],
];

/**
 * Helper to construct the 64 Cell objects deterministically from ELEVATION_MATRIX.
 */
const cells: readonly Cell[] = ELEVATION_MATRIX.flatMap((rowValues, rowIndex) =>
  rowValues.map((elevation, colIndex) => ({
    id: `cell-${rowIndex}-${colIndex}`,
    row: rowIndex,
    col: colIndex,
    elevation,
  }))
);

/**
 * 3 Physical stormwater drains positioned at key low-elevation pooling points across the ward.
 */
const drains: readonly Drain[] = [
  {
    id: 'drain-a',
    cellId: 'cell-3-3',
    capacity: 0.15, // m³/s discharge capacity
  },
  {
    id: 'drain-b',
    cellId: 'cell-5-5',
    capacity: 0.12, // m³/s discharge capacity
  },
  {
    id: 'drain-c',
    cellId: 'cell-7-6',
    capacity: 0.18, // m³/s discharge capacity
  },
];

/**
 * Canonical demo ward definition used for testing and baseline simulation runs.
 * Cell size: 20m x 20m (cellArea = 400 m²).
 */
export const demoWard: Ward = {
  rows: 8,
  cols: 8,
  cellArea: 400, // 20m x 20m cell
  cells,
  drains,
};
