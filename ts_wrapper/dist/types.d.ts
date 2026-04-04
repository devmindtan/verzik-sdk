export interface VerzikPackage {
    encrypted_file: Uint8Array;
    encrypted_key: Uint8Array;
    nonce: Uint8Array;
    ciphertext_hash: string;
    encryption_meta_hash: string;
}
export interface VerzikMetadata {
    encrypted_key: Uint8Array;
    nonce: Uint8Array;
    ciphertext_hash: string;
    encryption_meta_hash: string;
}
export interface VerzikEnvelope {
    metadata: VerzikMetadata;
    encrypted_data: Uint8Array;
}
export interface VerzikError {
    code: string;
    message: string;
    raw: string;
}
export interface EncryptOptions {
    aesKey?: Uint8Array;
    nonce?: Uint8Array;
}
export interface TorusNetworkOptions {
    network: "sapphire_devnet" | "sapphire_mainnet" | "testnet" | "mainnet" | string;
    clientId: string;
    verifier: string;
}
//# sourceMappingURL=types.d.ts.map