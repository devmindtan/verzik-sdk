import { NodeDetailManager } from "@toruslabs/fetch-node-details";
import { Torus } from "@toruslabs/torus.js";
import type { TorusNetworkOptions } from "./types";

/**
 * Lấy Public Key từ mạng lưới Torus dựa vào email của người dùng.
 * @param email Email của người dùng
 * @param options Cấu hình Torus (network, clientId, verifier)
 * @returns Chuỗi Public Key dạng hex (bắt đầu bằng 04)
 */
export async function getPublicKeyFromEmail(email: string, options: TorusNetworkOptions): Promise<string> {
  const fetchNodeDetails = new NodeDetailManager({ network: options.network as any });
  const torus = new Torus({
    network: options.network as any,
    clientId: options.clientId,
  });

  const nodeDetails = await fetchNodeDetails.getNodeDetails({
    verifier: options.verifier,
    verifierId: email,
  });

  const result = await torus.getPublicAddress(
    nodeDetails.torusNodeEndpoints,
    nodeDetails.torusNodePub,
    { verifier: options.verifier, verifierId: email }
  );

  let pubKeyHex = "";
  if (result.finalKeyData?.X && result.finalKeyData?.Y) {
    const x = String(result.finalKeyData.X).replace(/^0x/, "").padStart(64, '0');
    const y = String(result.finalKeyData.Y).replace(/^0x/, "").padStart(64, '0');
    pubKeyHex = "04" + x + y;
  } else if ((result as any).X && (result as any).Y) {
    const x = String((result as any).X).replace(/^0x/, "").padStart(64, '0');
    const y = String((result as any).Y).replace(/^0x/, "").padStart(64, '0');
    pubKeyHex = "04" + x + y;
  } else {
    throw new Error("Cannot get Key.");
  }

  return pubKeyHex;
}
