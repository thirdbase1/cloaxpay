# Integration Guide

Welcome to the CloaxPay integration guide. This document will help you integrate our payment widget into your application and understand how to handle payments.

## 1. Quick Start

Integrating CloaxPay is simple. You only need to redirect your users to our payment link.

### Step 1: Get Your API Keys
1. Log in to your Dashboard.
2. Go to **Settings** -> **Wallets** and add your Settlement Wallet (where you want to receive funds).
3. Go to **API Keys** and generate a new **Live Key**.

### Step 2: Create a Payment Session
Make a POST request to our API to create a payment session.

**Endpoint:** `POST https://your-domain.com/api/payment/initialize`

**Headers:**
- `Content-Type`: `application/json`
- `Authorization`: `Bearer YOUR_SECRET_KEY`

**Body:**
\`\`\`json
{
  "amount": 50.00,
  "currency": "USD",
  "description": "Order #1234",
  "callback_url": "https://your-site.com/order/success",
  "cancel_url": "https://your-site.com/order/cancel",
  "buyer_email": "customer@example.com"
}
\`\`\`

**Response:**
\`\`\`json
{
  "status": "success",
  "session_id": "sess_123abc...",
  "widget_url": "https://your-domain.com/pay/sess_123abc..."
}
\`\`\`

### Step 3: Redirect User
Redirect your customer to the `widget_url` returned in the response.
They will see the secure payment widget, choose their preferred crypto, and complete the payment.

---

## 2. Webhooks (Real-time Updates)

Webhooks allow your server to receive real-time updates when a payment is completed.

### Setting Up
1. Go to **Settings** in your Dashboard.
2. Enter your **Webhook URL** (e.g., `https://your-site.com/api/webhooks/cloaxpay`).
3. Copy your **Webhook Secret**.

### Verifying Webhooks
To ensure the request is genuinely from us, verify the signature header `X-CloaxPay-Signature`.

**Node.js Example:**

\`\`\`javascript
import crypto from 'crypto';

export async function POST(req) {
  const payload = await req.text();
  const signature = req.headers.get('x-cloaxpay-signature');
  const secret = process.env.WEBHOOK_SECRET;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');

  if (signature !== digest) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(payload);
  
  if (event.status === 'completed') {
    console.log(`Payment ${event.session_id} successful!`);
    // Fulfill order...
  }
}
\`\`\`

### Event Types
- `payment.created`: Session created.
- `payment.detecting`: User has sent funds (unconfirmed).
- `payment.completed`: Funds confirmed and settled.
- `payment.failed`: Transaction failed or expired.

---

## 3. The Payment Widget

Our hosted payment widget handles all the complexity:
- **Currency Conversion**: Real-time exchange rates.
- **Address Generation**: Unique deposit address for every session.
- **Status Polling**: Real-time feedback to the user.
- **Security**: Non-custodial. We verify the transaction on-chain.

You do not need to implement any blockchain logic. Just redirect to the URL and listen for the webhook.

---

## 4. Support

For questions or issues, visit our documentation or contact support.

**Powered by SideShift.ai**
