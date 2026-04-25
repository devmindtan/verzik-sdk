# Verzik SDK

The Verzik SDK provides hybrid encryption (AES-256-GCM + ECIES) powered by WebAssembly (WASM), alongside a robust TypeScript wrapper for seamless standard node.js and browser integration.

## Features

- **Blazing Fast**: Underlying crypto operations run in extremely fast Rust compiled WASM.
- **Hybrid Encryption**: Combines AES-256-GCM for efficient file encryption with ECIES for secure key exchange.
- **Blockchain Ready**: Includes Ethers.js integration for on-chain verifiable anchoring right out-of-the-box.
- **Torus Integration**: Directly fetch public identities through emails on the Torus network.

## Installation

```bash
npm install @verzik/sdk ethers dotenv
```

*(Note: Ensure you have your `core_wasm` module properly built and packaged next to `ts_wrapper` if compiling from source).*

## Quick Start

### Basic Encryption & Decryption

```typescript
import { VerzikSDK } from "@verzik/sdk";
import crypto from "crypto";

// 1. Generate Dummy Data
const data = new Uint8Array(Buffer.from("Hello World!"));

// 2. Prepare recipient Web3 public key
const recipientPubKey = new Uint8Array(65);
recipientPubKey[0] = 0x04; // Set uncompressed prefix
crypto.randomFillSync(recipientPubKey, 1);

// Encrypt
const encryptedPackage = VerzikSDK.encrypt(data, recipientPubKey);

// Optional: you can extract the metadata logic
const envelope = VerzikSDK.split(encryptedPackage);
console.log("Ciphertext Hash:", envelope.metadata.ciphertext_hash);
```

### Initializing the Blockchain Client
Create your `.env` file first:
```
RPC_URL=https://...
PROTOCOL_ADDRESS=0x...
PRIVATE_KEY=0x... (If issuing transactions otherwise optional)
```

```typescript
import { createBlockchainClientFromEnv } from "@verzik/sdk";

const client = createBlockchainClientFromEnv();
const count = await client.getTenantCount();
console.log("Total tenants:", count);
```

## Running Tests

If you are developing this SDK:

```bash
npm install
npm run test
```

## License
MIT
