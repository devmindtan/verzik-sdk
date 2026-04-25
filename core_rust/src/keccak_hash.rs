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

#[wasm_bindgen]
pub fn verify_hash(data: &[u8], expected_hash: &str) -> bool {
    let hash = hash_doc(data);
    hash == expected_hash
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;
    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_hash_doc() {
        let doc = b"hello verzik";
        let hash = hash_doc(doc);
        assert!(hash.starts_with("0x"));
        assert_eq!(hash.len(), 66); // 0x + 64 hex chars
    }

    #[wasm_bindgen_test]
    fn test_verify_hash() {
        let doc = b"hello verzik";
        let hash = hash_doc(doc);
        assert!(verify_hash(doc, &hash));
        assert!(!verify_hash(doc, "0x1234567890abcdef"));
    }
}
