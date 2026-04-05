import type {
  EncryptOptions,
  ReWrapResult,
  VerzikEnvelope,
  VerzikError,
  VerzikMetadata,
  VerzikPackage,
  TorusNetworkOptions,
  RegisterPayload,
} from "./types";
import { bytesToHex, hexToBytes, parseError } from "./utils";
import { encrypt, decrypt, split, merge, hashDocument } from "./encrypt";
import { reWrapKey } from "./re_wrap";
import { getPublicKeyFromEmail } from "./identity";
import { signAnchorPayload } from "./sign";

export type {
  EncryptOptions,
  ReWrapResult,
  VerzikEnvelope,
  VerzikError,
  VerzikMetadata,
  VerzikPackage,
  TorusNetworkOptions,
  RegisterPayload,
};
export { bytesToHex, hexToBytes, parseError };

export class VerzikSDK {
  static encrypt = encrypt;
  static decrypt = decrypt;
  static split = split;
  static merge = merge;
  static hashDocument = hashDocument;
  static reWrapKey = reWrapKey;
  static signAnchorPayload = signAnchorPayload;

  static ping(): void {
    const core = require("../core_wasm/verzik_sdk");
    core.ping();
  }

  static getPublicKeyFromEmail(email: string, options: TorusNetworkOptions): Promise<string> {
    return getPublicKeyFromEmail(email, options);
  }
}
