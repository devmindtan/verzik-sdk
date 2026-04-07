const { ethers } = require("ethers");

/**
 * Script này tạo ra một ví Ethereum ngẫu nhiên
 * Cung cấp: Address, Public Key (uncompressed), và Private Key
 */
function generateWallet() {
    console.log("🚀 Đang tạo ví mới...");
    
    // Tạo ví ngẫu nhiên
    const wallet = ethers.Wallet.createRandom();
    
    // Uncompressed Public Key (được dùng để mã hoá ECIES trong Verzik SDK)
    const pubKey = wallet.signingKey.publicKey;
    const privKey = wallet.privateKey;
    const address = wallet.address;

    console.log("\n✅ Đã tạo thành công:");
    console.log("══════════════════════════════════════════");
    console.log(`   Address:      ${address}`);
    console.log(`   Public Key:   ${pubKey}`);
    console.log(`   Private Key:  ${privKey}`);
    console.log("══════════════════════════════════════════");
    console.log("\n⚠️ Lưu trữ Private Key cẩn thận! Nó được dùng để giải mã.");
}

generateWallet();