import { id, parseEther } from "ethers";
import type { RegisterPayload } from "../types";
import type { BlockchainConfig, TenantConfig } from "../types/blockchain.types";
import { generate_tenant_id } from "../../core_wasm/verzik_sdk";
import {
  BlockchainContext,
  readBlockchainConfigFromEnv,
} from "./blockchain.context";

const CHAIN_ID = Number(process.env.CHAIN_ID?.trim() ?? 31337);

export class BlockchainSignClient {
  readonly context: BlockchainContext;

  constructor(config: BlockchainConfig) {
    this.context = new BlockchainContext(config);
  }

  private assertCanSendTx(action: string): void {
    if (!this.context.wallet) {
      throw new Error(
        `${action} requires PRIVATE_KEY. Contract runner is provider-only and cannot send transactions.`,
      );
    }
  }

  async createTenant(
    tenantName: string,
    treasuryAddress: string,
    config: TenantConfig,
  ): Promise<string> {
    if (!this.context.wallet) {
      throw new Error(
        "Client chưa có privateKey nên không thể gửi transaction ",
      );
    }

    try {
      const tx = await this.context.protocolContract.createTenant(
        generate_tenant_id(tenantName),
        treasuryAddress,
        {
          admin: config.admin,
          operatorManager: config.operatorManager,
          minStake: parseEther(config.minStake),
          unstakeCooldown: config.unstakeCooldown,
        },
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async setTenantStatus(tenantId: string, isActive: boolean): Promise<string> {
    try {
      const tx = await this.context.protocolContract.setTenantStatus(
        tenantId,
        isActive,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async joinAsOperator(
    tenantId: string,
    metadataURI: string,
    stakeAmount: string,
  ): Promise<string> {
    this.assertCanSendTx("joinAsOperator");
    try {
      const tx = await this.context.protocolContract.joinAsOperator(
        tenantId,
        metadataURI,
        {
          value: parseEther(stakeAmount),
        },
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async topUpStake(tenantId: string, stakeAmount: string): Promise<string> {
    this.assertCanSendTx("topUpStake");
    try {
      const tx = await this.context.protocolContract.topUpStake(tenantId, {
        value: parseEther(stakeAmount),
      });
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async updateOperatorMetadata(
    tenantId: string,
    metadataURI: string,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.updateOperatorMetadata(
        tenantId,
        metadataURI,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async requestUnstake(tenantId: string): Promise<string> {
    try {
      const tx = await this.context.protocolContract.requestUnstake(tenantId);
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async executeUnstake(tenantId: string): Promise<string> {
    try {
      const tx = await this.context.protocolContract.executeUnstake(tenantId);
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async registerWithSignature(payload: RegisterPayload): Promise<string> {
    try {
      if (!this.context.wallet) throw new Error("Cần Private Key để ký!");

      const domain = {
        name: "VoucherProtocol",
        version: "1",
        chainId: CHAIN_ID,
        verifyingContract: this.context.protocolContract.target as string,
      };

      const types = {
        Register: [
          { name: "tenantId", type: "bytes32" },
          { name: "fileHash", type: "bytes32" },
          { name: "owner", type: "address" },
          { name: "cid", type: "string" },
          { name: "ciphertextHash", type: "bytes32" },
          { name: "encryptionMetaHash", type: "bytes32" },
          { name: "docType", type: "uint32" },
          { name: "version", type: "uint32" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const signature = await this.context.wallet.signTypedData(
        domain,
        types,
        payload,
      );
      const tx = await this.context.protocolContract.registerWithSignature(
        payload,
        signature,
      );
      const receipt = await tx.wait();

      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async registerWithProvidedSignature(
    payload: RegisterPayload,
    signature: string,
  ): Promise<string> {
    try {
      this.assertCanSendTx("registerWithProvidedSignature");
      const tx = await this.context.protocolContract.registerWithSignature(
        payload,
        signature,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async coSignDocumentWithSignature(payload: {
    tenantId: string;
    fileHash: string;
    nonce: bigint;
    deadline: bigint;
  }): Promise<string> {
    try {
      if (!this.context.wallet) throw new Error("Cần Private Key để ký!");

      const domain = {
        name: "VoucherProtocol",
        version: "1",
        chainId: CHAIN_ID,
        verifyingContract: this.context.protocolContract.target as string,
      };

      const types = {
        CoSign: [
          { name: "tenantId", type: "bytes32" },
          { name: "fileHash", type: "bytes32" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const signature = await this.context.wallet.signTypedData(
        domain,
        types,
        payload,
      );
      const tx =
        await this.context.protocolContract.coSignDocumentWithSignature(
          payload,
          signature,
        );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async coSignWithProvidedSignature(
    payload: {
      tenantId: string;
      fileHash: string;
      nonce: bigint;
      deadline: bigint;
    },
    signature: string,
  ): Promise<string> {
    try {
      this.assertCanSendTx("coSignWithProvidedSignature");
      const tx =
        await this.context.protocolContract.coSignDocumentWithSignature(
          payload,
          signature,
        );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async setRecoveryDelegate(
    tenantId: string,
    delegate: string,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.setRecoveryDelegate(
        tenantId,
        delegate,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async recoverOperatorByDelegate(
    tenantId: string,
    lostOperator: string,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.recoverOperatorByDelegate(
        tenantId,
        lostOperator,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async setTreasury(tenantId: string, newTreasury: string): Promise<string> {
    try {
      const tx = await this.context.protocolContract.setTreasury(
        tenantId,
        newTreasury,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async revokeDocument(
    tenantId: string,
    fileHash: string,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.revokeDocument(
        tenantId,
        fileHash,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async slashOperator(
    tenantId: string,
    operator: string,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.slashOperator(
        tenantId,
        operator,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async softSlashOperator(
    tenantId: string,
    operator: string,
    violationCode: string,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.softSlashOperator(
        tenantId,
        operator,
        violationCode,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async setOperatorStatus(
    tenantId: string,
    operator: string,
    isActive: boolean,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.setOperatorStatus(
        tenantId,
        operator,
        isActive,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async recoverOperatorByAdmin(
    tenantId: string,
    lostOperator: string,
    newOperator: string,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.recoverOperatorByAdmin(
        tenantId,
        lostOperator,
        newOperator,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async setCoSignPolicy(
    tenantId: string,
    docType: number,
    enabled: boolean,
    minStake: string,
    minSigners: bigint,
    requiredRoleMask: bigint,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.setCoSignPolicy(
        tenantId,
        docType,
        enabled,
        parseEther(minStake),
        minSigners,
        requiredRoleMask,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async setCoSignOperator(
    tenantId: string,
    docType: number,
    operator: string,
    whitelisted: boolean,
    roleId: number,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.setCoSignOperator(
        tenantId,
        docType,
        operator,
        whitelisted,
        roleId,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async setMinOperatorStake(
    tenantId: string,
    newMinOperatorStake: string,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.setMinOperatorStake(
        tenantId,
        parseEther(newMinOperatorStake),
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async setUnstakeCooldown(
    tenantId: string,
    newUnstakeCooldown: bigint,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.setUnstakeCooldown(
        tenantId,
        newUnstakeCooldown,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async setViolationPenalty(
    tenantId: string,
    violationCode: string,
    penaltyBps: number,
  ): Promise<string> {
    try {
      const tx = await this.context.protocolContract.setViolationPenalty(
        tenantId,
        id(violationCode),
        penaltyBps,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }
}

export function createBlockchainSignClient(
  config: BlockchainConfig,
): BlockchainSignClient {
  return new BlockchainSignClient(config);
}

export function createBlockchainSignClientFromEnv(): BlockchainSignClient {
  return new BlockchainSignClient(readBlockchainConfigFromEnv());
}
