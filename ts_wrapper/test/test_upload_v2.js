const fs = require("fs");
const path = require("path");
const { VerzikSDK, bytesToHex, hexToBytes } = require("../dist/index.js");

/**
 * CẤU HÌNH TEST (Thay đổi cho phù hợp với môi trường của bạn)
 */
const CONFIG = {
    BACKEND_URL: "http://localhost:3000/api/v1/upload",
    CLIENT_ID: "vz_c7bf29db842ada690d9a539b96344914", // Thay bằng Client ID thực tế của bạn
    CLIENT_DOMAIN: "localhost",
    RECIPIENT_EMAIL: "hoanghuanpham3@gmail.com",
    TORUS: {
        network: "sapphire_devnet",
        clientId: "BJ-M7ve4Q2kYdg5jsEfIyPPNNWP7a7QhkdGOzis86Ug5SD1WYUsd1PjPnQaqEXz_99A5XUNdVGHRMNQm464wHeM",
        verifier: "verzik-auth",
    }
};

async function testUploadDraft() {
    console.log("🚀 Bắt đầu quy trình test Upload Draft (Bước 1/2)");

    // 1. Lấy Public Key của người nhận
    console.log(`\n🔍 Bước 1: Tra cứu Public Key cho ${CONFIG.RECIPIENT_EMAIL}...`);
    let pubKeyHex;
    try {
        pubKeyHex = await VerzikSDK.getPublicKeyFromEmail(CONFIG.RECIPIENT_EMAIL, CONFIG.TORUS);
        console.log("✅ Public Key:", pubKeyHex);
    } catch (err) {
        console.error("❌ Lỗi tra cứu Public Key:", err.message);
        return;
    }

    // 2. Chuẩn bị file dữ liệu
    const filePath = path.join(__dirname, "cw.pdf");
    if (!fs.existsSync(filePath)) {
        console.log("📝 Tạo file giả để test...");
        fs.writeFileSync(filePath, Buffer.from("%Pdadad"));
    }
    const fileBuffer = fs.readFileSync(filePath);
    const fileData = new Uint8Array(fileBuffer);
    console.log(`\n📄 Bước 2: Chuẩn bị file (${fileData.length} bytes)`);

    // 3. Hash tài liệu (Original Hash)
    const originalHash = VerzikSDK.hashDocument(fileData);
    console.log("🧬 Original Hash:", originalHash);

    // 4. Mã hoá tài liệu
    console.log("\n🔐 Bước 3: Đang mã hoá tài liệu...");
    const pubKeyBytes = hexToBytes(pubKeyHex);
    const pkg = VerzikSDK.encrypt(fileData, pubKeyBytes);
    console.log("✅ Mã hoá thành công!");

    // 5. Chuẩn bị Body Multipart/Form-Data
    console.log("\n📦 Bước 4: Chuẩn bị request body...");
    
    // Lưu ý: Node 18+ đã có sẵn FormData và fetch
    const formData = new FormData();
    
    // File binary đã mã hoá
    const encryptedFileBlob = new Blob([pkg.encrypted_file], { type: "application/octet-stream" });
    formData.append("encrypted_file", encryptedFileBlob, "encrypted_file.bin");

    // Các thông tin hash định danh
    formData.append("original_hash", originalHash);
    
    // JSON string cho hashes
    const hashesJson = JSON.stringify({
        ciphertext_hash: pkg.ciphertext_hash,
        encryption_meta_hash: pkg.encryption_meta_hash
    });
    formData.append("hashes", hashesJson);

    // JSON string cho keys
    const keysJson = JSON.stringify({
        encrypted_key: bytesToHex(pkg.encrypted_key),
        issuer_encrypted_key: bytesToHex(pkg.encrypted_key), // Tạm thời dùng chung
        nonce: bytesToHex(pkg.nonce),
        // optional: recipient_keys: { "wallet": "key_hex" }
    });
    formData.append("keys", keysJson);

    // Anchor payload (Optionally)
    const anchorPayloadJson = JSON.stringify({
        tenant_id: "0xe702fef210dc66faad0553ea8e2f5064188068f8052d2cd9c9611417db5c2705",
        doc_type: 1,
        version: 1,
        operator_nonce: 0,
        deadline: Math.floor(Date.now() / 1000) + 3600
    });
    formData.append("anchor_payload", anchorPayloadJson);

    // 6. Gửi request đến backend
    console.log("\n🌐 Bước 5: Đang gửi POST /api/v1/upload...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
        const response = await fetch(CONFIG.BACKEND_URL, {
            method: "POST",
            headers: {
                "X-Client-Id": CONFIG.CLIENT_ID,
                "X-Client-Domain": CONFIG.CLIENT_DOMAIN,
            },
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await response.json();
        console.log("\n📥 Phản hồi từ Server:");
        console.log(JSON.stringify(result, null, 2));

        if (response.ok && (result.status === "success" || result.success === true)) {
            console.log("\n✨ KẾT QUẢ: Tải bản nháp thành công! Trạng thái: PENDING.");
            console.log("👉 Tiếp theo bạn có thể thực hiện bước Anchor bằng chữ ký.");
        } else {
            console.error("\n❌ Tải bản nháp thất bại.");
        }
    } catch (err) {
        console.error("\n❌ Lỗi kết nối đến backend:", err.message);
    }
}

testUploadDraft().catch(console.error);
