# Web3 Paystack Testing Guide

## Critical Information About Testing

**IMPORTANT:** SideShift.ai has NO sandbox or testnet environment.

This means:
- **All transactions use REAL cryptocurrency** (production API)
- **All tests use REAL blockchain networks**
- **All tests incur REAL network fees**
- **Try Widget page enforces strict safety limits: $10 maximum per transaction**

## Why Testing Limits Exist

SideShift requires every transaction to be real. To protect developers from accidentally testing with large amounts, we enforce a $10 maximum on the Try Widget page.

## Safe Testing Strategy

### Step 1: Start Small ($1-2)

**ALWAYS** begin testing with $1-2 to verify the flow works:

\`\`\`bash
# ✅ Recommended first test
curl -X POST https://your-domain.com/api/payment/initialize \
  -H "Authorization: Bearer sk_test_YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1,
    "currency": "USD",
    "metadata": {
      "order_id": "test-001"
    }
  }'
\`\`\`

### Step 2: Use Separate Test Wallet

**DO NOT** use your production wallet for testing. Configure a separate test wallet:

\`\`\`
Production Wallet: 0xPROD... (for live customer payments)
Test Wallet: 0xTEST... (for test transactions only)
\`\`\`

Configure test wallet in: Dashboard > Settings > Wallets

### Step 3: Generate API Keys

1. Go to `/dashboard/api-keys`
2. Click "Generate API Key"
3. You'll receive:
   - **Public Key** (pk_xxx): For client-side widget (future)
   - **Secret Key** (sk_xxx): For server-side API calls
4. Save both keys securely

⚠️ **All keys are production keys.** There is no test/live distinction because SideShift has no sandbox.

### Step 4: Monitor Test Transactions

All test transactions are logged with `[TEST]` prefix in:
- Dashboard > Transactions
- Explorer (filter by test mode)

### Step 5: Understand Real Costs

Example test costs for $2 payment:

| Chain | Network Fee | SideShift Fee | Total Cost |
|-------|-------------|---------------|------------|
| Ethereum | ~$0.50 | ~$0.03 | ~$0.53 |
| Solana | ~$0.01 | ~$0.03 | ~$0.04 |
| BSC | ~$0.10 | ~$0.03 | ~$0.13 |

## Test Mode Enforcement

### Server-Side Protection

The API enforces strict limits:

\`\`\`typescript
const MAX_TEST_AMOUNT = 10; // USD

if (amount > MAX_TEST_AMOUNT) {
  return {
    error: "test_limit_exceeded",
    message: "Test mode limited to $10. Use live mode for larger amounts.",
    tip: "Start with $1-2 for initial testing"
  };
}
\`\`\`

### Error Response for Exceeded Limits

\`\`\`json
{
  "error": "test_limit_exceeded",
  "message": "Test mode is limited to $10 per transaction. SideShift has no sandbox, so test transactions use real funds with real fees.",
  "details": {
    "max_test_amount": 10,
    "requested_amount": 50,
    "tip": "Start with $1-2 for initial testing, then use live mode for production"
  }
}
\`\`\`

## Complete Testing Workflow

### 1. Create Merchant Account

1. Navigate to `/auth/sign-up`
2. Create an account with your email and password
3. Login at `/auth/login`

### 2. Configure Test Wallet

1. Go to `/dashboard/settings`
2. Add a separate test wallet address
3. Select preferred settlement token (USDC, ETH, SOL, etc.)

### 3. Generate API Keys

1. Go to `/dashboard/api-keys`
2. Click "Generate API Key"
3. You'll receive:
   - **Public Key** (pk_xxx): For client-side widget (future)
   - **Secret Key** (sk_xxx): For server-side API calls
4. Save both keys securely

⚠️ **All keys are production keys.** There is no test/live distinction because SideShift has no sandbox.

### 4. Test the Payment Flow

#### Create Payment Session

\`\`\`bash
curl -X POST https://your-domain.com/api/payment/initialize \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2,
    "currency": "USD",
    "metadata": {
      "customer_email": "test@example.com",
      "order_id": "TEST-123"
    }
  }'
\`\`\`

#### Expected Response

\`\`\`json
{
  "success": true,
  "session_id": "sess_abc123...",
  "widget_url": "https://your-domain.com/p/sess_abc123...",
  "amount": 2,
  "currency": "USD",
  "expires_at": "2025-01-15T12:00:00Z",
  "warning": "All transactions use real SideShift API with real cryptocurrency. Use small amounts for testing."
}
\`\`\`

#### Test the Widget

1. Visit the `widget_url` from the response
2. Widget displays:
   - Amount to pay ($2 USD)
   - Chain selector (Ethereum, Solana, BSC, Polygon)
   - Warning about test mode using real funds
3. Select your preferred chain (e.g., Solana for low fees)
4. Deposit address generated automatically
5. Send the EXACT amount shown
6. Click "I Have Paid" to trigger status monitoring

#### Verify Payment Status

\`\`\`bash
curl https://your-domain.com/api/payment/verify/sess_abc123... \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
\`\`\`

## Testing Checklist

Before accepting customer payments, complete this checklist:

- [ ] Created wallet address for receiving funds
- [ ] Configured wallet in Settings
- [ ] Generated API keys (all keys are production keys)
- [ ] Tested with $1-2 payment successfully using Try Widget
- [ ] Verified funds settled to wallet
- [ ] Tested webhook integration (if using webhooks)
- [ ] Tested expired session scenario
- [ ] Monitored transactions in Dashboard
- [ ] Understood real network fees involved

## Key Features to Test

### API Key Management
- ✅ Generate API keys (production)
- ✅ View all active keys
- ✅ Key rotation/regeneration

### Payment Widget
- ✅ Chain selection (ETH, SOL, MATIC, BNB, etc.)
- ✅ Deposit address generation
- ✅ Real-time crypto amount display
- ✅ QR code display
- ✅ Copy to clipboard
- ✅ Session persistence (refresh-safe)
- ✅ Refund address collection
- ✅ Status monitoring

### Security Features
- ✅ Test mode limits enforced
- ✅ Refund address required
- ✅ Session expiration (15 minutes)
- ✅ Webhook signature verification
- ✅ Transaction logging with merchant name

## When to Switch to Live Mode

Switch to live mode when you've:

1. ✅ Tested full payment flow with $1-2
2. ✅ Verified settlement to correct wallet
3. ✅ Tested webhook integration (if using)
4. ✅ Confirmed transaction monitoring works
5. ✅ Tested error scenarios (expired, underpaid)
6. ✅ Added production wallet addresses
7. ✅ Ready to accept real customer payments

## Common Issues

### "test_limit_exceeded" Error

**Cause:** Trying to test with amount > $10

**Solution:** Use amounts between $1-$10 for testing. For larger amounts, switch to live mode.

### "Unauthorized" Error

**Solution:** Check that your secret key is correct and included in the Authorization header: `Authorization: Bearer YOUR_SECRET_KEY`

### Widget shows "Session Expired"

**Solution:** Sessions expire after 15 minutes. Create a new payment session.

### Deposit address not showing

**Solution:** Check browser console for errors. Ensure merchant has configured a settlement wallet in Settings.

### Payment status stuck on "awaiting_payment"

**Solution:** Ensure you sent the EXACT crypto amount displayed. Check the transaction on blockchain explorer.

## Future: True Sandbox

We've requested SideShift to add a testnet/sandbox environment. Until then, these safeguards protect you from expensive testing mistakes. Updates will be announced when available.

## Support

Questions about testing?
- **Email:** support@fogopulse.com
- **Discord:** https://discord.gg/fogopay
- **Dashboard:** Report Issue
- **Documentation:** `/dashboard/integration`

---

**Remember:** All keys are production keys. SideShift has no sandbox/testnet. The Try Widget page enforces $10 maximum to protect you during testing. Start with $1-2 tests before accepting customer payments.
