import type {
  BlockchainConfig,
  EncryptOptions,
  PublishAndSignDocumentResult,
  ReWrapResult,
  TenantInfo,
  VerzikEnvelope,
  VerzikError,
  VerzikMetadata,
  VerzikPackage,
  TorusNetworkOptions,
  UploadDraftResponse,
} from "./types";
import { bytesToHex, hexToBytes, parseError } from "./utils";
import { encrypt, decrypt, split, merge, hashDocument } from "./encrypt";
import { reWrapKey } from "./re_wrap";
import { getPublicKeyFromEmail } from "./identity";
import { publishAndSignDocument } from "./sign";
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
  UploadDraftResponse,
  PublishAndSignDocumentResult,
};
export { bytesToHex, hexToBytes, parseError };
export {
  BlockchainClient,
  createBlockchainClient,
  createBlockchainClientFromEnv,
  createRegisterPayload,
  init,
  publishAndSignDocument,
};

export class VerzikSDK {
  static encrypt = encrypt;
  static decrypt = decrypt;
  static split = split;
  static merge = merge;
  static hashDocument = hashDocument;
  static reWrapKey = reWrapKey;
  static publishAndSignDocument = publishAndSignDocument;

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
