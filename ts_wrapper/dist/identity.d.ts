import type { TorusNetworkOptions } from "./types";
/**
 * Lấy Public Key từ mạng lưới Torus dựa vào email của người dùng.
 * @param email Email của người dùng
 * @param options Cấu hình Torus (network, clientId, verifier)
 * @returns Chuỗi Public Key dạng hex (bắt đầu bằng 04)
 */
export declare function getPublicKeyFromEmail(email: string, options: TorusNetworkOptions): Promise<string>;
//# sourceMappingURL=identity.d.ts.map