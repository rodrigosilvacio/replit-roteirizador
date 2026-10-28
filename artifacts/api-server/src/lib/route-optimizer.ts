// Held–Karp on a directed road-time matrix, capped at ten intermediate visits.
// Endpoints are fixed; identical coordinates still represent separate visits.
export function optimizeOrder(matrix: (number | null)[][]): number[] {
  const size = matrix.length;
  if (size < 2 || size > 12 || matrix.some(row => row.length !== size))
    throw new Error("Invalid matrix dimensions");
  const cost = (a: number, b: number) => {
    const value = matrix[a][b];
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : Infinity;
  };
  const original = Array.from({ length: size }, (_, i) => i);
  const total = (order: number[]) => order.slice(1).reduce((sum, v, i) => sum + cost(order[i], v), 0);
  const count = size - 2;
  if (count < 2) return original;
  const states = 1 << count;
  const dp = Array.from({ length: states }, () => Array<number>(count).fill(Infinity));
  const previous = Array.from({ length: states }, () => Array<number>(count).fill(-1));
  for (let j = 0; j < count; j++) dp[1 << j][j] = cost(0, j + 1);
  for (let mask = 1; mask < states; mask++) {
    for (let last = 0; last < count; last++) {
      if (!(mask & (1 << last))) continue;
      for (let next = 0; next < count; next++) {
        if (mask & (1 << next)) continue;
        const nextMask = mask | (1 << next);
        const candidate = dp[mask][last] + cost(last + 1, next + 1);
        if (candidate < dp[nextMask][next]) {
          dp[nextMask][next] = candidate;
          previous[nextMask][next] = last;
        }
      }
    }
  }
  let best = total(original), last = -1;
  for (let j = 0; j < count; j++) {
    const candidate = dp[states - 1][j] + cost(j + 1, size - 1);
    if (candidate < best) { best = candidate; last = j; }
  }
  if (last === -1) return original;
  let mask = states - 1;
  const middle: number[] = [];
  while (last !== -1) {
    middle.push(last + 1);
    const parent = previous[mask][last];
    mask ^= 1 << last;
    last = parent;
  }
  return [0, ...middle.reverse(), size - 1];
}
