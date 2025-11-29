"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Copy, Check, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import PaymentWidget from "@/components/payment-widget";

interface TestWidgetClientProps {
  secretKey?: string;
  publicKey?: string;
  merchantWallet?: string; // Settlement address
}

export function TestWidgetClient({ secretKey, publicKey, merchantWallet }: TestWidgetClientProps) {
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("USD");
  const [selectedChain, setSelectedChain] = useState("");
  const [supportedChains, setSupportedChains] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChains, setLoadingChains] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string>("");
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [settleAddress, setSettleAddress] = useState(merchantWallet || "");
  const { toast } = useToast();

  useEffect(() => {
    async function fetchChains() {
      try {
        const response = await fetch("/api/chains/supported");
        const data = await response.json();
        if (data.success && data.chains) {
          setSupportedChains(data.chains);
          if (data.chains.length > 0) {
            setSelectedChain(data.chains[0].id);
          }
        }
      } catch (error) {
        console.error("[v0] Failed to fetch chains:", error);
        toast({
          title: "Error",
          description: "Failed to load supported chains",
          variant: "destructive",
        });
      } finally {
        setLoadingChains(false);
      }
    }
    fetchChains();
  }, []);

  async function createPayment() {
    if (!secretKey) {
      toast({
        title: "No API Key",
        description: "Please generate API keys first at /dashboard/api-keys",
        variant: "destructive",
      });
      return;
    }

    if (!settleAddress) {
      toast({
        title: "No Settlement Address",
        description: "Please add a wallet address in Dashboard → Settings",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const [token, chain] = selectedChain.split("/");
      
      const response = await fetch("/api/payment/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${secretKey}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency,
          depositChain: chain,
          depositToken: token,
          settleAddress: settleAddress,
          metadata: {
            test: true,
            created_from: "test_widget",
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionData({
          sessionId: data.session_id,
          amount: parseFloat(amount),
          currency,
          depositChain: `${token}/${chain}`,
          depositAddress: data.deposit_address,
          status: "awaiting_payment",
          merchantName: "Your Business",
          merchantEmail: "support@yourbusiness.com"
        });
        
        toast({
          title: "Payment Session Created!",
          description: "Widget is now live below with real deposit address!",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create payment session",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[v0] Payment creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create payment session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopiedKey(""), 2000);
  }

  const integrationCode = secretKey ? `// Step 1: Get supported chains
const chainsResponse = await fetch('https://yourdomain.com/api/chains/supported');
const { chains } = await chainsResponse.json();
// chains = [{ id: "eth/mainnet", coin: "ETH", network: "mainnet", name: "Ethereum" }, ...]

// Step 2: Create payment session (server-side)
const response = await fetch('https://yourdomain.com/api/payment/deposit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${secretKey}'
  },
  body: JSON.stringify({
    amount: ${amount},
    currency: '${currency}',
    depositChain: 'mainnet', // Selected by user
    depositToken: '${selectedChain.split("/")[0]}', // Selected by user
    settleAddress: 'YOUR_WALLET_ADDRESS', // Where you receive funds
    metadata: { order_id: '12345' }
  })
});

const { session_id, widget_url, deposit_address, shift_id } = await response.json();

// Step 3: Redirect user to widget_url
window.location.href = widget_url;` : "";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Configuration</CardTitle>
          <CardDescription>
            Configure and create a test payment session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!secretKey && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No API keys found. Please{" "}
                <a href="/dashboard/api-keys" className="underline font-medium">
                  generate API keys
                </a>{" "}
                first.
              </AlertDescription>
            </Alert>
          )}

          {!settleAddress && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Add a wallet address in Settings to receive funds
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="settleAddress">Settlement Wallet Address</Label>
            <Input
              id="settleAddress"
              value={settleAddress}
              onChange={(e) => setSettleAddress(e.target.value)}
              placeholder="0x... or wallet address"
            />
            <p className="text-xs text-muted-foreground">
              Where you'll receive the funds (USDC by default)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chain">Deposit Chain (Customer Pays With)</Label>
            {loadingChains ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading chains from SideShift...
              </div>
            ) : (
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedChains.map((chain) => (
                    <SelectItem key={chain.id} value={chain.id}>
                      {chain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Chains are loaded dynamically from SideShift API
            </p>
          </div>

          <Button
            onClick={createPayment}
            disabled={loading || !secretKey || !settleAddress || loadingChains}
            className="w-full"
            size="lg"
          >
            {loading ? "Creating..." : "Create Payment Session"}
          </Button>
        </CardContent>
      </Card>

      {/* Results Card */}
      <div className="space-y-6">
        {/* API Keys Display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your API Keys</CardTitle>
            <CardDescription>Production keys for integration (safe $10 testing limit)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {secretKey ? (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Secret Key</Label>
                    <Badge variant="secondary" className="text-xs">Production</Badge>
                  </div>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted rounded px-3 py-2 text-xs font-mono break-all">
                      {secretKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(secretKey, "Secret Key")}
                    >
                      {copiedKey === "Secret Key" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {publicKey && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Public Key</Label>
                      <Badge variant="secondary" className="text-xs">Production</Badge>
                    </div>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-muted rounded px-3 py-2 text-xs font-mono break-all">
                        {publicKey}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(publicKey, "Public Key")}
                      >
                        {copiedKey === "Public Key" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No API keys generated yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Session Result */}
        {sessionData && (
          <>
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="text-lg text-green-900">Payment Session Created!</CardTitle>
                <CardDescription>Session ID: {sessionData.sessionId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertDescription className="text-sm">
                    ✅ This is your LIVE payment widget! Customers will see this when they pay.
                  </AlertDescription>
                </Alert>

                <div className="pt-3 border-t space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEmbedCode(!showEmbedCode)}
                    className="w-full"
                  >
                    {showEmbedCode ? "Hide" : "Show"} Integration Code
                  </Button>
                  
                  {showEmbedCode && (
                    <div className="space-y-2">
                      <Label className="text-xs">How to integrate this in your app:</Label>
                      <div className="relative">
                        <pre className="bg-slate-900 text-white p-3 rounded text-xs overflow-x-auto max-h-64">
                          <code>{integrationCode}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(integrationCode, "Integration Code")}
                        >
                          {copiedKey === "Integration Code" ? (
                            <Check className="h-3 w-3 text-white" />
                          ) : (
                            <Copy className="h-3 w-3 text-white" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <a href={`/api/debug/session/${sessionData.sessionId}`} target="_blank" rel="noopener noreferrer">
                    Debug Session Data
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Live Payment Widget</CardTitle>
                <CardDescription>This is exactly what your customers will see</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-sky-100 via-white to-blue-50 p-6 rounded-lg flex items-center justify-center min-h-[650px]">
                  <PaymentWidget 
                    sessionId={sessionData.sessionId}
                    amount={sessionData.amount}
                    currency={sessionData.currency}
                    depositChain={sessionData.depositChain}
                    depositAddress={sessionData.depositAddress}
                    status={sessionData.status}
                    merchantName={sessionData.merchantName}
                    merchantEmail={sessionData.merchantEmail}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
