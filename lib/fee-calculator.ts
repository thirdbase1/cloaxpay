import { createClient } from "./supabase/server";

export const FEE_CONFIG = {
  platformFeePercent: 0.025, // 2.5%
  minPlatformFee: 0.50,      // $0.50 minimum
  maxPlatformFee: 100.00,    // $100 maximum
};

export const GAS_FEES: Record<string, { base: number; priority: number }> = {
  mainnet: { base: 5.0, priority: 8.0 },
  polygon: { base: 0.1, priority: 0.2 },
  arbitrum: { base: 0.5, priority: 1.0 },
  optimism: { base: 0.5, priority: 1.0 },
  bsc: { base: 0.2, priority: 0.4 },
  solana: { base: 0.01, priority: 0.02 },
  avalanche: { base: 0.5, priority: 1.0 },
  base: { base: 0.3, priority: 0.6 },
  zksync: { base: 0.3, priority: 0.6 },
};

export interface FeeCalculation {
  grossAmount: number;
  platformFee: number;
  gasFee: number;
  totalFees: number;
  netAmount: number;
  netPercentage: number;
}

export function calculatePlatformFee(amount: number): number {
  const fee = amount * FEE_CONFIG.platformFeePercent;
  
  if (fee < FEE_CONFIG.minPlatformFee) return FEE_CONFIG.minPlatformFee;
  if (fee > FEE_CONFIG.maxPlatformFee) return FEE_CONFIG.maxPlatformFee;
  
  return parseFloat(fee.toFixed(2));
}

export function estimateGasFee(network: string, priority: boolean = false): number {
  const networkFees = GAS_FEES[network] || { base: 1.0, priority: 2.0 };
  return priority ? networkFees.priority : networkFees.base;
}

export function calculateFees(
  grossAmount: number,
  network: string,
  merchantCoversGas: boolean = false
): FeeCalculation {
  const platformFee = calculatePlatformFee(grossAmount);
  const gasFee = merchantCoversGas ? 0 : estimateGasFee(network);
  const totalFees = platformFee + gasFee;
  const netAmount = grossAmount - totalFees;
  const netPercentage = (netAmount / grossAmount) * 100;

  return {
    grossAmount,
    platformFee,
    gasFee,
    totalFees,
    netAmount,
    netPercentage: parseFloat(netPercentage.toFixed(2)),
  };
}

export async function applyMerchantFeeSettings(
  merchantId: string,
  grossAmount: number,
  network: string
): Promise<FeeCalculation> {
  const supabase = await createClient();
  
  const { data: merchant } = await supabase
    .from("merchants")
    .select("auto_gas_coverage")
    .eq("id", merchantId)
    .single();

  const merchantCoversGas = merchant?.auto_gas_coverage || false;
  
  return calculateFees(grossAmount, network, merchantCoversGas);
}

export function canProcessPayment(feeCalc: FeeCalculation, minThreshold: number = 1.0): boolean {
  return feeCalc.netAmount >= minThreshold;
}
