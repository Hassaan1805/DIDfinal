// Type declarations for snarkjs
declare module 'snarkjs' {
  export interface GrothProof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  }

  export interface PublicSignals extends Array<string> {}

  export interface VerificationKey {
    protocol: string;
    curve: string;
    nPublic: number;
    vk_alpha_1: string[];
    vk_beta_2: string[][];
    vk_gamma_2: string[][];
    vk_delta_2: string[][];
    vk_alphabeta_12: string[][][];
    IC: string[][];
  }

  export namespace groth16 {
    export function fullProve(
      input: any,
      wasmFile: string | Buffer,
      zkeyFile: string | Buffer
    ): Promise<{ proof: GrothProof; publicSignals: PublicSignals }>;

    export function verify(
      verificationKey: VerificationKey,
      publicSignals: PublicSignals,
      proof: GrothProof
    ): Promise<boolean>;

    export function exportSolidityVerifier(zkeyFile: string | Buffer): Promise<string>;
  }

  export namespace zKey {
    export function exportVerificationKey(zkeyFile: string | Buffer): Promise<VerificationKey>;
  }

  export namespace powersOfTau {
    export function newAccumulator(
      curve: string,
      power: number,
      fileName: string
    ): Promise<void>;

    export function contribute(
      oldPtauFile: string,
      newPTauFile: string,
      name: string,
      entropy?: string
    ): Promise<void>;

    export function preparePhase2(
      oldPtauFile: string,
      newPTauFile: string
    ): Promise<void>;
  }

  export function setup(
    r1csFile: string | Buffer,
    ptauFile: string | Buffer,
    zkeyFile: string
  ): Promise<void>;

  export function contribute(
    oldZkeyFile: string,
    newZKeyFile: string,
    name: string,
    entropy?: string
  ): Promise<void>;
}
