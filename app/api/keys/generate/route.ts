import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateApiKey } from "@/lib/api-keys"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: "Password is required to generate API keys" }, { status: 400 })
    }

    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (passwordError) {
      console.log("[v0] Password verification failed for user:", user.id)
      return NextResponse.json({ error: "Invalid password. Please try again." }, { status: 403 })
    }

    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("id, business_name, email")
      .eq("id", user.id)
      .single()

    if (merchantError || !merchant) {
      console.error("[v0] Merchant profile check error:", merchantError)
      return NextResponse.json(
        { error: "Merchant profile not found. Please complete your profile setup." },
        { status: 400 },
      )
    }

    const { data: wallets, error: walletError } = await supabase
      .from("merchant_wallets")
      .select("id")
      .eq("merchant_id", user.id)

    if (walletError) {
      console.error("[v0] Wallet check error:", walletError)

      if (walletError.code === "PGRST204" || walletError.message.includes("Could not find the table")) {
        return NextResponse.json(
          {
            error:
              "Database setup incomplete. The merchant_wallets table is missing. Please run the database migration script: scripts/001_create_merchant_wallets.sql",
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          error: "Unable to verify wallet configuration. Please try again or contact support.",
        },
        { status: 500 },
      )
    }

    if (!wallets || wallets.length === 0) {
      console.log("[v0] API key generation blocked - no wallets configured for merchant:", user.id)
      return NextResponse.json(
        {
          error:
            "You must add at least one settlement wallet before generating API keys. Go to Settings > Wallets to add your wallet address.",
        },
        { status: 400 },
      )
    }

    // generateApiKey() already handles revoking old keys automatically

    const publicKey = await generateApiKey(user.id, "public", true)
    const secretKey = await generateApiKey(user.id, "secret", true)

    console.log("[v0] Successfully generated API keys for merchant:", user.id, "with", wallets.length, "wallet(s)")

    return NextResponse.json({
      success: true,
      public_key: publicKey,
      secret_key: secretKey,
      message: "API keys generated successfully. Please save your secret key securely - it will not be shown again.",
    })
  } catch (error) {
    console.error("[v0] Key generation API error:", error)
    return NextResponse.json({ error: "Failed to generate API keys. Please try again." }, { status: 500 })
  }
}
