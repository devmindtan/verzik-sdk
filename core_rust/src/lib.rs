use wasm_bindgen::prelude::*;

pub mod encrypt;
pub mod keccak_hash;
pub mod re_wrap;
pub mod generate_tenant_id;
pub mod stream;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn ping() {
    log("[RUST] Pong !");
}

#[wasm_bindgen]
pub fn hello(name: &str) -> String {
    format!("Hello, {}!", name)
}
