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
  /**
   * WARNING: Setting a custom nonce manually is highly discouraged and can lead to severe security vulnerabilities if reused.
   */
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
  /** VoucherProtocol main contract address */
  protocolAddress: string;
  /** VoucherProtocolReader contract address */
  readerAddress?: string;
  privateKey?: string;
  /** Linked external library addresses (informational, not required for SDK calls) */
  operatorLibAddress?: string;
  documentLibAddress?: string;
  coSignLibAddress?: string;
  recoveryLibAddress?: string;
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
  stakeAmount: string;
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
  ciphertextHash: string;
  encryptionMetaHash: string;
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

export interface UploadDraftResponse {
  status: "success" | "error" | string;
  document?: {
    original_hash: string;
    metadata_cid: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface PublishAndSignDocumentResult {
  upload: UploadDraftResponse;
  payload: RegisterPayload;
  signature: string;
  signerAddress: string;
  chainId: bigint | number;
  domain: {
    name: string;
    version: string;
    chainId: bigint | number;
    verifyingContract: string;
  };
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
  decodedInput?: any;
  decodedLogs?: DecodedLog[];
}
