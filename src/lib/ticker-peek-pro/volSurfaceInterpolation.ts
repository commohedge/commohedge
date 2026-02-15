/**
 * Bilinear interpolation for the IV surface grid.
 * Fills null gaps in the z matrix using neighboring known values.
 */
export function interpolateSurface(
  z: (number | null)[][],
  strikes: number[],
  dtes: number[]
): (number | null)[][] {
  const rows = z.length;
  const cols = z[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return z;

  const result = z.map((row) => [...row]);

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (result[i][j] !== null) continue;

      const neighbors: { value: number; dist: number }[] = [];

      for (let jj = j - 1; jj >= 0; jj--) {
        if (result[i][jj] !== null) {
          neighbors.push({ value: result[i][jj]!, dist: Math.abs(strikes[j] - strikes[jj]) || 1 });
          break;
        }
      }
      for (let jj = j + 1; jj < cols; jj++) {
        if (result[i][jj] !== null) {
          neighbors.push({ value: result[i][jj]!, dist: Math.abs(strikes[j] - strikes[jj]) || 1 });
          break;
        }
      }
      for (let ii = i - 1; ii >= 0; ii--) {
        if (result[ii][j] !== null) {
          neighbors.push({ value: result[ii][j]!, dist: Math.abs(dtes[i] - dtes[ii]) || 1 });
          break;
        }
      }
      for (let ii = i + 1; ii < rows; ii++) {
        if (result[ii][j] !== null) {
          neighbors.push({ value: result[ii][j]!, dist: Math.abs(dtes[i] - dtes[ii]) || 1 });
          break;
        }
      }

      if (neighbors.length >= 2) {
        const totalInvDist = neighbors.reduce((s, n) => s + 1 / n.dist, 0);
        result[i][j] = neighbors.reduce((s, n) => s + (n.value / n.dist), 0) / totalInvDist;
      }
    }
  }

  return result;
}
