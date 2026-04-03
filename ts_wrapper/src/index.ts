import * as crypto from "crypto";
import * as core from "../core_wasm/verzik_sdk";
import type {
  EncryptOptions,
  VerzikEnvelope,
  VerzikError,
  VerzikMetadata,
  VerzikPackage,
} from "./types";
import { bytesToHex, hexToBytes, parseError } from "./utils";

export type {
  EncryptOptions,
  VerzikEnvelope,
  VerzikError,
  VerzikMetadata,
  VerzikPackage,
};
export { bytesToHex, hexToBytes, parseError };

export class VerzikSDK {
  /**
   * Encrypts file data using AES-256-GCM + ECIES.
   *
   * @param fileData Raw file bytes
   * @param recipientPubKey Secp256k1 uncompressed public key (65 bytes, 04-prefix)
   * @param options Optional overrides for AES key and nonce
   */
  static encrypt(
    fileData: Uint8Array,
    recipientPubKey: Uint8Array,
    options?: EncryptOptions,
  ): VerzikPackage {
    const aesKey = options?.aesKey ?? new Uint8Array(crypto.randomBytes(32));
    const nonce = options?.nonce ?? new Uint8Array(crypto.randomBytes(12));

    const result = core.encrypt_package(fileData, recipientPubKey, aesKey, nonce);

    return {
      encrypted_file: new Uint8Array(result.encrypted_file),
      encrypted_key: new Uint8Array(result.encrypted_key),
      nonce: new Uint8Array(result.nonce),
    };
  }

  /**
   * Decrypts a VerzikPackage back to plaintext.
   *
   * @param pkg Encrypted package
   * @param privateKey Secp256k1 private key (32 bytes)
   */
  static decrypt(pkg: VerzikPackage, privateKey: Uint8Array): Uint8Array {
    return core.decrypt_package(
      pkg.encrypted_file,
      pkg.encrypted_key,
      pkg.nonce,
      privateKey,
    );
  }

  /**
   * Splits a VerzikPackage into metadata and encrypted data.
   */
  static split(pkg: VerzikPackage): VerzikEnvelope {
    return {
      metadata: {
        encrypted_key: pkg.encrypted_key,
        nonce: pkg.nonce,
      },
      encrypted_data: pkg.encrypted_file,
    };
  }

  /**
   * Merges metadata and encrypted data into a VerzikPackage.
   */
  static merge(
    metadata: VerzikMetadata,
    encryptedData: Uint8Array,
  ): VerzikPackage {
    return {
      encrypted_file: encryptedData,
      encrypted_key: metadata.encrypted_key,
      nonce: metadata.nonce,
    };
  }

  /**
   * Hashes document data using Keccak-256.
   *
   * @param data Raw bytes to hash
   */
  static hashDocument(data: Uint8Array): string {
    return core.hash_doc(data);
  }

  static ping(): void {
    core.ping();
  }
}
