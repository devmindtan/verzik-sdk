# VoucherProtocol SDK — Tài liệu tham chiếu

> Phiên bản: `1.0.2-alpha` · Dùng cho: **Backend / Sandbox CLI**  
> Tất cả hàm đều thuộc `BlockchainClient`. Khởi tạo qua `createBlockchainClientFromEnv()` (đọc từ `.env`).

---

## Khởi tạo

```typescript
import { createBlockchainClientFromEnv } from "@verzik/sdk";

const client = createBlockchainClientFromEnv();
```

Biến môi trường cần thiết:

| Biến               | Bắt buộc | Mô tả                                                                  |
| ------------------ | :------: | ---------------------------------------------------------------------- |
| `RPC_URL`          |    ✓     | Endpoint RPC của node blockchain                                       |
| `PROTOCOL_ADDRESS` |    ✓     | Địa chỉ contract `VoucherProtocol`                                     |
| `READER_ADDRESS`   |          | Địa chỉ contract `VoucherProtocolReader` (mặc định = PROTOCOL_ADDRESS) |
| `PRIVATE_KEY`      |          | Cần thiết cho mọi hàm ghi (transaction)                                |

---

## Kiểu dữ liệu trả về

```typescript
TenantInfo = {
  id,
  admin,
  operatorManager,
  treasury,
  isActive,
  createdAt: bigint,
};
OperatorStatus = {
  exists,
  isActive,
  walletAddress,
  stakeAmount,
  nonce,
  unstakeReadyAt,
  canUnstakeNow,
  recoveryDelegate,
  metadataURI,
};
// stakeAmount đã được format: "1.5 ETH"
DocumentSnapshot = {
  exists,
  isValid,
  issuer,
  cid,
  timestamp,
  docType,
  version,
  coSignCount,
  trustedCoSignCount,
  coSignQualified,
};
CoSignStatus = {
  coSignQualified,
  coSignCount,
  trustedCoSignCount,
  trustedCoSignRoleMask,
  requiredRoleMask,
  minSigners,
  minStake,
};
// minStake đã được format: "1.0 ETH"
EnhancedTxResult = {
  transaction,
  receipt,
  block,
  confirmations,
  decodedInput,
  decodedLogs,
};
```

> **Lưu ý ETH:** Các trường `stakeAmount`, `minStake`, `minOperatorStake` trả về dạng `string` đã định dạng (`"X.X ETH"`) — **không cần** `formatEther` ở phía backend.  
> **Lưu ý timestamp:** `createdAt`, `unstakeReadyAt` là `bigint` Unix giây.  
> **Lưu ý BPS:** `1 BPS = 0.01%`, `10000 BPS = 100%`.

---

## Hàm đọc (Không tốn gas)

### Tenant

| Hàm                          | Tham số                | Trả về                                |
| ---------------------------- | ---------------------- | ------------------------------------- |
| `getTenantCount()`           | —                      | `bigint` — tổng số tenant             |
| `getTenantIds(start, limit)` | offset, limit          | `string[]` — mảng bytes32 ID          |
| `getTenantInfo(id)`          | tenantId (bytes32 hex) | `TenantInfo \| null`                  |
| `listTenants(start, limit)`  | offset, limit          | `TenantInfo[]` — kèm đầy đủ thông tin |

### Operator

| Hàm                                      | Tham số                    | Trả về                                                |
| ---------------------------------------- | -------------------------- | ----------------------------------------------------- |
| `getOperatorCount(tenantId)`             | tenantId                   | `bigint`                                              |
| `getOperatorIds(tenantId, start, limit)` | tenantId, offset, limit    | `string[]` — mảng địa chỉ                             |
| `getOperatorStatus(tenantId, operator)`  | tenantId, địa chỉ operator | `OperatorStatus`                                      |
| `listOperators(tenantId, start, limit)`  | tenantId, offset, limit    | `OperatorStatus[]` — chỉ những operator `exists=true` |
| `getNonce(tenantId, operatorAddress)`    | tenantId, địa chỉ operator | `bigint` — dùng khi tạo EIP-712 signature             |

### Tài liệu

| Hàm                                             | Tham số                      | Trả về                                                |
| ----------------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| `getDocumentStatus(tenantId, fileHash)`         | tenantId, fileHash (bytes32) | `DocumentSnapshot`                                    |
| `verify(tenantId, fileHash)`                    | tenantId, fileHash           | `VerifyStatus` — nhanh, chỉ cần biết hợp lệ hay không |
| `hasSignedDocument(tenantId, fileHash, signer)` | tenantId, fileHash, địa chỉ  | `boolean`                                             |
| `isDocumentCoSignQualified(tenantId, fileHash)` | tenantId, fileHash           | `boolean`                                             |
| `getCoSignStatus(tenantId, fileHash)`           | tenantId, fileHash           | `CoSignStatus` — tiến trình co-sign                   |

### Cấu hình Co-Sign

| Hàm                                                    | Tham số                      | Trả về                                                |
| ------------------------------------------------------ | ---------------------------- | ----------------------------------------------------- |
| `getCoSignPolicy(tenantId, docType)`                   | tenantId, loại tài liệu (số) | `{ enabled, minStake, minSigners, requiredRoleMask }` |
| `getCoSignOperatorConfig(tenantId, docType, operator)` | tenantId, docType, địa chỉ   | `{ whitelisted, roleId }`                             |

### Cấu hình Runtime Tenant

| Hàm                                            | Tham số                       | Trả về                                                              |
| ---------------------------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `getTenantRuntimeConfig(tenantId)`             | tenantId                      | `{ minOperatorStake (ETH string), unstakeCooldown (bigint, giây) }` |
| `getViolationPenalty(tenantId, violationCode)` | tenantId, mã vi phạm (string) | `number` — BPS                                                      |

### Lịch sử giao dịch

| Hàm                            | Tham số          | Trả về             |
| ------------------------------ | ---------------- | ------------------ |
| `getTransactionByHash(txHash)` | transaction hash | `EnhancedTxResult` |

---

## Hàm ghi (Tốn gas · Cần PRIVATE_KEY)

### Protocol Admin

| Hàm                                    | Tham số                                                                        | Mô tả                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `createTenant(name, treasury, config)` | tên, địa chỉ treasury, `{ admin, operatorManager, minStake, unstakeCooldown }` | Tạo tenant mới. `minStake` truyền ETH string (`"1.0"`), `unstakeCooldown` tính bằng giây |
| `setTenantStatus(tenantId, isActive)`  | tenantId, bool                                                                 | Bật/tắt tenant. Khi `false`: toàn bộ lifecycle operator bị đóng băng                     |

### Operator (tự thực hiện với ví operator)

| Hàm                                                         | Tham số                                   | Mô tả                                  |
| ----------------------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| `joinAsOperator(tenantId, metadataURI, stakeAmount)`        | tenantId, URI, ETH string                 | Đăng ký operator kèm stake             |
| `topUpStake(tenantId, stakeAmount)`                         | tenantId, ETH string                      | Nạp thêm stake                         |
| `updateOperatorMetadata(tenantId, metadataURI)`             | tenantId, URI mới                         | Cập nhật metadata                      |
| `requestUnstake(tenantId)`                                  | tenantId                                  | Bắt đầu đếm cooldown unstake           |
| `executeUnstake(tenantId)`                                  | tenantId                                  | Rút stake sau cooldown (ETH về ví)     |
| `registerWithSignature(payload)`                            | `RegisterPayload`                         | Đăng ký tài liệu bằng EIP-712          |
| `coSignDocumentWithSignature(payload)`                      | `{ tenantId, fileHash, nonce, deadline }` | Đồng ký tài liệu                       |
| `setRecoveryDelegate(tenantId, delegate)`                   | tenantId, địa chỉ                         | Ủy quyền recovery cho ví khác          |
| `recoverOperatorByDelegate(tenantId, lostOperator, reason)` | tenantId, ví cũ, lý do                    | Recovery operator (gọi từ ví delegate) |

### Tenant Admin

| Hàm                                          | Tham số                   | Mô tả                                             |
| -------------------------------------------- | ------------------------- | ------------------------------------------------- |
| `setTreasury(tenantId, newTreasury)`         | tenantId, địa chỉ         | Cập nhật ví treasury (không được trùng role khác) |
| `revokeDocument(tenantId, fileHash, reason)` | tenantId, fileHash, lý do | Thu hồi tài liệu                                  |

### Operator Manager

| Hàm                                                                                   | Tham số                              | Mô tả                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------ |
| `slashOperator(tenantId, operator, reason)`                                           | tenantId, địa chỉ, lý do             | Phạt nặng: mất toàn bộ stake               |
| `softSlashOperator(tenantId, operator, violationCode, reason)`                        | tenantId, địa chỉ, mã vi phạm, lý do | Phạt nhẹ theo BPS đã cấu hình              |
| `setOperatorStatus(tenantId, operator, isActive, reason)`                             | tenantId, địa chỉ, bool, lý do       | Bật/tắt operator                           |
| `recoverOperatorByAdmin(tenantId, lostOperator, newOperator, reason)`                 | tenantId, ví cũ, ví mới, lý do       | Recovery (Admin thực hiện)                 |
| `setCoSignPolicy(tenantId, docType, enabled, minStake, minSigners, requiredRoleMask)` | —                                    | Thiết lập policy co-sign cho loại tài liệu |
| `setCoSignOperator(tenantId, docType, operator, whitelisted, roleId)`                 | —                                    | Cấp/thu hồi quyền co-sign cho operator     |
| `setMinOperatorStake(tenantId, newMinOperatorStake)`                                  | tenantId, ETH string                 | Cập nhật stake tối thiểu                   |
| `setUnstakeCooldown(tenantId, newUnstakeCooldown)`                                    | tenantId, giây (bigint)              | Cập nhật thời gian chờ unstake             |
| `setViolationPenalty(tenantId, violationCode, penaltyBps)`                            | tenantId, mã vi phạm, BPS            | Cấu hình mức phạt                          |

---

## Ví dụ sử dụng nhanh

```typescript
import { init } from "@verzik/sdk";
import dotenv from "dotenv";

dotenv.config();

// 1. Khởi tạo
const client = await init();

// 2. Lấy thông tin (Read)
const tenants = await client.listTenants(0, 10);
const targetTenantId = tenants[0].id;

const op = await client.getOperatorStatus(targetTenantId, "0xAddress...");
console.log(`Stake: ${op.stakeAmount}`); // "1.5 ETH"

// 3. Nghiệp vụ (Logic)
const result = await client.verify(targetTenantId, "0xFileHash...");
if (result.isValid) {
  console.log("Tài liệu hợp lệ!");
}

// 4. Quản trị (Admin)
await client.createTenant("MyTenant", "0xTreasury...", {
  admin: "0xAdmin...",
  operatorManager: "0xManager...",
  minStake: "1.0",
  unstakeCooldown: 86400,
});

// 5. Ký và đăng ký (Operator)
// Giả sử hàm registerWithSignature đã bao gồm bước yêu cầu ví ký payload
const txHash = await client.registerWithSignature({
  tenantId: targetTenantId,
  fileHash: "0x...",
  docType: 1,
  // ... các tham số khác
});

console.log(`Thành công! TxHash: ${txHash}`);
```

---

## Ghi chú quan trọng

- **ETH input:** Các hàm nhận ETH đều dùng **string** (`"1.0"`, `"0.5"`). SDK tự `parseEther` bên trong.
- **bytes32:** `tenantId`, `fileHash` truyền dưới dạng hex string 66 ký tự (`0x...`).
- **violationCode:** Truyền string thường (ví dụ `"FAKE_DOCUMENT"`). SDK tự hash `id()` bên trong.
- **Lỗi:** Mọi exception đều là `Error` với `.message` là chuỗi tiếng Việt decode từ contract error.
