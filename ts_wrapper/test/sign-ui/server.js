const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  VerzikSDK,
  bytesToHex,
  hexToBytes,
  createBlockchainClientFromEnv,
} = require('../../dist/index.js');

const root = __dirname;
const indexFile = path.join(root, 'index.html');
const appFile = path.join(root, 'app.js');

let blockchainClient = null;
let blockchainInitError = null;
try {
  blockchainClient = createBlockchainClientFromEnv();
} catch (error) {
  blockchainInitError = String(error?.message || error);
}

const DEFAULT_TORUS = {
  network: 'sapphire_devnet',
  clientId: 'BJ-M7ve4Q2kYdg5jsEfIyPPNNWP7a7QhkdGOzis86Ug5SD1WYUsd1PjPnQaqEXz_99A5XUNdVGHRMNQm464wHeM',
  verifier: 'verzik-auth',
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(String(url || ''));
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isEthAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());
}

function isSecp256k1PubKeyHex(value) {
  const clean = String(value || '').replace(/^0x/, '');
  const compressed = /^0[23][a-fA-F0-9]{64}$/.test(clean);
  const uncompressed = /^04[a-fA-F0-9]{128}$/.test(clean);
  return compressed || uncompressed;
}

function ensureHexPrefix(value) {
  const raw = String(value || '').trim();
  if (!raw) return raw;
  return raw.startsWith('0x') ? raw : `0x${raw}`;
}

async function resolveRecipientPublicKey({ recipientIdentifier, issuerPublicKey, signerAddress, torus }) {
  const id = String(recipientIdentifier || '').trim();

  if (!id) {
    return issuerPublicKey;
  }

  if (isSecp256k1PubKeyHex(id)) {
    return ensureHexPrefix(id);
  }

  if (isEmail(id)) {
    return VerzikSDK.getPublicKeyFromEmail(id, torus);
  }

  if (isEthAddress(id)) {
    if (signerAddress && id.toLowerCase() === String(signerAddress).toLowerCase()) {
      return issuerPublicKey;
    }
    throw new Error('Recipient là địa chỉ ví thì cần public key tương ứng (hoặc dùng chính ví đang ký).');
  }

  throw new Error('Recipient identifier không hợp lệ. Dùng email, địa chỉ ví hoặc public key secp256k1.');
}

function normalizeRecipientIdentifiers(input) {
  if (Array.isArray(input)) {
    return input
      .map((v) => String(v || '').trim())
      .filter(Boolean);
  }

  return String(input || '')
    .split(/[\n,;]/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function getSdkChainConfig() {
  const chainIdRaw = process.env.CHAIN_ID || process.env.BLOCKCHAIN_CHAIN_ID || '31337';
  const parsedChainId = Number.parseInt(String(chainIdRaw), 10);
  return {
    rpc_url: process.env.RPC_URL || process.env.BLOCKCHAIN_RPC_URL || null,
    protocol_address: process.env.PROTOCOL_ADDRESS || null,
    tenant_id: process.env.TENANT_ID || null,
    chain_id: Number.isFinite(parsedChainId) ? parsedChainId : 31337,
  };
}

async function handleSdkConfig(_req, res) {
  const cfg = getSdkChainConfig();
  sendJson(res, 200, {
    status: 'success',
    sdk: {
      blockchain_ready: Boolean(blockchainClient),
      init_error: blockchainInitError,
      ...cfg,
    },
  });
}

async function handleSdkNonce(req, res) {
  if (!blockchainClient) {
    sendJson(res, 500, {
      status: 'error',
      message: 'BlockchainClient not initialized',
      detail: blockchainInitError || 'Unknown init error',
    });
    return;
  }

  try {
    const reqUrl = new URL(req.url, 'http://localhost');
    const tenantId = String(reqUrl.searchParams.get('tenant_id') || '').trim();
    const operatorAddress = String(reqUrl.searchParams.get('operator_address') || '').trim();

    if (!tenantId || !operatorAddress) {
      sendJson(res, 400, {
        status: 'error',
        message: 'Missing tenant_id or operator_address',
      });
      return;
    }

    const nonce = await blockchainClient.getNonce(tenantId, operatorAddress);
    sendJson(res, 200, {
      status: 'success',
      tenant_id: tenantId,
      operator_address: operatorAddress,
      nonce: nonce.toString(),
      source: 'sdk',
    });
  } catch (error) {
    sendJson(res, 500, {
      status: 'error',
      message: 'SDK nonce query failed',
      detail: String(error?.message || error),
    });
  }
}

async function handlePrepareUpload(req, res) {
  try {
    const body = await parseJsonBody(req);

    const targetUrl = body.targetUrl;
    if (!isHttpUrl(targetUrl)) {
      sendJson(res, 400, { status: 'error', message: 'targetUrl không hợp lệ' });
      return;
    }

    if (!body.fileBase64) {
      sendJson(res, 400, { status: 'error', message: 'Thiếu fileBase64' });
      return;
    }

    const fileBytes = new Uint8Array(Buffer.from(body.fileBase64, 'base64'));
    const fileName = body.fileName || 'encrypted_file.bin';
    // Backend hiện tại dùng multer.single("encrypted_file")
    const fileFieldName = 'encrypted_file';
    const tenantId = String(body.tenantId || '').trim();
    const docType = Number(body.docType || 1);
    const version = Number(body.version || 1);
    const operatorNonce = String(body.operatorNonce || '0');
    const deadline = Number(body.deadline || Math.floor(Date.now() / 1000) + 3600);
    const issuerPublicKey = ensureHexPrefix(body.issuerPublicKey);
    const signerAddress = String(body.signerAddress || '').trim();

    if (!issuerPublicKey || !isSecp256k1PubKeyHex(issuerPublicKey)) {
      sendJson(res, 400, { status: 'error', message: 'issuerPublicKey không hợp lệ' });
      return;
    }

    const torus = {
      ...DEFAULT_TORUS,
      ...(body.torus || {}),
    };

    const recipientIdentifiers = normalizeRecipientIdentifiers(body.recipientIdentifiers ?? body.recipientIdentifier);
    const normalizedRecipients = recipientIdentifiers.length > 0 ? recipientIdentifiers : [signerAddress || issuerPublicKey];

    const recipientPublicKeys = [];
    for (const recipientIdentifier of normalizedRecipients) {
      const resolved = await resolveRecipientPublicKey({
        recipientIdentifier,
        issuerPublicKey,
        signerAddress,
        torus,
      });
      recipientPublicKeys.push({ recipientIdentifier, publicKey: resolved });
    }

    const aesKey = new Uint8Array(crypto.randomBytes(32));
    const nonce = new Uint8Array(crypto.randomBytes(12));

    const recipientPackages = [];
    for (const item of recipientPublicKeys) {
      const pkg = VerzikSDK.encrypt(
        fileBytes,
        hexToBytes(item.publicKey),
        { aesKey, nonce },
      );
      recipientPackages.push({
        recipientIdentifier: item.recipientIdentifier,
        publicKey: item.publicKey,
        package: pkg,
      });
    }

    const primaryRecipient = recipientPackages[0];

    const issuerPkg = VerzikSDK.encrypt(
      fileBytes,
      hexToBytes(issuerPublicKey),
      { aesKey, nonce },
    );

    const originalHash = VerzikSDK.hashDocument(fileBytes);

    const hashesJson = JSON.stringify({
      ciphertext_hash: primaryRecipient.package.ciphertext_hash,
      encryption_meta_hash: primaryRecipient.package.encryption_meta_hash,
    });

    const recipientKeysMap = {};
    recipientPackages.forEach((item, index) => {
      const keyName = item.recipientIdentifier || `recipient_${index + 1}`;
      recipientKeysMap[keyName] = bytesToHex(item.package.encrypted_key);
    });

    const keysJson = JSON.stringify({
      // Backend hiện tại kỳ vọng string cho encrypted_key
      encrypted_key: String(bytesToHex(primaryRecipient.package.encrypted_key)),
      issuer_encrypted_key: String(bytesToHex(issuerPkg.encrypted_key)),
      nonce: String(bytesToHex(primaryRecipient.package.nonce)),
    });

    const anchorPayloadJson = JSON.stringify({
      tenant_id: tenantId,
      doc_type: docType,
      version,
      operator_nonce: operatorNonce,
      deadline,
    });

    const formData = new FormData();
    formData.append(fileFieldName, new Blob([primaryRecipient.package.encrypted_file], { type: 'application/octet-stream' }), fileName);
    formData.append('original_hash', originalHash);
    formData.append('hashes', hashesJson);
    formData.append('keys', keysJson);
    // Dành cho nhiều recipient nhưng không phá schema keys hiện tại của backend
    formData.append('recipient_keys', JSON.stringify(recipientKeysMap));
    formData.append('anchor_payload', anchorPayloadJson);

    const forwardHeaders = {
      ...(body.clientId ? { 'X-Client-Id': String(body.clientId) } : {}),
      ...(body.clientDomain ? { 'X-Client-Domain': String(body.clientDomain) } : {}),
      ...((body.extraHeaders && typeof body.extraHeaders === 'object') ? body.extraHeaders : {}),
      ...(isEthAddress(signerAddress) ? { 'X-Wallet-Address': signerAddress } : {}),
    };

    const upstream = await fetch(String(targetUrl), {
      method: 'POST',
      headers: forwardHeaders,
      body: formData,
    });

    const upstreamText = await upstream.text();
    let upload;
    try {
      upload = JSON.parse(upstreamText);
    } catch {
      sendJson(res, 502, {
        status: 'error',
        message: 'Backend upload không trả JSON hợp lệ',
        raw: upstreamText.slice(0, 400),
      });
      return;
    }

    if (!upstream.ok || upload.status !== 'success') {
      sendJson(res, upstream.status || 502, {
        status: 'error',
        message: upload.message || `Backend trả về lỗi HTTP ${upstream.status}`,
        upload,
      });
      return;
    }

    sendJson(res, 200, {
      status: 'success',
      upload,
      computed: {
        original_hash: originalHash,
        ciphertext_hash: primaryRecipient.package.ciphertext_hash,
        encryption_meta_hash: primaryRecipient.package.encryption_meta_hash,
        recipient_public_keys: recipientPublicKeys,
        encrypted_keys_count: recipientPackages.length,
        issuer_public_key: issuerPublicKey,
      },
    });
  } catch (error) {
    sendJson(res, 500, {
      status: 'error',
      message: 'Lỗi prepare upload',
      detail: String(error),
    });
  }
}

async function handleProxyUpload(req, res) {
  const targetUrl = req.headers['x-target-url'];
  if (!isHttpUrl(targetUrl)) {
    sendJson(res, 400, {
      status: 'error',
      message: 'Thiếu hoặc sai header X-Target-Url',
    });
    return;
  }

  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));

  req.on('end', async () => {
    try {
      const bodyBuffer = Buffer.concat(chunks);
      const incoming = req.headers;
      const forwardHeaders = {};

      if (incoming['content-type']) {
        forwardHeaders['content-type'] = incoming['content-type'];
      }

      for (const [key, value] of Object.entries(incoming)) {
        const lower = key.toLowerCase();
        if (lower === 'x-target-url') continue;
        if (lower === 'content-type') continue;
        if (lower === 'content-length') continue;
        if (lower === 'host') continue;
        if (lower === 'connection') continue;
        if (lower.startsWith('x-') || lower === 'authorization') {
          if (typeof value === 'string') {
            forwardHeaders[lower] = value;
          }
        }
      }

      const upstream = await fetch(String(targetUrl), {
        method: 'POST',
        headers: forwardHeaders,
        body: bodyBuffer,
      });

      const upstreamText = await upstream.text();
      const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
      res.writeHead(upstream.status, { 'Content-Type': contentType });
      res.end(upstreamText);
    } catch (error) {
      sendJson(res, 502, {
        status: 'error',
        message: 'Proxy upload thất bại',
        detail: String(error),
      });
    }
  });
}

async function handleProxyGet(req, res) {
  const targetUrl = req.headers['x-target-url'];
  if (!isHttpUrl(targetUrl)) {
    sendJson(res, 400, { status: 'error', message: 'Thiếu hoặc sai header X-Target-Url' });
    return;
  }

  try {
    const upstream = await fetch(String(targetUrl), {
      method: 'GET',
      headers: {
        'X-Client-Id': req.headers['x-client-id'] || '',
        'X-Client-Domain': req.headers['x-client-domain'] || '',
      },
    });

    const upstreamText = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    res.writeHead(upstream.status, { 'Content-Type': contentType });
    res.end(upstreamText);
  } catch (error) {
    sendJson(res, 502, {
      status: 'error',
      message: 'Proxy GET thất bại',
      detail: String(error),
    });
  }
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (req.method === 'POST' && urlPath === '/proxy/upload') {
    handleProxyUpload(req, res);
    return;
  }

  if (req.method === 'POST' && urlPath === '/proxy/prepare-upload') {
    handlePrepareUpload(req, res);
    return;
  }

  if (req.method === 'GET' && urlPath === '/proxy/nonce') {
    handleProxyGet(req, res);
    return;
  }

  if (req.method === 'GET' && urlPath === '/proxy/sdk/config') {
    handleSdkConfig(req, res);
    return;
  }

  if (req.method === 'GET' && urlPath === '/proxy/sdk/nonce') {
    handleSdkNonce(req, res);
    return;
  }

  let filePath = indexFile;
  if (urlPath === '/app.js') filePath = appFile;
  if (urlPath !== '/' && urlPath !== '/app.js') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  try {
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(error));
  }
});

server.listen(3001, () => {
  console.log('🚀 Sign test UI is running at http://localhost:3001');
});
