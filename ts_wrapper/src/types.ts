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

export interface BlockchainConfig {
  rpcUrl: string;
  protocolAddress: string;
  readerAddress?: string;
  privateKey?: string;
}

export interface TenantInfo {
  id: string;
  admin: string;
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
  minStake: bigint;
}

export interface RegisterPayload {
  tenantId: string;
  fileHash: string;
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
  metadataURI: string;
  stakeAmount: bigint;
  nonce: bigint;
  unstakeReadyAt: bigint;
  canUnstakeNow: boolean;
  recoveryDelegate: string;
}

export interface DocumentSnapshot {
  exists: boolean;
  isValid: boolean;
  issuer: string;
  cid: string;
  timestamp: bigint;
  ciphertextHash: number;
  encryptionMetaHash: number;
  docType: number;
  version: number;
  coSignCount: bigint;
  trustedCoSignCount: bigint;
  trustedCoSignRoleMask: bigint;
  coSignQualified: boolean;
}

export interface VerifyStatus {
  exists: boolean;
  isValid: boolean;
  issuer: string;
  cid: string;
}
export interface TenantConfig {
  admin: string;
  slasher: string;
  operatorManager: string;
  minStake: string;
  unstakeCooldown: bigint;
}
