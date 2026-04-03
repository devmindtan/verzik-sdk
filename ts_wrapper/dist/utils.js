"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexToBytes = hexToBytes;
exports.bytesToHex = bytesToHex;
exports.parseError = parseError;
// ─── Hex / Bytes Conversion ─────────────────────────────────────────────────
/** Convert hex string (with or without 0x prefix) to Uint8Array */
function hexToBytes(hex) {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (clean.length % 2 !== 0) {
        throw new Error(`Invalid hex string length: ${clean.length}`);
    }
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}
/** Convert Uint8Array to hex string (no 0x prefix) */
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
// ─── Error Parsing ──────────────────────────────────────────────────────────
/**
 * Parse SDK error string "[CODE] message" into structured VerzikError.
 * Falls back gracefully if format doesn't match.
 */
function parseError(raw) {
    const str = String(raw);
    const match = str.match(/^\[(\w+)\]\s*(.*)$/);
    if (match) {
        return { code: match[1], message: match[2], raw: str };
    }
    return { code: "UNKNOWN", message: str, raw: str };
}
//# sourceMappingURL=utils.js.map