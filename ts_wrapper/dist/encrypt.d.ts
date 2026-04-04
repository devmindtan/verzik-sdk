import type { EncryptOptions, VerzikEnvelope, VerzikMetadata, VerzikPackage } from "./types";
/**
 * Encrypts file data using AES-256-GCM + ECIES.
 *
 * @param fileData Raw file bytes
 * @param recipientPubKey Secp256k1 uncompressed public key (65 bytes, 04-prefix)
 * @param options Optional overrides for AES key and nonce
 */
export declare function encrypt(fileData: Uint8Array, recipientPubKey: Uint8Array, options?: EncryptOptions): VerzikPackage;
/**
 * Decrypts a VerzikPackage back to plaintext.
 *
 * @param pkg Encrypted package
 * @param privateKey Secp256k1 private key (32 bytes)
 */
export declare function decrypt(pkg: VerzikPackage, privateKey: Uint8Array): Uint8Array;
/**
 * Splits a VerzikPackage into metadata and encrypted data.
 */
export declare function split(pkg: VerzikPackage): VerzikEnvelope;
/**
 * Merges metadata and encrypted data into a VerzikPackage.
 */
export declare function merge(metadata: VerzikMetadata, encryptedData: Uint8Array): VerzikPackage;
/**
 * Hashes document data using Keccak-256.
 *
 * @param data Raw bytes to hash
 */
export declare function hashDocument(data: Uint8Array): string;
//# sourceMappingURL=encrypt.d.ts.map