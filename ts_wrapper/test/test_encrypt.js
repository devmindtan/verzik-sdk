const fs = require("fs");
const path = require("path");
const { VerzikSDK, hexToBytes, bytesToHex } = require("../dist/index.js");

const TORUS_CONFIG = {
    network: "sapphire_devnet",
    clientId: "your-key",
    verifier: "verzik-auth",
};

async function testEncryptFlow() {
    const email = "[EMAIL_ADDRESS]";

    // ─── Bước 1: Lookup Public Key từ email ───
    console.log("🔍 Bước 1: Lookup Public Key cho", email);
    const pubKeyHex = await VerzikSDK.getPublicKeyFromEmail(email, TORUS_CONFIG);
    console.log("🔑 Public Key:", pubKeyHex.substring(0, 20) + "...");

    // ─── Bước 2: Chuẩn bị dữ liệu cần mã hoá ───
    const filePath = path.join(__dirname, "data.pdf");
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Không tìm thấy file: ${filePath}`);
        console.log(`⚠️ Tự động tạo một file data.pdf giả để test...`);
        fs.writeFileSync(filePath, Buffer.from("%PDF-1.4\n" + "DUMMY_DATA_".repeat(100)));
    }
    const sampleData = fs.readFileSync(filePath);
    const fileData = new Uint8Array(sampleData);
    console.log("\n📄 Bước 2: Dữ liệu gốc đọc từ data.pdf (" + fileData.length + " bytes)");

    // ─── Bước 3: Hash tài liệu (Keccak-256) ───
    const docHash = VerzikSDK.hashDocument(fileData);
    console.log("🧬 Bước 3: Document Hash:", docHash.substring(0, 20) + "...");

    // ─── Bước 4: Mã hoá bằng AES-256-GCM + ECIES ───
    console.log("\n🔐 Bước 4: Đang mã hoá...");
    const pubKeyBytes = hexToBytes(pubKeyHex);
    const pkg = VerzikSDK.encrypt(fileData, pubKeyBytes);

    console.log("  ├─ encrypted_file:        ", pkg.encrypted_file.length, "bytes");
    console.log("  ├─ encrypted_key:         ", pkg.encrypted_key.length, "bytes");
    console.log("  ├─ nonce:                 ", pkg.nonce.length, "bytes");
    console.log("  ├─ ciphertext_hash (New): ", pkg.ciphertext_hash);
    console.log("  └─ encryption_meta_hash:  ", pkg.encryption_meta_hash);

    // ─── Bước 5: Split thành metadata + ciphertext (cho việc upload riêng) ───
    const envelope = VerzikSDK.split(pkg);
    console.log("\n📦 Bước 5: Split envelope");
    console.log("  ├─ metadata.encrypted_key:", bytesToHex(envelope.metadata.encrypted_key).substring(0, 30) + "...");
    console.log("  ├─ metadata.nonce:        ", bytesToHex(envelope.metadata.nonce));
    console.log("  └─ encrypted_data:        ", envelope.encrypted_data.length, "bytes");

    // ─── Bước 6: Merge lại và kiểm tra tính toàn vẹn ───
    const rebuilt = VerzikSDK.merge(envelope.metadata, envelope.encrypted_data);
    const isIntact =
        bytesToHex(rebuilt.encrypted_file) === bytesToHex(pkg.encrypted_file) &&
        bytesToHex(rebuilt.encrypted_key) === bytesToHex(pkg.encrypted_key) &&
        bytesToHex(rebuilt.nonce) === bytesToHex(pkg.nonce);
    console.log("\nBước 6: Merge lại →", isIntact ? "Toàn vẹn!" : "Sai lệch!");

    //console.log(envelope.encrypted_data, envelope.metadata) log with small file

    
    // Đóng gói JSON thông tin Metadata (Sẽ đưa vào header)
    const headerMetadata = JSON.stringify({
        encrypted_key: bytesToHex(envelope.metadata.encrypted_key),
        nonce: bytesToHex(envelope.metadata.nonce)
    });

    try {
        const response = await fetch("http://localhost:3000/api/upload-binary", {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream", 
                "X-Document-Hash": docHash,
                "X-Metadata": headerMetadata
            },
            body: envelope.encrypted_data 
        });
        
        const jsonFeedback = await response.json();
        console.log("server:", jsonFeedback);
    } catch (err) {
        console.log("Error:", err);
    }
}

testEncryptFlow().catch(console.error);
