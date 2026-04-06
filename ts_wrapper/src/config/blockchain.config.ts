import dotenv from "dotenv";
import VoucherProtocolABI from "../../src/abi/VoucherProtocolModule#VoucherProtocol.json";
import { JsonRpcProvider, Wallet, Contract } from "ethers";
import type { BlockchainConfig, TenantInfo } from "../types";
import { generate_tenant_id } from "../../core_wasm/verzik_sdk";

dotenv.config();

type TenantTuple = [boolean, string, string, boolean, bigint];

export class BlockchainClient {
  private readonly provider: JsonRpcProvider;
  private readonly wallet?: Wallet;
  private readonly contract: Contract;

  constructor(config: BlockchainConfig) {
    const rpcUrl = config.rpcUrl?.trim();
    const protocolAddress = config.protocolAddress?.trim();
    const privateKey = config.privateKey?.trim();

    if (!rpcUrl || !protocolAddress) {
      throw new Error(
        "Thiếu cấu hình blockchain (rpcUrl hoặc protocolAddress)",
      );
    }

    this.provider = new JsonRpcProvider(rpcUrl);

    if (privateKey) {
      this.wallet = new Wallet(privateKey, this.provider);
      this.contract = new Contract(
        protocolAddress,
        VoucherProtocolABI.abi,
        this.wallet,
      );
      return;
    }

    this.contract = new Contract(
      protocolAddress,
      VoucherProtocolABI.abi,
      this.provider,
    );
  }

  get signer(): Wallet | undefined {
    return this.wallet;
  }

  get instance(): Contract {
    return this.contract;
  }

  async getTenantCount(): Promise<bigint> {
    return (await this.contract.getTenantCount()) as bigint;
  }

  async getTenantIds(start = 0, limit = 10): Promise<string[]> {
    return (await this.contract.getTenantIds(start, limit)) as string[];
  }

  async getTenantInfo(id: string): Promise<TenantInfo | null> {
    const info = (await this.contract.getTenantInfo(id)) as TenantTuple;
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
        "Client chưa có privateKey nên không thể gửi transaction",
      );
    }

    const tx = await this.contract.createTenant(
      generate_tenant_id(tenantName),
      adminAddress,
      treasuryAddress,
    );
    return tx.hash as string;
  }
}

export function createBlockchainClient(
  config: BlockchainConfig,
): BlockchainClient {
  return new BlockchainClient(config);
}

export function createBlockchainClientFromEnv(): BlockchainClient {
  const rpcUrl = process.env.LOCAL_RPC_URL?.trim();
  const privateKey = process.env.PRIVATE_KEY?.trim();
  const protocolAddress = process.env.PROTOCOL_ADDRESS?.trim();

  if (!rpcUrl || !protocolAddress) {
    throw new Error(
      "Thiếu biến môi trường (LOCAL_RPC_URL hoặc PROTOCOL_ADDRESS)",
    );
  }

  return new BlockchainClient({
    rpcUrl,
    privateKey,
    protocolAddress,
  });
}

export async function init(): Promise<BlockchainClient> {
  return createBlockchainClientFromEnv();
}
