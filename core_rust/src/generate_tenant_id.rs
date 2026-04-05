use wasm_bindgen::prelude::*;
use tiny_keccak::{Hasher, Keccak};

#[wasm_bindgen]
pub fn generate_tenant_id(name: &str) -> String {
    let mut hasher = Keccak::v256();
    let mut output = [0u8; 32];
    
    hasher.update(name.as_bytes());
    let timestamp = js_sys::Date::now() as u64; 
    hasher.update(&timestamp.to_be_bytes());
    
    hasher.finalize(&mut output);
    
    format!("0x{}", hex::encode(output))
}