import { ethers } from "ethers";
import { VerzikSDK } from "../src/index";
import type { RegisterPayload } from "../src/types";

async function main() {
    console.log("=== THÔNG TIN TỪ MẠNG DEV (K3S) ===");
    const PROTOCOL_ADDRESS = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
    const TENANT_ID = "0xe702fef210dc66faad0553ea8e2f5064188068f8052d2cd9c9611417db5c2705";

    // Khởi tạo provider local, dùng để debug ngẫu nhiên (nếu hardhat chạy)
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    console.log("\n1. Test lấy PublicKey bằng Email (VerzikSDK.getPublicKeyFromEmail) ...");
    const testEmail = "hoanghuanpham3@gmail.com";
    try {
        const pubKey = await VerzikSDK.getPublicKeyFromEmail(testEmail, {
            network: "sapphire_devnet",
            clientId: "",
            verifier: "verzik-auth"
        });
        console.log(`   => PublicKey lấy được cho ${testEmail}:`, pubKey);
    } catch (e: any) {
        console.log(`   => [Lưu ý] Lỗi lấy PublicKey cho ${testEmail} (Có thể do sai Verifier/ClientId):`, e.message);
    }

    console.log("\n2. Thiết lập ví người dùng (người tiến hành ký duyệt)...");
    const wallet = ethers.Wallet.createRandom();
    console.log("   => Địa chỉ ví người ký:", wallet.address);

    const payload: RegisterPayload = {
        tenantId: TENANT_ID,
        fileHash: ethers.id("nong-dan-thoi-dai-moi-file-hash"),
        cid: "QmDemoCID_test_k3s_network_123",
        ciphertextHash: ethers.id("cipher_demo"),
        encryptionMetaHash: ethers.id("meta_demo"),
        docType: 1,
        version: 1,
        nonce: 1,
        deadline: Math.floor(Date.now() / 1000) + 3600 // 1 tiếng nữa hết hạn
    };

    console.log("\n3. Gọi thử VerzikSDK.signAnchorPayload()...");

    // Gọi hàm SDK mà chúng ta vừa tái cấu trúc
    const signature = await VerzikSDK.signAnchorPayload(
        wallet,
        PROTOCOL_ADDRESS,
        payload
    );
    console.log("   => Chữ ký thu được:", signature);

    console.log("\n4. Thử verify chữ ký (kiểm tra chéo xem có bị sai cấu trúc EIP-712 không)...");

    let chainId = 1n; // Trùng khớp với logic fallback bên trong signAnchorPayload (1n) khi không có provider
    try {
        chainId = (await provider.getNetwork()).chainId;
        console.log("   => Đã lấy được chainId từ K3S/Hardhat rpc:", chainId);
    } catch (e) {
        console.log("   => Không kết nối được tới 127.0.0.1:8545. Tự động fallback chainId=1 để verify (trùng khớp với sign).");
    }

    const domain = {
        name: "VoucherProtocol",
        version: "1",
        chainId: chainId,
        verifyingContract: PROTOCOL_ADDRESS
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

    const recoveredAddr = ethers.verifyTypedData(domain, types, payload, signature);
    console.log("   => Người ký thực sự theo Smart Contract hỉểu:", recoveredAddr);
    console.log("   => Trùng khớp với ví không? :", recoveredAddr === wallet.address ? "YES!" : "NO!");
}

main().catch(err => console.error(err));
