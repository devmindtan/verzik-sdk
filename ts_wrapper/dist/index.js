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
exports.VerzikSDK = exports.parseError = exports.hexToBytes = exports.bytesToHex = void 0;
const crypto = __importStar(require("crypto"));
const core = __importStar(require("../core_wasm/verzik_sdk"));
const utils_1 = require("./utils");
Object.defineProperty(exports, "bytesToHex", { enumerable: true, get: function () { return utils_1.bytesToHex; } });
Object.defineProperty(exports, "hexToBytes", { enumerable: true, get: function () { return utils_1.hexToBytes; } });
Object.defineProperty(exports, "parseError", { enumerable: true, get: function () { return utils_1.parseError; } });
// ─── VerzikSDK ──────────────────────────────────────────────────────────────
class VerzikSDK {
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
    static encrypt(fileData, recipientPubKey, options) {
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
     * Decrypt a VerzikPackage back to plaintext.
     *
     * @param pkg - encrypted package (or separate fields)
     * @param privateKey - your secp256k1 private key (32 bytes)
     * @returns decrypted plaintext as Uint8Array
     */
    static decrypt(pkg, privateKey) {
        return core.decrypt_package(pkg.encrypted_file, pkg.encrypted_key, pkg.nonce, privateKey);
    }
    /**
     * Split a VerzikPackage into metadata + encrypted data for efficient transport.
     *
     * - metadata (~200 bytes) → send as JSON
     * - encrypted_data (large) → send as binary stream
     *
     * Pure TypeScript — no WASM call needed.
     */
    static split(pkg) {
        return {
            metadata: {
                encrypted_key: pkg.encrypted_key,
                nonce: pkg.nonce,
            },
            encrypted_data: pkg.encrypted_file,
        };
    }
    /**
     * Merge metadata + encrypted data back into a VerzikPackage for decryption.
     *
     * Pure TypeScript — no WASM call needed.
     */
    static merge(metadata, encryptedData) {
        return {
            encrypted_file: encryptedData,
            encrypted_key: metadata.encrypted_key,
            nonce: metadata.nonce,
        };
    }
    /**
     * Hash document data using Keccak-256.
     *
     * @param data - raw bytes to hash
     * @returns "0x"-prefixed hex hash string
     */
    static hashDocument(data) {
        return core.hash_doc(data);
    }
    /** Ping the WASM module — logs "[RUST] Pong !" to console */
    static ping() {
        core.ping();
    }
}
exports.VerzikSDK = VerzikSDK;
//# sourceMappingURL=index.js.map