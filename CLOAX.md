# CloaxPay

**Non-Custodial Crypto Payment Infrastructure for Web3 Commerce**

---

## The Problem

Crypto payments are fundamentally broken for mainstream adoption. Despite blockchain technology promising seamless global transactions, the reality is far from it:

- **Network Confusion**: A customer sends USDC on Arbitrum, but the merchant only accepts payments on Base. The funds are stuck, the customer is confused, and the sale is lost.
- **The Gas Problem**: Users receive crypto but can't move it because they don't have native tokens for gas fees.
- **Address Exposure**: Merchants must publicly share wallet addresses, creating security vulnerabilities and enabling transaction tracking.
- **Technical Complexity**: Integrating crypto payments requires deep blockchain knowledge, managing multiple RPCs, and handling dozens of networks.
- **UX Friction**: Asking customers "What network are you paying from?" instantly kills conversion rates.

---

## The Challenges We Identified

1. **Multi-Chain Fragmentation**: 40+ blockchain networks, each with different tokens, addresses, and confirmation times
2. **No Universal Payment Standard**: Unlike credit cards with standardized processing, crypto lacks a unified payment protocol
3. **Custody Risk**: Most payment processors hold customer funds, creating counterparty risk
4. **Developer Burden**: Building crypto payment flows from scratch takes months and requires specialized expertise
5. **Real-Time Settlement**: Traditional payment processors batch transactions; crypto merchants expect instant confirmation
6. **Currency Volatility**: Customers want to pay in their preferred token; merchants want to receive in stablecoins

---

## Why Existing Solutions Fail

| Solution | Problem |
|----------|---------|
| **Direct Wallet Payments** | Requires customers to manually select correct network, copy addresses, manage gas |
| **Centralized Payment Processors** | Custodial risk, KYC requirements, restricted countries, high fees |
| **Simple Payment Links** | No cross-chain support, no automatic conversion, poor UX |
| **DEX Integrations** | Complex to implement, slippage issues, liquidity fragmentation |

Existing solutions force merchants to choose between security (non-custodial) and usability (good UX). CloaxPay eliminates this tradeoff.

---

## The Opportunity

The crypto payments market is projected to reach $4.5 billion by 2028. Yet:

- 73% of merchants cite "complexity" as the primary barrier to accepting crypto
- 68% of crypto holders have abandoned a purchase due to payment friction
- Cross-chain transactions fail 12% of the time on average

There's a massive gap between what crypto promises (instant, global, borderless payments) and what it delivers. CloaxPay bridges this gap.

---

## Our Solution

CloaxPay is a **non-custodial payment infrastructure** that enables merchants to accept crypto payments from any chain, in any token, settled directly to their wallet in their preferred currency.

**Core Principle**: Funds never touch CloaxPay servers. We route, convert, and deliver—but never hold.

---

## What CloaxPay Solves

- **Any Chain → Any Chain**: Customer pays in ETH on Arbitrum, merchant receives USDC on Base. Automatically.
- **Zero Gas for Merchants**: Settlement happens directly to merchant wallets with no gas management required
- **No Address Exposure**: Dynamic deposit addresses per transaction protect merchant privacy
- **5-Minute Integration**: Drop-in widget or simple API—no blockchain expertise needed
- **Instant Settlement**: Real-time conversion and delivery, not batched processing
- **Non-Custodial Security**: Funds route directly from customer to merchant via SideShift's infrastructure

---

## How CloaxPay Works

\`\`\`
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Customer   │───▶│  CloaxPay   │───▶│  SideShift  │───▶│  Merchant   │
│  (Any Chain)│    │  (Routing)  │    │  (Convert)  │    │  (Receives) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     ETH/ARB           Quote &            Swap              USDC/BASE
                      Session          Execution
\`\`\`

**Step-by-Step Flow:**

1. **Merchant creates payment session** via API or dashboard
2. **Customer selects payment method** (chain + token) from the widget
3. **CloaxPay fetches real-time quote** from SideShift API
4. **Unique deposit address generated** for this specific transaction
5. **Customer sends payment** to the deposit address
6. **SideShift converts and routes** directly to merchant's configured wallet
7. **Merchant receives settlement** in their preferred token (e.g., USDC on Base)
8. **Webhook notification** confirms completion with full transaction details

---

## Key Features

### Payment Widget
- Embeddable, customizable checkout experience
- Supports 40+ chains and 100+ tokens
- Real-time quotes with 30-second refresh
- Mobile-responsive design
- Automatic network detection

### Merchant Dashboard
- Real-time transaction monitoring
- Revenue analytics and charts
- Multi-wallet configuration
- Webhook management
- API key generation

### Developer API
- RESTful endpoints for full control
- Webhook notifications for all events
- Session management
- Quote retrieval
- Transaction status tracking

### Multi-Chain Deposit Support (Powered by SideShift API)
- Fixed-rate quotes (no slippage surprises)
- 40+ supported networks
- Automatic best-route selection
- Real-time exchange rates

---

## What Makes CloaxPay Different

1. **Truly Non-Custodial**: Unlike Coinbase Commerce or BitPay, we never hold funds. Period.
2. **Cross-Chain Native**: Built from day one for multi-chain reality, not bolted on later
3. **Merchant-First Design**: Configure once, accept from everywhere
4. **Real-Time Everything**: Quotes, conversions, settlements, and notifications—all instant
5. **Privacy-Preserving**: No KYC for merchants, no address reuse, minimal data collection
6. **Developer Experience**: Clean APIs, comprehensive docs, copy-paste integration

---

## Technical Advantages

### SideShift Integration
- Direct API integration with SideShift V2
- Fixed-rate quotes lock in exchange rates
- Automatic retry logic with exponential backoff
- Fallback handling for network congestion

### Error Handling
- Graceful degradation when networks are congested
- Automatic quote refresh before expiration
- Clear error messages for debugging
- Comprehensive logging for troubleshooting

### Security Architecture
- AES-256-GCM encryption for sensitive data
- HMAC-SHA256 webhook signatures
- Rate limiting on all endpoints
- Input validation and sanitization
- No private keys stored server-side

---

## User Benefits

### For Merchants
- **Higher Conversion**: Remove payment friction, capture more sales
- **Lower Fees**: No 3% credit card fees, no chargebacks
- **Global Reach**: Accept payments from anywhere, no banking restrictions
- **Instant Settlement**: No 3-5 day holds, funds arrive immediately
- **Simple Accounting**: Receive in stablecoins, simplify bookkeeping

### For Customers
- **Pay Your Way**: Use any token on any chain you already hold
- **No New Wallets**: Works with existing wallets (MetaMask, Rainbow, etc.)
- **Clear Pricing**: See exact amount before confirming
- **Fast Checkout**: 3 clicks from cart to confirmed payment

---

## Our Approach to Security

### Non-Custodial by Design
- CloaxPay never has access to merchant funds
- No hot wallets, no cold storage, no custody risk
- Funds route directly through SideShift to merchant wallets

### Privacy Protection
- Unique deposit addresses per transaction
- Merchant settlement addresses never exposed to customers
- Minimal data retention (transaction records only)
- No KYC requirements for merchants

### Technical Security
- All API communications over HTTPS
- Webhook payloads signed with merchant-specific secrets
- API keys use secure random generation (256-bit entropy)
- Rate limiting prevents abuse

---

## Limitations & What's Coming Next

### Current Limitations
- **Same-Coin Shifts**: Sending USDC and receiving USDC on a different chain is not yet supported → **Coming Soon**
- **Fiat Off-Ramp**: Direct conversion to bank accounts not available → **Q2 2025**
- **Recurring Payments**: Subscription billing not yet implemented → **Q3 2025**

### Roadmap
- [ ] Same-coin cross-chain transfers
- [ ] Fiat settlement options
- [ ] Subscription/recurring payment support
- [ ] Enhanced analytics dashboard
- [ ] Mobile SDK (iOS/Android)
- [ ] Shopify/WooCommerce plugins

---

## Performance & Scalability

### Speed
- Quote generation: <500ms average
- Widget load time: <1 second
- Settlement confirmation: Network-dependent (typically 1-5 minutes)

### Scalability
- Stateless API design
- Horizontal scaling ready
- No blockchain node dependencies (SideShift handles routing)
- 40+ chains supported without additional infrastructure

### Reliability
- Automatic retry logic for failed requests
- Graceful handling of network congestion
- Real-time monitoring and alerting
- 99.9% uptime target

---

## Developer Experience

### Quick Start
\`\`\`bash
# 1. Get your API keys from dashboard
# 2. Create a payment session
curl -X POST https://yoursite.com/api/payment/initialize \
  -H "x-api-key: sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "USD"}'

# 3. Embed the widget or redirect to hosted page
\`\`\`

### Clean API Design
- RESTful conventions
- Consistent error responses
- Comprehensive TypeScript types
- Webhook event documentation

### Integration Options
1. **Drop-in Widget**: Copy-paste iframe, zero code changes
2. **React Component**: Full customization, native integration
3. **API-Only**: Build your own UI, use our backend

---

## Why We Built CloaxPay

We've been in crypto since 2017. We've watched the space evolve from "Bitcoin for coffee" experiments to DeFi summer to NFT mania. Through it all, one thing remained broken: **actually paying for things with crypto.**

Every time we tried to use crypto for real commerce, we hit the same walls:
- "Sorry, we only accept ETH on mainnet" (gas fees: $50)
- "Please send to this address" (copied wrong, funds gone)
- "Your payment is processing" (3 days later, still waiting)

We built CloaxPay because we believe crypto payments should be **easier than credit cards**, not harder. The technology exists. The liquidity exists. The demand exists. What was missing was the infrastructure to connect them seamlessly.

CloaxPay is that infrastructure.

---

## The Vision

**Short-term**: Become the default payment infrastructure for Web3 commerce. Make accepting crypto as simple as adding a Stripe button.

**Medium-term**: Enable any merchant, anywhere, to accept any currency and receive any currency. True global commerce without banking gatekeepers.

**Long-term**: Build the financial rails for the decentralized economy. Not just payments, but invoicing, subscriptions, payroll, and treasury management—all non-custodial, all instant, all global.

---

## Get Started

1. **Sign Up**: Create a merchant account at [cloaxpay.com](https://cloaxpay.com)
2. **Configure**: Set your settlement wallet and preferred token
3. **Integrate**: Add the widget to your site or use the API
4. **Accept Payments**: Start receiving crypto from customers worldwide

---

**CloaxPay** — *Non-Custodial. Multi-Chain. Instant Settlement.*

© 2025 CloaxPay. All rights reserved.
