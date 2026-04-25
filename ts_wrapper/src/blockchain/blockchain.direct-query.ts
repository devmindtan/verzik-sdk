import { formatEther, id } from "ethers";
import type { Block } from "ethers";
import type {
  CoSignStatus,
  DecodedLog,
  EnhancedTxResult,
  OperatorStatus,
  TenantInfo,
  VerifyStatus,
} from "../types";
import type {
  BlockchainConfig,
  DocumentSnapshot,
} from "../types/blockchain.types";
import {
  BlockchainContext,
  readBlockchainConfigFromEnv,
} from "./blockchain.context";

type TenantTuple = [boolean, string, string, string, boolean, bigint];

export class DirectQueryClient {
  readonly context: BlockchainContext;

  constructor(config: BlockchainConfig) {
    this.context = new BlockchainContext(config);
  }

  async getTenantCount(): Promise<bigint> {
    return (await this.context.readerContract.getTenantCount()) as bigint;
  }

  async getTransactionByHash(txHash: string): Promise<any> {
    try {
      const transaction = await this.context.provider.getTransaction(txHash);
      if (!transaction) throw new Error(`Không tìm thấy giao dịch: ${txHash}`);

      const receipt = await this.context.provider.getTransactionReceipt(txHash);

      let blockData: any = null;
      let confirmations = 0;

      if (receipt) {
        const currentBlock = await this.context.provider.getBlockNumber();
        const block = await this.context.provider.getBlock(receipt.blockNumber);

        if (block) {
          blockData = {
            ...block,
            baseFeePerGas: block.baseFeePerGas?.toString(),
            difficulty: block.difficulty?.toString(),
            gasLimit: block.gasLimit?.toString(),
            gasUsed: block.gasUsed?.toString(),
            timestamp: block.timestamp,
          };
        }
        confirmations = currentBlock - receipt.blockNumber + 1;
      }

      const contractInterface = this.context.protocolContract.interface;
      let decodedInput;
      let decodedLogs: any[] = [];

      if (contractInterface) {
        try {
          const parsed = contractInterface.parseTransaction({
            data: transaction.data,
            value: transaction.value,
          });
          if (parsed) {
            decodedInput = {
              name: parsed.name,
              signature: parsed.signature,
              args: Object.fromEntries(
                Object.entries(parsed.args.toObject()).map(([k, v]) => [
                  k,
                  typeof v === "bigint" ? v.toString() : v,
                ]),
              ),
            };
          }
        } catch (e) {
          throw new Error("" + e);
        }

        if (receipt?.logs) {
          decodedLogs = receipt.logs
            .map((log) => {
              try {
                const parsed = contractInterface.parseLog(log);
                return parsed
                  ? {
                      name: parsed.name,
                      args: Object.fromEntries(
                        Object.entries(parsed.args.toObject()).map(([k, v]) => [
                          k,
                          typeof v === "bigint" ? v.toString() : v,
                        ]),
                      ),
                    }
                  : null;
              } catch {
                return null;
              }
            })
            .filter((l) => l !== null);
        }
      }

      return {
        transaction: {
          ...transaction,
          value: transaction.value.toString(),
          gasPrice: transaction.gasPrice?.toString(),
          gasLimit: transaction.gasLimit.toString(),
          maxFeePerGas: transaction.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString(),
          nonce: transaction.nonce,
        },
        receipt: receipt
          ? {
              ...receipt,
              gasUsed: receipt.gasUsed.toString(),
              cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
              gasPrice: receipt.gasPrice?.toString(),
            }
          : null,
        block: blockData,
        confirmations: Math.max(0, confirmations),
        decodedInput,
        decodedLogs,
      };
    } catch (error: any) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async getOperatorCount(tenantId: string): Promise<bigint> {
    return (await this.context.readerContract.getOperatorCount(
      tenantId,
    )) as bigint;
  }

  async getTenantIds(start = 0, limit = 10): Promise<string[]> {
    return (await this.context.readerContract.getTenantIds(
      start,
      limit,
    )) as string[];
  }

  async getOperatorIds(
    tenantId: string,
    start = 0,
    limit = 10,
  ): Promise<string[]> {
    return (await this.context.readerContract.getOperatorIds(
      tenantId,
      start,
      limit,
    )) as string[];
  }

  async getTenantInfo(id: string): Promise<TenantInfo | null> {
    const info = (await this.context.readerContract.getTenantInfo(
      id,
    )) as TenantTuple;
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

  async listOperators(
    tenantId: string,
    start = 0,
    limit = 10,
  ): Promise<OperatorStatus[]> {
    try {
      const operatorAddresses =
        (await this.context.readerContract.getOperatorIds(
          tenantId,
          start,
          limit,
        )) as string[];

      const operators = await Promise.all(
        operatorAddresses.map(async (address: string) => {
          const op = await this.context.readerContract.getOperatorStatus(
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
            stakeAmount: Number(formatEther(op.stakeAmount)),
            nonce: Number(op.nonce),
            unstakeReadyAt: Number(op.unstakeReadyAt),
            canUnstakeNow: op.canUnstakeNow,
            recoveryDelegate: op.recoveryDelegate,
          } as OperatorStatus;
        }),
      );

      return operators.filter((op) => op.exists);
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async listTenants(start = 0, limit = 10): Promise<TenantInfo[]> {
    const ids = await this.getTenantIds(start, limit);
    const tenants = await Promise.all(
      ids.map((tenantId) => this.getTenantInfo(tenantId)),
    );
    return tenants.filter((tenant): tenant is TenantInfo => tenant !== null);
  }

  async getOperatorStatus(
    tenantId: string,
    operator: string,
  ): Promise<OperatorStatus> {
    try {
      const operatorStatus =
        await this.context.readerContract.getOperatorStatus(tenantId, operator);

      return {
        exists: operatorStatus.exists,
        isActive: operatorStatus.isActive,
        walletAddress: operatorStatus.walletAddress,
        metadataURI: operatorStatus.metadataURI,
        stakeAmount: Number(formatEther(operatorStatus.stakeAmount)),
        nonce: Number(operatorStatus.nonce),
        unstakeReadyAt: Number(operatorStatus.unstakeReadyAt),
        canUnstakeNow: operatorStatus.canUnstakeNow,
        recoveryDelegate: operatorStatus.recoveryDelegate,
      };
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async getDocumentStatus(
    tenantId: string,
    fileHash: string,
  ): Promise<DocumentSnapshot> {
    try {
      const documentStatus =
        await this.context.readerContract.getDocumentStatus(tenantId, fileHash);
      return {
        exists: documentStatus.exists,
        isValid: documentStatus.isValid,
        owner: documentStatus.owner,
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
      throw new Error(await this.context.decodeError(error));
    }
  }

  async verify(tenantId: string, fileHash: string): Promise<VerifyStatus> {
    try {
      return (await this.context.readerContract.verify(
        tenantId,
        fileHash,
      )) as VerifyStatus;
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async getDocumentOrRevert(
    tenantId: string,
    fileHash: string,
  ): Promise<unknown> {
    try {
      return await this.context.readerContract.getDocumentOrRevert(
        tenantId,
        fileHash,
      );
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async hasSignedDocument(
    tenantId: string,
    fileHash: string,
    signer: string,
  ): Promise<boolean> {
    try {
      return Boolean(
        await this.context.readerContract.hasSignedDocument(
          tenantId,
          fileHash,
          signer,
        ),
      );
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async isDocumentCoSignQualified(
    tenantId: string,
    fileHash: string,
  ): Promise<boolean> {
    try {
      return await this.context.readerContract.isDocumentCoSignQualified(
        tenantId,
        fileHash,
      );
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async getCoSignStatus(
    tenantId: string,
    fileHash: string,
  ): Promise<CoSignStatus> {
    try {
      const result = await this.context.readerContract.getCoSignStatus(
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
      throw new Error(await this.context.decodeError(error));
    }
  }

  async getNonceCount(tenantId: string, operator: string): Promise<bigint> {
    try {
      const nonce = await this.context.protocolContract.nonces(
        tenantId,
        operator,
      );
      return BigInt(nonce);
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
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
    try {
      const result = await this.context.readerContract.getCoSignPolicy(
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
      throw new Error(await this.context.decodeError(error));
    }
  }

  async getCoSignOperatorConfig(
    tenantId: string,
    docType: number,
    operator: string,
  ): Promise<{ whitelisted: boolean; roleId: number }> {
    try {
      const result = await this.context.readerContract.getCoSignOperatorConfig(
        tenantId,
        docType,
        operator,
      );
      return {
        whitelisted: Boolean(result[0]),
        roleId: Number(result[1]),
      };
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async getTenantRuntimeConfig(
    tenantId: string,
  ): Promise<{ minOperatorStake: number; unstakeCooldown: bigint }> {
    try {
      const result =
        await this.context.readerContract.getTenantRuntimeConfig(tenantId);
      return {
        minOperatorStake: Number(formatEther(result[0])),
        unstakeCooldown: BigInt(result[1]),
      };
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }

  async getViolationPenalty(
    tenantId: string,
    violationCode: string,
  ): Promise<number> {
    try {
      const penaltyBps = await this.context.readerContract.getViolationPenalty(
        tenantId,
        id(violationCode),
      );
      return Number(penaltyBps);
    } catch (error) {
      throw new Error(await this.context.decodeError(error));
    }
  }
}

export function createDirectQueryClient(
  config: BlockchainConfig,
): DirectQueryClient {
  return new DirectQueryClient(config);
}

export function createDirectQueryClientFromEnv(): DirectQueryClient {
  return new DirectQueryClient(readBlockchainConfigFromEnv());
}
