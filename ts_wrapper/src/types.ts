import type { Block, TransactionReceipt, TransactionResponse } from "ethers";

export interface VerzikPackage {
  encrypted_file: Uint8Array;
  encrypted_key: Uint8Array;
  nonce: Uint8Array;
  ciphertext_hash: string;
  encryption_meta_hash: string;
}

export interface VerzikMetadata {
  encrypted_key: Uint8Array;
  nonce: Uint8Array;
  ciphertext_hash: string;
  encryption_meta_hash: string;
}

export interface VerzikEnvelope {
  metadata: VerzikMetadata;
  encrypted_data: Uint8Array;
}

export interface VerzikError {
  code: string;
  message: string;
  raw: string;
}

export interface EncryptOptions {
  aesKey?: Uint8Array;
  nonce?: Uint8Array;
}

export interface TorusNetworkOptions {
  network:
    | "sapphire_devnet"
    | "sapphire_mainnet"
    | "testnet"
    | "mainnet"
    | string;
  clientId: string;
  verifier: string;
}

export interface ReWrapResult {
  encrypted_key: Uint8Array;
  encryption_meta_hash: string;
}

export interface TenantInfo {
  id: string;
  admin: string;
  operatorManager: string;
  treasury: string;
  isActive: boolean;
  createdAt: bigint;
}

export interface CoSignStatus {
  coSignQualified: boolean;
  coSignCount: number;
  trustedCoSignCount: number;
  trustedCoSignRoleMask: bigint;
  requiredRoleMask: bigint;
  minSigners: number;
  /** Formatted ETH string, e.g. "1.5 ETH" */
  minStake: string;
}

export interface RegisterPayload {
  tenantId: string;
  fileHash: string;
  owner: string;
  cid: string;
  ciphertextHash: string;
  encryptionMetaHash: string;
  docType: number;
  version: number;
  nonce: bigint;
  deadline: bigint;
}

export interface OperatorStatus {
  exists: boolean;
  isActive: boolean;
  walletAddress: string;
  metadataURI: string;
  /** Formatted ETH string, e.g. "1.5 ETH" */
  stakeAmount: number;
  nonce: number;
  unstakeReadyAt: number;
  canUnstakeNow: boolean;
  recoveryDelegate: string;
}

export interface VerifyStatus {
  exists: boolean;
  isValid: boolean;
  issuer: string;
  cid: string;
}

export interface DecodedLog {
  name: string;
  signature: string;
  args: any;
}
export interface EnhancedTxResult {
  transaction: TransactionResponse;
  receipt: TransactionReceipt | null;
  block: Block | null;
  confirmations: number;
  decodedInput?: any; // Giải mã hàm đã gọi
  decodedLogs?: DecodedLog[]; // Giải mã các Event (Emit)
}
