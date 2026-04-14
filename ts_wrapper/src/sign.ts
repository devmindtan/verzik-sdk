import { ethers } from "ethers";
import VoucherProtocolABI from "./abi/VoucherProtocolModule#VoucherProtocol.json";
import type {
    PublishAndSignDocumentResult,
    RegisterPayload,
    UploadDraftResponse,
} from "./types";

type UploadHeaders = Record<string, string> | Array<[string, string]>;

export interface PublishAndSignDocumentParams {
    uploadUrl: string;
    provider: ethers.Eip1193Provider;
    verifyingContract: string;
    tenantId: string;
    docType: number;
    version: number;
    ciphertextHash: string;
    encryptionMetaHash: string;
    deadline: number | string | bigint;
    nonce?: number | string | bigint;
    file: Blob | Uint8Array | ArrayBuffer;
    fileName?: string;
    fileFieldName?: string;
    extraFormFields?: Record<string, string>;
    uploadHeaders?: UploadHeaders;
    nonceResolver?: (context: {
        browserProvider: ethers.BrowserProvider;
        signerAddress: string;
        tenantId: string;
        verifyingContract: string;
    }) => Promise<number | string | bigint>;
}

function isUserRejectedSignatureError(error: unknown): boolean {
    const anyError = error as { code?: unknown; message?: unknown };
    return anyError?.code === 4001 || String(anyError?.message ?? "").toLowerCase().includes("user rejected");
}

function toBigIntValue(value: number | string | bigint): bigint {
    return typeof value === "bigint" ? value : BigInt(value);
}

function normalizeUploadPayload(file: Blob | Uint8Array | ArrayBuffer, fileName = "draft.bin") {
    if (typeof Blob !== "undefined" && file instanceof Blob) {
        return { blob: file, fileName };
    }

    if (typeof Blob === "undefined") {
        throw new Error("This runtime does not support Blob/FormData for multipart/form-data upload.");
    }

    const blob = new Blob([file], { type: "application/octet-stream" });
    return { blob, fileName };
}

async function uploadDraftDocument(
    uploadUrl: string,
    file: Blob | Uint8Array | ArrayBuffer,
    options?: {
        fileName?: string;
        fileFieldName?: string;
        extraFormFields?: Record<string, string>;
        uploadHeaders?: UploadHeaders;
    }
): Promise<UploadDraftResponse> {
    const { blob, fileName } = normalizeUploadPayload(file, options?.fileName);
    const formData = new FormData();
    formData.append(options?.fileFieldName ?? "file", blob, fileName);

    for (const [key, value] of Object.entries(options?.extraFormFields ?? {})) {
        formData.append(key, value);
    }

    const response = await fetch(uploadUrl, {
        method: "POST",
        headers: options?.uploadHeaders,
        body: formData,
    });

    const rawBody = await response.text();
    let parsedBody: UploadDraftResponse;

    try {
        parsedBody = JSON.parse(rawBody) as UploadDraftResponse;
    } catch {
        throw new Error(`Upload failed: backend returned non-JSON response (${response.status}).`);
    }

    if (!response.ok) {
        throw new Error(parsedBody?.status ? `Upload failed: ${parsedBody.status}` : `Upload failed with HTTP ${response.status}`);
    }

    if (parsedBody.status !== "success" || !parsedBody.document) {
        throw new Error("Upload failed: backend response does not match the expected success schema.");
    }

    return parsedBody;
}

// Hàm này nằm ở lớp TS Wrapper, chạy sau khi Rust đã mã hóa xong và BE đã trả về CID
// Cập nhật để hỗ trợ Ethers v6: nhận trực tiếp lớp Signer
export async function signAnchorPayload(
    signer: ethers.Signer,
    verifyingContract: string,
    payload: RegisterPayload
) {
    // 1. Cấu hình đúng chuẩn Domain mà Smart Contract yêu cầu
    const domain = {
        name: "VoucherProtocol",
        version: "1",
        chainId: signer.provider ? (await signer.provider.getNetwork()).chainId : 1n,
        verifyingContract
    };
    const types = {
        Register: [
            { name: "tenantId", type: "bytes32" },
            { name: "fileHash", type: "bytes32" },
            { name: "cid", type: "string" },
            { name: "ciphertextHash", type: "bytes32" },
            { name: "encryptionMetaHash", type: "bytes32" },
            { name: "docType", type: "uint32" },
            { name: "version", type: "uint32" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" }
        ]
    };

    // 3. Ethers v6 sẽ tự động dựng Popup MetaMask/Wallet lên cho user bấm
    // Chữ ký trả về sẽ là một chuỗi Hex chuẩn EIP-712
    const signature = await signer.signTypedData(domain, types, payload);
    return signature;
}

// Luồng 2 bước: upload draft lên backend, sau đó mở MetaMask để ký EIP-712
export async function publishAndSignDocument(
    params: PublishAndSignDocumentParams
): Promise<PublishAndSignDocumentResult> {
    const upload = await uploadDraftDocument(params.uploadUrl, params.file, {
        fileName: params.fileName,
        fileFieldName: params.fileFieldName,
        extraFormFields: params.extraFormFields,
        uploadHeaders: params.uploadHeaders,
    });

    const browserProvider = new ethers.BrowserProvider(params.provider);
    const signer = await browserProvider.getSigner();
    const signerAddress = await signer.getAddress();

    const resolvedNonce =
        params.nonce ??
        (params.nonceResolver
            ? await params.nonceResolver({
                  browserProvider,
                  signerAddress,
                  tenantId: params.tenantId,
                  verifyingContract: params.verifyingContract,
              })
            : await new ethers.Contract(
                  params.verifyingContract,
                  VoucherProtocolABI.abi,
                  browserProvider
              ).nonces(params.tenantId, signerAddress));

    const network = await browserProvider.getNetwork();
    const chainId = network.chainId;

    const payload: RegisterPayload = {
        tenantId: params.tenantId,
        fileHash: upload.document!.original_hash,
        cid: upload.document!.metadata_cid,
        ciphertextHash: params.ciphertextHash,
        encryptionMetaHash: params.encryptionMetaHash,
        docType: params.docType,
        version: params.version,
        nonce: toBigIntValue(resolvedNonce),
        deadline: toBigIntValue(params.deadline),
    };

    const domain = {
        name: "VoucherProtocol",
        version: "1",
        chainId,
        verifyingContract: params.verifyingContract,
    };

    try {
        const signature = await signer.signTypedData(domain, {
            Register: [
                { name: "tenantId", type: "bytes32" },
                { name: "fileHash", type: "bytes32" },
                { name: "cid", type: "string" },
                { name: "ciphertextHash", type: "bytes32" },
                { name: "encryptionMetaHash", type: "bytes32" },
                { name: "docType", type: "uint32" },
                { name: "version", type: "uint32" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        }, payload);

        return {
            upload,
            payload,
            signature,
            signerAddress,
            chainId,
            domain,
        };
    } catch (error) {
        if (isUserRejectedSignatureError(error)) {
            throw new Error("User rejected the signature request in MetaMask.");
        }

        throw error instanceof Error ? error : new Error(String(error));
    }
}

/**
 * Recovers the signer address from a given EIP-712 signature matching the VoucherProtocol.
 */
export function verifySignature(
    payload: RegisterPayload,
    signature: string,
    verifyingContract: string,
    chainId: bigint | number
): string {
    const domain = {
        name: "VoucherProtocol",
        version: "1",
        chainId,
        verifyingContract
    };

    const types = {
        Register: [
            { name: "tenantId", type: "bytes32" },
            { name: "fileHash", type: "bytes32" },
            { name: "cid", type: "string" },
            { name: "ciphertextHash", type: "bytes32" },
            { name: "encryptionMetaHash", type: "bytes32" },
            { name: "docType", type: "uint32" },
            { name: "version", type: "uint32" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" }
        ]
    };

    return ethers.verifyTypedData(domain, types, payload, signature);
}