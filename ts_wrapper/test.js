const { NodeDetailManager } = require("@toruslabs/fetch-node-details");
const { Torus } = require("@toruslabs/torus.js");
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
 
const sdk = require('./core_wasm/verzik_sdk.js');
 
const hexToUint8Array = (hex) => {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    return new Uint8Array(clean.match(/.{1,2}/g).map(b => parseInt(b, 16)));
};

async function fullEncryptTest(email, filePath) {
    console.log(`\n === VERZIK SDK FULL TEST === `);
    console.log(`Target: ${email}`);
    console.log(`File  : ${filePath}\n`);

    try {
        console.log("─── Bước 1: Lookup Public Key ───");
        const fetchNodeDetails = new NodeDetailManager({ network: "sapphire_devnet" });
        const torus = new Torus({
            network: "sapphire_devnet",
            clientId: "your-key",
        });

        const nodeDetails = await fetchNodeDetails.getNodeDetails({
            verifier: "verzik-auth",
            verifierId: email,
        });

        const result = await torus.getPublicAddress(
            nodeDetails.torusNodeEndpoints,
            nodeDetails.torusNodePub,
            { verifier: "verzik-auth", verifierId: email }
        );
 
        let pubKeyHex = "";
        if (result.finalKeyData?.X && result.finalKeyData?.Y) {
            const x = result.finalKeyData.X.toString(16).padStart(64, '0');
            const y = result.finalKeyData.Y.toString(16).padStart(64, '0');
            pubKeyHex = "04" + x + y;
        } else if (result.X && result.Y) {
            const x = result.X.toString(16).padStart(64, '0');
            const y = result.Y.toString(16).padStart(64, '0');
            pubKeyHex = "04" + x + y;
        } else {
            throw new Error("Không thể trích xuất Public Key từ Torus.");
        }
        console.log("Public Key:", pubKeyHex.substring(0, 20) + "...");
 
        console.log("\n─── Bước 2: Encrypt Package ───");
        const fileBuffer = fs.readFileSync(filePath);
        const aesKey = crypto.randomBytes(32);
        const nonce = crypto.randomBytes(12);

        console.log(`File size: ${fileBuffer.length} bytes`);

        const pkg = sdk.encrypt_package(
            new Uint8Array(fileBuffer),
            hexToUint8Array(pubKeyHex),
            new Uint8Array(aesKey),
            new Uint8Array(nonce),
        );

        console.log("Encrypted!");
        console.log(`   encrypted_file : ${pkg.encrypted_file.length} bytes`);
        console.log(`   encrypted_key  : ${pkg.encrypted_key.length} bytes`);
        console.log(`   nonce          : ${pkg.nonce.length} bytes`);

        console.log("\n─── Bước 3: Split Package (metadata vs data) ───");
        const envelope = sdk.split_package(pkg);

        const metadataJson = JSON.stringify({
            encrypted_key: Array.from(envelope.metadata.encrypted_key),
            nonce: Array.from(envelope.metadata.nonce),
        });

        console.log("Split thành công!");
        console.log(`   metadata JSON  : ${metadataJson.length} bytes  ← gửi nhẹ`);
        console.log(`   encrypted_data : ${envelope.encrypted_data.length} bytes  ← gửi binary`);

        console.log("\n─── Bước 4: Merge Package (simulate nhận lại từ server) ───");
        const merged = sdk.merge_package(
            envelope.metadata,
            new Uint8Array(envelope.encrypted_data),
        );

        console.log("Merge thành công!");
        console.log(`   encrypted_file : ${merged.encrypted_file.length} bytes`);
        console.log(`   encrypted_key  : ${merged.encrypted_key.length} bytes`);
        console.log(`   nonce          : ${merged.nonce.length} bytes`);

        console.log("\n─── Verify: So sánh trước/sau split+merge ───");
        const fileMatch = Buffer.from(pkg.encrypted_file).equals(Buffer.from(merged.encrypted_file));
        const keyMatch = Buffer.from(pkg.encrypted_key).equals(Buffer.from(merged.encrypted_key));
        const nonceMatch = Buffer.from(pkg.nonce).equals(Buffer.from(merged.nonce));

        console.log(`   encrypted_file match : ${fileMatch ? '✅' : '❌'}`);
        console.log(`   encrypted_key match  : ${keyMatch ? '✅' : '❌'}`);
        console.log(`   nonce match          : ${nonceMatch ? '✅' : '❌'}`);

        if (fileMatch && keyMatch && nonceMatch) {
            console.log("\nALL PASSED — Split/Merge round-trip hoàn hảo!");
        } else {
            console.log("\nDATA MISMATCH — Có lỗi trong split/merge!");
        }

        // ━━━ LƯU KẾT QUẢ ━━━
        const output = {
            target_email: email,
            metadata: {
                encrypted_key_hex: Buffer.from(pkg.encrypted_key).toString('hex'),
                nonce_hex: Buffer.from(pkg.nonce).toString('hex'),
            },
            encrypted_file_size: pkg.encrypted_file.length,
            timestamp: new Date().toISOString(),
        };
        fs.writeFileSync('result.json', JSON.stringify(output, null, 2));

    } catch (error) {
        console.error("\nLỖI:", error.message || error);
        if (error.stack) console.error(error.stack);
    }
}

// ━━━ RUN ━━━
const testFile = path.join(__dirname, 'test.pdf');
fullEncryptTest("email@gmail.com", testFile);com