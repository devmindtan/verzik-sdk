const fs = require("fs");
const path = require("path");
const { VerzikSDK, hexToBytes, bytesToHex } = require("../dist/index.js");
 
const CONFIG = {
    METADATA_CID: "bafkreiget3undlj7m365w6hjqkslnsgonpzijzgpgubudtdboghlfhdoby",  
    PRIVATE_KEY: "0xe3fb52afbe00182a0198d148f09c54be49b34dbc77ba3bbe9d502365c22d9afa", 
    IPFS_GATEWAY: "https://ipfs.io/ipfs/",
};

async function testDecrypt() {
    try {
        const metadataCid = process.argv[2] || CONFIG.METADATA_CID;
        const privateKeyHex = process.argv[3] || CONFIG.PRIVATE_KEY;

        console.log(`Starting decryption test for CID: ${metadataCid}`);
 
        console.log(`\nStep 1: Fetching metadata from IPFS...`);
        const metaUrl = `${CONFIG.IPFS_GATEWAY}${metadataCid}`;
        const metaResponse = await fetch(metaUrl);
        if (!metaResponse.ok) {
            throw new Error(`Failed to fetch metadata: ${metaResponse.statusText}`);
        }
        const metadata = await metaResponse.json();
        console.log("   ✅ Metadata fetched successfully.");
        console.log("   Metadata keys:", Object.keys(metadata));

        // 2. Extract required pieces
        const fileCid = metadata.file_cid || (metadata.file_pointer ? metadata.file_pointer.replace("ipfs://", "") : null);
        const encryptedKey = metadata.keys?.encrypted_key || metadata.encrypted_key;
        const nonce = metadata.keys?.nonce || metadata.nonce;

        if (!fileCid || !encryptedKey || !nonce) {
            console.error("❌ Metadata missing required fields (file_cid, encrypted_key, nonce)");
            console.log("Full metadata:", JSON.stringify(metadata, null, 2));
            return;
        }

        console.log(`\n🔍 Step 2: Fetching encrypted file from IPFS: ${fileCid}...`);
        const fileUrl = `${CONFIG.IPFS_GATEWAY}${fileCid}`;
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
            throw new Error(`Failed to fetch encrypted file: ${fileResponse.statusText}`);
        }
        const encryptedFileBuffer = await fileResponse.arrayBuffer();
        const encryptedFile = new Uint8Array(encryptedFileBuffer);
        console.log(`   ✅ Encrypted file fetched (${encryptedFile.length} bytes).`);

        // 3. Decrypt the file
        console.log(`\n🔐 Step 3: Decrypting using VerzikSDK...`);
        const pkg = {
            encrypted_file: encryptedFile,
            encrypted_key: hexToBytes(encryptedKey),
            nonce: hexToBytes(nonce),
        };

        const privateKeyBytes = hexToBytes(privateKeyHex);
        const decryptedFile = VerzikSDK.decrypt(pkg, privateKeyBytes);

        console.log(`   ✅ Decryption successful! (${decryptedFile.length} bytes).`);

        // 4. Save decrypted file
        const outputName = metadata.file_name ? `decrypted_${metadata.file_name}` : "decrypted_file.bin";
        const outputPath = path.join(__dirname, outputName);
        fs.writeFileSync(outputPath, Buffer.from(decryptedFile));
        console.log(`\n💾 Saved decrypted file to: ${outputPath}`);

        // Preview content if it seems like text
        if (decryptedFile.length < 1000) {
            const preview = new TextDecoder().decode(decryptedFile);
            console.log(`\n📝 Preview (first 1000 chars):\n${preview}`);
        }

    } catch (error) {
        console.error(`\n❌ Decryption failed:`, error.message);
    }
}

testDecrypt().catch(console.error);
