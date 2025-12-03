import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MerchantTestSite } from "@/components/merchant-test-site"

export default async function TestWidgetPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: merchant } = await supabase.from("merchants").select("*").eq("id", data.user.id).single()

  const { data: apiKeys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("merchant_id", data.user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })

  const secretKey = apiKeys?.find((k) => k.key_type === "secret")?.key_value
  const publicKey = apiKeys?.find((k) => k.key_type === "public")?.key_value

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Test Integration
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          See how your customers will experience payments with your branding
        </p>
      </div>

      <Card className="mb-6 bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
            Your API Keys (Production - $10 test limit)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-amber-800 mb-2">
            These are production keys. SideShift has no sandbox, so this page enforces a $10 maximum for safe testing.
          </p>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Public Key (for client-side)</p>
            <code className="text-xs bg-white px-2 py-1 rounded border break-all block">
              {publicKey || "Generate keys in API Keys page"}
            </code>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Secret Key (for server-side)</p>
            <code className="text-xs bg-white px-2 py-1 rounded border break-all block">
              {secretKey || "Generate keys in API Keys page"}
            </code>
          </div>
        </CardContent>
      </Card>

      <MerchantTestSite secretKey={secretKey} businessName={merchant?.business_name || "Your Business"} />
    </div>
  )
}
