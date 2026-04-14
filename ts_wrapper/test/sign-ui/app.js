/* global ethers */

 
const $ = (id) => document.getElementById(id);

const els = {
  mmStatus: $("mmStatus"),
  walletStatus: $("walletStatus"),
  signerAddress: $("signerAddress"),
  chainId: $("chainId"),
  uploadSummary: $("uploadSummary"),
  signatureBox: $("signatureBox"),
  autoSummary: $("autoSummary"),
  log: $("log"),
  connectBtn: $("connectBtn"),
  runBtn: $("runBtn"),
  fillBtn: $("fillBtn"),
};

let browserProvider = null;
let signer = null;
let signerAddress = "";
let eip1193Provider = null;

const DEFAULTS = {
  uploadUrl: "http://localhost:3000/api/v1/upload",
  verifyingContract: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  tenantId: "0xe702fef210dc66faad0553ea8e2f5064188068f8052d2cd9c9611417db5c2705",
  clientId: "",
  clientDomain: "localhost",
  docType: 1,
  version: 1,
  chainId: 31337
};

function nowPlus(hours) {
  return Math.floor(Date.now() / 1000) + hours * 3600;
}

function setLog(message, data) {
  els.log.textContent = data
    ? `${message}\n${typeof data === "string" ? data : JSON.stringify(data, null, 2)}`
    : message;
}

function setBadge(el, text, tone) {
  el.textContent = text;
  el.style.borderColor =
    tone === "good"
      ? "rgba(34, 197, 94, 0.35)"
      : tone === "bad"
        ? "rgba(239, 68, 68, 0.35)"
        : "rgba(148, 163, 184, 0.18)";
  el.style.color =
    tone === "good"
      ? "#86efac"
      : tone === "bad"
        ? "#fca5a5"
        : "#d8b4fe";
}

function toBigIntOrDefault(value, fallback) {
  const trimmed = String(value || "").trim();
  return trimmed ? BigInt(trimmed) : fallback;
}

function parseJsonField(value, fallback = {}) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return fallback;

  // Hỗ trợ nhập nhanh: nếu chỉ dán chuỗi đơn (vd: vz_xxx), coi là X-Client-Id
  if (!trimmed.startsWith("{")) {
    return { "X-Client-Id": trimmed };
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("Headers JSON không hợp lệ. Ví dụ đúng: {\"X-Trace-Id\":\"abc\"}");
  }
}

function parseRecipientIdentifiers(value) {
  return String(value || "")
    .split(/[\n,;]/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

function ensureEthereum() {
  const injected = window.ethereum;
  if (!injected) {
    setBadge(els.mmStatus, "MetaMask: không có window.ethereum", "bad");
    throw new Error("Không tìm thấy MetaMask hoặc ví EIP-1193.");
  }

  if (Array.isArray(injected.providers) && injected.providers.length > 0) {
    const realMetaMask = injected.providers.find(
      (p) => p?.isMetaMask && !p?.isBraveWallet && !p?.isRabby
    );
    const fallbackMetaMask = injected.providers.find((p) => p?.isMetaMask);
    eip1193Provider = realMetaMask || fallbackMetaMask || injected.providers[0];
  } else {
    eip1193Provider = injected;
  }

  if (!eip1193Provider?.request) {
    setBadge(els.mmStatus, "MetaMask provider không hợp lệ", "bad");
    throw new Error("Provider EIP-1193 không hợp lệ.");
  }

  const providerLabel = eip1193Provider?.isMetaMask
    ? (eip1193Provider?.isBraveWallet ? "Brave-compatible provider" : "MetaMask")
    : "Generic EIP-1193 provider";
  console.log("[sign-ui] Selected provider:", {
    provider: providerLabel,
    isMetaMask: !!eip1193Provider?.isMetaMask,
    isBraveWallet: !!eip1193Provider?.isBraveWallet,
    isRabby: !!eip1193Provider?.isRabby,
  });

  setBadge(els.mmStatus, "MetaMask: đã sẵn sàng", "good");
}

async function connectWallet() {
  ensureEthereum();
  browserProvider = new ethers.BrowserProvider(eip1193Provider);
  await browserProvider.send("eth_requestAccounts", []);
  signer = await browserProvider.getSigner();
  signerAddress = await signer.getAddress();
  const chainId = await ensureExpectedChain();

  els.signerAddress.textContent = signerAddress;
  els.chainId.textContent = chainId.toString();
  setBadge(els.walletStatus, "Wallet: đã kết nối", "good");
  setLog("Đã kết nối MetaMask.");
}

function toHexChainId(chainId) {
  return `0x${BigInt(chainId).toString(16)}`;
}

async function getWalletChainId() {
  const hex = await eip1193Provider.request({ method: "eth_chainId" });
  return BigInt(hex);
}

async function ensureExpectedChain() {
  const expected = BigInt(DEFAULTS.chainId);
  let chainId = await getWalletChainId();

  if (chainId === expected) {
    return chainId;
  }

  try {
    await eip1193Provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: toHexChainId(expected) }],
    });
  } catch (switchErr) {
    if (switchErr?.code === 4902) {
      await eip1193Provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: toHexChainId(expected),
          chainName: "Hardhat Local 31337",
          rpcUrls: ["http://100.114.63.52:30545"],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        }],
      });
    } else {
      throw switchErr;
    }
  }

  browserProvider = new ethers.BrowserProvider(eip1193Provider);
  signer = await browserProvider.getSigner();
  signerAddress = await signer.getAddress();
  chainId = await getWalletChainId();
  if (chainId !== expected) {
    throw new Error(`MetaMask đang ở chainId=${chainId.toString()} nhưng cần ${expected.toString()}. Kiểm tra lại Network trong MetaMask.`);
  }
  return chainId;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function getIssuerPublicKey(activeSigner) {
  const challenge = `Verzik issuer pubkey proof ${Date.now()}`;
  const signature = await activeSigner.signMessage(challenge);
  const digest = ethers.hashMessage(challenge);
  return ethers.SigningKey.recoverPublicKey(digest, signature);
}

async function uploadDraftByProxy(requestBody) {
  const response = await fetch("/proxy/prepare-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Proxy không trả JSON hợp lệ. HTTP ${response.status}. Raw: ${text.slice(0, 300)}`);
  }

  if (!response.ok || json.status !== "success" || !json.upload?.document) {
    throw new Error(`Upload thất bại: ${json.message || json.detail || response.status}`);
  }

  return json;
}

async function anchorDocumentByProxy(
  targetUrl,
  originalHash,
  signature,
  clientId,
  clientDomain,
  walletAddress,
  anchorPayload
) {
  const headers = {
    "Content-Type": "application/json",
    "X-Target-Url": targetUrl,
    "X-Client-Id": clientId,
    "X-Client-Domain": clientDomain,
  };

  if (walletAddress) {
    headers["X-Wallet-Address"] = walletAddress;
  }

  const response = await fetch("/proxy/upload", {
    method: "POST",
    headers,
    body: JSON.stringify({
      original_hash: originalHash,
      signature: signature,
      ...(anchorPayload || {}),
    }),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Proxy anchor không trả JSON hợp lệ. HTTP ${response.status}. Raw: ${text.slice(0, 300)}`);
  }

  if (!response.ok || json.status !== "success") {
    const detail = json.detail ? ` | detail: ${json.detail}` : "";
    throw new Error(`Anchor thất bại: ${json.message || json.error || response.status}${detail}`);
  }

  return json;
}

async function syncDefaultsFromSdkConfig() {
  try {
    const response = await fetch("/proxy/sdk/config");
    const json = await response.json();
    if (!response.ok || json.status !== "success" || !json.sdk) return;

    if (json.sdk.protocol_address) {
      DEFAULTS.verifyingContract = String(json.sdk.protocol_address);
    }
    if (json.sdk.tenant_id) {
      DEFAULTS.tenantId = String(json.sdk.tenant_id);
    }
    if (json.sdk.chain_id !== undefined && json.sdk.chain_id !== null) {
      DEFAULTS.chainId = Number(json.sdk.chain_id);
    }
  } catch (error) {
    console.warn("Không thể đồng bộ config từ SDK:", error);
  }
}

async function resolveNonce(uploadUrl, tenantId, operatorAddress, clientId, clientDomain) {
  const nonceInput = $("nonce").value.trim();
  if (nonceInput) return BigInt(nonceInput);

  try {
    const sdkNonceUrl = `/proxy/sdk/nonce?tenant_id=${encodeURIComponent(tenantId)}&operator_address=${encodeURIComponent(operatorAddress)}`;
    const response = await fetch(sdkNonceUrl, { method: "GET" });

    const json = await response.json();
    if (response.ok && json.nonce !== undefined) {
      return BigInt(json.nonce);
    }
    console.warn("Không thể query nonce từ SDK proxy, fallback qua backend:", json);
  } catch (err) {
    console.warn("Lỗi query nonce từ SDK proxy, fallback qua backend:", err);
  }

  const nonceUrl = `${uploadUrl.replace(/\/upload$/, "")}/operator/nonce?tenant_id=${tenantId}&operator_address=${operatorAddress}`;
  try {
    const response = await fetch("/proxy/nonce", {
      method: "GET",
      headers: {
        "X-Target-Url": nonceUrl,
        "X-Client-Id": clientId,
        "X-Client-Domain": clientDomain,
      },
    });

    const json = await response.json();
    if (response.ok && json.nonce !== undefined) {
      return BigInt(json.nonce);
    }
    console.warn("Không thể query nonce từ backend, fallback về 0:", json);
  } catch (err) {
    console.warn("Lỗi query nonce từ backend proxy, fallback về 0:", err);
  }

  return 0n;
}

async function runFlow() {
  try {
    ensureEthereum();
    els.runBtn.disabled = true;
    els.signatureBox.textContent = "-";

    const uploadUrl = $("uploadUrl").value.trim() || DEFAULTS.uploadUrl;
    const anchorUrl = uploadUrl.replace("/upload", "/anchor");
    const verifyingContract = $("verifyingContract").value.trim() || DEFAULTS.verifyingContract;
    const tenantId = $("tenantId").value.trim() || DEFAULTS.tenantId;
    const recipientRaw = $("recipientIdentifier").value;
    const recipientIdentifiers = parseRecipientIdentifiers(recipientRaw);
    const docType = Number($("docType").value.trim() || DEFAULTS.docType);
    const version = Number($("version").value.trim() || DEFAULTS.version);
    const deadline = toBigIntOrDefault($("deadline").value, BigInt(nowPlus(1)));
    // Backend nhận file field cố định: encrypted_file
    const fileFieldName = "encrypted_file";
    const clientId = $("clientId").value.trim();
    const clientDomain = $("clientDomain").value.trim();
    const file = $("fileInput").files?.[0];

    if (!file) {
      throw new Error("Chưa chọn file.");
    }

    if (!signer || !browserProvider) {
      await connectWallet();
    }

    // Đồng bộ signer mỗi lần chạy để tránh lệch account khi user đổi ví trên MetaMask.
    signer = await browserProvider.getSigner();
    signerAddress = await signer.getAddress();
    els.signerAddress.textContent = signerAddress;

    const walletChainId = await ensureExpectedChain();
    els.chainId.textContent = walletChainId.toString();

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const issuerPublicKey = await getIssuerPublicKey(signer);
    const extraHeaders = parseJsonField($("uploadHeaders").value, {});
    const nonce = await resolveNonce(uploadUrl, tenantId, signerAddress, clientId, clientDomain);

    setLog("Đang mã hóa + upload qua local proxy...", {
      recipientIdentifiers,
      signerAddress,
      issuerPublicKey,
    });

    const proxyResult = await uploadDraftByProxy({
      targetUrl: uploadUrl,
      fileName: file.name || "encrypted_file.bin",
      fileBase64: bytesToBase64(fileBytes),
      recipientIdentifiers,
      signerAddress,
      issuerPublicKey,
      tenantId,
      docType,
      version,
      deadline: Number(deadline),
      operatorNonce: nonce.toString(),
      fileFieldName,
      clientId,
      clientDomain,
      extraHeaders,
    });

    const uploadResult = proxyResult.upload;
    const computed = proxyResult.computed;

    els.autoSummary.textContent = JSON.stringify({
      ...computed,
      file_field: fileFieldName,
    }, null, 2);
    els.uploadSummary.textContent = JSON.stringify(uploadResult.document, null, 2);
    setLog("Upload thành công. Đang mở popup ký MetaMask...", { upload: uploadResult.document, computed });

    const payload = {
      tenantId,
      fileHash: uploadResult.document.original_hash,
      cid: uploadResult.document.metadata_cid,
      ciphertextHash: computed.ciphertext_hash,
      encryptionMetaHash: computed.encryption_meta_hash,
      docType,
      version,
      nonce,
      deadline,
    };

    const domain = {
      name: "VoucherProtocol",
      version: "1",
      chainId: BigInt(DEFAULTS.chainId),
      verifyingContract,
    };

    let signature;
    let recoveredSignerAddress;
    try {
      const registerTypes = {
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
      };
      signature = await signer.signTypedData(domain, registerTypes, payload);
      recoveredSignerAddress = ethers.verifyTypedData(domain, registerTypes, payload, signature);
      signerAddress = recoveredSignerAddress;
      els.signerAddress.textContent = signerAddress;
    } catch (signErr) {
      const msg = String(signErr?.message || signErr || "");
      if (signErr?.code === 4001 || /rejected|denied|cancel/i.test(msg)) {
        throw new Error("Người dùng đã từ chối ký trong MetaMask.");
      }
      throw signErr;
    }

    els.signatureBox.textContent = signature;
    setLog("Ký thành công. Đang gửi Anchor đến backend...", {
      signature,
      recovered_signer: signerAddress,
    });

    const anchorResult = await anchorDocumentByProxy(
      anchorUrl,
      uploadResult.document.original_hash,
      signature,
      clientId,
      clientDomain,
      signerAddress,
      {
        tenant_id: tenantId,
        doc_type: docType,
        version,
        nonce: nonce.toString(),
        deadline: deadline.toString(),
        cid: uploadResult.document.metadata_cid,
        ciphertext_hash: computed.ciphertext_hash,
        encryption_meta_hash: computed.encryption_meta_hash,
      }
    );

    setLog("Hoàn tất quy trình: Upload & Anchor thành công!", {
      upload: uploadResult,
      anchor: anchorResult,
    });
    setBadge(els.walletStatus, "Xong: Đã Anchor", "good");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/NetworkError|Failed to fetch|fetch resource/i.test(message)) {
      setLog("Lỗi: Không kết nối được upload endpoint. Kiểm tra backend localhost:3000 và thử lại.", {
        raw: message,
      });
    } else {
      setLog(`Lỗi: ${message}`);
    }
    setBadge(els.walletStatus, message.includes("từ chối") ? "Wallet: user rejected" : "Wallet: lỗi", "bad");
  } finally {
    els.runBtn.disabled = false;
  }
}

function fillDefaults() {
  $("uploadUrl").value = DEFAULTS.uploadUrl;
  $("verifyingContract").value = DEFAULTS.verifyingContract;
  $("tenantId").value = DEFAULTS.tenantId;
  $("clientId").value = DEFAULTS.clientId;
  $("clientDomain").value = DEFAULTS.clientDomain;
  $("uploadHeaders").value = "";
  $("docType").value = String(DEFAULTS.docType);
  $("version").value = String(DEFAULTS.version);
  $("deadline").value = String(nowPlus(1));
  $("recipientIdentifier").value = "";
  setLog("Đã điền default config.");
}

function init() {
  fillDefaults();
  syncDefaultsFromSdkConfig()
    .then(() => fillDefaults())
    .catch(() => {});
  setBadge(els.mmStatus, window.ethereum ? "MetaMask: đã sẵn sàng" : "MetaMask: chưa cài", window.ethereum ? "good" : "bad");
  setBadge(els.walletStatus, "Wallet: chưa kết nối", "neutral");

  try {
    ensureEthereum();
    if (eip1193Provider?.on) {
      eip1193Provider.on("accountsChanged", () => {
        signer = null;
        signerAddress = "";
        els.signerAddress.textContent = "-";
        setBadge(els.walletStatus, "Wallet: đổi account, cần kết nối lại", "neutral");
        setLog("MetaMask đã đổi account. Bấm Connect Wallet trước khi chạy lại.");
      });
      eip1193Provider.on("chainChanged", () => {
        signer = null;
        signerAddress = "";
        els.signerAddress.textContent = "-";
        els.chainId.textContent = "-";
        setBadge(els.walletStatus, "Wallet: đổi network, cần kết nối lại", "neutral");
        setLog("MetaMask đã đổi network. Bấm Connect Wallet trước khi chạy lại.");
      });
    }
  } catch (error) {
    setLog(`Lỗi ví: ${error.message || error}`);
  }

  $("fileInput").addEventListener("change", async () => {
    const file = $("fileInput").files?.[0];
    if (!file) return;
    els.autoSummary.textContent = `Sẽ tự sinh khi bấm Upload & Sign\nfile: ${file.name}\nsize: ${file.size} bytes`;
  });

  els.connectBtn.addEventListener("click", () => {
    connectWallet().catch((error) => setLog(`Lỗi kết nối: ${error.message || error}`));
  });

  els.runBtn.addEventListener("click", () => {
    runFlow().catch((error) => setLog(`Lỗi chạy flow: ${error.message || error}`));
  });

  els.fillBtn.addEventListener("click", fillDefaults);
}

init();
