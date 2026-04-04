import * as core from "../core_wasm/verzik_sdk";
import type { ReWrapResult } from "./types";

/**
 * Re-wraps the AES key for a new recipient without re-encrypting file data.
 *
 * @param encryptedKey ECIES-wrapped AES key from the original package
 * @param nonce Original nonce (12 bytes)
 * @param oldPrivateKey Current owner's secp256k1 private key (32 bytes)
 * @param newRecipientPubKey New recipient's uncompressed public key (65 bytes, 04-prefix)
 */
export function reWrapKey(
  encryptedKey: Uint8Array,
  nonce: Uint8Array,
  oldPrivateKey: Uint8Array,
  newRecipientPubKey: Uint8Array,
): ReWrapResult {
  const result = core.re_wrap_key(encryptedKey, nonce, oldPrivateKey, newRecipientPubKey);

  return {
    encrypted_key: new Uint8Array(result.encrypted_key),
    encryption_meta_hash: result.encryption_meta_hash as string,
  };
}
