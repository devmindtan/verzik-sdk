"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicKeyFromEmail = getPublicKeyFromEmail;
const fetch_node_details_1 = require("@toruslabs/fetch-node-details");
const torus_js_1 = require("@toruslabs/torus.js");
/**
 * Lấy Public Key từ mạng lưới Torus dựa vào email của người dùng.
 * @param email Email của người dùng
 * @param options Cấu hình Torus (network, clientId, verifier)
 * @returns Chuỗi Public Key dạng hex (bắt đầu bằng 04)
 */
async function getPublicKeyFromEmail(email, options) {
    const fetchNodeDetails = new fetch_node_details_1.NodeDetailManager({ network: options.network });
    const torus = new torus_js_1.Torus({
        network: options.network,
        clientId: options.clientId,
    });
    const nodeDetails = await fetchNodeDetails.getNodeDetails({
        verifier: options.verifier,
        verifierId: email,
    });
    const result = await torus.getPublicAddress(nodeDetails.torusNodeEndpoints, nodeDetails.torusNodePub, { verifier: options.verifier, verifierId: email });
    let pubKeyHex = "";
    if (result.finalKeyData?.X && result.finalKeyData?.Y) {
        const x = String(result.finalKeyData.X).replace(/^0x/, "").padStart(64, '0');
        const y = String(result.finalKeyData.Y).replace(/^0x/, "").padStart(64, '0');
        pubKeyHex = "04" + x + y;
    }
    else if (result.X && result.Y) {
        const x = String(result.X).replace(/^0x/, "").padStart(64, '0');
        const y = String(result.Y).replace(/^0x/, "").padStart(64, '0');
        pubKeyHex = "04" + x + y;
    }
    else {
        throw new Error("Cannot get Key.");
    }
    return pubKeyHex;
}
//# sourceMappingURL=identity.js.map