use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit},
};
use ecies::{decrypt as ecies_decrypt, encrypt as ecies_encrypt};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use crate::keccak_hash::hash_doc;

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

pub fn sdk_err(code: SdkErrorCode, detail: &str) -> JsValue {
    JsValue::from_str(&format!("[{:?}] {}", code, detail))
}

#[derive(Serialize, Deserialize)]
pub struct VerzikPackage {
    pub encrypted_file: Vec<u8>,
    pub encrypted_key: Vec<u8>,
    pub nonce: [u8; 12],
    pub ciphertext_hash: String,
    pub encryption_meta_hash: String,
}

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

    let cipher = Aes256Gcm::new_from_slice(aes_key)
        .map_err(|e| sdk_err(SdkErrorCode::InvalidAesKey, &e.to_string()))?;
    let nonce = Nonce::from_slice(nonce_bytes);

    let encrypted_file = cipher
        .encrypt(nonce, file_data)
        .map_err(|_| sdk_err(SdkErrorCode::AesEncryptFailed, "AES-GCM encryption failed"))?;

    let encrypted_key = ecies_encrypt(recipient_pub_key, aes_key).map_err(|_| {
        sdk_err(
            SdkErrorCode::EciesWrapFailed,
            "Check public key format (65 bytes, 04-prefix)",
        )
    })?;

    let mut nonce_arr = [0u8; 12];
    nonce_arr.copy_from_slice(nonce_bytes);

    let ciphertext_hash = hash_doc(&encrypted_file);
    
    let mut meta_data = Vec::with_capacity(encrypted_key.len() + nonce_bytes.len());
    meta_data.extend_from_slice(&encrypted_key);
    meta_data.extend_from_slice(nonce_bytes);
    let encryption_meta_hash = hash_doc(&meta_data);

    let package = VerzikPackage {
        encrypted_file,
        encrypted_key,
        nonce: nonce_arr,
        ciphertext_hash,
        encryption_meta_hash,
    };

    Ok(serde_wasm_bindgen::to_value(&package)?)
}

#[wasm_bindgen]
pub fn decrypt_package(
    encrypted_file: &[u8],
    encrypted_key: &[u8],
    nonce_bytes: &[u8],
    my_private_key: &[u8],
) -> Result<Vec<u8>, JsValue> {
    if nonce_bytes.len() != 12 {
        return Err(sdk_err(
            SdkErrorCode::InvalidNonce,
            &format!("Expected 12 bytes, got {}", nonce_bytes.len()),
        ));
    }

    let aes_key = ecies_decrypt(my_private_key, encrypted_key).map_err(|_| {
        sdk_err(
            SdkErrorCode::EciesUnwrapFailed,
            "Wrong private key or corrupted wrapped key",
        )
    })?;

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

