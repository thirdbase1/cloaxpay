# Web3 Paystack - Merchant Integration Guide

Complete guide to integrating Web3 Paystack payment widget into your application.

## Table of Contents

- [Quick Start](#quick-start)
- [Getting Your API Keys](#getting-your-api-keys)
- [Getting Supported Chains](#getting-supported-chains)
- [Creating a Payment Session](#creating-a-payment-session)
- [Embedding the Widget](#embedding-the-widget)
- [Verifying Payments](#verifying-payments)
- [Webhooks](#webhooks)
- [Code Examples](#code-examples)
- [Best Practices](#best-practices)
- [Testing](#testing)
- [Support](#support)
- [Changelog](#changelog)

---

## Quick Start

1. Sign up at [your-platform-url]
2. Get your API keys from the dashboard
3. **Add your settlement wallet address** (where you receive funds)
4. **Get supported chains** from the API
5. Let customers select chain and amount on your site
6. Create payment session with customer's selection
7. Redirect customer to payment widget
8. Verify payment completion via webhook or API

**Total integration time: ~15 minutes**

---

## Getting Your API Keys

After signing up, navigate to **Dashboard → API Keys** to get your keys:

- **Public Key** (`pk_...`) - Used in client-side code
- **Secret Key** (`sk_...`) - Used in server-side code (keep secret!)

### Important: Production-Only Platform

⚠️ **All API keys are production keys.** SideShift.ai has no sandbox environment, so all transactions use real cryptocurrency.

**Safe Testing:**
- Use the **Try Widget** page in your dashboard
- Test with small amounts ($1-10 maximum enforced)
- Start with $1-2 for initial tests

---

## Getting Supported Chains

**Important:** Always fetch supported chains from the API. Never hardcode chains as they may change.

### Endpoint

\`\`\`
GET https://your-platform-url/api/chains/supported
\`\`\`

### Response

\`\`\`json
{
  "success": true,
  "chains": [
    {
      "id": "eth/mainnet",
      "coin": "ETH",
      "network": "mainnet",
      "name": "Ethereum",
      "label": "Ethereum (mainnet)"
    },
    {
      "id": "sol/mainnet",
      "coin": "SOL",
      "network": "mainnet",
      "name": "Solana",
      "label": "Solana (mainnet)"
    }
    // ... more chains
  ]
}
\`\`\`

### Integration Example

\`\`\`javascript
// Fetch chains when page loads
const response = await fetch('https://your-platform-url/api/chains/supported');
const { chains } = await response.json();

// Show chains to user in a dropdown
<select id="chain-selector">
  {chains.map(chain => (
    <option value={chain.id}>{chain.label}</option>
  ))}
</select>
\`\`\`

---

## Creating a Payment Session

Create a payment session from your server using your **secret key**.

### Endpoint

\`\`\`
POST https://your-platform-url/api/payment/deposit
\`\`\`

### Headers

\`\`\`
Authorization: Bearer YOUR_SECRET_KEY
Content-Type: application/json
\`\`\`

### Request Body

\`\`\`json
{
  "amount": 100,
  "currency": "USD",
  "depositChain": "mainnet",
  "depositToken": "eth",
  "settleAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "metadata": {
    "order_id": "order_123",
    "customer_email": "customer@example.com"
  }
}
\`\`\`

**Required Fields:**
- `amount` - Payment amount
- `currency` - Currency code (USD, EUR, etc.)
- `depositChain` - Network customer will pay on (from supported chains API)
- `depositToken` - Token customer will pay with (from supported chains API)
- `settleAddress` - YOUR wallet address where you receive funds

### Response

\`\`\`json
{
  "success": true,
  "session_id": "sess_abc123...",
  "widget_url": "https://your-platform-url/p/sess_abc123...",
  "deposit_address": "0x1234...", // Real SideShift address
  "deposit_chain": "eth/mainnet",
  "shift_id": "shift_xyz...", // SideShift shift ID
  "amount": 100,
  "currency": "USD",
  "expires_at": "2025-01-15T12:00:00Z"
}
\`\`\`

---

## Embedding the Widget

### Option 1: Redirect (Simplest)

Redirect users to the `widget_url` returned from the API:

\`\`\`javascript
// Redirect user to payment widget
window.location.href = data.widget_url;
\`\`\`

### Option 2: Iframe Embed

Embed the widget in an iframe:

\`\`\`html
<iframe
  src="https://your-platform-url/widget/sess_abc123..."
  width="100%"
  height="600"
  frameborder="0"
  style="border-radius: 8px;"
></iframe>
\`\`\`

### Option 3: Modal/Dialog

Open the widget in a modal:

\`\`\`javascript
// Using a modal library
const modal = document.createElement('dialog');
modal.innerHTML = `
  <iframe 
    src="${widgetUrl}" 
    width="450" 
    height="600"
    style="border: none; border-radius: 12px;"
  ></iframe>
`;
document.body.appendChild(modal);
modal.showModal();
\`\`\`

---

## Verifying Payments

### Check Payment Status

\`\`\`
GET https://your-platform-url/api/payment/verify/:id
\`\`\`

### Headers

\`\`\`
Authorization: Bearer YOUR_SECRET_KEY
\`\`\`

### Response

\`\`\`json
{
  "session_id": "sess_abc123...",
  "status": "completed",
  "amount": 100,
  "currency": "USD",
  "deposit_address": "0x1234...",
  "deposit_chain": "eth/mainnet",
  "created_at": "2025-01-14T10:00:00Z",
  "completed_at": "2025-01-14T10:15:00Z"
}
\`\`\`

### Status Values

- `pending` - Session created, waiting for initialization
- `awaiting_payment` - Deposit address generated, waiting for payment
- `processing` - Payment detected, processing swap/settlement
- `completed` - Payment successfully completed
- `failed` - Payment failed
- `expired` - Session expired (24 hours)

---

## Webhooks

Receive real-time notifications when payment status changes.

### Setting Up Webhooks

1. Go to **Dashboard → Settings → Webhooks**
2. Add your webhook URL (e.g., `https://yoursite.com/api/webhooks/payment`)
3. Save your webhook secret for verification

### Webhook Payload

\`\`\`json
{
  "event": "payment.completed",
  "session_id": "sess_abc123...",
  "status": "completed",
  "amount": 100,
  "currency": "USD",
  "metadata": {
    "order_id": "order_123"
  },
  "timestamp": "2025-01-14T10:15:00Z"
}
\`\`\`

### Webhook Events

- `payment.pending` - Payment session created
- `payment.detected` - Payment detected on-chain
- `payment.processing` - Payment being processed
- `payment.completed` - Payment successfully completed
- `payment.failed` - Payment failed
- `payment.expired` - Payment session expired

### Verifying Webhook Signatures

Always verify webhook signatures to ensure authenticity:

\`\`\`javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// In your webhook handler
app.post('/api/webhooks/payment', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhook(req.body, signature, WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook...
});
\`\`\`

---

## Code Examples

### Node.js / Express

\`\`\`javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const API_URL = 'https://your-platform-url/api';
const SECRET_KEY = 'YOUR_SECRET_KEY';

// Create payment endpoint
app.post('/create-payment', async (req, res) => {
  try {
    const { amount, currency, depositChain, depositToken, settleAddress, metadata } = req.body;
    
    const response = await axios.post(
      `${API_URL}/payment/deposit`,
      { amount, currency, depositChain, depositToken, settleAddress, metadata },
      {
        headers: {
          'Authorization': `Bearer ${SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Payment creation failed:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Verify payment endpoint
app.get('/verify-payment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await axios.get(
      `${API_URL}/payment/verify/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${SECRET_KEY}`
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Payment verification failed:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
\`\`\`

### Python / Flask

\`\`\`python
from flask import Flask, request, jsonify
import requests
import hmac
import hashlib

app = Flask(__name__)

API_URL = 'https://your-platform-url/api'
SECRET_KEY = 'YOUR_SECRET_KEY'
WEBHOOK_SECRET = 'your_webhook_secret'

@app.route('/create-payment', methods=['POST'])
def create_payment():
    data = request.json
    
    response = requests.post(
        f'{API_URL}/payment/deposit',
        json={
            'amount': data['amount'],
            'currency': data['currency'],
            'depositChain': data['depositChain'],
            'depositToken': data['depositToken'],
            'settleAddress': data['settleAddress'],
            'metadata': data.get('metadata', {})
        },
        headers={
            'Authorization': f'Bearer {SECRET_KEY}',
            'Content-Type': 'application/json'
        }
    )
    
    return jsonify(response.json())

@app.route('/verify-payment/<id>', methods=['GET'])
def verify_payment(id):
    response = requests.get(
        f'{API_URL}/payment/verify/{id}',
        headers={'Authorization': f'Bearer {SECRET_KEY}'}
    )
    
    return jsonify(response.json())

@app.route('/webhooks/payment', methods=['POST'])
def payment_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data()
    
    # Verify signature
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected_signature):
        return jsonify({'error': 'Invalid signature'}), 401
    
    event = request.json
    
    # Handle webhook event
    if event['event'] == 'payment.completed':
        # Update order status, fulfill order, etc.
        print(f"Payment completed: {event['session_id']}")
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(port=3000)
\`\`\`

### PHP

\`\`\`php
<?php

$apiUrl = 'https://your-platform-url/api';
$secretKey = 'YOUR_SECRET_KEY';

// Create payment
function createPayment($amount, $currency, $depositChain, $depositToken, $settleAddress, $metadata = []) {
    global $apiUrl, $secretKey;
    
    $ch = curl_init("$apiUrl/payment/deposit");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $secretKey",
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'amount' => $amount,
        'currency' => $currency,
        'depositChain' => $depositChain,
        'depositToken' => $depositToken,
        'settleAddress' => $settleAddress,
        'metadata' => $metadata
    ]));
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Verify payment
function verifyPayment($id) {
    global $apiUrl, $secretKey;
    
    $ch = curl_init("$apiUrl/payment/verify/$id");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $secretKey"
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Handle webhook
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = file_get_contents('php://input');
    $signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'];
    $webhookSecret = 'your_webhook_secret';
    
    $expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);
    
    if (!hash_equals($signature, $expectedSignature)) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid signature']);
        exit;
    }
    
    $event = json_decode($payload, true);
    
    if ($event['event'] === 'payment.completed') {
        // Handle completed payment
        error_log("Payment completed: " . $event['session_id']);
    }
    
    echo json_encode(['success' => true]);
}

?>
\`\`\`

### Next.js / React

\`\`\`typescript
// app/api/payment/create/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const response = await fetch('https://your-platform-url/api/payment/deposit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  return NextResponse.json(data);
}

// components/CheckoutButton.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CheckoutButton({ amount, currency, depositChain, depositToken, settleAddress, metadata }: any) {
  const [loading, setLoading] = useState(false);
  
  async function handleCheckout() {
    setLoading(true);
    
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, depositChain, depositToken, settleAddress, metadata }),
      });
      
      const data = await response.json();
      
      // Redirect to widget
      window.location.href = data.widget_url;
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <Button onClick={handleCheckout} disabled={loading}>
      {loading ? 'Loading...' : 'Pay with Crypto'}
    </Button>
  );
}
\`\`\`

---

## Best Practices

### Security

1. **Never expose secret keys** - Keep `sk_*` keys server-side only
2. **Verify webhook signatures** - Always validate incoming webhooks
3. **Use HTTPS** - All API calls should use HTTPS
4. **Store keys securely** - Use environment variables, not hardcoded values

### User Experience

1. **Show loading states** - Display spinners during payment creation
2. **Handle errors gracefully** - Show user-friendly error messages
3. **Provide support contact** - Make it easy for users to get help
4. **Test in test mode** - Thoroughly test before going live

### Performance

1. **Cache session data** - Store session info temporarily to reduce API calls
2. **Use webhooks** - Don't poll for status; use webhooks for real-time updates
3. **Set timeouts** - Add reasonable timeouts to API calls

### Compliance

1. **Privacy policy** - Update your privacy policy to mention crypto payments
2. **Terms of service** - Include payment terms and refund policy
3. **Customer support** - Be ready to help with payment issues

---

## Testing

### Test Mode Transactions

In test mode, payments won't actually transfer funds. Use these test addresses:

- Ethereum: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- Solana: `4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T`

### Test Card Details

No cards are needed - Web3 Paystack accepts cryptocurrency only.

---

## Support

Need help? Contact us:

- Email: support@yourplatform.com
- Discord: [Your Discord Link]
- Documentation: https://docs.yourplatform.com

---

## Changelog

### Version 1.0.0 (MVP)

- Initial release with Ethereum, Solana, Polygon, and BSC support
- Payment widget with QR codes
- Webhook notifications
- Test and live modes
