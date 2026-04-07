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
  nonce: number | string | bigint;
  deadline: number | string | bigint;
}

export interface UploadedDocumentResponse {
  file_name: string;
  original_hash: string;
  cid: string;
  metadata_cid: string;
  file_cid: string;
  directory_cid: string;
  nonce: string;
  draft_status: string;
}

export interface UploadDraftResponse {
  status: string;
  document: UploadedDocumentResponse;
}

export interface PublishAndSignDocumentResult {
  upload: UploadDraftResponse;
  payload: RegisterPayload;
  signature: string;
  signerAddress: string;
  chainId: bigint;
  domain: {
    name: string;
    version: string;
    chainId: bigint;
    verifyingContract: string;
  };
}
