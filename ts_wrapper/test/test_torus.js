const { VerzikSDK } = require("../dist/index.js");

async function testTorusIntegration() {
    console.log("🚀 Bắt đầu test Torus Public Key Lookup qua VerzikSDK...");
    const email = "hoanghuanpham3@gmail.com"; 

    try {
        const pubKey = await VerzikSDK.getPublicKeyFromEmail(email, {
            network: "sapphire_devnet",
            clientId: "BJ-M7ve4Q2kYdg5jsEfIyPPNNWP7a7QhkdGOzis86Ug5SD1WYUsd1PjPnQaqEXz_99A5XUNdVGHRMNQm464wHeM", // Hãy thay client ID thật vào đây sau này
            verifier: "verzik-auth" // Verifier dùng cho dApp giả lập của bạn
        });
        
        console.log("✅ Lấy Public Key thành công!");
        console.log("🔑 Kết quả:", pubKey);
    } catch (error) {
        console.error("❌ Lỗi khi lấy Public Key:", error.message);
    }
}

testTorusIntegration();
