import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-keys";

export async function POST(req: NextRequest) {
  try {
    const { userId, businessName, email } = await req.json();

    const supabase = await createClient();

    // Create merchant profile
    const { error: merchantError } = await supabase
      .from("merchants")
      .insert({
        id: userId,
        business_name: businessName,
        email: email,
        preferred_token: "USDC",
      });

    if (merchantError) {
      return NextResponse.json({ error: merchantError.message }, { status: 400 });
    }

    await Promise.all([
      generateApiKey(userId, "public", true),  // is_live = true
      generateApiKey(userId, "secret", true),  // is_live = true
    ]);

    const productionWallets = [
      { chain: "eth", address: process.env.MERCHANT_WALLET || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", is_primary: true },
      { chain: "bsc", address: process.env.MERCHANT_WALLET || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", is_primary: false },
      { chain: "sol", address: process.env.MERCHANT_WALLET || "DemoWallet111111111111111111111111111111111", is_primary: false },
      { chain: "btc", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", is_primary: false },
    ];

    await supabase.from("merchant_wallets").insert(
      productionWallets.map(wallet => ({
        merchant_id: userId,
        chain: wallet.chain,
        address: wallet.address,
        is_primary: wallet.is_primary,
      }))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initialize merchant" },
      { status: 500 }
    );
  }
}
