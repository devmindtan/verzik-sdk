import type { VerzikError } from "./types";

export function hexToBytes(hex: string): Uint8Array {
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

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function parseError(raw: unknown): VerzikError {
  const str = String(raw);
  const match = str.match(/^\[(\w+)\]\s*(.*)$/);
  if (match) {
    return { code: match[1], message: match[2], raw: str };
  }
  return { code: "UNKNOWN", message: str, raw: str };
}
