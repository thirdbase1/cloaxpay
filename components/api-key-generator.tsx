"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, AlertTriangle } from 'lucide-react';

interface ApiKeyGeneratorProps {
  merchantId: string;
}

export function ApiKeyGenerator({ merchantId }: ApiKeyGeneratorProps) {
  const [keyType, setKeyType] = useState<"public" | "secret">("secret");
  const [isLive, setIsLive] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateKey = async () => {
    setIsLoading(true);
    setGeneratedKey(null);

    try {
      const response = await fetch("/api/keys/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant_id: merchantId,
          key_type: keyType,
          is_live: isLive,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate key");
      }

      const data = await response.json();
      setGeneratedKey(data.key_value);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("[v0] Failed to generate key:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
    }
  };

  return (
    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
      <CardHeader>
        <CardTitle>Generate New API Key</CardTitle>
        <CardDescription>Creating a new key will automatically revoke your old one</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900 text-sm">
            <strong>Important:</strong> Only ONE key of each type can be active at a time. 
            Generating a new key will invalidate your previous key immediately.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label className="mb-3 block">Key Type</Label>
            <RadioGroup
              value={keyType}
              onValueChange={(value) => setKeyType(value as "public" | "secret")}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="secret" id="secret" />
                <Label htmlFor="secret" className="font-normal">
                  <strong>Secret Key (sk_)</strong> - For backend/server use only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="font-normal">
                  Public Key (pk_) - Safe for frontend code
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-3 block">Environment</Label>
            <RadioGroup
              value={isLive ? "live" : "test"}
              onValueChange={(value) => setIsLive(value === "live")}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="test" id="test" />
                <Label htmlFor="test" className="font-normal">
                  <strong>Test Mode</strong> - Simulated payments, perfect for development
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="live" id="live" />
                <Label htmlFor="live" className="font-normal">
                  <strong>Live Mode</strong> - Real crypto payments for production
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {generatedKey && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription>
              <div className="flex items-center justify-between gap-2 mb-2">
                <code className="text-xs break-all flex-1 font-mono">{generatedKey}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-green-900 font-medium">
                ✅ Key generated! Save it securely - you won't see it again.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={generateKey}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Generating..." : "Generate Key"}
        </Button>
      </CardContent>
    </Card>
  );
}
