import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createClient } from "@/lib/supabase/server";
import { redirect } from 'next/navigation';

export default async function APIPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          API Reference
        </h1>
        <p className="text-lg text-muted-foreground">
          Complete API documentation with security best practices
        </p>
      </div>

      {/* Security Notice */}
      <Alert className="border-2 border-red-200 bg-red-50">
        <Shield className="h-5 w-5 text-red-600" />
        <AlertDescription className="text-red-900">
          <strong>Security Warning:</strong> Never expose your secret keys in client-side code. 
          Always make API calls from your backend server.
        </AlertDescription>
      </Alert>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Authentication
          </CardTitle>
          <CardDescription>How to authenticate your API requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold">API Keys</h3>
            <p className="text-sm text-muted-foreground">
              All API requests must include your secret key in the Authorization header:
            </p>
            <div className="bg-black text-white p-4 rounded-lg font-mono text-xs overflow-x-auto">
              <pre>{`Authorization: Bearer sk_test_your_secret_key_here`}</pre>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50">Test Mode</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded text-xs">sk_test_...</code> - For development and testing
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                <li>• Payments auto-complete after 15s</li>
                <li>• No real cryptocurrency required</li>
                <li>• Safe for development</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50">Live Mode</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded text-xs">sk_live_...</code> - For production
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                <li>• Real blockchain transactions</li>
                <li>• Actual cryptocurrency transfers</li>
                <li>• Production environment</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>Available endpoints and their usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Initialize Payment */}
          <div className="space-y-3 border-b pb-6">
            <div className="flex items-center gap-3">
              <Badge className="bg-green-600">POST</Badge>
              <code className="text-sm">/api/payment/initialize</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Create a new payment session
            </p>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Request Body:</p>
              <div className="bg-black text-white p-4 rounded-lg font-mono text-xs overflow-x-auto">
                <pre>{`{
  "amount": 100.00,        // Required: Amount in USD
  "currency": "USD",       // Required: Currency code
  "metadata": {            // Optional: Custom data
    "order_id": "12345",
    "customer_email": "user@example.com"
  }
}`}</pre>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Response:</p>
              <div className="bg-black text-white p-4 rounded-lg font-mono text-xs overflow-x-auto">
                <pre>{`{
  "success": true,
  "session_id": "sess_abc123...",
  "widget_url": "https://pay.fogopulse.com/p/sess_abc123...",
  "amount": 100.00,
  "currency": "USD",
  "expires_at": "2025-01-18T..."
}`}</pre>
              </div>
            </div>
          </div>

          {/* Check Payment Status */}
          <div className="space-y-3 border-b pb-6">
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-600">GET</Badge>
              <code className="text-sm">/api/widget/status/:sessionId</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Check the status of a payment session
            </p>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Response:</p>
              <div className="bg-black text-white p-4 rounded-lg font-mono text-xs overflow-x-auto">
                <pre>{`{
  "session_id": "sess_abc123...",
  "status": "completed",           // pending, awaiting_payment, completed, etc.
  "amount": 100.00,
  "currency": "USD",
  "deposit_address": "0x...",     // Crypto address for payment
  "deposit_chain": "ethereum",     // Selected blockchain
  "transaction": {
    "deposit_tx_hash": "0x...",
    "settle_tx_hash": "0x...",
    "status": "settled"
  }
}`}</pre>
              </div>
            </div>
          </div>

          {/* Webhook Events */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge className="bg-purple-600">POST</Badge>
              <code className="text-sm">Your Webhook URL</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Receive real-time payment notifications (configured in Settings)
            </p>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Webhook Payload:</p>
              <div className="bg-black text-white p-4 rounded-lg font-mono text-xs overflow-x-auto">
                <pre>{`{
  "event": "payment.completed",
  "session_id": "sess_abc123...",
  "status": "completed",
  "amount": "100.00",
  "currency": "USD",
  "settled_amount": "98.00",      // After fees
  "settled_currency": "USDC",     // Your preferred token
  "deposit_tx_hash": "0x...",
  "settle_tx_hash": "0x...",
  "timestamp": "2025-01-17T..."
}`}</pre>
              </div>
            </div>

            <Alert className="bg-yellow-50 border-yellow-200">
              <Lock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-900 text-sm">
                <strong>Always verify webhook signatures</strong> using HMAC-SHA256 with your webhook secret to prevent spoofing attacks.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Error Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Error Codes</CardTitle>
          <CardDescription>HTTP status codes and error responses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { code: "200", desc: "Success", color: "text-green-600" },
              { code: "400", desc: "Bad Request - Invalid parameters", color: "text-orange-600" },
              { code: "401", desc: "Unauthorized - Invalid API key", color: "text-red-600" },
              { code: "404", desc: "Not Found - Session doesn't exist", color: "text-gray-600" },
              { code: "410", desc: "Gone - Session expired", color: "text-gray-600" },
              { code: "422", desc: "Unprocessable - Underpayment detected", color: "text-orange-600" },
              { code: "500", desc: "Server Error - Contact support", color: "text-red-600" },
            ].map(({ code, desc, color }) => (
              <div key={code} className="flex items-start gap-3 text-sm">
                <code className={`font-bold ${color}`}>{code}</code>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Rate Limits & Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Rate Limits
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 60 requests per minute per IP</li>
                <li>• Burst limit: 120 requests</li>
                <li>• Webhook retries: 3 attempts</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                Security Best Practices
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Never expose secret keys publicly</li>
                <li>• Always verify webhook signatures</li>
                <li>• Use HTTPS for all requests</li>
                <li>• Rotate keys if compromised</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
