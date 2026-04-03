const fs = require('fs');
const path = require('path');

const sdkCore = require('./core_wasm/verzik_sdk.js');
 
const filePath = path.join(__dirname, '2026-ICPC Vietnam Southern Provincial PC-Huan Pham-PLACE.pdf');
const fileBuffer = fs.readFileSync(filePath);

sdkCore.ping();

const test = sdkCore.hello("Huan");
console.log(test);
 
const hash = sdkCore.hash_doc(fileBuffer);
console.log(hash);