import type { Contract, Wallet } from "ethers";
import type {
  CoSignStatus,
  EnhancedTxResult,
  OperatorStatus,
  RegisterPayload,
  TenantInfo,
  VerifyStatus,
} from "../types";
import type {
  BlockchainConfig,
  TenantConfig,
  DocumentSnapshot,
} from "../types/blockchain.types";
import { DirectQueryClient } from "./blockchain.direct-query";
import { BlockchainSignClient } from "./blockchain.sign-client";
import { readBlockchainConfigFromEnv } from "./blockchain.context";

export class BlockchainClient {
  private readonly queryClient: DirectQueryClient;
  private readonly signClient: BlockchainSignClient;

  constructor(config: BlockchainConfig) {
    this.queryClient = new DirectQueryClient(config);
    this.signClient = new BlockchainSignClient(config);
  }

  get signer(): Wallet | undefined {
    return this.signClient.context.signer;
  }

  get instance(): Contract {
    return this.signClient.context.instance;
  }

  get reader(): Contract {
    return this.queryClient.context.reader;
  }

  get query(): DirectQueryClient {
    return this.queryClient;
  }

  get sign(): BlockchainSignClient {
    return this.signClient;
  }

  async getTenantCount(): Promise<bigint> {
    return this.queryClient.getTenantCount();
  }

  async getTransactionByHash(txHash: string): Promise<EnhancedTxResult> {
    return this.queryClient.getTransactionByHash(txHash);
  }

  async getOperatorCount(tenantId: string): Promise<bigint> {
    return this.queryClient.getOperatorCount(tenantId);
  }

  async getTenantIds(start = 0, limit = 10): Promise<string[]> {
    return this.queryClient.getTenantIds(start, limit);
  }

  async getOperatorIds(
    tenantId: string,
    start = 0,
    limit = 10,
  ): Promise<string[]> {
    return this.queryClient.getOperatorIds(tenantId, start, limit);
  }

  async getTenantInfo(id: string): Promise<TenantInfo | null> {
    return this.queryClient.getTenantInfo(id);
  }

  async listOperators(
    tenantId: string,
    start = 0,
    limit = 10,
  ): Promise<OperatorStatus[]> {
    return this.queryClient.listOperators(tenantId, start, limit);
  }

  async listTenants(start = 0, limit = 10): Promise<TenantInfo[]> {
    return this.queryClient.listTenants(start, limit);
  }

  async getOperatorStatus(
    tenantId: string,
    operator: string,
  ): Promise<OperatorStatus> {
    return this.queryClient.getOperatorStatus(tenantId, operator);
  }

  async getDocumentStatus(
    tenantId: string,
    fileHash: string,
  ): Promise<DocumentSnapshot> {
    return this.queryClient.getDocumentStatus(tenantId, fileHash);
  }

  async verify(tenantId: string, fileHash: string): Promise<VerifyStatus> {
    return this.queryClient.verify(tenantId, fileHash);
  }

  async getDocumentOrRevert(
    tenantId: string,
    fileHash: string,
  ): Promise<unknown> {
    return this.queryClient.getDocumentOrRevert(tenantId, fileHash);
  }

  async hasSignedDocument(
    tenantId: string,
    fileHash: string,
    signer: string,
  ): Promise<boolean> {
    return this.queryClient.hasSignedDocument(tenantId, fileHash, signer);
  }

  async isDocumentCoSignQualified(
    tenantId: string,
    fileHash: string,
  ): Promise<boolean> {
    return this.queryClient.isDocumentCoSignQualified(tenantId, fileHash);
  }

  async getCoSignStatus(
    tenantId: string,
    fileHash: string,
  ): Promise<CoSignStatus> {
    return this.queryClient.getCoSignStatus(tenantId, fileHash);
  }

  async getNonceCount(tenantId: string, operator: string): Promise<bigint> {
    return this.queryClient.getNonceCount(tenantId, operator);
  }

  async getCoSignPolicy(
    tenantId: string,
    docType: number,
  ): Promise<{
    enabled: boolean;
    minStake: string;
    minSigners: bigint;
    requiredRoleMask: bigint;
  }> {
    return this.queryClient.getCoSignPolicy(tenantId, docType);
  }

  async getCoSignOperatorConfig(
    tenantId: string,
    docType: number,
    operator: string,
  ): Promise<{ whitelisted: boolean; roleId: number }> {
    return this.queryClient.getCoSignOperatorConfig(
      tenantId,
      docType,
      operator,
    );
  }

  async getTenantRuntimeConfig(
    tenantId: string,
  ): Promise<{ minOperatorStake: number; unstakeCooldown: bigint }> {
    return this.queryClient.getTenantRuntimeConfig(tenantId);
  }

  async getViolationPenalty(
    tenantId: string,
    violationCode: string,
  ): Promise<number> {
    return this.queryClient.getViolationPenalty(tenantId, violationCode);
  }

  async createTenant(
    tenantName: string,
    treasuryAddress: string,
    config: TenantConfig,
  ): Promise<string> {
    return this.signClient.createTenant(tenantName, treasuryAddress, config);
  }

  async setTenantStatus(tenantId: string, isActive: boolean): Promise<string> {
    return this.signClient.setTenantStatus(tenantId, isActive);
  }

  async joinAsOperator(
    tenantId: string,
    metadataURI: string,
    stakeAmount: string,
  ): Promise<string> {
    return this.signClient.joinAsOperator(tenantId, metadataURI, stakeAmount);
  }

  async topUpStake(tenantId: string, stakeAmount: string): Promise<string> {
    return this.signClient.topUpStake(tenantId, stakeAmount);
  }

  async updateOperatorMetadata(
    tenantId: string,
    metadataURI: string,
  ): Promise<string> {
    return this.signClient.updateOperatorMetadata(tenantId, metadataURI);
  }

  async requestUnstake(tenantId: string): Promise<string> {
    return this.signClient.requestUnstake(tenantId);
  }

  async executeUnstake(tenantId: string): Promise<string> {
    return this.signClient.executeUnstake(tenantId);
  }

  async registerWithSignature(payload: RegisterPayload): Promise<string> {
    return this.signClient.registerWithSignature(payload);
  }

  async coSignDocumentWithSignature(payload: {
    tenantId: string;
    fileHash: string;
    nonce: bigint;
    deadline: bigint;
  }): Promise<string> {
    return this.signClient.coSignDocumentWithSignature(payload);
  }

  async setRecoveryDelegate(
    tenantId: string,
    delegate: string,
  ): Promise<string> {
    return this.signClient.setRecoveryDelegate(tenantId, delegate);
  }

  async recoverOperatorByDelegate(
    tenantId: string,
    lostOperator: string,
    reason: string,
  ): Promise<string> {
    return this.signClient.recoverOperatorByDelegate(
      tenantId,
      lostOperator,
      reason,
    );
  }

  async setTreasury(tenantId: string, newTreasury: string): Promise<string> {
    return this.signClient.setTreasury(tenantId, newTreasury);
  }

  async revokeDocument(
    tenantId: string,
    fileHash: string,
    reason: string,
  ): Promise<string> {
    return this.signClient.revokeDocument(tenantId, fileHash, reason);
  }

  async slashOperator(
    tenantId: string,
    operator: string,
    reason: string,
  ): Promise<string> {
    return this.signClient.slashOperator(tenantId, operator, reason);
  }

  async softSlashOperator(
    tenantId: string,
    operator: string,
    violationCode: string,
    reason: string,
  ): Promise<string> {
    return this.signClient.softSlashOperator(
      tenantId,
      operator,
      violationCode,
      reason,
    );
  }

  async setOperatorStatus(
    tenantId: string,
    operator: string,
    isActive: boolean,
    reason: string,
  ): Promise<string> {
    return this.signClient.setOperatorStatus(
      tenantId,
      operator,
      isActive,
      reason,
    );
  }

  async recoverOperatorByAdmin(
    tenantId: string,
    lostOperator: string,
    newOperator: string,
    reason: string,
  ): Promise<string> {
    return this.signClient.recoverOperatorByAdmin(
      tenantId,
      lostOperator,
      newOperator,
      reason,
    );
  }

  async setCoSignPolicy(
    tenantId: string,
    docType: number,
    enabled: boolean,
    minStake: string,
    minSigners: bigint,
    requiredRoleMask: bigint,
  ): Promise<string> {
    return this.signClient.setCoSignPolicy(
      tenantId,
      docType,
      enabled,
      minStake,
      minSigners,
      requiredRoleMask,
    );
  }

  async setCoSignOperator(
    tenantId: string,
    docType: number,
    operator: string,
    whitelisted: boolean,
    roleId: number,
  ): Promise<string> {
    return this.signClient.setCoSignOperator(
      tenantId,
      docType,
      operator,
      whitelisted,
      roleId,
    );
  }

  async setMinOperatorStake(
    tenantId: string,
    newMinOperatorStake: string,
  ): Promise<string> {
    return this.signClient.setMinOperatorStake(tenantId, newMinOperatorStake);
  }

  async setUnstakeCooldown(
    tenantId: string,
    newUnstakeCooldown: bigint,
  ): Promise<string> {
    return this.signClient.setUnstakeCooldown(tenantId, newUnstakeCooldown);
  }

  async setViolationPenalty(
    tenantId: string,
    violationCode: string,
    penaltyBps: number,
  ): Promise<string> {
    return this.signClient.setViolationPenalty(
      tenantId,
      violationCode,
      penaltyBps,
    );
  }
}

export function createBlockchainClient(
  config: BlockchainConfig,
): BlockchainClient {
  return new BlockchainClient(config);
}

export function createBlockchainClientFromEnv(): BlockchainClient {
  return new BlockchainClient(readBlockchainConfigFromEnv());
}

export async function init(): Promise<BlockchainClient> {
  return createBlockchainClientFromEnv();
}

export function createRegisterPayload(
  data: Partial<RegisterPayload> & {
    tenantId: string;
    fileHash: string;
    owner: string;
    cid: string;
    ciphertextHash: string;
    encryptionMetaHash: string;
    docType: number;
    version: number;
    nonce: bigint;
  },
): RegisterPayload {
  return {
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    ...data,
  };
}
