import type { EncryptOptions, VerzikEnvelope, VerzikError, VerzikMetadata, VerzikPackage, TorusNetworkOptions } from "./types";
import { bytesToHex, hexToBytes, parseError } from "./utils";
import { encrypt, decrypt, split, merge, hashDocument } from "./encrypt";
export type { EncryptOptions, VerzikEnvelope, VerzikError, VerzikMetadata, VerzikPackage, TorusNetworkOptions, };
export { bytesToHex, hexToBytes, parseError };
export declare class VerzikSDK {
    static encrypt: typeof encrypt;
    static decrypt: typeof decrypt;
    static split: typeof split;
    static merge: typeof merge;
    static hashDocument: typeof hashDocument;
    static ping(): void;
    static getPublicKeyFromEmail(email: string, options: TorusNetworkOptions): Promise<string>;
}
//# sourceMappingURL=index.d.ts.map