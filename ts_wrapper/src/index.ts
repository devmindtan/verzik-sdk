import type {
  BlockchainConfig,
  EncryptOptions,
  ReWrapResult,
  TenantInfo,
  VerzikEnvelope,
  VerzikError,
  VerzikMetadata,
  VerzikPackage,
  TorusNetworkOptions,
} from "./types";
import { bytesToHex, hexToBytes, parseError } from "./utils";
import { decodeContractError } from "./contract-errors";
import { encrypt, decrypt, split, merge, hashDocument } from "./encrypt";
import { reWrapKey } from "./re_wrap";
import * as core from "../core_wasm/verzik_sdk";
import { getPublicKeyFromEmail } from "./identity";
import {
  BlockchainClient,
  createBlockchainClient,
  createBlockchainClientFromEnv,
  createRegisterPayload,
  init,
} from "./config/blockchain.config";

export type {
  BlockchainConfig,
  EncryptOptions,
  ReWrapResult,
  TenantInfo,
  VerzikEnvelope,
  VerzikError,
  VerzikMetadata,
  VerzikPackage,
  TorusNetworkOptions,
};
export { bytesToHex, hexToBytes, parseError, decodeContractError };
export {
  BlockchainClient,
  createBlockchainClient,
  createBlockchainClientFromEnv,
  createRegisterPayload,
  init,
};

export class VerzikSDK {
  static encrypt = encrypt;
  static decrypt = decrypt;
  static split = split;
  static merge = merge;
  static hashDocument = hashDocument;
  static reWrapKey = reWrapKey;

  static ping(): void {
    core.ping();
  }

  static getPublicKeyFromEmail(
    email: string,
    options: TorusNetworkOptions,
  ): Promise<string> {
    return getPublicKeyFromEmail(email, options);
  }
}
