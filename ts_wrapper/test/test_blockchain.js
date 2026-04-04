require('dotenv').config({ path: '../.env' });
const { ethers } = require("ethers");

// Đọc ABI (Bác nhớ copy file VoucherProtocol.json của ông Tân vào nhé)
const VoucherProtocolABI = require("../src/abi/VoucherProtocolModule#VoucherProtocol.json");

async function testConnection() {
    console.log("🔌 Đang kết nối tới Blockchain local...");

    // 1. Kết nối RPC
    const provider = new ethers.JsonRpcProvider(process.env.LOCAL_RPC_URL);
    
    // 2. Nạp ví Account #1 (Tenant Admin)
    const wallet = new ethers.Wallet(process.env.TEST_PRIVATE_KEY, provider);

    // 3. Khởi tạo Contract
    const contract = new ethers.Contract(
        process.env.PROTOCOL_ADDRESS, 
        VoucherProtocolABI.abi, // Nhớ trỏ đúng vào mảng abi trong file json
        wallet
    );

    try {
        // Gọi thử hàm getTenantCount
        const count = await contract.getTenantCount();
        console.log(`✅ Kết nối thành công! Tổng số Tenant hiện có: ${count.toString()}`);
        
        // Gọi thêm hàm verify (Hàm số 9) xem file rác có tồn tại không
        const dummyHash = ethers.id("file_giả_mạo");
        const verifyObj = await contract.verify(process.env.TENANT_ID, dummyHash);
        console.log(`🔍 Test tra cứu file rỗng: Tồn tại = ${verifyObj[0]}`);

    } catch (error) {
        console.error("❌ Lỗi kết nối:", error);
    }
}

testConnection();