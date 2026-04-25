import type { TorusNetworkOptions } from "./types";
import { encrypt, decrypt, split, merge, hashDocument } from "./encrypt";
import { reWrapKey } from "./re_wrap";
import { getPublicKeyFromEmail } from "./identity";
export type {
  EncryptOptions,
  ReWrapResult,
  TenantInfo,
  VerzikEnvelope,
  VerzikError,
  VerzikMetadata,
  VerzikPackage,
  TorusNetworkOptions,
  EnhancedTxResult,
  OperatorStatus,
  VerifyStatus,
} from "./types";
export type {
  BlockchainConfig,
  TenantConfig,
  TenantRuntimeConfig,
  DocumentSnapshot,
} from "./types/blockchain.types";
export type {
  GraphNodeConfig,
  DocumentAnchored,
  TenantCreated,
  OperatorJoined,
  ViolationPenaltyUpdated,
  GraphNodeQueryError,
  GraphNodeQueryResponse,
  CoSignOperatorConfigured,
  CoSignPolicyUpdated,
  DocumentCoSignQualified,
  DocumentCoSigned,
  DocumentRevoked,
  MinOperatorStakeUpdated,
  NonceConsumed,
  OperatorMetadataUpdated,
  OperatorRecovered,
  OperatorRecoveryAliasUpdated,
  OperatorRecoveryDelegateUpdated,
  OperatorSlashed,
  OperatorSoftSlashed,
  OperatorStakeToppedUp,
  OperatorStatusUpdated,
  OperatorUnstakeRequested,
  OperatorUnstaked,
  ProtocolInitialized,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  TenantStatusUpdated,
  TreasuryUpdated,
  UnstakeCooldownUpdated,
} from "./types/graph.types";
export { bytesToHex, hexToBytes, parseError } from "./utils";
export { decodeContractError } from "./contract-errors";
export {
  BlockchainClient,
  createBlockchainClient,
  createBlockchainClientFromEnv,
  createRegisterPayload,
  init,
  BlockchainContext,
  createBlockchainContext,
  DirectQueryClient,
  createDirectQueryClient,
  createDirectQueryClientFromEnv,
  GraphQueryClient,
  createGraphQueryClient,
  BlockchainSetClient,
  createBlockchainSetClient,
  createBlockchainSetClientFromEnv,
} from "./config/blockchain.config";

export class VerzikSDK {
  static encrypt = encrypt;
  static decrypt = decrypt;
  static split = split;
  static merge = merge;
  static hashDocument = hashDocument;
  static reWrapKey = reWrapKey;

  static ping(): void {
    const core = require("../core_wasm/verzik_sdk");
    core.ping();
  }

  static getPublicKeyFromEmail(
    email: string,
    options: TorusNetworkOptions,
  ): Promise<string> {
    return getPublicKeyFromEmail(email, options);
  }
}
