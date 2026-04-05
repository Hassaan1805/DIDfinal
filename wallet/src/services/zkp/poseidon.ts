/**
 * Self-contained Poseidon hash for BN128 — no Node.js dependencies.
 *
 * Implements the same algorithm as circomlibjs/poseidon_reference.js but
 * using native BigInt arithmetic so it runs in Hermes (React Native) without
 * requiring ffjavascript, circomlibjs, or any WebAssembly / Web Workers.
 *
 * Constants (round constants C, MDS matrix M) are pre-extracted for the two
 * arities we actually use:
 *   - t=3  (2-input Poseidon): computeMerkleRoot Poseidon(pk, 0), Poseidon(node, 0)
 *   - t=4  (3-input Poseidon): computeMerkleRoot Poseidon(addr, role, 1)
 */

import CONSTANTS from './poseidon_constants_rn.json';

// BN128 scalar field modulus
const P = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

const fadd = (a: bigint, b: bigint): bigint => (a + b) % P;
const fmul = (a: bigint, b: bigint): bigint => (a * b) % P;
const fpow5 = (a: bigint): bigint => {
  const a2 = fmul(a, a);
  const a4 = fmul(a2, a2);
  return fmul(a, a4);
};
const fe = (x: bigint | string | number): bigint => (BigInt(x) % P + P) % P;

// Pre-parse constants once at module load
const C1: bigint[] = (CONSTANTS as any).C1.map((s: string) => BigInt(s));
const M1: bigint[][] = (CONSTANTS as any).M1.map((r: string[]) => r.map((s: string) => BigInt(s)));
const C2: bigint[] = (CONSTANTS as any).C2.map((s: string) => BigInt(s));
const M2: bigint[][] = (CONSTANTS as any).M2.map((r: string[]) => r.map((s: string) => BigInt(s)));

const N_ROUNDS_F = 8;
// N_ROUNDS_P indexed by (t-2): t=3 → index 1 → 57, t=4 → index 2 → 56
const N_ROUNDS_P = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68];

function poseidonRaw(inputs: bigint[], C: bigint[], M: bigint[][]): bigint {
  const t = inputs.length + 1;
  const nRoundsP = N_ROUNDS_P[t - 2];
  const totalRounds = N_ROUNDS_F + nRoundsP;

  let state: bigint[] = [0n, ...inputs.map(fe)];

  for (let r = 0; r < totalRounds; r++) {
    // Add round constants
    state = state.map((a, i) => fadd(a, C[r * t + i]));

    // S-box
    if (r < N_ROUNDS_F / 2 || r >= N_ROUNDS_F / 2 + nRoundsP) {
      state = state.map(fpow5); // full round
    } else {
      state[0] = fpow5(state[0]); // partial round
    }

    // MDS matrix multiplication
    state = state.map((_, i) =>
      state.reduce((acc, a, j) => fadd(acc, fmul(M[i][j], a)), 0n)
    );
  }

  return state[0];
}

/**
 * Poseidon hash of exactly 2 inputs (uses t=3 constants).
 */
export function poseidon2(a: bigint, b: bigint): bigint {
  return poseidonRaw([a, b], C1, M1);
}

/**
 * Poseidon hash of exactly 3 inputs (uses t=4 constants).
 */
export function poseidon3(a: bigint, b: bigint, c: bigint): bigint {
  return poseidonRaw([a, b, c], C2, M2);
}
