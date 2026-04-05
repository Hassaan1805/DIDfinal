/**
 * Client-side ZK Proof Generator
 *
 * Generates Groth16 proofs ON-DEVICE so the ZK private key never leaves the wallet.
 * Uses:
 *   - poseidon.ts (pure BigInt, no Node deps) for Merkle root computation
 *   - witness_calculator.js (circom-generated) for witness generation (requires WebAssembly)
 *   - snarkjs groth16.prove() for proof generation
 *
 * Circuit artifacts (nftOwnership.wasm, nftOwnership_0001.zkey) are downloaded from
 * the backend on first use and kept in memory for the session.
 */

// snarkjs's UMD bundle has top-level code that creates a Blob from a Uint8Array
// for Web Worker bootstrapping.  React Native defines Blob but its constructor
// doesn't support ArrayBuffer/ArrayBufferView, so we temporarily hide it.
// In single-threaded mode (no Worker global) the workerSource is never used.
const _OrigBlob = (globalThis as any).Blob;
(globalThis as any).Blob = undefined;
const snarkjs = require('snarkjs');
(globalThis as any).Blob = _OrigBlob;

const witnessCalcBuilder = require('./witness_calculator');
import { poseidon2, poseidon3 } from './poseidon';

const ROLE_HASHES: Record<string, string> = {
  employee: '1000',
  manager: '1001',
  auditor: '1002',
  admin: '1003',
};

class ZKProverService {
  private wasmBuffer: Uint8Array | null = null;
  private zkeyBuffer: Uint8Array | null = null;
  private ready = false;

  /**
   * Download circuit artifacts from the backend and build Poseidon.
   * Artifacts are kept in memory for the session (re-downloaded on app restart).
   */
  async ensureArtifacts(apiBaseUrl: string): Promise<void> {
    if (this.wasmBuffer && this.zkeyBuffer) return;

    const base = apiBaseUrl.replace(/\/+$/, '');

    if (!this.wasmBuffer) {
      console.log('[ZKProver] Downloading nftOwnership.wasm…');
      const wasmRes = await fetch(`${base}/zkp/artifacts/nftOwnership.wasm`);
      if (!wasmRes.ok) throw new Error(`Failed to download wasm: ${wasmRes.status}`);
      this.wasmBuffer = new Uint8Array(await wasmRes.arrayBuffer());
      console.log(`[ZKProver] WASM loaded (${this.wasmBuffer.length} bytes)`);
    }

    if (!this.zkeyBuffer) {
      console.log('[ZKProver] Downloading nftOwnership_0001.zkey…');
      const zkeyRes = await fetch(`${base}/zkp/artifacts/nftOwnership_0001.zkey`);
      if (!zkeyRes.ok) throw new Error(`Failed to download zkey: ${zkeyRes.status}`);
      this.zkeyBuffer = new Uint8Array(await zkeyRes.arrayBuffer());
      console.log(`[ZKProver] zkey loaded (${this.zkeyBuffer.length} bytes)`);
    }

    this.ready = true;
    console.log('[ZKProver] Artifacts loaded, prover ready');
  }

  /**
   * Compute Poseidon-based Merkle root matching the circuit logic.
   * Same computation as backend's computeMerkleRoot().
   */
  computeMerkleRoot(zkPrivKey: string, roleHash: string): string {
    const MAX_252 = BigInt(2) ** BigInt(252);
    const pkField = BigInt('0x' + zkPrivKey) % MAX_252;

    // publicAddress = Poseidon(pk, 0)
    const addr = poseidon2(pkField, 0n);
    // leaf = Poseidon(addr, roleHash, 1)
    const leaf = poseidon3(addr, BigInt(roleHash), 1n);
    // 8-level tree with all-zero siblings
    let node: bigint = leaf;
    for (let i = 0; i < 8; i++) {
      node = poseidon2(node, 0n);
    }
    return node.toString();
  }

  /**
   * Generate a Groth16 proof entirely on-device.
   * The private key never leaves this function.
   *
   * Returns { proof, publicSignals } ready to send to the backend.
   */
  async generateProof(
    zkPrivKey: string,
    requiredBadge: string,
  ): Promise<{ proof: any; publicSignals: string[] }> {
    if (!this.ready || !this.wasmBuffer || !this.zkeyBuffer) {
      throw new Error('Artifacts not loaded — call ensureArtifacts() first');
    }

    const roleHash = ROLE_HASHES[requiredBadge];
    if (!roleHash) throw new Error(`Unknown badge: ${requiredBadge}`);

    const merkleRoot = this.computeMerkleRoot(zkPrivKey, roleHash);

    const MAX_252 = BigInt(2) ** BigInt(252);
    const pkField = (BigInt('0x' + zkPrivKey) % MAX_252).toString();

    const inputs = {
      privateKey: pkField,
      nonce: '0',
      tokenId: '1',
      nftContractAddress: roleHash,
      merkleRoot,
      merkleProof: Array(8).fill('0'),
      merkleIndices: Array(8).fill('0'),
    };

    console.log('[ZKProver] Generating witness…');
    const t0 = Date.now();

    // Step 1: Generate witness using the circuit's WASM (requires WebAssembly)
    const wc = await witnessCalcBuilder(this.wasmBuffer.buffer);
    const witnessBuffer = await wc.calculateWTNSBin(inputs, 0);

    console.log(`[ZKProver] Witness generated in ${Date.now() - t0}ms`);

    // Step 2: Generate Groth16 proof
    const t1 = Date.now();
    const { proof, publicSignals } = await snarkjs.groth16.prove(
      new Uint8Array(this.zkeyBuffer),
      new Uint8Array(witnessBuffer),
    );

    console.log(`[ZKProver] Proof generated in ${Date.now() - t1}ms (total ${Date.now() - t0}ms)`);
    console.log(`[ZKProver] publicSignals[0] (isValid) = ${publicSignals[0]}`);
    console.log(`[ZKProver] publicSignals[1] (roleHash) = ${publicSignals[1]}`);

    return { proof, publicSignals };
  }

  /**
   * Check if WebAssembly is available in the runtime.
   */
  isSupported(): boolean {
    return typeof WebAssembly !== 'undefined'
      && typeof WebAssembly.compile === 'function'
      && typeof WebAssembly.instantiate === 'function';
  }
}

export const zkProver = new ZKProverService();
