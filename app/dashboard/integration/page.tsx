"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Code2,
  Webhook,
  CheckCircle2,
  Copy,
  HelpCircle,
  Zap,
  Smartphone,
  Globe,
  Monitor,
  Wallet,
  Key,
  Settings,
  TestTube,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { DashboardNav } from "@/components/dashboard-nav"

export default function IntegrationPage() {
  const [secretKey, setSecretKey] = useState<string>("")
  const [publicKey, setPublicKey] = useState<string>("")
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [hasWallet, setHasWallet] = useState<boolean | null>(null)
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)

  useEffect(() => {
    async function loadKeys() {
      const response = await fetch("/api/keys/list")
      const data = await response.json()
      setSecretKey(data.secretKey || "")
      setPublicKey(data.publicKey || "")
      setHasApiKey(!!(data.secretKey || data.publicKey))
    }

    async function checkWallet() {
      try {
        const response = await fetch("/api/merchant/wallets")
        const data = await response.json()
        setHasWallet(data.wallets && data.wallets.length > 0)
      } catch {
        setHasWallet(false)
      }
    }

    loadKeys()
    checkWallet()
  }, [])

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashboardNav />

      <main className="flex-1 w-full overflow-x-hidden">
        <div className="container max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Integration Guide
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
              Accept crypto payments anywhere - web, mobile apps, or any platform. Simple API, powerful results.
            </p>
          </div>

          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-amber-900">
                <Zap className="h-5 w-5 text-amber-600" />
                Quick Setup Guide - Start Here
              </CardTitle>
              <CardDescription className="text-amber-800">
                Follow these steps in order to start accepting payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Step 1: Add Wallet */}
                <Link href="/dashboard/settings" className="block group">
                  <Card
                    className={`h-full transition-all hover:shadow-lg hover:-translate-y-1 ${hasWallet ? "border-green-300 bg-green-50" : "border-amber-300 bg-white"}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${hasWallet ? "bg-green-500" : "bg-amber-500"}`}
                        >
                          {hasWallet ? <CheckCircle2 className="h-4 w-4" /> : "1"}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Wallet className="h-4 w-4" /> Add Wallet
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {hasWallet ? "Wallet configured!" : "Add your settlement wallet first"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Step 2: Get API Key */}
                <Link href="/dashboard/api-keys" className="block group">
                  <Card
                    className={`h-full transition-all hover:shadow-lg hover:-translate-y-1 ${hasApiKey ? "border-green-300 bg-green-50" : hasWallet === false ? "border-gray-200 bg-gray-50 opacity-60" : "border-blue-300 bg-white"}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${hasApiKey ? "bg-green-500" : "bg-blue-500"}`}
                        >
                          {hasApiKey ? <CheckCircle2 className="h-4 w-4" /> : "2"}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Key className="h-4 w-4" /> Get API Keys
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {hasApiKey ? "Keys generated!" : "Generate your API keys"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Step 3: Configure Webhook */}
                <Link href="/dashboard/settings" className="block group">
                  <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 border-purple-200 bg-white">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold">
                          3
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Settings className="h-4 w-4" /> Setup Webhook
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">Configure webhook URL</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Step 4: Test */}
                <Link href="/dashboard/try-widget" className="block group">
                  <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 border-emerald-200 bg-white">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                          4
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <TestTube className="h-4 w-4" /> Test Widget
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">Try a test payment</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Platform Support */}
          <Alert className="bg-emerald-50 border-emerald-200">
            <Globe className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-900">
              <strong>Works Everywhere:</strong> Our payment widget works on any platform that can open a URL -
              websites, mobile apps (iOS/Android), desktop apps, or any system with web capabilities.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-2 border-blue-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Monitor className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm">Web Apps</h4>
                  <p className="text-xs text-muted-foreground">Direct redirect or iframe</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-green-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm">Mobile Apps</h4>
                  <p className="text-xs text-muted-foreground">WebView or in-app browser</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-purple-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                  <Code2 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm">Any Backend</h4>
                  <p className="text-xs text-muted-foreground">REST API integration</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Integration Steps */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Code2 className="h-5 w-5 text-primary" />
                API Integration - 3 Simple Steps
              </CardTitle>
              <CardDescription>Copy-paste code to start accepting payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                {/* Step 1 */}
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm sm:text-base">
                    1
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">Use Your API Keys</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Get your keys from{" "}
                        <Link href="/dashboard/api-keys" className="text-primary underline font-medium">
                          API Keys page
                        </Link>{" "}
                        (requires wallet setup first)
                      </p>
                    </div>

                    {publicKey && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Your Public Key:</p>
                        <div className="flex items-center gap-2 p-2 sm:p-3 bg-slate-900 text-white rounded-lg">
                          <code className="flex-1 text-[10px] sm:text-xs overflow-x-auto font-mono break-all">
                            {publicKey}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white hover:bg-white/10 h-7 w-7 p-0 shrink-0"
                            onClick={() => copyToClipboard(publicKey, "public")}
                          >
                            {copiedField === "public" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {secretKey && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Your Secret Key (server-side only):</p>
                        <div className="flex items-center gap-2 p-2 sm:p-3 bg-slate-900 text-white rounded-lg">
                          <code className="flex-1 text-[10px] sm:text-xs overflow-x-auto font-mono break-all">
                            {secretKey}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white hover:bg-white/10 h-7 w-7 p-0 shrink-0"
                            onClick={() => copyToClipboard(secretKey, "secret")}
                          >
                            {copiedField === "secret" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {!publicKey && !secretKey && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertDescription className="text-amber-900 text-xs sm:text-sm">
                          <strong>No API keys yet.</strong>{" "}
                          <Link href="/dashboard/settings" className="underline">
                            Add a wallet first
                          </Link>
                          , then{" "}
                          <Link href="/dashboard/api-keys" className="underline">
                            generate your API keys
                          </Link>
                          .
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm sm:text-base">
                    2
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">Create Payment Session</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">Call our API from your backend</p>
                    </div>
                    <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-lg overflow-x-auto">
                      <pre className="text-[10px] sm:text-xs font-mono whitespace-pre-wrap break-words sm:whitespace-pre">{`const response = await fetch(
  'https://your-domain.com/api/payment/initialize',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SECRET_KEY
    },
    body: JSON.stringify({
      amount: 50.00,
      currency: 'USD'
    })
  }
);

const { widget_url } = await response.json();`}</pre>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm sm:text-base">
                    3
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">Redirect Customer to Payment</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Open the payment widget URL on any platform
                      </p>
                    </div>
                    <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-lg overflow-x-auto">
                      <pre className="text-[10px] sm:text-xs font-mono whitespace-pre-wrap break-words sm:whitespace-pre">{`// Web: Redirect browser
window.location.href = widget_url;

// Mobile (React Native): Open WebView
<WebView source={{ uri: widget_url }} />

// Mobile (Native): Open in-app browser
openUrl(widget_url);`}</pre>
                    </div>
                  </div>
                </div>
              </div>

              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900 text-xs sm:text-sm">
                  <strong>That's it!</strong> We handle the payment page, QR codes, blockchain confirmations, and send
                  webhooks to your server when payment completes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Webhook Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Webhook className="h-5 w-5" />
                Webhooks - Get Payment Notifications
              </CardTitle>
              <CardDescription>
                Receive real-time updates when payments complete. Configure in{" "}
                <Link href="/dashboard/settings" className="text-primary underline">
                  Settings → Webhooks
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">How to Setup:</h4>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                  <li>
                    Go to{" "}
                    <Link href="/dashboard/settings" className="text-primary underline">
                      Settings
                    </Link>{" "}
                    and click the <strong>Webhooks</strong> tab
                  </li>
                  <li>Enter your webhook URL (e.g., https://yoursite.com/api/webhook)</li>
                  <li>Copy the webhook secret for signature verification</li>
                  <li>Save your settings</li>
                </ol>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Webhook Payload Example:</h4>
                <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-lg overflow-x-auto">
                  <pre className="text-[10px] sm:text-xs font-mono whitespace-pre-wrap break-words sm:whitespace-pre">{`{
  "event": "payment.completed",
  "session_id": "sess_abc123",
  "status": "completed",
  "amount": "100.00",
  "currency": "USD",
  "settled_amount": "100.00",
  "settled_currency": "USDC",
  "deposit_tx_hash": "0x742d35...",
  "settle_tx_hash": "0x8f3e21...",
  "timestamp": "2024-11-17T10:30:00Z"
}`}</pre>
                </div>
                <p className="text-xs text-muted-foreground">
                  Events: payment.pending, payment.confirming, payment.completed, payment.failed, payment.expired
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Verify Webhook Signature:</h4>
                <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-lg overflow-x-auto">
                  <pre className="text-[10px] sm:text-xs font-mono whitespace-pre-wrap break-words sm:whitespace-pre">{`// Verify the X-Webhook-Signature header
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return signature === expected;
}`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Code Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Code2 className="h-5 w-5" />
                Full Code Examples
              </CardTitle>
              <CardDescription>Copy-paste examples for popular platforms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Next.js / React */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-slate-900 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">N</span>
                  </div>
                  Next.js / React
                </h3>
                <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-lg overflow-x-auto">
                  <pre className="text-[10px] sm:text-xs font-mono whitespace-pre-wrap break-words sm:whitespace-pre">{`// app/api/create-payment/route.ts
export async function POST(request: Request) {
  const { amount, currency } = await request.json();
  
  const response = await fetch(
    'https://your-domain.com/api/payment/initialize',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.SECRET_KEY}\`
      },
      body: JSON.stringify({ amount, currency })
    }
  );
  
  return Response.json(await response.json());
}

// components/PayButton.tsx
'use client';
export function PayButton({ amount }: { amount: number }) {
  const handlePay = async () => {
    const res = await fetch('/api/create-payment', {
      method: 'POST',
      body: JSON.stringify({ amount, currency: 'USD' })
    });
    const { widget_url } = await res.json();
    window.location.href = widget_url;
  };
  
  return (
    <button onClick={handlePay}>
      Pay with Crypto
    </button>
  );
}`}</pre>
                </div>
              </div>

              {/* React Native / Mobile */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-cyan-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">RN</span>
                  </div>
                  React Native / Mobile Apps
                </h3>
                <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-lg overflow-x-auto">
                  <pre className="text-[10px] sm:text-xs font-mono whitespace-pre-wrap break-words sm:whitespace-pre">{`import { WebView } from 'react-native-webview';
import { Linking } from 'react-native';

// Option 1: Use WebView (recommended)
function PaymentScreen({ widgetUrl }) {
  return (
    <WebView 
      source={{ uri: widgetUrl }}
      onNavigationStateChange={(state) => {
        if (state.url.includes('success')) {
          navigation.navigate('Success');
        }
      }}
    />
  );
}

// Option 2: Open in external browser
async function openPayment(widgetUrl) {
  await Linking.openURL(widgetUrl);
}`}</pre>
                </div>
              </div>

              {/* Python */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-yellow-500 flex items-center justify-center shrink-0">
                    <span className="text-slate-900 text-xs font-bold">Py</span>
                  </div>
                  Python (Flask / Django)
                </h3>
                <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-lg overflow-x-auto">
                  <pre className="text-[10px] sm:text-xs font-mono whitespace-pre-wrap break-words sm:whitespace-pre">{`import requests
import os

def create_payment(amount, currency='USD'):
    response = requests.post(
        'https://your-domain.com/api/payment/initialize',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {os.getenv("SECRET_KEY")}'
        },
        json={'amount': amount, 'currency': currency}
    )
    return response.json()

# Usage
payment = create_payment(100.00)
return redirect(payment['widget_url'])`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <HelpCircle className="h-5 w-5" />
                Common Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-3 sm:p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-semibold text-sm">Why do I need to add a wallet first?</h4>
                  <p className="text-xs text-muted-foreground">
                    Your wallet is where all payments are settled. We need it before generating API keys so payments
                    have somewhere to go. Go to{" "}
                    <Link href="/dashboard/settings" className="text-primary underline">
                      Settings → Wallets
                    </Link>
                    .
                  </p>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-semibold text-sm">How do I test payments?</h4>
                  <p className="text-xs text-muted-foreground">
                    Use the{" "}
                    <Link href="/dashboard/try-widget" className="text-primary underline">
                      Test Widget
                    </Link>{" "}
                    page to simulate a payment flow and see how the widget works before integrating.
                  </p>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-semibold text-sm">Does it work on mobile apps?</h4>
                  <p className="text-xs text-muted-foreground">
                    Yes! Use WebView (React Native, Flutter, native iOS/Android) or open the widget URL in an in-app
                    browser. Works on any platform.
                  </p>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-semibold text-sm">How do webhooks work?</h4>
                  <p className="text-xs text-muted-foreground">
                    Configure your webhook URL in{" "}
                    <Link href="/dashboard/settings" className="text-primary underline">
                      Settings
                    </Link>
                    . We POST payment status updates to your server with signature verification.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
