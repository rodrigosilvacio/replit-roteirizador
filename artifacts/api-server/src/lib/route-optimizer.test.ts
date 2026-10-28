import { test } from "node:test";
import assert from "node:assert/strict";
import { optimizeOrder } from "./route-optimizer.ts";

test("directed costs preserve endpoints and visit every stop", () => {
  const matrix = [[0, 9, 1, 9], [9, 0, 9, 1], [9, 1, 0, 9], [1, 9, 9, 0]];
  assert.deepEqual(optimizeOrder(matrix), [0, 2, 1, 3]);
});
test("ties retain original order", () => {
  assert.deepEqual(optimizeOrder(Array.from({length: 5}, () => Array(5).fill(1))), [0, 1, 2, 3, 4]);
});
test("null edges are not free and unreachable matrices retain original", () => {
  assert.deepEqual(optimizeOrder([[0, 1, null, 9], [1, 0, 1, 1], [1, null, 0, 1], [1, 1, 1, 0]]), [0, 1, 2, 3]);
});
test("round trip with repeated endpoints preserves visits", () => {
  assert.deepEqual(optimizeOrder([[0,9,1,0],[1,0,9,1],[9,1,0,9],[0,9,1,0]]), [0,2,1,3]);
});
test("maximum size and simple route", () => {
  const m = Array.from({length:12}, () => Array(12).fill(1));
  assert.equal(new Set(optimizeOrder(m)).size, 12);
  assert.deepEqual(optimizeOrder([[0,1],[1,0]]), [0,1]);
  assert.throws(() => optimizeOrder(Array.from({length:13}, () => Array(13).fill(1))));
});
