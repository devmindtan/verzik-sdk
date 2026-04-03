/** Full encrypted package — contains everything needed to decrypt */
export interface VerzikPackage {
    encrypted_file: Uint8Array;
    encrypted_key: Uint8Array;
    nonce: Uint8Array;
}
/** Lightweight metadata — encrypted_key + nonce only (~200 bytes) */
export interface VerzikMetadata {
    encrypted_key: Uint8Array;
    nonce: Uint8Array;
}
/** Envelope that splits metadata from raw encrypted data for efficient network transport */
export interface VerzikEnvelope {
    metadata: VerzikMetadata;
    encrypted_data: Uint8Array;
}
/** Parsed SDK error with code + human-readable message */
export interface VerzikError {
    code: string;
    message: string;
    raw: string;
}
/** Encryption options — allows overriding auto-generated AES key and nonce */
export interface EncryptOptions {
    /** 32-byte AES key. If omitted, SDK generates one via crypto.randomBytes(32) */
    aesKey?: Uint8Array;
    /** 12-byte nonce. If omitted, SDK generates one via crypto.randomBytes(12) */
    nonce?: Uint8Array;
}
//# sourceMappingURL=types.d.ts.map