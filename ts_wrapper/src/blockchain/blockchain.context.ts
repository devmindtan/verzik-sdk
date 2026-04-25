import { Contract, JsonRpcProvider, Wallet } from "ethers";
import dotenv from "dotenv";
import VoucherProtocolABI from "../abi/VoucherProtocolModule#VoucherProtocol.json";
import VoucherProtocolReaderABI from "../abi/VoucherProtocolModule#VoucherProtocolReader.json";
import type { BlockchainConfig } from "../types/blockchain.types";
import { decodeContractError } from "../contract-errors";

const runtimeProcess = (
  globalThis as { process?: { versions?: { node?: string } } }
).process;
if (runtimeProcess?.versions?.node) {
  dotenv.config();
}

export class BlockchainContext {
  readonly provider: JsonRpcProvider;
  readonly wallet?: Wallet;
  readonly protocolContract: Contract;
  readonly readerContract: Contract;

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

  async decodeError(error: any): Promise<string> {
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
}

export function createBlockchainContext(
  config: BlockchainConfig,
): BlockchainContext {
  return new BlockchainContext(config);
}

export function readBlockchainConfigFromEnv(): BlockchainConfig {
  const rpcUrl = process.env.RPC_URL?.trim();
  const privateKey = process.env.PRIVATE_KEY?.trim();
  const protocolAddress = process.env.PROTOCOL_ADDRESS?.trim();
  const readerAddress = process.env.READER_ADDRESS?.trim();

  const operatorLibAddress = process.env.OPERATOR_LIB_ADDRESS?.trim();
  const documentLibAddress = process.env.DOCUMENT_LIB_ADDRESS?.trim();
  const coSignLibAddress = process.env.COSIGN_LIB_ADDRESS?.trim();
  const recoveryLibAddress = process.env.RECOVERY_LIB_ADDRESS?.trim();

  if (!rpcUrl || !protocolAddress) {
    throw new Error(
      "Bổ sung biến môi trường vào .env (RPC_URL hoặc PROTOCOL_ADDRESS)",
    );
  }

  return {
    rpcUrl,
    privateKey,
    protocolAddress,
    readerAddress,
    operatorLibAddress,
    documentLibAddress,
    coSignLibAddress,
    recoveryLibAddress,
  };
}
