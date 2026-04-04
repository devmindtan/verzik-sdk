"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerzikSDK = exports.parseError = exports.hexToBytes = exports.bytesToHex = void 0;
const utils_1 = require("./utils");
Object.defineProperty(exports, "bytesToHex", { enumerable: true, get: function () { return utils_1.bytesToHex; } });
Object.defineProperty(exports, "hexToBytes", { enumerable: true, get: function () { return utils_1.hexToBytes; } });
Object.defineProperty(exports, "parseError", { enumerable: true, get: function () { return utils_1.parseError; } });
const encrypt_1 = require("./encrypt");
const identity_1 = require("./identity");
class VerzikSDK {
    static ping() {
        const core = require("../core_wasm/verzik_sdk");
        core.ping();
    }
    static getPublicKeyFromEmail(email, options) {
        return (0, identity_1.getPublicKeyFromEmail)(email, options);
    }
}
exports.VerzikSDK = VerzikSDK;
VerzikSDK.encrypt = encrypt_1.encrypt;
VerzikSDK.decrypt = encrypt_1.decrypt;
VerzikSDK.split = encrypt_1.split;
VerzikSDK.merge = encrypt_1.merge;
VerzikSDK.hashDocument = encrypt_1.hashDocument;
//# sourceMappingURL=index.js.map