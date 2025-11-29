# Web3 Paystack - Merchant Debugging Guide

Complete guide to troubleshooting common integration issues and debugging payment flows.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues & Solutions](#common-issues--solutions)
- [API Error Codes](#api-error-codes)
- [Payment Status Flow](#payment-status-flow)
- [Debugging Tools](#debugging-tools)
- [Server Logs](#server-logs)
- [Testing Checklist](#testing-checklist)
- [Support](#support)

---

## Quick Diagnostics

### Is Your Integration Working?

Run this quick test to verify your setup:

\`\`\`bash
# 1. Test API Key
curl https://your-platform-url/api/chains/supported \
  -H "Authorization: Bearer YOUR_SECRET_KEY"

# Expected: 200 OK with list of chains

# 2. Create Test Payment
curl -X POST https://your-platform-url/api/payment/initialize \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1, "currency": "USD"}'

# Expected: 200 OK with session_id and widget_url

# 3. Verify Payment
curl https://your-platform-url/api/payment/verify/SESSION_ID \
  -H "Authorization: Bearer YOUR_SECRET_KEY"

# Expected: 200 OK with payment details
\`\`\`

---

## Common Issues & Solutions

### 1. "Invalid API Key" (401 Error)

**Symptoms:**
\`\`\`json
{
  "error": "Invalid API key"
}
\`\`\`

**Possible Causes:**

#### A. Missing Authorization Header
\`\`\`javascript
// ❌ Wrong
fetch('/api/payment/initialize', {
  method: 'POST',
  body: JSON.stringify({ amount: 100 })
})

// ✅ Correct
fetch('/api/payment/initialize', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_SECRET_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ amount: 100 })
})
\`\`\`

#### B. Using Public Key Instead of Secret Key
\`\`\`javascript
// ❌ Wrong - Using public key for server-side call
const apiKey = 'pk_live_abc123...';

// ✅ Correct - Use secret key
const apiKey = 'sk_live_abc123...';
\`\`\`

#### C. Key Not Found in Database
**Solution:** 
1. Go to Dashboard → API Keys
2. Check if your key exists and is not revoked
3. If missing, generate a new key
4. Update your environment variables

#### D. Extra Whitespace in Key
\`\`\`javascript
// ❌ Wrong - Extra spaces
const apiKey = ' sk_live_abc123... ';

// ✅ Correct - Trim whitespace
const apiKey = process.env.SECRET_KEY.trim();
\`\`\`

**Debug Steps:**
1. Check server logs for `[v0] Validating API key:` messages
2. Verify key format starts with `sk_live` or `sk_test`
3. Use Debug Tool at `/dashboard/debug/api-key` to test your key
4. Regenerate key if necessary

---

### 2. "Payment Session Not Found" (404 Error)

**Symptoms:**
\`\`\`json
{
  "error": "Payment session not found"
}
\`\`\`

**Possible Causes:**

#### A. Wrong Session ID
\`\`\`javascript
// Check that session_id matches exactly
const sessionId = 'sess_abc123...'; // Must match database
\`\`\`

#### B. Session Belongs to Different Merchant
\`\`\`javascript
// Each merchant can only access their own sessions
// Verify you're using the correct API key for this merchant
\`\`\`

#### C. Session Expired
Sessions expire after 10 minutes. Check `expires_at` field.

**Debug Steps:**
1. Log the session_id you're trying to verify
2. Check Dashboard → Transactions for this session
3. Verify the session was created with the same API key
4. Check expiration time

---

### 3. Widget Not Loading

**Symptoms:**
- Blank page at `/p/SESSION_ID`
- "Session Expired" message
- Infinite loading spinner

**Possible Causes:**

#### A. Session Expired
\`\`\`javascript
// Check expires_at timestamp
const expiresAt = new Date(session.expires_at);
const now = new Date();

if (expiresAt < now) {
  console.log('Session expired, create new one');
}
\`\`\`

#### B. Invalid Session ID in URL
\`\`\`javascript
// ❌ Wrong - Malformed URL
window.location.href = `/p/${undefined}`;

// ✅ Correct - Valid session ID
window.location.href = `/p/${data.session_id}`;
\`\`\`

#### C. CORS Issues (if embedding in iframe)
\`\`\`html
<!-- Add proper CORS headers if embedding -->
<iframe 
  src="https://your-platform-url/p/sess_abc123..."
  sandbox="allow-same-origin allow-scripts allow-forms"
></iframe>
\`\`\`

**Debug Steps:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify session_id in URL is correct
4. Check Network tab for failed requests
5. Look for `[v0]` debug logs in console

---

### 4. Payment Status Stuck on "pending"

**Symptoms:**
- Payment created successfully
- Widget loads but shows "pending" forever
- No deposit address generated

**Possible Causes:**

#### A. Customer Hasn't Selected Chain Yet
**Solution:** Customer must select which crypto they want to pay with (ETH, SOL, BNB, etc.)

#### B. Missing Settlement Wallet
**Solution:**
1. Go to Dashboard → Settings
2. Add your wallet address for receiving funds
3. Save settings
4. Try creating payment again

#### C. SideShift API Error
**Solution:** Check server logs for SideShift errors. May need to retry.

**Debug Steps:**
1. Check payment status: `GET /api/payment/verify/:id`
2. Look for `shift_id` in response - if missing, shift wasn't created
3. Check server logs for `[v0] SideShift` messages
4. Verify settlement wallet is configured

---

### 5. Payment Status Stuck on "awaiting_payment"

**Symptoms:**
- Deposit address generated
- Customer sent crypto
- Status still shows "awaiting_payment"

**Possible Causes:**

#### A. Wrong Amount Sent
\`\`\`javascript
// Customer must send EXACT amount shown
// Check blockchain explorer to verify amount sent
\`\`\`

#### B. Wrong Chain/Network
\`\`\`javascript
// Customer sent to wrong network
// Example: Sent ETH on BSC instead of Ethereum mainnet
\`\`\`

#### C. Insufficient Blockchain Confirmations
\`\`\`javascript
// Payment detected but waiting for confirmations
// ETH: ~12 confirmations (~3 minutes)
// SOL: ~32 confirmations (~15 seconds)
// BTC: ~3 confirmations (~30 minutes)
\`\`\`

#### D. SideShift Processing Delay
Normal processing time: 2-10 minutes depending on chain

**Debug Steps:**
1. Get deposit address from session
2. Check blockchain explorer for transaction
3. Verify amount matches exactly
4. Check confirmation count
5. Wait 5-10 minutes for processing
6. Check SideShift status: `GET /api/widget/status/:sessionId`

---

### 6. Webhook Not Receiving Events

**Symptoms:**
- Payments completing successfully
- Webhook endpoint never called
- No webhook logs

**Possible Causes:**

#### A. Webhook URL Not Configured
**Solution:**
1. Go to Dashboard → Settings → Webhooks
2. Add your webhook URL
3. Save settings

#### B. Webhook URL Not Accessible
\`\`\`bash
# Test your webhook endpoint
curl -X POST https://yoursite.com/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return 200 OK
\`\`\`

#### C. Firewall Blocking Requests
**Solution:** Whitelist Web3 Paystack IP addresses

#### D. Not Verifying Signature
\`\`\`javascript
// ❌ Wrong - Rejecting valid webhooks
if (!signature) {
  return res.status(401).send('Unauthorized');
}

// ✅ Correct - Verify signature properly
const crypto = require('crypto');
const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature !== expectedSignature) {
  return res.status(401).send('Invalid signature');
}
\`\`\`

**Debug Steps:**
1. Check webhook URL is publicly accessible
2. Test with curl or Postman
3. Check server logs for incoming webhook requests
4. Verify signature validation logic
5. Check webhook secret matches dashboard

---

### 7. "Insufficient Amount" Error

**Symptoms:**
\`\`\`json
{
  "error": "Insufficient amount",
  "message": "Amount too low to cover fees"
}
\`\`\`

**Cause:** Payment amount is too small to cover network fees and platform fees.

**Solution:**
\`\`\`javascript
// Minimum amounts by chain:
const minimums = {
  ethereum: 5,   // $5 USD minimum
  solana: 1,     // $1 USD minimum
  bsc: 2,        // $2 USD minimum
  polygon: 2,    // $2 USD minimum
  bitcoin: 10    // $10 USD minimum
};

// Always check minimum before creating payment
if (amount < minimums[selectedChain]) {
  alert(`Minimum payment: $${minimums[selectedChain]}`);
}
\`\`\`

---

### 8. CORS Errors in Browser

**Symptoms:**
\`\`\`
Access to fetch at 'https://api.yourplatform.com' from origin 'https://yoursite.com' 
has been blocked by CORS policy
\`\`\`

**Solution:**

#### For API Calls from Your Frontend
\`\`\`javascript
// ❌ Wrong - Calling API directly from frontend with secret key
fetch('https://api.yourplatform.com/payment/initialize', {
  headers: {
    'Authorization': 'Bearer sk_live_...' // NEVER expose secret key!
  }
})

// ✅ Correct - Call your own backend, which calls our API
fetch('https://yoursite.com/api/create-payment', {
  method: 'POST',
  body: JSON.stringify({ amount: 100 })
})
\`\`\`

#### For Widget Embedding
\`\`\`html
<!-- Widget is designed to be redirected to, not embedded -->
<!-- ✅ Recommended: Redirect -->
<script>
  window.location.href = widgetUrl;
</script>

<!-- ⚠️ If you must embed, use proper sandbox -->
<iframe 
  src="https://api.yourplatform.com/p/sess_..."
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
></iframe>
\`\`\`

---

## API Error Codes

| Code | Error | Meaning | Solution |
|------|-------|---------|----------|
| 400 | Bad Request | Invalid request body | Check required fields |
| 401 | Unauthorized | Invalid/missing API key | Verify Authorization header |
| 404 | Not Found | Session doesn't exist | Check session_id |
| 422 | Validation Error | Invalid data format | Check field types/values |
| 429 | Rate Limited | Too many requests | Slow down, implement backoff |
| 500 | Server Error | Internal error | Retry with exponential backoff |
| 503 | Service Unavailable | SideShift API down | Retry after 30 seconds |

---

## Payment Status Flow

Understanding the payment lifecycle:

\`\`\`
1. pending
   ↓ (Customer selects chain)
2. awaiting_payment
   ↓ (Customer sends crypto)
3. paid
   ↓ (Blockchain confirmations)
4. processing
   ↓ (SideShift swap + settlement)
5. completed ✅

   OR

5. failed ❌
\`\`\`

### Status Descriptions

| Status | Description | Next Step |
|--------|-------------|-----------|
| `pending` | Session created, waiting for chain selection | Customer selects crypto |
| `awaiting_payment` | Deposit address generated | Customer sends payment |
| `paid` | Payment detected on-chain | Wait for confirmations |
| `processing` | Swapping and settling | Wait for completion |
| `completed` | Payment successful | Deliver goods/services |
| `failed` | Payment failed | Contact support |
| `expired` | Session expired (10 min) | Create new session |

---

## Debugging Tools

### 1. API Key Debug Tool

Visit `/dashboard/debug/api-key` to test your API keys:

\`\`\`
Input: sk_live_abc123...
Output:
✅ Valid
✅ Merchant: merchant_xyz
✅ Not revoked
✅ Created: 2025-01-15
\`\`\`

### 2. Server Logs

All operations log with `[v0]` prefix. Search your logs:

\`\`\`bash
# Find API key validation
grep "\[v0\] Validating API key" logs.txt

# Find payment creation
grep "\[v0\] Creating payment" logs.txt

# Find SideShift errors
grep "\[v0\] SideShift" logs.txt
\`\`\`

### 3. Browser Console

Open DevTools (F12) and look for `[v0]` logs:

\`\`\`javascript
// Widget logs
[v0] Starting payment with amount: 100
[v0] Secret Key exists: true
[v0] Payment response: {...}

// Error logs
[v0] Failed to create payment: Invalid API key
\`\`\`

### 4. Network Tab

Check API requests in browser DevTools → Network:

1. Find request to `/api/payment/initialize`
2. Check Request Headers for Authorization
3. Check Response for errors
4. Verify status code (200 = success)

---

## Server Logs

### Key Log Messages

#### Successful Payment Creation
\`\`\`
[v0] Starting payment with amount: 100
[v0] Secret Key exists: true
[v0] Secret Key prefix: sk_live
[v0] Payment request: {"amount":100,...}
[v0] API Response status: 200
[v0] API Response data: {"success":true,"session_id":"sess_..."}
[v0] Payment response: {"success":true,...}
\`\`\`

#### API Key Validation
\`\`\`
[v0] Validating API key: sk_live_abc123...
[v0] API key validated successfully for merchant: merchant_xyz
\`\`\`

#### SideShift Integration
\`\`\`
[v0] Creating SideShift shift: {...}
[v0] SideShift shift created: shift_xyz
[v0] Deposit address: 0x123...
[v0] SideShift status: settled
\`\`\`

#### Errors to Watch For
\`\`\`
[v0] Invalid key format - must start with sk_
[v0] Attempted to validate key: sk_live_... (not found in database)
[v0] SideShift API failed: 500 Internal Server Error
[v0] Failed to create payment: Missing settlement wallet
\`\`\`

---

## Testing Checklist

Before going live, verify:

### API Integration
- [ ] API keys generated and saved securely
- [ ] Authorization header included in all requests
- [ ] Error handling implemented for all API calls
- [ ] Retry logic for 500/503 errors
- [ ] Timeout handling (30 second timeout recommended)

### Payment Flow
- [ ] Test payment with $1-2 successfully completed
- [ ] Funds received in settlement wallet
- [ ] Payment status updates correctly
- [ ] Expired session handled gracefully
- [ ] Failed payment handled gracefully

### Widget Integration
- [ ] Widget loads correctly
- [ ] Chain selection works
- [ ] Deposit address generates
- [ ] QR code displays
- [ ] Copy to clipboard works
- [ ] Status updates in real-time
- [ ] Expiration timer works
- [ ] Mobile responsive

### Webhooks (if using)
- [ ] Webhook URL configured
- [ ] Webhook endpoint accessible
- [ ] Signature verification implemented
- [ ] All event types handled
- [ ] Idempotency implemented (handle duplicate webhooks)
- [ ] Error responses logged

### Security
- [ ] Secret keys stored in environment variables
- [ ] Secret keys never exposed to frontend
- [ ] HTTPS used for all API calls
- [ ] Webhook signatures verified
- [ ] Rate limiting implemented on your endpoints

### User Experience
- [ ] Loading states shown during API calls
- [ ] Error messages user-friendly
- [ ] Success confirmation displayed
- [ ] Support contact information provided
- [ ] Mobile-friendly design

---

## Support

### Self-Service Resources

1. **Documentation**: `/dashboard/docs`
2. **Integration Guide**: `MERCHANT_INTEGRATION.md`
3. **Testing Guide**: `TESTING_GUIDE.md`
4. **API Reference**: `/dashboard/api`
5. **Try Widget**: `/dashboard/try-widget`

### Debug Tools

1. **API Key Tester**: `/dashboard/debug/api-key`
2. **Transaction Explorer**: `/dashboard/transactions`
3. **Server Logs**: Check your application logs for `[v0]` messages
4. **Browser Console**: Check for `[v0]` debug logs

### Common Debug Commands

\`\`\`bash
# Test API connectivity
curl https://your-platform-url/api/chains/supported

# Test API key
curl https://your-platform-url/api/chains/supported \
  -H "Authorization: Bearer YOUR_SECRET_KEY"

# Create test payment
curl -X POST https://your-platform-url/api/payment/initialize \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1, "currency": "USD"}'

# Verify payment
curl https://your-platform-url/api/payment/verify/SESSION_ID \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
\`\`\`

### Contact Support

If you're still stuck after trying the above:

- **Email**: support@fogopulse.com
- **Discord**: https://discord.gg/fogopay
- **Dashboard**: Report Issue button
- **Response Time**: Within 24 hours

**When contacting support, include:**
1. Session ID or transaction ID
2. Error message (exact text)
3. Server logs (with `[v0]` messages)
4. Steps to reproduce
5. Expected vs actual behavior

---

## Appendix: Debug Checklist

Print this and check off as you debug:

\`\`\`
□ API key starts with sk_live or sk_test
□ API key exists in Dashboard → API Keys
□ API key not revoked
□ Authorization header included: "Bearer YOUR_KEY"
□ Content-Type header: "application/json"
□ Request body is valid JSON
□ Amount is number, not string
□ Settlement wallet configured in Settings
□ Webhook URL is publicly accessible (if using webhooks)
□ Server logs show [v0] messages
□ Browser console shows [v0] messages
□ Network tab shows 200 OK responses
□ Session ID matches exactly
□ Session not expired (check expires_at)
□ Customer sent exact amount shown
□ Customer sent to correct chain/network
□ Waited 5-10 minutes for processing
□ Checked blockchain explorer for transaction
□ Verified transaction has enough confirmations
\`\`\`

---

**Remember:** Most issues are related to API key configuration or missing settlement wallets. Always check these first!
