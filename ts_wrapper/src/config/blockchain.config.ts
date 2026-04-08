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

  async createTenant(
    tenantName: string,
    adminAddress: string,
    treasuryAddress: string,
  ): Promise<string> {
    if (!this.wallet) {
      throw new Error(
        "Client chưa có privateKey nên không thể gửi transaction ",
      );
    }

    const tx = await this.protocolContract.createTenant(
      generate_tenant_id(tenantName),
      adminAddress,
      treasuryAddress,
    );
    return tx.hash as string;
  }

  async joinAsOperator(
    tenantId: string,
    _metadataURI: string,
    stakeAmount: string,
  ) {
    try {
      const tx = await this.protocolContract.joinAsOperator(
        tenantId,
        _metadataURI,
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

  async registerWithSignature(payload: RegisterPayload): Promise<string> {
    try {
      if (!this.wallet) throw new Error("Cần Private Key để ký!");

      // Định nghĩa Domain
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

      const signature = await this.wallet?.signTypedData(
        domain,
        types,
        payload,
      );
      const tx = await this.protocolContract.registerWithSignature(
        payload,
        signature,
      );

      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      throw new Error("" + error);
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

  /**
   * @notice Thu hồi hiệu lực tài liệu bởi tenant admin hoặc issuer.
   */
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
      return receipt.hash;
    } catch (error) {
      throw new Error(" " + error);
    }
  }

  /**
   * @notice Lấy nonce hiện tại của một operator trong một tenant cụ thể.
   * @param tenantId ID của tenant (bytes32)
   * @param operatorAddress Địa chỉ ví của operator
   */
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

  async verify(tenantId: string, fileHash: string): Promise<VerifyStatus> {
    try {
      const verifyStatus = await this.readerContract.verify(tenantId, fileHash);

      return verifyStatus;
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
