use tiny_keccak::{Hasher, Keccak};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn hash_doc(data: &[u8]) -> String {
    let mut hasher = Keccak::v256();
    let mut output = [0u8; 32];

    hasher.update(data);
    hasher.finalize(&mut output);

    format!("0x{}", hex::encode(output))
}
