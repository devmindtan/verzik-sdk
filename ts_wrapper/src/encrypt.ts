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
  if (
    !(recipientPubKey instanceof Uint8Array) ||
    !((recipientPubKey.length === 65 && recipientPubKey[0] === 0x04) ||
      (recipientPubKey.length === 33 && (recipientPubKey[0] === 0x02 || recipientPubKey[0] === 0x03)))
  ) {
    throw new Error("Invalid Web3 public key format. Expected uncompressed (65 bytes, 0x04) or compressed (33 bytes, 0x02/0x03) SECP256k1 public key.");
  }

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
  if (!(privateKey instanceof Uint8Array) || privateKey.length !== 32) {
    throw new Error("Invalid private key format. Expected 32-byte SECP256k1 private key.");
  }

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
