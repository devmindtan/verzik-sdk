import type { EncryptOptions, VerzikEnvelope, VerzikError, VerzikMetadata, VerzikPackage } from "./types";
import { bytesToHex, hexToBytes, parseError } from "./utils";
export type { EncryptOptions, VerzikEnvelope, VerzikError, VerzikMetadata, VerzikPackage, };
export { bytesToHex, hexToBytes, parseError };
export declare class VerzikSDK {
    /**
     * Encrypt file data using hybrid AES-256-GCM + ECIES.
     *
     * AES key (32 bytes) and nonce (12 bytes) are auto-generated if not provided.
     *
     * @param fileData - raw file bytes
     * @param recipientPubKey - secp256k1 uncompressed public key (65 bytes, 04-prefix)
     * @param options - optional AES key and nonce overrides
     * @returns VerzikPackage containing encrypted_file, encrypted_key, and nonce
     */
    static encrypt(fileData: Uint8Array, recipientPubKey: Uint8Array, options?: EncryptOptions): VerzikPackage;
    /**
     * Decrypt a VerzikPackage back to plaintext.
     *
     * @param pkg - encrypted package (or separate fields)
     * @param privateKey - your secp256k1 private key (32 bytes)
     * @returns decrypted plaintext as Uint8Array
     */
    static decrypt(pkg: VerzikPackage, privateKey: Uint8Array): Uint8Array;
    /**
     * Split a VerzikPackage into metadata + encrypted data for efficient transport.
     *
     * - metadata (~200 bytes) → send as JSON
     * - encrypted_data (large) → send as binary stream
     *
     * Pure TypeScript — no WASM call needed.
     */
    static split(pkg: VerzikPackage): VerzikEnvelope;
    /**
     * Merge metadata + encrypted data back into a VerzikPackage for decryption.
     *
     * Pure TypeScript — no WASM call needed.
     */
    static merge(metadata: VerzikMetadata, encryptedData: Uint8Array): VerzikPackage;
    /**
     * Hash document data using Keccak-256.
     *
     * @param data - raw bytes to hash
     * @returns "0x"-prefixed hex hash string
     */
    static hashDocument(data: Uint8Array): string;
    /** Ping the WASM module — logs "[RUST] Pong !" to console */
    static ping(): void;
}
//# sourceMappingURL=index.d.ts.map