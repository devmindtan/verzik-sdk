import { ethers } from "ethers";
import type { RegisterPayload } from "./types";

// Hàm này nằm ở lớp TS Wrapper, chạy sau khi Rust đã mã hóa xong và BE đã trả về CID
// Cập nhật để hỗ trợ Ethers v6: nhận trực tiếp lớp Signer
export async function signAnchorPayload(
    signer: ethers.Signer,
    verifyingContract: string,
    payload: RegisterPayload
) {
    // 1. Cấu hình đúng chuẩn Domain mà Smart Contract yêu cầu
    const domain = {
        name: "VoucherProtocol",
        version: "1",
        chainId: signer.provider ? (await signer.provider.getNetwork()).chainId : 1n,
        verifyingContract
    };
    const types = {
        Register: [
            { name: "tenantId", type: "bytes32" },
            { name: "fileHash", type: "bytes32" },
            { name: "cid", type: "string" },
            { name: "ciphertextHash", type: "bytes32" },
            { name: "encryptionMetaHash", type: "bytes32" },
            { name: "docType", type: "uint32" },
            { name: "version", type: "uint32" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" }
        ]
    };

    // 3. Ethers v6 sẽ tự động dựng Popup MetaMask/Wallet lên cho user bấm
    // Chữ ký trả về sẽ là một chuỗi Hex chuẩn EIP-712
    const signature = await signer.signTypedData(domain, types, payload);
    return signature;
}