import * as crypto from "crypto";
import * as core from "../core_wasm/verzik_sdk";
import type {
  EncryptOptions,
  VerzikEnvelope,
  VerzikMetadata,
  VerzikPackage,
} from "./types";

/**
 * Encrypts file data using AES-256-GCM + ECIES.
 *
 * @param fileData Raw file bytes
 * @param recipientPubKey Secp256k1 uncompressed public key (65 bytes, 04-prefix)
 * @param options Optional overrides for AES key and nonce
 */
export function encrypt(
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
    ciphertext_hash: result.ciphertext_hash as string,
    encryption_meta_hash: result.encryption_meta_hash as string,
  };
}

/**
 * Decrypts a VerzikPackage back to plaintext.
 *
 * @param pkg Encrypted package
 * @param privateKey Secp256k1 private key (32 bytes)
 */
export function decrypt(pkg: VerzikPackage, privateKey: Uint8Array): Uint8Array {
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
export function split(pkg: VerzikPackage): VerzikEnvelope {
  return {
    metadata: {
      encrypted_key: pkg.encrypted_key,
      nonce: pkg.nonce,
      ciphertext_hash: pkg.ciphertext_hash,
      encryption_meta_hash: pkg.encryption_meta_hash,
    },
    encrypted_data: pkg.encrypted_file,
  };
}

/**
 * Merges metadata and encrypted data into a VerzikPackage.
 */
export function merge(
  metadata: VerzikMetadata,
  encryptedData: Uint8Array,
): VerzikPackage {
  return {
    encrypted_file: encryptedData,
    encrypted_key: metadata.encrypted_key,
    nonce: metadata.nonce,
    ciphertext_hash: metadata.ciphertext_hash,
    encryption_meta_hash: metadata.encryption_meta_hash,
  };
}

/**
 * Hashes document data using Keccak-256.
 *
 * @param data Raw bytes to hash
 */
export function hashDocument(data: Uint8Array): string {
  return core.hash_doc(data);
}
