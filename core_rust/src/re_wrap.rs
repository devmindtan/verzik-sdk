use ecies::{decrypt as ecies_decrypt, encrypt as ecies_encrypt};
use wasm_bindgen::prelude::*;
use crate::encrypt::{SdkErrorCode, sdk_err};
use crate::keccak_hash::hash_doc;

/// Re-wraps an ECIES-encrypted AES key for a new recipient.
///
/// Decrypts `encrypted_key` with `old_private_key`, then re-encrypts the
/// recovered AES key with `new_recipient_pub_key`.
///
/// Returns a JS object: `{ encrypted_key: Uint8Array, encryption_meta_hash: String }`
#[wasm_bindgen]
pub fn re_wrap_key(
    encrypted_key: &[u8],
    nonce: &[u8],
    old_private_key: &[u8],
    new_recipient_pub_key: &[u8],
) -> Result<JsValue, JsValue> {
    let aes_key = ecies_decrypt(old_private_key, encrypted_key).map_err(|_| {
        sdk_err(
            SdkErrorCode::EciesUnwrapFailed,
            "Cannot unwrap key — wrong private key or corrupted data",
        )
    })?;

    let new_encrypted_key = ecies_encrypt(new_recipient_pub_key, &aes_key).map_err(|_| {
        sdk_err(
            SdkErrorCode::EciesWrapFailed,
            "Re-wrap failed — check new public key format (65 bytes, 04-prefix)",
        )
    })?;

    let mut meta_data = Vec::with_capacity(new_encrypted_key.len() + nonce.len());
    meta_data.extend_from_slice(&new_encrypted_key);
    meta_data.extend_from_slice(nonce);
    let encryption_meta_hash = hash_doc(&meta_data);

    let obj = js_sys::Object::new();
    js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("encrypted_key"),
        &js_sys::Uint8Array::from(new_encrypted_key.as_slice()).into(),
    )?;
    js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("encryption_meta_hash"),
        &JsValue::from_str(&encryption_meta_hash),
    )?;

    Ok(obj.into())
}
