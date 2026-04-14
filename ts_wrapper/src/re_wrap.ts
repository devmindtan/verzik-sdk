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
  if (!(oldPrivateKey instanceof Uint8Array) || oldPrivateKey.length !== 32) {
    throw new Error("Invalid private key format. Expected 32-byte SECP256k1 private key.");
  }
  if (
    !(newRecipientPubKey instanceof Uint8Array) ||
    !((newRecipientPubKey.length === 65 && newRecipientPubKey[0] === 0x04) ||
      (newRecipientPubKey.length === 33 && (newRecipientPubKey[0] === 0x02 || newRecipientPubKey[0] === 0x03)))
  ) {
    throw new Error("Invalid Web3 public key format. Expected uncompressed (65 bytes, 0x04) or compressed (33 bytes, 0x02/0x03) SECP256k1 public key.");
  }

  const result = core.re_wrap_key(encryptedKey, nonce, oldPrivateKey, newRecipientPubKey);

  return {
    encrypted_key: new Uint8Array(result.encrypted_key),
    encryption_meta_hash: result.encryption_meta_hash as string,
  };
}
