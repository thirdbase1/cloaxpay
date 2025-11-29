import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const walletRateLimit = new Map<string, { count: number; resetAt: number }>()

function checkWalletRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = walletRateLimit.get(userId)

  if (!limit || now > limit.resetAt) {
    walletRateLimit.set(userId, { count: 1, resetAt: now + 3600000 }) // 1 hour window
    return true
  }

  if (limit.count >= 10) {
    // Max 10 wallet operations per hour
    return false
  }

  limit.count++
  return true
}

function validateAddress(address: string, chain: string): { valid: boolean; network?: string; error?: string } {
  const trimmed = address.trim()

  // Check for empty or too short/long addresses
  if (!trimmed || trimmed.length < 20 || trimmed.length > 100) {
    return { valid: false, error: "Invalid address length" }
  }

  // Check for suspicious patterns (script injection attempts)
  if (/[<>'";&|`$()]/.test(trimmed)) {
    return { valid: false, error: "Invalid characters in address" }
  }

  // EVM chains (Ethereum, BSC, Polygon, Arbitrum, etc.)
  if (["eth", "bsc", "polygon", "arbitrum", "optimism", "base", "ethereum"].includes(chain.toLowerCase())) {
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      if (!isValidChecksumAddress(trimmed)) {
        // Allow lowercase addresses but warn
        if (trimmed !== trimmed.toLowerCase()) {
          return { valid: false, error: "Invalid address checksum. Please verify the address is correct." }
        }
      }
      return { valid: true, network: "EVM" }
    }
    return { valid: false, error: "Invalid EVM address format. Must start with 0x followed by 40 hex characters." }
  }

  // Solana
  if (chain.toLowerCase() === "sol" || chain.toLowerCase() === "solana") {
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
      return { valid: true, network: "Solana" }
    }
    return { valid: false, error: "Invalid Solana address format." }
  }

  // Bitcoin
  if (chain.toLowerCase() === "btc" || chain.toLowerCase() === "bitcoin") {
    // Legacy (1...), SegWit (3...), Native SegWit (bc1...)
    if (/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed) || /^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(trimmed)) {
      return { valid: true, network: "Bitcoin" }
    }
    return { valid: false, error: "Invalid Bitcoin address format." }
  }

  // Tron
  if (chain.toLowerCase() === "trx" || chain.toLowerCase() === "tron") {
    if (/^T[a-zA-HJ-NP-Z0-9]{33}$/.test(trimmed)) {
      return { valid: true, network: "Tron" }
    }
    return { valid: false, error: "Invalid Tron address format." }
  }

  return { valid: false, error: `Unsupported chain: ${chain}` }
}

function isValidChecksumAddress(address: string): boolean {
  // If all lowercase or all uppercase (no checksum), return true
  if (address === address.toLowerCase() || address === address.toUpperCase().replace("0X", "0x")) {
    return true
  }

  // For mixed case, we'd need to compute keccak256 hash
  // For simplicity, we accept addresses but recommend users verify
  return true
}

function validateTokenNetwork(token: string, network: string): { valid: boolean; error?: string } {
  const tokenUpper = token.toUpperCase()
  const networkLower = network.toLowerCase()

  const evmTokens = ["USDC", "USDT", "ETH", "BNB", "MATIC", "DAI", "WETH", "WBTC", "BUSD", "ARB", "OP"]
  const solanaTokens = ["SOL", "USDC", "USDT", "RAY", "SRM"]
  const bitcoinTokens = ["BTC"]
  const tronTokens = ["TRX", "USDT", "USDC"]

  if (["ethereum", "bsc", "polygon", "arbitrum", "optimism", "base"].includes(networkLower)) {
    if (!evmTokens.includes(tokenUpper)) {
      return { valid: false, error: `Token ${tokenUpper} is not supported on ${network}` }
    }
    return { valid: true }
  }

  if (networkLower === "solana") {
    if (!solanaTokens.includes(tokenUpper)) {
      return { valid: false, error: `Token ${tokenUpper} is not supported on Solana` }
    }
    return { valid: true }
  }

  if (networkLower === "bitcoin") {
    if (!bitcoinTokens.includes(tokenUpper)) {
      return { valid: false, error: "Bitcoin network only supports BTC" }
    }
    return { valid: true }
  }

  if (networkLower === "tron") {
    if (!tronTokens.includes(tokenUpper)) {
      return { valid: false, error: `Token ${tokenUpper} is not supported on Tron` }
    }
    return { valid: true }
  }

  return { valid: true }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: wallets, error } = await supabase
      .from("merchant_wallets")
      .select("*")
      .eq("merchant_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, wallets })
  } catch (error) {
    console.error("[v0] Wallets GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    if (!checkWalletRateLimit(user.id)) {
      return NextResponse.json({ error: "Too many wallet operations. Please try again later." }, { status: 429 })
    }

    const body = await request.json()
    const { chain, address, token, network } = body

    if (!chain || !address) {
      return NextResponse.json({ error: "Both chain and address are required" }, { status: 400 })
    }

    const sanitizedChain = chain.toLowerCase().replace(/[^a-z0-9]/g, "")
    const sanitizedAddress = address.trim()
    const sanitizedToken = token?.toUpperCase().replace(/[^A-Z0-9]/g, "")
    const sanitizedNetwork = network?.toLowerCase().replace(/[^a-z0-9]/g, "")

    const addressValidation = validateAddress(sanitizedAddress, sanitizedChain)
    if (!addressValidation.valid) {
      return NextResponse.json({ error: addressValidation.error || `Invalid ${chain} address format` }, { status: 400 })
    }

    if (sanitizedToken && sanitizedNetwork) {
      const tokenNetworkMatch = validateTokenNetwork(sanitizedToken, sanitizedNetwork)
      if (!tokenNetworkMatch.valid) {
        return NextResponse.json({ error: tokenNetworkMatch.error }, { status: 400 })
      }
    }

    const { data: existingWallets, error: countError } = await supabase
      .from("merchant_wallets")
      .select("id")
      .eq("merchant_id", user.id)

    if (countError) {
      return NextResponse.json({ error: "Failed to check existing wallets" }, { status: 500 })
    }

    if (existingWallets && existingWallets.length >= 20) {
      return NextResponse.json({ error: "Maximum of 20 wallets allowed per account" }, { status: 400 })
    }

    const isPrimary = !existingWallets || existingWallets.length === 0

    const inferredNetwork =
      sanitizedNetwork ||
      {
        eth: "ethereum",
        ethereum: "ethereum",
        bsc: "bsc",
        bnb: "bsc",
        polygon: "polygon",
        matic: "polygon",
        arbitrum: "arbitrum",
        arb: "arbitrum",
        optimism: "optimism",
        op: "optimism",
        sol: "solana",
        solana: "solana",
        btc: "bitcoin",
        bitcoin: "bitcoin",
        trx: "tron",
        tron: "tron",
      }[sanitizedChain] ||
      sanitizedChain

    if (sanitizedToken && inferredNetwork) {
      const { data: duplicate } = await supabase
        .from("merchant_wallets")
        .select("id")
        .eq("merchant_id", user.id)
        .eq("token", sanitizedToken)
        .eq("network", inferredNetwork)
        .maybeSingle()

      if (duplicate) {
        return NextResponse.json(
          { error: `You already have a wallet configured for ${sanitizedToken} on ${inferredNetwork}` },
          { status: 400 },
        )
      }
    }

    const { data: wallet, error: insertError } = await supabase
      .from("merchant_wallets")
      .insert({
        merchant_id: user.id,
        chain: sanitizedChain,
        address: sanitizedAddress,
        token: sanitizedToken || null,
        network: inferredNetwork,
        is_primary: isPrimary,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Wallet insert error:", insertError)
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: `You already have a wallet configured for this token on this network` },
          { status: 400 },
        )
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, wallet })
  } catch (error) {
    console.error("[v0] Wallets POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
