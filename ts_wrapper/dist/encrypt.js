"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.split = split;
exports.merge = merge;
exports.hashDocument = hashDocument;
const crypto = __importStar(require("crypto"));
const core = __importStar(require("../core_wasm/verzik_sdk"));
/**
 * Encrypts file data using AES-256-GCM + ECIES.
 *
 * @param fileData Raw file bytes
 * @param recipientPubKey Secp256k1 uncompressed public key (65 bytes, 04-prefix)
 * @param options Optional overrides for AES key and nonce
 */
function encrypt(fileData, recipientPubKey, options) {
    const aesKey = options?.aesKey ?? new Uint8Array(crypto.randomBytes(32));
    const nonce = options?.nonce ?? new Uint8Array(crypto.randomBytes(12));
    const result = core.encrypt_package(fileData, recipientPubKey, aesKey, nonce);
    return {
        encrypted_file: new Uint8Array(result.encrypted_file),
        encrypted_key: new Uint8Array(result.encrypted_key),
        nonce: new Uint8Array(result.nonce),
        ciphertext_hash: result.ciphertext_hash,
        encryption_meta_hash: result.encryption_meta_hash,
    };
}
/**
 * Decrypts a VerzikPackage back to plaintext.
 *
 * @param pkg Encrypted package
 * @param privateKey Secp256k1 private key (32 bytes)
 */
function decrypt(pkg, privateKey) {
    return core.decrypt_package(pkg.encrypted_file, pkg.encrypted_key, pkg.nonce, privateKey);
}
/**
 * Splits a VerzikPackage into metadata and encrypted data.
 */
function split(pkg) {
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
function merge(metadata, encryptedData) {
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
function hashDocument(data) {
    return core.hash_doc(data);
}
//# sourceMappingURL=encrypt.js.map