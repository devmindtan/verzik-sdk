export {
  BlockchainClient,
  createBlockchainClient,
  createBlockchainClientFromEnv,
  createRegisterPayload,
  init,
} from "../blockchain/blockchain.client";

export {
  DirectQueryClient,
  createDirectQueryClient,
  createDirectQueryClientFromEnv,
} from "../blockchain/blockchain.direct-query";

export {
  BlockchainSetClient,
  createBlockchainSetClient,
  createBlockchainSetClientFromEnv,
} from "../blockchain/blockchain.set-client";

export {
  GraphQueryClient,
  createGraphQueryClient,
} from "../blockchain/blockchain.graph-query";

export {
  BlockchainContext,
  createBlockchainContext,
} from "../blockchain/blockchain.context";
import dotenv from "dotenv";
import VoucherProtocolABI from "../abi/VoucherProtocolModule#VoucherProtocol.json";
import VoucherProtocolReaderABI from "../abi/VoucherProtocolModule#VoucherProtocolReader.json";

import {
  JsonRpcProvider,
  Wallet,
  Contract,
  parseEther,
  formatEther,
  id,
} from "ethers";
import type { Block } from "ethers";
import type {
  BlockchainConfig,
  TenantInfo,
  CoSignStatus,
  RegisterPayload,
  OperatorStatus,
  DocumentSnapshot,
  VerifyStatus,
  TenantConfig,
  DecodedLog,
  EnhancedTxResult,
} from "../types";
import { generate_tenant_id } from "../../core_wasm/verzik_sdk";
import { decodeContractError } from "../contract-errors";

dotenv.config();

type TenantTuple = [boolean, string, string, string, boolean, bigint];

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

  private async _err(error: any): Promise<string> {
    const iface = this.protocolContract?.interface;

    let rescuedData: string | undefined;
    if (error?.transaction) {
      try {
        await this.provider.call(error.transaction);
      } catch (callErr: any) {
        const raw =
          callErr?.data ?? callErr?.error?.data ?? callErr?.info?.error?.data;
        rescuedData = typeof raw === "string" ? raw : raw?.data;
      }
    }

    const patchedError = rescuedData ? { ...error, data: rescuedData } : error;

    return decodeContractError(patchedError, iface);
  }

  // --- Base (only-view) ---

  /** Trả về tổng số tenant đã tạo trên protocol.
   * @returns Số lượng tenant (bigint)
   */
  async getTenantCount(): Promise<bigint> {
    return (await this.readerContract.getTenantCount()) as bigint;
  }

  async getTransactionByHash(txHash: string): Promise<EnhancedTxResult> {
    try {
      // 1. Lấy dữ liệu thô đồng thời để tối ưu hiệu năng (Parallel)
      const [transaction, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash),
      ]);

      if (!transaction) {
        throw new Error(`Không tìm thấy giao dịch: ${txHash}`);
      }

      // 2. Lấy Block và tính Confirmations
      let block: Block | null = null;
      let confirmations = 0;

      if (receipt) {
        const currentBlock = await this.provider.getBlockNumber();
        block = await this.provider.getBlock(receipt.blockNumber);
        confirmations = currentBlock - receipt.blockNumber + 1;
      }

      // 3. GIẢI MÃ DỮ LIỆU (Phần quan trọng nhất)
      let decodedInput;
      let decodedLogs: DecodedLog[] = [];

      // Lấy interface từ contract của bạn (this.protocolContract.interface)
      const contractInterface = this.protocolContract.interface;

      if (contractInterface) {
        // Giải mã Input (Biết được hàm nào đã gọi và tham số truyền vào)
        try {
          decodedInput = contractInterface.parseTransaction({
            data: transaction.data,
            value: transaction.value,
          });
        } catch (e) {
          /* Giao dịch không thuộc contract này */
        }

        // Giải mã Logs (Biết được các Event/Emit đã bắn ra)
        if (receipt?.logs) {
          decodedLogs = receipt.logs
            .map((log) => {
              try {
                const parsed = contractInterface.parseLog(log);
                return parsed
                  ? {
                    name: parsed.name,
                    signature: parsed.signature,
                    args: parsed.args.toObject(),
                  }
                  : null;
              } catch (e) {
                return null;
              }
            })
            .filter((log): log is DecodedLog => log !== null);
        }
      }

      return {
        transaction,
        receipt,
        block,
        confirmations: Math.max(0, confirmations),
        decodedInput,
        decodedLogs,
      };
    } catch (error: any) {
      throw new Error(`Lỗi Explorer: ${error.message}`);
    }
  }
  async getOperatorCount(tenantId: string): Promise<bigint> {
    return (await this.readerContract.getOperatorCount(tenantId)) as bigint;
  }

  /** Lấy danh sách ID tenant theo trang.
   * @param start - Vị trí bắt đầu (mặc định 0)
   * @param limit - Số lượng tối đa (mặc định 10)
   * @returns Mảng bytes32 hex ID
   */
  async getTenantIds(start = 0, limit = 10): Promise<string[]> {
    return (await this.readerContract.getTenantIds(start, limit)) as string[];
  }

  /** Lấy danh sách địa chỉ operator của tenant theo trang.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param start - Vị trí bắt đầu (mặc định 0)
   * @param limit - Số lượng tối đa (mặc định 10)
   * @returns Mảng địa chỉ operator
   */
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

  /** Lấy thông tin chi tiết một tenant.
   * @param id - ID tenant (bytes32 hex)
   * @returns `{ id, admin, operatorManager, treasury, isActive, createdAt }` hoặc `null` nếu không tồn tại
   */
  async getTenantInfo(id: string): Promise<TenantInfo | null> {
    const info = (await this.readerContract.getTenantInfo(id)) as TenantTuple;
    const [exists, admin, operatorManager, treasury, isActive, createdAt] =
      info;

    if (!exists) {
      return null;
    }

    return {
      id,
      admin,
      operatorManager,
      treasury,
      isActive,
      createdAt,
    };
  }

  /** Lấy danh sách operator của tenant kèm trạng thái đầy đủ.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param start - Vị trí bắt đầu (mặc định 0)
   * @param limit - Số lượng tối đa (mặc định 10)
   * @returns Mảng `OperatorStatus` (chỉ những operator `exists = true`)
   */
  async listOperators(
    tenantId: string,
    start = 0,
    limit = 10,
  ): Promise<OperatorStatus[]> {
    try {
      const operatorAddresses = (await this.readerContract.getOperatorIds(
        tenantId,
        start,
        limit,
      )) as string[];

      const operators = await Promise.all(
        operatorAddresses.map(async (address: string) => {
          const op = await this.readerContract.getOperatorStatus(
            tenantId,
            address,
          );
          return {
            exists: op.exists,
            isActive: op.isActive,
            walletAddress:
              op.walletAddress !== "0x0000000000000000000000000000000000000000"
                ? op.walletAddress
                : address,
            metadataURI: op.metadataURI,
            stakeAmount: formatEther(op.stakeAmount) + " ETH",
            nonce: op.nonce,
            unstakeReadyAt: op.unstakeReadyAt,
            canUnstakeNow: op.canUnstakeNow,
            recoveryDelegate: op.recoveryDelegate,
          } as OperatorStatus;
        }),
      );

      return operators.filter((op) => op.exists);
    } catch (error) {
      throw new Error("Could not list operators: " + error);
    }
  }

  /** Lấy danh sách tenant kèm thông tin đầy đủ theo trang.
   * @param start - Vị trí bắt đầu (mặc định 0)
   * @param limit - Số lượng tối đa (mặc định 10)
   * @returns Mảng `TenantInfo`
   */
  async listTenants(start = 0, limit = 10): Promise<TenantInfo[]> {
    const ids = await this.getTenantIds(start, limit);
    const tenants = await Promise.all(ids.map((id) => this.getTenantInfo(id)));
    return tenants.filter((tenant): tenant is TenantInfo => tenant !== null);
  }

  /** Lấy trạng thái đầy đủ của một operator trong tenant.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param operator - Địa chỉ ví operator
   * @returns `{ exists, isActive, walletAddress, stakeAmount, nonce, unstakeReadyAt, canUnstakeNow, recoveryDelegate, metadataURI }`
   */
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
        walletAddress: operatorStatus.walletAddress,
        metadataURI: operatorStatus.metadataURI,
        stakeAmount: formatEther(operatorStatus.stakeAmount) + " ETH",
        nonce: operatorStatus.nonce,
        unstakeReadyAt: operatorStatus.unstakeReadyAt,
        canUnstakeNow: operatorStatus.canUnstakeNow,
        recoveryDelegate: operatorStatus.recoveryDelegate,
      };
    } catch (error) {
      throw new Error("Could not fetch operator status: " + error);
    }
  }

  /** Lấy snapshot trạng thái tài liệu.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param fileHash - Hash file (bytes32 hex)
   * @returns `{ exists, isValid, issuer, cid, timestamp, docType, version, coSignCount, trustedCoSignCount, coSignQualified, ... }`
   */
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
      throw new Error(String(error));
    }
  }

  /** Xác thực tài liệu có hợp lệ không.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param fileHash - Hash file (bytes32 hex)
   * @returns `VerifyStatus` (exists, isValid, issuer, cid)
   */
  async verify(tenantId: string, fileHash: string): Promise<VerifyStatus> {
    try {
      return (await this.readerContract.verify(
        tenantId,
        fileHash,
      )) as VerifyStatus;
    } catch (error) {
      throw new Error(await this._err(error));
    }
  }

  /** Lấy tài liệu hoặc revert nếu không tồn tại.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param fileHash - Hash file (bytes32 hex)
   * @returns Dữ liệu tài liệu thô từ contract
   */
  async getDocumentOrRevert(
    tenantId: string,
    fileHash: string,
  ): Promise<unknown> {
    try {
      return await this.readerContract.getDocumentOrRevert(tenantId, fileHash);
    } catch (error) {
      throw new Error(await this._err(error));
    }
  }

  /** Kiểm tra một địa chỉ đã co-sign tài liệu chưa.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param fileHash - Hash file (bytes32 hex)
   * @param signer - Địa chỉ cần kiểm tra
   * @returns `true` nếu đã ký
   */
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
      throw new Error(await this._err(error));

    }
  }

  /** Kiểm tra tài liệu đã đạt ngưỡng co-sign chưa.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param fileHash - Hash file (bytes32 hex)
   * @returns `true` nếu qualified
   */
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
      throw new Error(await this._err(error));
    }
  }

  /** Lấy tiến trình co-sign của tài liệu.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param fileHash - Hash file (bytes32 hex)
   * @returns `{ coSignQualified, coSignCount, trustedCoSignCount, trustedCoSignRoleMask, requiredRoleMask, minSigners, minStake }`
   */
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
        minStake: formatEther(result[6]) + " ETH",
      };
    } catch (error) {
      throw new Error(await this._err(error));
    }
  }

  /** Lấy nonce hiện tại của operator (dùng để tạo signature EIP-712).
   * @param tenantId - ID tenant (bytes32 hex)
   * @param operatorAddress - Địa chỉ operator
   * @returns Nonce hiện tại (bigint)
   */
  async getNonce(tenantId: string, operatorAddress: string): Promise<bigint> {
    try {
      const nonce = await this.protocolContract.nonces(
        tenantId,
        operatorAddress,
      );
      return BigInt(nonce);
    } catch (error) {
      throw new Error(String(error));
    }
  }

  /** Lấy chính sách co-sign cho một loại tài liệu.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param docType - Loại tài liệu (số nguyên)
   * @returns `{ enabled, minStake, minSigners, requiredRoleMask }`
   */
  async getCoSignPolicy(
    tenantId: string,
    docType: number,
  ): Promise<{
    enabled: boolean;
    /** Formatted ETH string, e.g. "1.5 ETH" */
    minStake: string;
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
        minStake: formatEther(result[1]) + " ETH",
        minSigners: BigInt(result[2]),
        requiredRoleMask: BigInt(result[3]),
      };
    } catch (error) {
      throw new Error(String(error));
    }
  }

  /** Lấy cấu hình co-sign của một operator cụ thể cho loại tài liệu.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param docType - Loại tài liệu (số nguyên)
   * @param operator - Địa chỉ operator
   * @returns `{ whitelisted, roleId }`
   */
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
      throw new Error(String(error));
    }
  }

  /** Lấy cấu hình runtime hiện tại của tenant.
   * @param tenantId - ID tenant (bytes32 hex)
   * @returns `{ minOperatorStake (ETH string), unstakeCooldown (giây, bigint) }`
   */
  async getTenantRuntimeConfig(
    tenantId: string,
  ): Promise<{ minOperatorStake: string; unstakeCooldown: bigint }> {
    try {
      const result = await this.readerContract.getTenantRuntimeConfig(tenantId);
      return {
        minOperatorStake: formatEther(result[0]) + " ETH",
        unstakeCooldown: BigInt(result[1]),
      };
    } catch (error) {
      throw new Error(String(error));
    }
  }

  /** Lấy mức phạt (BPS) của một mã vi phạm.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param violationCode - Mã vi phạm (string, tự động hash `id()`)
   * @returns Mức phạt theo BPS (1 BPS = 0.01%)
   */
  async getViolationPenalty(
    tenantId: string,
    violationCode: string,
  ): Promise<number> {
    try {
      const penaltyBps = await this.readerContract.getViolationPenalty(
        tenantId,
        id(violationCode),
        id(violationCode),
      );
      return Number(penaltyBps);
    } catch (error) {
      throw new Error(String(error));
    }
  }

  // --- OWNER PROTOCOL ---

  /** Tạo tenant mới. Yêu cầu quyền `PROTOCOL_ADMIN_ROLE`.
   * @param tenantName - Tên tenant (chuỗi, tự động sinh tenantId bytes32)
   * @param treasuryAddress - Địa chỉ nhận phí
   * @param config - `{ admin, operatorManager, minStake (ETH string), unstakeCooldown (giây) }`
   * @returns Transaction hash
   */
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

    try {
      const tx = await this.protocolContract.createTenant(
        generate_tenant_id(tenantName),
        treasuryAddress,
        {
          admin: config.admin,
          slasher: config.slasher ?? config.operatorManager,
          operatorManager: config.operatorManager,
          minStake: parseEther(config.minStake),
          unstakeCooldown: config.unstakeCooldown,
        },
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this._err(error));
    }
  }

  /** Bật / tắt trạng thái hoạt động của tenant. Yêu cầu `PROTOCOL_ADMIN_ROLE`.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param isActive - `true` = bật, `false` = đóng băng
   * @returns Transaction hash
   */
  async setTenantStatus(tenantId: string, isActive: boolean): Promise<string> {
    try {
      const tx = await this.protocolContract.setTenantStatus(
        tenantId,
        isActive,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(String(error));
    }
  }

  // --- OPERATOR ---

  /** Đăng ký trở thành operator của tenant (gửi kèm native token làm stake).
   * @param tenantId - ID tenant (bytes32 hex)
   * @param metadataURI - URI metadata (HTTPS hoặc IPFS)
   * @param stakeAmount - Số ETH stake (ví dụ: `"1.5"`)
   * @returns Transaction hash
   */
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
      throw new Error(await this._err(error));
    }
  }

  /** Nạp thêm stake cho operator hiện tại trong tenant.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param stakeAmount - Số ETH cần nạp thêm (ví dụ: `"0.5"`)
   * @returns Transaction hash
   */
  async topUpStake(tenantId: string, stakeAmount: string): Promise<string> {
    try {
      const tx = await this.protocolContract.topUpStake(tenantId, {
        value: parseEther(stakeAmount),
      });
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(String(error));
    }
  }

  /** Cập nhật URI metadata của operator.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param metadataURI - URI mới
   * @returns Transaction hash
   */
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
      throw new Error(String(error));
    }
  }

  /** Khởi động thời gian chờ unstake. Phải chờ đủ `unstakeCooldown` mới rút được.
   * @param tenantId - ID tenant (bytes32 hex)
   * @returns Transaction hash
   */
  async requestUnstake(tenantId: string): Promise<string> {
    try {
      const tx = await this.protocolContract.requestUnstake(tenantId);
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(String(error));
    }
  }

  /** Thực hiện rút stake sau khi cooldown đã hết. ETH trả về ví operator.
   * @param tenantId - ID tenant (bytes32 hex)
   * @returns Transaction hash
   */
  async executeUnstake(tenantId: string): Promise<string> {
    try {
      const tx = await this.protocolContract.executeUnstake(tenantId);
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(String(error));
    }
  }

  /** Đăng ký tài liệu bằng chữ ký EIP-712 của operator.
   * @param payload - `{ tenantId, fileHash, cid, ciphertextHash, encryptionMetaHash, docType, version, nonce, deadline }`
   * @returns Transaction hash
   */
  async registerWithSignature(payload: RegisterPayload): Promise<string> {
    try {
      if (!this.wallet) throw new Error("Cần Private Key để ký!");

      const network = await this.provider.getNetwork();
      const domain = {
        name: "VoucherProtocol",
        version: "1",
        chainId: network.chainId,
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
      throw new Error(String(error));
    }
  }

  /** Đồng ký tài liệu bằng chữ ký EIP-712.
   * @param payload - `{ tenantId, fileHash, nonce, deadline }`
   * @returns Transaction hash
   */
  async coSignDocumentWithSignature(payload: {
    tenantId: string;
    fileHash: string;
    nonce: bigint;
    deadline: bigint;
  }): Promise<string> {
    try {
      if (!this.wallet) throw new Error("Cần Private Key để ký!");

      const network = await this.provider.getNetwork();
      const domain = {
        name: "VoucherProtocol",
        version: "1",
        chainId: network.chainId,
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
      throw new Error(String(error));
    }
  }

  /** Ủy quyền một địa chỉ khác thực hiện recovery cho tài khoản operator.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param delegate - Địa chỉ được ủy quyền
   * @returns Transaction hash
   */
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
      throw new Error(String(error));
    }
  }

  /** Phục hồi operator thông qua delegate đã được ủy quyền (cần gọi từ ví delegate).
   * @param tenantId - ID tenant (bytes32 hex)
   * @param lostOperator - Địa chỉ ví cũ cần phục hồi
   * @param reason - Lý do (string)
   * @returns Transaction hash
   */
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
      throw new Error(String(error));
    }
  }

  // --- TENANT ADMIN ---

  /** Cập nhật địa chỉ treasury của tenant. Yêu cầu quyền Admin.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param newTreasury - Địa chỉ treasury mới (không được trùng role khác)
   * @returns Transaction hash
   */
  async setTreasury(tenantId: string, newTreasury: string): Promise<string> {
    try {
      const tx = await this.protocolContract.setTreasury(tenantId, newTreasury);
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(String(error));
    }
  }

  /** Thu hồi tài liệu (đánh dấu vô hiệu). Yêu cầu quyền Tenant Admin.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param fileHash - Hash file (bytes32 hex)
   * @param reason - Lý do thu hồi
   * @returns Transaction hash
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
      return receipt.hash as string;
    } catch (error) {
      throw new Error(String(error));
    }
  }

  // --- TENANT OPERATOR MANAGER (slash) ---

  /** Phạt nặng operator: mất toàn bộ stake, vô hiệu hóa. Yêu cầu quyền Operator Manager.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param operator - Địa chỉ operator bị phạt
   * @param reason - Lý do (string)
   * @returns Transaction hash
   */
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
      throw new Error(String(error));
    }
  }

  /** Phạt nhẹ operator dựa theo mã vi phạm và tỷ lệ BPS đã cấu hình. Yêu cầu quyền Operator Manager.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param operator - Địa chỉ operator bị phạt
   * @param violationCode - Mã vi phạm (string)
   * @param reason - Lý do (string)
   * @returns Transaction hash
   */
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
      throw new Error(String(error));
    }
  }

  // --- Tenant operator manager ---

  /** Bật / tắt trạng thái hoạt động của operator. Yêu cầu quyền Operator Manager.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param operator - Địa chỉ operator
   * @param isActive - `true` = bật, `false` = khóa
   * @param reason - Lý do (string)
   * @returns Transaction hash
   */
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
      throw new Error(String(error));
    }
  }

  /** Phục hồi operator bằng cách chuyển sang ví mới (Admin thực hiện thay).
   * @param tenantId - ID tenant (bytes32 hex)
   * @param lostOperator - Địa chỉ ví cũ
   * @param newOperator - Địa chỉ ví mới
   * @param reason - Lý do (string)
   * @returns Transaction hash
   */
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
      throw new Error(String(error));
    }
  }

  /** Thiết lập chính sách co-sign cho loại tài liệu. Yêu cầu quyền Operator Manager.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param docType - Loại tài liệu (số nguyên)
   * @param enabled - Bật/tắt policy
   * @param minStake - Stake tối thiểu (ETH string, ví dụ: `"1.0"`)
   * @param minSigners - Số co-signer tối thiểu (bigint)
   * @param requiredRoleMask - Role mask yêu cầu (bigint)
   * @returns Transaction hash
   */
  async setCoSignPolicy(
    tenantId: string,
    docType: number,
    enabled: boolean,
    minStake: string,
    minSigners: bigint,
    requiredRoleMask: bigint,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.setCoSignPolicy(
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
      throw new Error(await this._err(error));
    }
  }

  /** Cấp/thu hồi quyền co-sign và role cho operator trên một loại tài liệu.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param docType - Loại tài liệu (số nguyên)
   * @param operator - Địa chỉ operator
   * @param whitelisted - `true` = cấp quyền, `false` = thu hồi
   * @param roleId - Role ID (số nguyên)
   * @returns Transaction hash
   */
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
      throw new Error(await this._err(error));
    }
  }

  /** Cập nhật mức stake tối thiểu cho operator của tenant. Yêu cầu quyền Operator Manager.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param newMinOperatorStake - Mức stake mới (ETH string, ví dụ: `"2.0"`)
   * @returns Transaction hash
   */
  async setMinOperatorStake(
    tenantId: string,
    newMinOperatorStake: string,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.setMinOperatorStake(
        tenantId,
        parseEther(newMinOperatorStake),
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this._err(error));
    }
  }

  /** Cập nhật thời gian chờ unstake. Yêu cầu quyền Operator Manager.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param newUnstakeCooldown - Thời gian chờ tính bằng giây (bigint, ví dụ: `86400n` = 1 ngày)
   * @returns Transaction hash
   */
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
      throw new Error(await this._err(error));
    }
  }

  /** Cấu hình mức phạt (BPS) cho mã vi phạm. Yêu cầu quyền Operator Manager.
   * @param tenantId - ID tenant (bytes32 hex)
   * @param violationCode - Mã vi phạm (string, tự động hash `id()`)
   * @param penaltyBps - Mức phạt (1 BPS = 0.01%, tối đa 10000 = 100%)
   * @returns Transaction hash
   */
  async setViolationPenalty(
    tenantId: string,
    violationCode: string,
    penaltyBps: number,
  ): Promise<string> {
    try {
      const tx = await this.protocolContract.setViolationPenalty(
        tenantId,
        id(violationCode),
        penaltyBps,
      );
      const receipt = await tx.wait();
      return receipt.hash as string;
    } catch (error) {
      throw new Error(await this._err(error));
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

  // External library addresses (linked at deploy, not called directly by SDK)
  const operatorLibAddress = process.env.OPERATOR_LIB_ADDRESS?.trim();
  const documentLibAddress = process.env.DOCUMENT_LIB_ADDRESS?.trim();
  const coSignLibAddress = process.env.COSIGN_LIB_ADDRESS?.trim();
  const recoveryLibAddress = process.env.RECOVERY_LIB_ADDRESS?.trim();

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
    operatorLibAddress,
    documentLibAddress,
    coSignLibAddress,
    recoveryLibAddress,
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
