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
export interface TenantConfig {
  admin: string;
  operatorManager: string;
  minStake: string;
  unstakeCooldown: bigint;
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
export interface TenantRuntimeConfig {
  minOperatorStake: number;
  unstakeCooldown: bigint;
}
export interface DocumentSnapshot {
  exists: boolean;
  isValid: boolean;
  owner: string;
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
