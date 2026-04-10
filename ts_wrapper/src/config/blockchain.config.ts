import dotenv from "dotenv";
import VoucherProtocolABI from "../abi/VoucherProtocolModule#VoucherProtocol.json";
import VoucherProtocolReaderABI from "../abi/VoucherProtocolModule#VoucherProtocolReader.json";

import { JsonRpcProvider, Wallet, Contract, parseEther } from "ethers";
import type {
  BlockchainConfig,
  TenantInfo,
  CoSignStatus,
  RegisterPayload,
  OperatorStatus,
  DocumentSnapshot,
  VerifyStatus,
  TenantConfig,
} from "../types";
import { generate_tenant_id } from "../../core_wasm/verzik_sdk";

dotenv.config();

type TenantTuple = [boolean, string, string, boolean, bigint];
const CHAIN_ID = process.env.CHAIN_ID?.trim() ?? 31337;
export class BlockchainClient {
  private readonly provider: JsonRpcProvider;
  private readonly wallet?: Wallet;
  private readonly protocolContract: Contract;
  private readonly readerContract: Contract;

  constructor(config: BlockchainConfig) {
    const rpcUrl = config.rpcUrl?.trim();
    const protocolAddress = config.protocolAddress?.trim();
    const readerAddress = config.readerAddress?.trim() ?? protocolAddress;
    const privateKey = config.privateKey?.trim();

    if (!rpcUrl || !protocolAddress || !readerAddress) {
      throw new Error(
        "Thiếu cấu hình blockchain (rpcUrl hoặc protocolAddress)",
      );
    }

    this.provider = new JsonRpcProvider(rpcUrl);

    if (privateKey) {
      this.wallet = new Wallet(privateKey, this.provider);
      this.protocolContract = new Contract(
        protocolAddress,
        VoucherProtocolABI.abi,
        this.wallet,
      );
    } else {
      this.protocolContract = new Contract(
        protocolAddress,
        VoucherProtocolABI.abi,
        this.provider,
      );
    }

    this.readerContract = new Contract(
      readerAddress,
      VoucherProtocolReaderABI.abi,
      this.provider,
    );
  }

  get signer(): Wallet | undefined {
    return this.wallet;
  }

  get instance(): Contract {
    return this.protocolContract;
  }

  get reader(): Contract {
    return this.readerContract;
  }

  // --- Base (only-view) ---

  async getTenantCount(): Promise<bigint> {
    return (await this.readerContract.getTenantCount()) as bigint;
  }

  async getOperatorCount(tenantId: string): Promise<bigint> {
    return (await this.readerContract.getOperatorCount(tenantId)) as bigint;
  }

  async getTenantIds(start = 0, limit = 10): Promise<string[]> {
    return (await this.readerContract.getTenantIds(start, limit)) as string[];
  }

  async getOperatorIds(
    tenantId: string,
    start = 0,
    limit = 10,
  ): Promise<string[]> {
    return (await this.readerContract.getOperatorIds(
      tenantId,
      start,
      limit,
    )) as string[];
  }

  async getTenantInfo(id: string): Promise<TenantInfo | null> {
    const info = (await this.readerContract.getTenantInfo(id)) as TenantTuple;
    const [exists, admin, treasury, isActive, createdAt] = info;

    if (!exists) {
      return null;
    }

    return {
      id,
      admin,
      treasury,
      isActive,
      createdAt,
    };
  }

  async listOperators(
    tenantId: string,
    start = 0,
    limit = 10,
  ): Promise<OperatorStatus[]> {
    try {
      const operatorAddresses = await this.readerContract.getOperatorIds(
        tenantId,
        start,
        limit,
      );

      const operators = await Promise.all(
        operatorAddresses.map((address: string) =>
          this.readerContract.getOperatorStatus(tenantId, address),
        ),
      );

      return operators.filter((op) => op.exists);
    } catch (error) {
      throw new Error("Lỗi khi lấy danh sách Operator: " + error);
    }
  }

  async listTenants(start = 0, limit = 10): Promise<TenantInfo[]> {
    const ids = await this.getTenantIds(start, limit);
    const tenants = await Promise.all(ids.map((id) => this.getTenantInfo(id)));
    return tenants.filter((tenant): tenant is TenantInfo => tenant !== null);
  }

  async getOperatorStatus(
    tenantId: string,
    operator: string,
  ): Promise<OperatorStatus> {
    try {
      const operatorStatus = await this.readerContract.getOperatorStatus(
        tenantId,
        operator,
      );

      return {
        exists: operatorStatus.exists,
        isActive: operatorStatus.isActive,
        metadataURI: operatorStatus.metadataURI,
        stakeAmount: operatorStatus.stakeAmount,
        nonce: operatorStatus.nonce,
        unstakeReadyAt: operatorStatus.unstakeReadyAt,
        canUnstakeNow: operatorStatus.canUnstakeNow,
        recoveryDelegate: operatorStatus.recoveryDelegate,
      };
    } catch (error) {
      throw new Error("Could not fetch operator data " + error);
    }
  }

  async getDocumentStatus(
    tenantId: string,
    fileHash: string,
  ): Promise<DocumentSnapshot> {
    try {
      const documentStatus = await this.readerContract.getDocumentStatus(
        tenantId,
        fileHash,
      );
      return {
        exists: documentStatus.exists,
        isValid: documentStatus.isValid,
        issuer: documentStatus.issuer,
        cid: documentStatus.cid,
        timestamp: documentStatus.timestamp,
        ciphertextHash: documentStatus.ciphertextHash,
        encryptionMetaHash: documentStatus.encryptionMetaHash,
        docType: documentStatus.docType,
        version: documentStatus.version,
        coSignCount: documentStatus.coSignCount,
        trustedCoSignCount: documentStatus.trustedCoSignCount,
        trustedCoSignRoleMask: documentStatus.trustedCoSignRoleMask,
        coSignQualified: documentStatus.coSignQualified,
      };
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async verify(tenantId: string, fileHash: string): Promise<VerifyStatus> {
    try {
      return (await this.readerContract.verify(
        tenantId,
        fileHash,
      )) as VerifyStatus;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async getDocumentOrRevert(
    tenantId: string,
    fileHash: string,
  ): Promise<unknown> {
    try {
      return await this.readerContract.getDocumentOrRevert(tenantId, fileHash);
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async hasSignedDocument(
    tenantId: string,
    fileHash: string,
    signer: string,
  ): Promise<boolean> {
    try {
      return Boolean(
        await this.readerContract.hasSignedDocument(tenantId, fileHash, signer),
      );
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async isDocumentCoSignQualified(
    tenantId: string,
    fileHash: string,
  ): Promise<boolean> {
    try {
      const isQualified = await this.readerContract.isDocumentCoSignQualified(
        tenantId,
        fileHash,
      );
      return isQualified;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async getCoSignStatus(
    tenantId: string,
    fileHash: string,
  ): Promise<CoSignStatus> {
    try {
      const result = await this.readerContract.getCoSignStatus(
        tenantId,
        fileHash,
      );
      return {
        coSignQualified: result[0],
        coSignCount: Number(result[1]),
        trustedCoSignCount: Number(result[2]),
        trustedCoSignRoleMask: BigInt(result[3]),
        requiredRoleMask: BigInt(result[4]),
        minSigners: Number(result[5]),
        minStake: BigInt(result[6]),
      };
    } catch (error) {
      throw new Error(
        "Tài liệu không tồn tại hoặc chưa được khai báo " + error,
      );
    }
  }

  async getNonce(tenantId: string, operatorAddress: string): Promise<bigint> {
    try {
      const nonce = await this.protocolContract.nonces(
        tenantId,
        operatorAddress,
      );
      return BigInt(nonce);
    } catch (error) {
      throw new Error("" + error);
    }
  }

  async getCoSignPolicy(
    tenantId: string,
    docType: number,
  ): Promise<{
    enabled: boolean;
    minStake: bigint;
    minSigners: bigint;
    requiredRoleMask: bigint;
  }> {
    try {
      const result = await this.readerContract.getCoSignPolicy(
        tenantId,
        docType,
      );
      return {
        enabled: Boolean(result[0]),
        minStake: BigInt(result[1]),
        minSigners: BigInt(result[2]),
        requiredRoleMask: BigInt(result[3]),
      };
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async getCoSignOperatorConfig(
    tenantId: string,
    docType: number,
    operator: string,
  ): Promise<{ whitelisted: boolean; roleId: number }> {
    try {
      const result = await this.readerContract.getCoSignOperatorConfig(
        tenantId,
        docType,
        operator,
      );
      return {
        whitelisted: Boolean(result[0]),
        roleId: Number(result[1]),
      };
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async getTenantRuntimeConfig(
    tenantId: string,
  ): Promise<{ minOperatorStake: bigint; unstakeCooldown: bigint }> {
    try {
      const result = await this.readerContract.getTenantRuntimeConfig(tenantId);
      return {
        minOperatorStake: BigInt(result[0]),
        unstakeCooldown: BigInt(result[1]),
      };
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async getViolationPenalty(
    tenantId: string,
    violationCode: string,
  ): Promise<number> {
    try {
      const penaltyBps = await this.readerContract.getViolationPenalty(
        tenantId,
        violationCode,
      );
      return Number(penaltyBps);
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  // --- OWNER PROTOCOL ---

  async createTenant(
    tenantName: string,
    treasuryAddress: string,
    config: TenantConfig,
  ): Promise<string> {
    if (!this.wallet) {
      throw new Error(
        "Client chưa có privateKey nên không thể gửi transaction ",
      );
    }

    const tx = await this.protocolContract.createTenant(
      generate_tenant_id(tenantName),
      treasuryAddress,
      {
        admin: config.admin,
        slasher: config.slasher,
        operatorManager: config.operatorManager,
        minStake: parseEther(config.minStake),
        unstakeCooldown: config.unstakeCooldown,
      },
    );
    const receipt = await tx.wait();
    return receipt.hash as string;
  }

  async setTenantStatus(tenantId: string, isActive: boolean): Promise<string> {
    try {
      const tx = await this.protocolContract.setTenantStatus(
        tenantId,
        isActive,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  // --- OPERATOR ---

  async joinAsOperator(
    tenantId: string,
    metadataURI: string,
    stakeAmount: string,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.joinAsOperator(
        tenantId,
        metadataURI,
        {
          value: parseEther(stakeAmount),
        },
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error("Lỗi gia nhập Operator: " + error);
    }
  }

  async topUpStake(tenantId: string, stakeAmount: string): Promise<string> {
    try {
      const tx = await this.protocolContract.topUpStake(tenantId, {
        value: parseEther(stakeAmount),
      });
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async updateOperatorMetadata(
    tenantId: string,
    metadataURI: string,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.updateOperatorMetadata(
        tenantId,
        metadataURI,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async requestUnstake(tenantId: string): Promise<string> {
    try {
      const tx = await this.protocolContract.requestUnstake(tenantId);
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async executeUnstake(tenantId: string): Promise<string> {
    try {
      const tx = await this.protocolContract.executeUnstake(tenantId);
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async registerWithSignature(payload: RegisterPayload): Promise<string> {
    try {
      if (!this.wallet) throw new Error("Cần Private Key để ký!");

      const domain = {
        name: "VoucherProtocol",
        version: "1",
        chainId: CHAIN_ID,
        verifyingContract: this.protocolContract.target as string,
      };

      const types = {
        Register: [
          { name: "tenantId", type: "bytes32" },
          { name: "fileHash", type: "bytes32" },
          { name: "cid", type: "string" },
          { name: "ciphertextHash", type: "bytes32" },
          { name: "encryptionMetaHash", type: "bytes32" },
          { name: "docType", type: "uint32" },
          { name: "version", type: "uint32" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const signature = await this.wallet.signTypedData(domain, types, payload);
      const tx = await this.protocolContract.registerWithSignature(
        payload,
        signature,
      );
      const receipt = await tx.wait();

      return receipt.hash as string;
    } catch (error) {
      throw new Error("" + error);
    }
  }

  async coSignDocumentWithSignature(payload: {
    tenantId: string;
    fileHash: string;
    nonce: bigint;
    deadline: bigint;
  }): Promise<string> {
    try {
      if (!this.wallet) throw new Error("Cần Private Key để ký!");

      const domain = {
        name: "VoucherProtocol",
        version: "1",
        chainId: CHAIN_ID,
        verifyingContract: this.protocolContract.target as string,
      };

      const types = {
        CoSign: [
          { name: "tenantId", type: "bytes32" },
          { name: "fileHash", type: "bytes32" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const signature = await this.wallet.signTypedData(domain, types, payload);
      const tx = await this.protocolContract.coSignDocumentWithSignature(
        payload,
        signature,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async setRecoveryDelegate(
    tenantId: string,
    delegate: string,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.setRecoveryDelegate(
        tenantId,
        delegate,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async recoverOperatorByDelegate(
    tenantId: string,
    lostOperator: string,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.recoverOperatorByDelegate(
        tenantId,
        lostOperator,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  // --- TENANT ADMIN ---

  async setTreasury(tenantId: string, newTreasury: string): Promise<string> {
    try {
      const tx = await this.protocolContract.setTreasury(tenantId, newTreasury);
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async revokeDocument(
    tenantId: string,
    fileHash: string,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.revokeDocument(
        tenantId,
        fileHash,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  // --- TENANT SLAHER ---

  async slashOperator(
    tenantId: string,
    operator: string,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.slashOperator(
        tenantId,
        operator,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async softSlashOperator(
    tenantId: string,
    operator: string,
    violationCode: string,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.softSlashOperator(
        tenantId,
        operator,
        violationCode,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  // --- Tenant operator manager ---

  async setOperatorStatus(
    tenantId: string,
    operator: string,
    isActive: boolean,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.setOperatorStatus(
        tenantId,
        operator,
        isActive,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async recoverOperatorByAdmin(
    tenantId: string,
    lostOperator: string,
    newOperator: string,
    reason: string,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.recoverOperatorByAdmin(
        tenantId,
        lostOperator,
        newOperator,
        reason,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async setCoSignPolicy(
    tenantId: string,
    docType: number,
    enabled: boolean,
    minStake: bigint,
    minSigners: bigint,
    requiredRoleMask: bigint,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.setCoSignPolicy(
        tenantId,
        docType,
        enabled,
        minStake,
        minSigners,
        requiredRoleMask,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
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
      const tx = await this.protocolContract.setCoSignOperator(
        tenantId,
        docType,
        operator,
        whitelisted,
        roleId,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async setMinOperatorStake(
    tenantId: string,
    newMinOperatorStake: bigint,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.setMinOperatorStake(
        tenantId,
        newMinOperatorStake,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async setUnstakeCooldown(
    tenantId: string,
    newUnstakeCooldown: bigint,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.setUnstakeCooldown(
        tenantId,
        newUnstakeCooldown,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  async setViolationPenalty(
    tenantId: string,
    violationCode: string,
    penaltyBps: number,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.setViolationPenalty(
        tenantId,
        violationCode,
        penaltyBps,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(" " + error);
    }
  }
}

export function createBlockchainClient(
  config: BlockchainConfig,
): BlockchainClient {
  return new BlockchainClient(config);
}

export function createBlockchainClientFromEnv(): BlockchainClient {
  const rpcUrl = process.env.RPC_URL?.trim();
  const privateKey = process.env.PRIVATE_KEY?.trim();
  const protocolAddress = process.env.PROTOCOL_ADDRESS?.trim();
  const readerAddress = process.env.READER_ADDRESS?.trim();

  if (!rpcUrl || !protocolAddress) {
    throw new Error(
      "Bổ sung biến môi trường vào .env (RPC_URL hoặc PROTOCOL_ADDRESS)",
    );
  }

  return new BlockchainClient({
    rpcUrl,
    privateKey,
    protocolAddress,
    readerAddress,
  });
}

export async function init(): Promise<BlockchainClient> {
  return createBlockchainClientFromEnv();
}

export function createRegisterPayload(
  data: Partial<RegisterPayload> & {
    tenantId: string;
    fileHash: string;
    cid: string;
    ciphertextHash: string;
    encryptionMetaHash: string;
    docType: number;
    version: number;
    nonce: bigint;
  },
): RegisterPayload {
  return {
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // Mặc định 1 tiếng
    ...data,
  };
}
