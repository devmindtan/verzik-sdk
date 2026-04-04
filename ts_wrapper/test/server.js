const http = require('http');

console.clear(); 

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/upload-binary') {
        const docHash = req.headers['x-document-hash'];
        const metadataJson = req.headers['x-metadata'];
        
        let chunks = [];
        req.on('data', chunk => {
            chunks.push(chunk); 
        });
        
        req.on('end', () => {
            try {
                const binaryData = Buffer.concat(chunks);
                const metadata = metadataJson ? JSON.parse(metadataJson) : null;

                console.log("\n" + "=".repeat(50));
                console.log("📥 Server nhận được Yêu cầu POST Binary Thuần:");
                console.log("  ├─ Document Hash:", docHash);
                if (metadata) { 
                    console.log("  ├─ Encrypted Key Length (Từ HTTP Header):", metadata.encrypted_key.length); 
                }
                console.log("  └─ Kích thước tệp Binary thật:", binaryData.length, "bytes (Khớp hoàn toàn, không bị độn size)");

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: "Server đã tiếp nhận và giữ nguyên Binary siêu nhẹ!" 
                }));
                console.log("=".repeat(50) + "\n");
            } catch (err) {
                console.error("Lỗi:", err.message);
                res.writeHead(400);
                res.end("Bad Request");
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3000, () => {
    console.log("🚀 Server giả lập đang lắng nghe trên cổng 3000...");
});
