import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

export default async function DebugPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  // Get merchant data
  const { data: merchant } = await supabase.from("merchants").select("*").eq("id", user.id).single()

  // Get API keys
  const { data: apiKeys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("merchant_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })

  // Check environment variables (server-side)
  const envChecks = {
    sideshift_affiliate: !!process.env.SIDESHIFT_AFFILIATE_ID,
    sideshift_secret: !!process.env.SIDESHIFT_SECRET,
    merchant_wallet: !!process.env.MERCHANT_WALLET,
    site_url: !!process.env.NEXT_PUBLIC_SITE_URL,
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Debug Dashboard</h1>
        <p className="text-muted-foreground">System health check and troubleshooting</p>
      </div>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Required for CloaxPay to function</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <EnvCheck
            name="SIDESHIFT_AFFILIATE_ID"
            status={envChecks.sideshift_affiliate}
            required
            description="Your SideShift affiliate ID"
          />
          <EnvCheck
            name="SIDESHIFT_SECRET"
            status={envChecks.sideshift_secret}
            required
            description="Your SideShift API secret"
          />
          <EnvCheck
            name="MERCHANT_WALLET"
            status={envChecks.merchant_wallet}
            required
            description="Where settlements will be sent"
            value={envChecks.merchant_wallet ? process.env.MERCHANT_WALLET : undefined}
          />
          <EnvCheck
            name="NEXT_PUBLIC_SITE_URL"
            status={envChecks.site_url}
            description="Your production URL"
            value={process.env.NEXT_PUBLIC_SITE_URL || "Using default (localhost)"}
          />
        </CardContent>
      </Card>

      {/* Merchant Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant Profile</CardTitle>
          <CardDescription>Your account configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {merchant ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Business Name:</span>
                <span className="font-medium">{merchant.business_name || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{merchant.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preferred Token:</span>
                <span className="font-medium">{merchant.preferred_token || "USDC"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Test Mode:</span>
                <span className="font-medium">{merchant.test_mode ? "Yes" : "No"}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>Merchant profile not found</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Your authentication credentials</CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys && apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {key.key_type === "secret" ? "Secret Key" : "Public Key"}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        key.is_live ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {key.is_live ? "Live" : "Test"}
                    </span>
                  </div>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all">{key.key_value}</code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {new Date(key.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>No API keys found. Generate keys in Settings.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-base">Troubleshooting Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>401 Invalid API key error?</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              Make sure you're using the <strong>Secret Key</strong> (starts with sk_test or sk_live)
            </li>
            <li>Copy the full key from Settings → API Keys</li>
            <li>Check the key hasn't been revoked</li>
            <li>If testing the widget, make sure you pasted the key in the "Try Widget" page</li>
          </ul>
          <p className="mt-4">
            <strong>Missing SideShift credentials?</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              Add <code className="text-xs bg-white px-1 rounded">SIDESHIFT_AFFILIATE_ID</code> and{" "}
              <code className="text-xs bg-white px-1 rounded">SIDESHIFT_SECRET</code> to your Vercel project environment
              variables
            </li>
            <li>
              Get these from{" "}
              <a
                href="https://sideshift.ai/affiliate"
                target="_blank"
                className="text-blue-600 hover:underline"
                rel="noreferrer"
              >
                https://sideshift.ai/affiliate
              </a>
            </li>
            <li>Redeploy after adding environment variables</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function EnvCheck({
  name,
  status,
  required = false,
  description,
  value,
}: {
  name: string
  status: boolean
  required?: boolean
  description?: string
  value?: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      {status ? (
        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
      ) : (
        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-sm font-medium">{name}</code>
          {required && <span className="text-xs text-red-600">Required</span>}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        {value && <code className="text-xs text-muted-foreground mt-1 block break-all">{value}</code>}
      </div>
      <div className="text-xs font-medium">
        {status ? <span className="text-green-600">Set</span> : <span className="text-red-600">Missing</span>}
      </div>
    </div>
  )
}
