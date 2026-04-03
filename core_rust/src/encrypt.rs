use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit},
};
use ecies::{decrypt as ecies_decrypt, encrypt as ecies_encrypt};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// ─── Error Codes ────────────────────────────────────────────────────────────

/// Typed error codes for programmatic handling on the client side.
/// Client can match on `error.code` instead of parsing error messages.
#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
pub enum SdkErrorCode {
    InvalidAesKey,
    InvalidNonce,
    AesEncryptFailed,
    AesDecryptFailed,
    EciesWrapFailed,
    EciesUnwrapFailed,
}

/// Internal helper — create a JsValue error with a code and human-readable detail.
fn sdk_err(code: SdkErrorCode, detail: &str) -> JsValue {
    // Format: "[CODE] detail" — simple, grep-able, and structured enough
    // for the client to split on the first space if they want the code.
    JsValue::from_str(&format!("[{:?}] {}", code, detail))
}

// ─── Data Structures ────────────────────────────────────────────────────────

/// Full encrypted package — contains everything needed to decrypt.
/// Suitable for storage or single-payload transport.
#[derive(Serialize, Deserialize)]
pub struct VerzikPackage {
    pub encrypted_file: Vec<u8>,
    pub encrypted_key: Vec<u8>,
    pub nonce: [u8; 12],
}

/// Lightweight metadata — encrypted_key + nonce only (~200 bytes).
/// Designed to be sent as a small JSON payload, separate from the bulk data.
#[derive(Serialize, Deserialize)]
pub struct VerzikMetadata {
    pub encrypted_key: Vec<u8>,
    pub nonce: [u8; 12],
}

/// Envelope that splits metadata from raw encrypted data.
/// Optimized for network transport: send metadata as JSON, data as binary stream.
#[derive(Serialize, Deserialize)]
pub struct VerzikEnvelope {
    pub metadata: VerzikMetadata,
    pub encrypted_data: Vec<u8>,
}

// ─── Core Encrypt / Decrypt ─────────────────────────────────────────────────

/// Encrypt file data using hybrid AES-256-GCM + ECIES.
///
/// - `file_data`: raw bytes of the file to encrypt
/// - `recipient_pub_key`: secp256k1 uncompressed public key (65 bytes, 04-prefix)
/// - `aes_key`: 32-byte random AES key (generate on client via `crypto.randomBytes(32)`)
/// - `nonce_bytes`: 12-byte random nonce (generate on client via `crypto.randomBytes(12)`)
///
/// Returns a JS Object `{ encrypted_file, encrypted_key, nonce }`.
#[wasm_bindgen]
pub fn encrypt_package(
    file_data: &[u8],
    recipient_pub_key: &[u8],
    aes_key: &[u8],
    nonce_bytes: &[u8],
) -> Result<JsValue, JsValue> {
    if aes_key.len() != 32 {
        return Err(sdk_err(
            SdkErrorCode::InvalidAesKey,
            &format!("Expected 32 bytes, got {}", aes_key.len()),
        ));
    }
    if nonce_bytes.len() != 12 {
        return Err(sdk_err(
            SdkErrorCode::InvalidNonce,
            &format!("Expected 12 bytes, got {}", nonce_bytes.len()),
        ));
    }

    // ── AES-256-GCM encrypt ──
    let cipher = Aes256Gcm::new_from_slice(aes_key)
        .map_err(|e| sdk_err(SdkErrorCode::InvalidAesKey, &e.to_string()))?;
    let nonce = Nonce::from_slice(nonce_bytes);

    let encrypted_file = cipher
        .encrypt(nonce, file_data)
        .map_err(|_| sdk_err(SdkErrorCode::AesEncryptFailed, "AES-GCM encryption failed"))?;

    // ── ECIES wrap AES key with recipient's public key ──
    let encrypted_key = ecies_encrypt(recipient_pub_key, aes_key).map_err(|_| {
        sdk_err(
            SdkErrorCode::EciesWrapFailed,
            "Check public key format (65 bytes, 04-prefix)",
        )
    })?;

    // ── Pack into fixed-nonce struct ──
    let mut nonce_arr = [0u8; 12];
    nonce_arr.copy_from_slice(nonce_bytes);

    let package = VerzikPackage {
        encrypted_file,
        encrypted_key,
        nonce: nonce_arr,
    };

    Ok(serde_wasm_bindgen::to_value(&package)?)
}

/// Decrypt a VerzikPackage back to plaintext.
///
/// - `encrypted_file`: the AES-GCM ciphertext
/// - `encrypted_key`: ECIES-wrapped AES key
/// - `nonce_bytes`: 12-byte nonce used during encryption
/// - `my_private_key`: your secp256k1 private key (32 bytes)
///
/// Returns the decrypted plaintext as `Uint8Array`.
#[wasm_bindgen]
pub fn decrypt_package(
    encrypted_file: &[u8],
    encrypted_key: &[u8],
    nonce_bytes: &[u8],
    my_private_key: &[u8],
) -> Result<Vec<u8>, JsValue> {
    // ── Fail-fast validation ──
    if nonce_bytes.len() != 12 {
        return Err(sdk_err(
            SdkErrorCode::InvalidNonce,
            &format!("Expected 12 bytes, got {}", nonce_bytes.len()),
        ));
    }

    // ── ECIES unwrap AES key ──
    let aes_key = ecies_decrypt(my_private_key, encrypted_key).map_err(|_| {
        sdk_err(
            SdkErrorCode::EciesUnwrapFailed,
            "Wrong private key or corrupted wrapped key",
        )
    })?;

    // ── AES-256-GCM decrypt ──
    let cipher = Aes256Gcm::new_from_slice(&aes_key)
        .map_err(|e| sdk_err(SdkErrorCode::InvalidAesKey, &e.to_string()))?;
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher.decrypt(nonce, encrypted_file).map_err(|_| {
        sdk_err(
            SdkErrorCode::AesDecryptFailed,
            "Decryption failed — data may be corrupted or tampered",
        )
    })?;

    Ok(plaintext)
}

// ─── Split / Merge Helpers ──────────────────────────────────────────────────

/// Split a VerzikPackage into a VerzikEnvelope for efficient network transport.
///
/// Client workflow:
/// ```js
/// const pkg = encrypt_package(file, pubkey, aes, nonce);
/// const envelope = split_package(pkg);
/// // POST envelope.metadata as JSON  (~200 bytes)
/// // POST envelope.encrypted_data as binary stream (large)
/// ```
#[wasm_bindgen]
pub fn split_package(package_js: JsValue) -> Result<JsValue, JsValue> {
    let pkg: VerzikPackage = serde_wasm_bindgen::from_value(package_js)
        .map_err(|e| JsValue::from_str(&format!("[DeserializeError] {}", e)))?;

    let envelope = VerzikEnvelope {
        metadata: VerzikMetadata {
            encrypted_key: pkg.encrypted_key,
            nonce: pkg.nonce,
        },
        encrypted_data: pkg.encrypted_file,
    };

    Ok(serde_wasm_bindgen::to_value(&envelope)?)
}

/// Merge metadata + encrypted data back into a VerzikPackage for decryption.
///
/// Client workflow:
/// ```js
/// const pkg = merge_package(metadata, encrypted_data);
/// const plaintext = decrypt_package(
///     pkg.encrypted_file, pkg.encrypted_key, pkg.nonce, myPrivateKey
/// );
/// ```
#[wasm_bindgen]
pub fn merge_package(metadata_js: JsValue, encrypted_data: &[u8]) -> Result<JsValue, JsValue> {
    let meta: VerzikMetadata = serde_wasm_bindgen::from_value(metadata_js)
        .map_err(|e| JsValue::from_str(&format!("[DeserializeError] {}", e)))?;

    let package = VerzikPackage {
        encrypted_file: encrypted_data.to_vec(),
        encrypted_key: meta.encrypted_key,
        nonce: meta.nonce,
    };

    Ok(serde_wasm_bindgen::to_value(&package)?)
}
