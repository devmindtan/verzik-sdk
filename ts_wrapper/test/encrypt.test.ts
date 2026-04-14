import { describe, it, expect } from "vitest";
import { encrypt } from "../src/encrypt";
import crypto from "crypto";

describe("VerzikSDK Encryption", () => {
    it("should encrypt successfully with a valid uncompressed public key", () => {
        // Generate a random uncompressed public key (65 bytes with 0x04 prefix)
        const recipientPubKey = new Uint8Array(65);
        recipientPubKey[0] = 0x04;
        crypto.randomFillSync(recipientPubKey, 1);

        const data = new Uint8Array([1, 2, 3, 4, 5]);

        const result = encrypt(data, recipientPubKey);
        
        expect(result).toHaveProperty("encrypted_file");
        expect(result).toHaveProperty("encrypted_key");
        expect(result).toHaveProperty("nonce");
        expect(result).toHaveProperty("ciphertext_hash");
        expect(result).toHaveProperty("encryption_meta_hash");
    });

    it("should throw error if recipient public key is invalid", () => {
        const invalidPubKey = new Uint8Array([1, 2, 3]); // Invalid length
        const data = new Uint8Array([1, 2, 3, 4, 5]);

        expect(() => encrypt(data, invalidPubKey)).toThrow(
            "Invalid Web3 public key format. Expected uncompressed (65 bytes, 0x04) or compressed (33 bytes, 0x02/0x03) SECP256k1 public key."
        );
    });
});
