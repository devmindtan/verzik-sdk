export interface VerzikPackage {
  encrypted_file: Uint8Array;
  encrypted_key: Uint8Array;
  nonce: Uint8Array;
}

export interface VerzikMetadata {
  encrypted_key: Uint8Array;
  nonce: Uint8Array;
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
