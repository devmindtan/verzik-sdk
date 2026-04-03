import type { VerzikError } from "./types";
/** Convert hex string (with or without 0x prefix) to Uint8Array */
export declare function hexToBytes(hex: string): Uint8Array;
/** Convert Uint8Array to hex string (no 0x prefix) */
export declare function bytesToHex(bytes: Uint8Array): string;
/**
 * Parse SDK error string "[CODE] message" into structured VerzikError.
 * Falls back gracefully if format doesn't match.
 */
export declare function parseError(raw: unknown): VerzikError;
//# sourceMappingURL=utils.d.ts.map