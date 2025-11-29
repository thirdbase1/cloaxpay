import { redirect } from "next/navigation"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { SecureApiKeyManager } from "@/components/secure-api-key-manager"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function ApiKeysPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const serviceSupabase = await createServiceRoleClient()

  const { data: wallets, error: walletError } = await serviceSupabase
    .from("merchant_wallets")
    .select("id")
    .eq("merchant_id", data.user.id)

  const hasWallets = wallets && wallets.length > 0

  const tableNotExists = walletError && walletError.code === "PGRST204"

  const { data: apiKeys, error: keysError } = await serviceSupabase
    .from("api_keys")
    .select("id, key_type, is_live, created_at")
    .eq("merchant_id", data.user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })

  console.log(
    "[v0] Fetched API keys for merchant:",
    data.user.id,
    "Count:",
    apiKeys?.length || 0,
    "Wallets:",
    wallets?.length || 0,
  )

  if (keysError) {
    console.error("[v0] Error fetching API keys:", keysError)
  }

  return (
    <div className="w-full">
      <div className="container mx-auto p-3 sm:p-4 md:p-6 lg:p-8 max-w-5xl">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            API Keys
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Manage your integration keys securely</p>
        </div>

        {tableNotExists && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-900 dark:text-red-200">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-semibold mb-1 text-sm sm:text-base">Database Setup Required</p>
                  <p className="text-xs sm:text-sm">
                    The merchant_wallets table is missing from your database. Please run the database migration script
                    to create it.
                  </p>
                </div>
                <div className="bg-red-900/10 dark:bg-red-100/10 p-3 rounded border border-red-200 dark:border-red-800">
                  <p className="text-xs font-semibold mb-1">How to fix:</p>
                  <ol className="text-xs space-y-1 list-decimal list-inside">
                    <li>Find the file: scripts/001_create_merchant_wallets.sql</li>
                    <li>Run the SQL script in your Supabase dashboard</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!hasWallets && !tableNotExists && (
          <Alert className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-900 dark:text-orange-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold mb-1 text-sm sm:text-base">Settlement Wallet Required</p>
                  <p className="text-xs sm:text-sm">
                    Before generating API keys, you must add at least one settlement wallet. CloaxPay currently supports
                    only EVM and SVM settlement wallets.
                  </p>
                </div>
                <Link href="/dashboard/settings">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap">
                    Add Wallet Now
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <SecureApiKeyManager
          merchantId={data.user.id}
          existingKeys={apiKeys || []}
          hasWallets={hasWallets && !tableNotExists}
        />
      </div>
    </div>
  )
}
