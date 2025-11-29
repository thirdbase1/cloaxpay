import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const deleteRateLimit = new Map<string, { count: number; resetAt: number }>()

function checkDeleteRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = deleteRateLimit.get(userId)

  if (!limit || now > limit.resetAt) {
    deleteRateLimit.set(userId, { count: 1, resetAt: now + 3600000 }) // 1 hour window
    return true
  }

  if (limit.count >= 10) {
    // Max 10 deletes per hour
    return false
  }

  limit.count++
  return true
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkDeleteRateLimit(user.id)) {
      return NextResponse.json({ error: "Too many delete operations. Please try again later." }, { status: 429 })
    }

    const { id: walletId } = await params

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletId)) {
      return NextResponse.json({ error: "Invalid wallet ID format" }, { status: 400 })
    }

    const { data: wallet, error: walletError } = await supabase
      .from("merchant_wallets")
      .select("id, is_primary")
      .eq("id", walletId)
      .eq("merchant_id", user.id)
      .single()

    if (walletError || !wallet) {
      console.error("[v0] Wallet not found:", walletError)
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    const { data: activeKeys } = await supabase
      .from("api_keys")
      .select("id")
      .eq("merchant_id", user.id)
      .is("revoked_at", null)

    const { data: allWallets } = await supabase.from("merchant_wallets").select("id").eq("merchant_id", user.id)

    const isLastWallet = allWallets && allWallets.length === 1

    // If they have active API keys, revoke them since they need a wallet for payments
    if (isLastWallet && activeKeys && activeKeys.length > 0) {
      // Revoke all active API keys since they're deleting their only wallet
      await supabase
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("merchant_id", user.id)
        .is("revoked_at", null)
    }

    const { error, count } = await supabase
      .from("merchant_wallets")
      .delete()
      .eq("id", walletId)
      .eq("merchant_id", user.id)

    if (error) {
      console.error("[v0] Wallet delete error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // If primary was deleted and not last wallet, promote another
    if (wallet.is_primary && !isLastWallet) {
      const { data: newPrimary } = await supabase
        .from("merchant_wallets")
        .select("id")
        .eq("merchant_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single()

      if (newPrimary) {
        await supabase.from("merchant_wallets").update({ is_primary: true }).eq("id", newPrimary.id)
      }
    }

    return NextResponse.json({
      success: true,
      deleted: true,
      apiKeysRevoked: isLastWallet && activeKeys && activeKeys.length > 0,
      message: isLastWallet
        ? "Wallet deleted. Your API keys have been revoked since you need at least one wallet to process payments."
        : "Wallet deleted successfully.",
    })
  } catch (error) {
    console.error("[v0] Wallet DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
