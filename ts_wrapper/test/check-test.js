const { ethers } = require("ethers");
const fs = require("fs");
const path = require('path');
async function checkBlockchain() {
    // 1. Kết nối vào mạng Hardhat của ông Tân
    const rpcUrl = "http://100.114.63.52:30545";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // 2. Tra cứu bằng Transaction Hash (Biên lai)
    const txHash = "0xb1dd46a3b119b8d24e80d8b59ca261f5bf0015435346bbfa6169c17aa37a2dcb"; // Lấy từ JSON
    console.log(`🔍 Đang đào xới Blockchain tìm tx: ${txHash}...`);
    
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (receipt) {
        console.log(`✅ CHUẨN RỒI! Giao dịch thành công, được đóng gói ở Block số: ${receipt.blockNumber}`);
        console.log(`⛽ Gas đã đốt: ${receipt.gasUsed.toString()} wei`);
    } else {
        console.log("❌ Không tìm thấy giao dịch, có thể mạng bị reset!");
        return;
    }

    // 3. Đọc dữ liệu vĩnh cửu nằm trong Smart Contract
    console.log("\n🔍 Đang trích xuất dữ liệu từ Smart Contract...");
    const contractAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"; // Lấy từ Notion
    
    const abiPath = path.join(__dirname, "../src/abi/VoucherProtocolModule#VoucherProtocol.json");
    const abiFile = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = abiFile.abi || abiFile;
    const contract = new ethers.Contract(contractAddress, abi, provider);

    const originalHash = "0x2de8ca26f7dd1404feec6081953e5d8279724dd261613bdc8a103bb834afadc1"; // Lấy từ JSON

    try {
        console.log("\n🔍 Đang gọi hàm getDocumentOrRevert từ Smart Contract...");
        
        // 1. Khai báo 2 cái chìa khoá (Lấy đúng cái Tenant ID mà bác dùng lúc tạo file Test)
        const tenantId = "0xe702fef210dc66faad0553ea8e2f5064188068f8052d2cd9c9611417db5c2705"; 
        const originalHash = "0x2de8ca26f7dd1404feec6081953e5d8279724dd261613bdc8a103bb834afadc1";

        // 2. Dùng Ethers.js gọi đúng cái hàm mà ông Tân đã viết
        const docData = await contract.getDocumentOrRevert(tenantId, originalHash); 
        
        console.log("🎉 TUYỆT VỜI! DỮ LIỆU ĐÃ ĐƯỢC MOI RA TỪ BLOCKCHAIN:");
        console.log({
            tenantId: docData.tenantId,
            cid: docData.cid, // Dám cá đây là cái IPFS CID của bác!
            issuer: docData.issuer,
            timestamp: new Date(Number(docData.timestamp) * 1000).toLocaleString(),
            isValid: docData.isValid,
            ciphertextHash: docData.ciphertextHash,
            encryptionMetaHash: docData.encryptionMetaHash,
            docType: Number(docData.docType),
            version: Number(docData.version)
        });

    } catch (err) {
        console.log("❌ Lỗi cmnr:", err.message);
    }
}

checkBlockchain();