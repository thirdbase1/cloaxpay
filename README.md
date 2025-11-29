# CloaxPay - Decentralized Crypto Payment Gateway

**Accept crypto payments in 200+ coins across 40+ chains. Receive in any token you choose. Zero fees. Non-custodial.**

## Overview

CloaxPay solves the crypto fragmentation problem for merchants. Instead of managing dozens of wallets across multiple chains, merchants simply set their preferred settlement token and wallet address. Customers can pay with any supported cryptocurrency, and CloaxPay automatically converts and routes funds directly to the merchant's wallet.

### Key Features

- **200+ Coins, 40+ Chains**: Accept Bitcoin, Ethereum, Solana, USDC, and hundreds more
- **You Choose What You Receive**: Settle in USDC, ETH, BTC, or any supported token
- **Zero Platform Fees**: We don't charge merchants anything - keep 100% of what you earn
- **Non-Custodial**: Funds flow directly to your wallet - we never hold your assets
- **Real-Time Processing**: Live transaction tracking and instant webhook notifications
- **Built for Developers**: Simple REST API, works on any platform

---

## How It Works

CloaxPay leverages **SideShift.ai** for secure, trustless cross-chain swaps:

1. **Payment Initialization**: Merchant creates a payment session via API
2. **Customer Selects Payment Method**: User chooses their preferred coin (BTC, ETH, SOL, etc.)
3. **Automatic Swap**: SideShift creates a variable shift to the merchant's settlement token
4. **Direct Settlement**: Funds are swapped and sent directly to merchant's wallet
5. **Webhook Notification**: Merchant receives real-time payment status updates

---

## Quick Start

### 1. Create Account

1. Sign up at `/auth/sign-up`
2. Go to **Settings** and add your settlement wallet (EVM or Solana)
3. Go to **API Keys** and generate your keys

**Important**: You must add a wallet before generating API keys.

### 2. Initialize a Payment

\`\`\`bash
curl -X POST https://your-domain.com/api/payment/initialize \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "currency": "USD",
    "metadata": {
      "order_id": "order_123"
    }
  }'
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "session_id": "sess_abc123...",
  "widget_url": "https://your-domain.com/pay/sess_abc123...",
  "expires_at": "2025-01-01T12:00:00Z"
}
\`\`\`

### 3. Redirect Customer

\`\`\`javascript
// Redirect to payment widget
window.location.href = session.widget_url;
\`\`\`

### 4. Handle Webhooks

Configure your webhook URL in **Settings > Webhooks**.

**Webhook Payload:**
\`\`\`json
{
  "event": "payment.completed",
  "session_id": "sess_abc123...",
  "status": "completed",
  "amount": "50.00",
  "currency": "USD",
  "settled_amount": "50.00",
  "settled_currency": "USDC",
  "tx_hash": "0x742d35...",
  "timestamp": "2025-01-01T10:30:00Z"
}
\`\`\`

**Verify Webhook Signature:**
\`\`\`javascript
import crypto from 'crypto';

const signature = req.headers['x-cloaxpay-signature'];
const payload = JSON.stringify(req.body);

const expected = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
  // Valid webhook - process the payment
  console.log('Payment completed:', req.body.session_id);
}
\`\`\`

---

## Supported Networks

**Settlement Networks (where you receive funds):**
- EVM Chains: Ethereum, Polygon, Base, Arbitrum, Optimism, Avalanche, BSC
- Solana: SPL tokens
- Bitcoin, Litecoin, Dogecoin, Tron, XRP

**Payment Networks (what customers can pay with):**
- All 40+ chains supported by SideShift.ai
- 200+ cryptocurrencies

---

## API Reference

### `POST /api/payment/initialize`
Creates a new payment session.

**Headers:**
- `Authorization: Bearer sk_live_...`

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | number | Yes | Payment amount |
| currency | string | Yes | Currency code (USD, EUR, etc.) |
| metadata | object | No | Custom data for your records |

**Response:**
| Field | Description |
|-------|-------------|
| session_id | Unique payment identifier |
| widget_url | URL to redirect customer to |
| expires_at | Session expiration time |

### `GET /api/payment/verify/:session_id`
Check payment status.

**Response:**
| Field | Description |
|-------|-------------|
| status | pending, completed, failed, expired |
| settled_amount | Amount received |
| tx_hash | Blockchain transaction hash |

---

## Security

- **HMAC Webhook Signatures**: All webhooks are signed with your secret key
- **API Key Authentication**: Secure Bearer token authentication
- **IP Whitelisting**: SideShift webhook endpoints protected by IP whitelist
- **Non-Custodial**: We never have access to your funds

---

## Support

For questions or issues, visit our documentation or contact support.

---

**Built by developers, for developers.**
