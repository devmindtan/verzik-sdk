import { Interface, formatEther } from "ethers";

// ─────────────────────────────────────────────────────────────
// Error message map — từng lỗi custom của IVoucherProtocolErrorsEvents
// ─────────────────────────────────────────────────────────────
const ERROR_MESSAGES: Record<string, (args: readonly any[]) => string> = {
  Unauthorized: () => "Không có quyền thực hiện thao tác này.",
  TenantNotFound: () => "Tenant không tồn tại.",
  TenantAlreadyExists: () => "Tenant đã tồn tại.",
  TenantInactive: () => "Tenant đang bị vô hiệu hóa.",
  InvalidTenantAddress: () => "Địa chỉ Tenant không hợp lệ.",
  InsufficientStake: (args) =>
    `Stake không đủ (gửi: ${formatEther(args[0])} ETH, yêu cầu: ${formatEther(args[1])} ETH).`,
  OperatorNotActive: () => "Operator không đang hoạt động.",
  OperatorAlreadyActive: () => "Operator đã đang hoạt động rồi.",
  OperatorNotInTenant: () => "Operator không thuộc Tenant này.",
  DocumentAlreadyExists: () => "Tài liệu đã được đăng ký trước đó.",
  DocumentNotFound: () => "Tài liệu không tồn tại.",
  DocumentAlreadyRevoked: () => "Tài liệu đã bị thu hồi trước đó.",
  InvalidSignature: () => "Chữ ký không hợp lệ.",
  ExpiredSignature: () =>
    "Chữ ký đã hết hạn (deadline vượt quá thời điểm hiện tại).",
  NoStake: () => "Operator chưa có stake.",
  NoPendingUnstake: () => "Không có yêu cầu unstake đang chờ.",
  UnstakeNotReady: (args) => {
    const readyAt = new Date(Number(args[0]) * 1000);
    return `Chưa đến thời gian unstake. Sẵn sàng lúc: ${readyAt.toLocaleString("vi-VN")}.`;
  },
  EthTransferFailed: () =>
    "Chuyển ETH thất bại (địa chỉ treasury có thể không nhận được ETH).",
  InvalidRecoveryTarget: () => "Địa chỉ recovery không hợp lệ.",
  RecoveryNotAllowed: () => "Không được phép thực hiện recovery.",
  DocumentNotValid: () => "Tài liệu không hợp lệ hoặc đã bị thu hồi.",
  AlreadyCoSigned: () => "Operator đã co-sign tài liệu này rồi.",
  InvalidCoSignPolicy: () => "Cấu hình Co-Sign Policy không hợp lệ.",
  CoSignerNotWhitelisted: () =>
    "Operator không nằm trong whitelist Co-Sign của tenant.",
  InsufficientCoSignStake: (args) =>
    `Stake để co-sign không đủ (hiện tại: ${formatEther(args[0])} ETH, yêu cầu: ${formatEther(args[1])} ETH).`,
  InvalidCoSignRole: () => "Role Co-Sign không hợp lệ.",
  InvalidConfigValue: () =>
    "Giá trị cấu hình không hợp lệ (minStake hoặc cooldown phải > 0).",
  NoStakeToRecover: () => "Operator không có stake để thực hiện recovery.",
  UnstakeInProgress: () =>
    "Đang trong quá trình unstake — hủy yêu cầu unstake trước khi tiếp tục.",
  OperatorNotLost: () =>
    "Operator chưa ở trạng thái lost (phải inactive và có recovery delegate).",
  InvalidPenaltyBps: (args) =>
    `Mức phạt không hợp lệ: ${args[0]} BPS (phải từ 1 đến 10000).`,
  PenaltyNotConfigured: (args) =>
    `Chưa cấu hình mức phạt cho violation code: ${args[0]}.`,
  CannotSlashYourself: () => "Không thể tự slash chính mình.",
  ProtocolAdminCannotHaveOtherRoles: () =>
    "Protocol Admin không thể đồng thời mang role của Tenant.",
  InvalidOperatorAddress: () => "Địa chỉ Operator không hợp lệ.",
  TenantRoleConflict: () =>
    "Xung đột role: admin, operatorManager và treasury phải là các địa chỉ khác nhau.",
};

/**
 * Giải mã lỗi custom Solidity từ ethers CALL_EXCEPTION.
 * Trả về thông báo lỗi có nghĩa bằng tiếng Việt.
 */
export function decodeContractError(error: any, iface?: Interface): string {
  const rawData: any =
    error?.data ??
    error?.error?.data ??
    error?.info?.error?.data ??
    error?.revert?.args?.[0];

  const data: string | undefined =
    typeof rawData === "string" ? rawData : rawData?.data;

  if (data && data !== "0x" && iface) {
    try {
      const decoded = iface.parseError(data);
      if (decoded) {
        const formatter = ERROR_MESSAGES[decoded.name];
        const msg = formatter
          ? formatter([...decoded.args])
          : `Lỗi contract không xác định: ${decoded.name}`;
        return `[${decoded.name}] ${msg}`;
      }
    } catch {
      return `Lỗi hệ thống (Hex): ${data.slice(0, 10)}...`;
    }
  }

  return (
    error?.shortMessage ?? error?.reason ?? error?.message ?? String(error)
  );
}
