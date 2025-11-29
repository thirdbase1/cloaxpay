import { createSideShiftClient } from "./sideshift";
import { createClient } from "./supabase/server";
import { calculateFees, canProcessPayment } from "./fee-calculator";

interface RoutePreviewParams {
  sessionId: string;
  depositCoin: string;
  depositNetwork: string;
  depositAmount: string;
}

interface RoutePreview {
  depositCoin: string;
  depositNetwork: string;
  depositAmount: string;
  settleCoin: string;
  settleNetwork: string;
  grossAmount: number;
  platformFee: number;
  gasFee: number;
  netAmount: number;
  settleAmount: string;
  exchangeRate: string;
  canProcess: boolean;
  insufficientForFees: boolean;
  warnings: string[];
}

const PLATFORM_FEE_PERCENT = 0.025;

const GAS_ESTIMATES: Record<string, number> = {
  mainnet: 5.0,    // ETH mainnet
  polygon: 0.1,    // Polygon
  arbitrum: 0.5,   // Arbitrum
  optimism: 0.5,   // Optimism
  bsc: 0.2,        // BSC
  solana: 0.01,    // Solana
  avalanche: 0.5,  // Avalanche
};

export async function previewRoute(params: RoutePreviewParams): Promise<RoutePreview> {
  const { sessionId, depositCoin, depositNetwork, depositAmount } = params;
  
  const supabase = await createClient();
  
  const { data: session } = await supabase
    .from("payment_sessions")
    .select("*, merchants(*)")
    .eq("session_id", sessionId)
    .single();

  if (!session) {
    throw new Error("Session not found");
  }

  const merchant = session.merchants as any;
  const settleCoin = (merchant.preferred_token || "USDC").toLowerCase();
  const settleNetwork = "mainnet";

  const sideshift = createSideShiftClient();
  
  const pair = await sideshift.getPair(
    depositCoin.toLowerCase(),
    settleCoin,
    parseFloat(depositAmount)
  );

  const feeCalc = calculateFees(
    parseFloat(depositAmount),
    depositNetwork,
    merchant.auto_gas_coverage
  );

  const warnings: string[] = [];
  const canProcess = canProcessPayment(feeCalc);
  const insufficientForFees = !canProcess;

  if (insufficientForFees) {
    warnings.push("Amount too small to cover platform and gas fees");
  }

  if (parseFloat(pair.min) > feeCalc.netAmount) {
    warnings.push(`Amount below minimum swap amount (${pair.min} ${depositCoin.toUpperCase()})`);
  }

  if (pair.max && parseFloat(pair.max) < feeCalc.netAmount) {
    warnings.push(`Amount exceeds maximum swap amount (${pair.max} ${depositCoin.toUpperCase()})`);
  }

  const settleAmount = (feeCalc.netAmount * parseFloat(pair.rate)).toFixed(6);

  return {
    depositCoin: depositCoin.toUpperCase(),
    depositNetwork,
    depositAmount,
    settleCoin: settleCoin.toUpperCase(),
    settleNetwork,
    grossAmount: feeCalc.grossAmount,
    platformFee: feeCalc.platformFee,
    gasFee: feeCalc.gasFee,
    netAmount: feeCalc.netAmount,
    settleAmount,
    exchangeRate: pair.rate,
    canProcess,
    insufficientForFees,
    warnings,
  };
}

export async function executeSwap(sessionId: string, txHash: string) {
  const supabase = await createClient();
  
  const { data: session } = await supabase
    .from("payment_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (!session || !session.metadata?.shift_id) {
    throw new Error("Session or shift not found");
  }

  const sideshift = createSideShiftClient();
  const shift = await sideshift.getShift(session.metadata.shift_id);

  const { data: transaction } = await supabase
    .from("transactions")
    .insert({
      session_id: session.id,
      merchant_id: session.merchant_id,
      deposit_tx_hash: txHash,
      deposit_chain: session.deposit_chain,
      deposit_amount: shift.depositAmount ? parseFloat(shift.depositAmount) : 0,
      status: "detected",
      metadata: {
        shift_id: shift.id,
        shift_status: shift.status,
      },
    })
    .select()
    .single();

  return transaction;
}
