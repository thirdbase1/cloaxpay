import { createClient } from "@/lib/supabase/server";

export interface AnalyticsQuery {
  merchantId: string;
  startDate?: Date;
  endDate?: Date;
  groupBy?: "day" | "week" | "month";
}

export interface AnalyticsMetrics {
  totalSessions: number;
  completedSessions: number;
  failedSessions: number;
  totalRevenue: number;
  averageAmount: number;
  conversionRate: number;
  averageTimeToConfirm: number;
  topChains: Array<{ chain: string; count: number }>;
  topTokens: Array<{ token: string; count: number }>;
}

export async function getAnalyticsMetrics({
  merchantId,
  startDate,
  endDate,
}: AnalyticsQuery): Promise<AnalyticsMetrics> {
  const supabase = await createClient();

  let query = supabase
    .from("payment_sessions")
    .select("*")
    .eq("merchant_id", merchantId);

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }
  if (endDate) {
    query = query.lte("created_at", endDate.toISOString());
  }

  const { data: sessions } = await query;

  if (!sessions) {
    return {
      totalSessions: 0,
      completedSessions: 0,
      failedSessions: 0,
      totalRevenue: 0,
      averageAmount: 0,
      conversionRate: 0,
      averageTimeToConfirm: 0,
      topChains: [],
      topTokens: [],
    };
  }

  const completed = sessions.filter((s) => s.status === "completed");
  const failed = sessions.filter((s) => s.status === "failed");
  const totalRevenue = completed.reduce((sum, s) => sum + s.amount, 0);

  // Get transactions for time calculations
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("merchant_id", merchantId);

  const avgTimeToConfirm =
    transactions && transactions.length > 0
      ? transactions
          .filter((t) => t.confirmed_at && t.created_at)
          .reduce((sum, t) => {
            const diff =
              new Date(t.confirmed_at!).getTime() -
              new Date(t.created_at).getTime();
            return sum + diff;
          }, 0) /
        (transactions.length || 1)
      : 0;

  // Calculate top chains
  const chainCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    if (s.deposit_chain) {
      const chain = s.deposit_chain.split("/")[0];
      chainCounts[chain] = (chainCounts[chain] || 0) + 1;
    }
  });
  const topChains = Object.entries(chainCounts)
    .map(([chain, count]) => ({ chain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate top tokens (from transactions)
  const tokenCounts: Record<string, number> = {};
  if (transactions) {
    transactions.forEach((t) => {
      tokenCounts[t.from_token] = (tokenCounts[t.from_token] || 0) + 1;
    });
  }
  const topTokens = Object.entries(tokenCounts)
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalSessions: sessions.length,
    completedSessions: completed.length,
    failedSessions: failed.length,
    totalRevenue,
    averageAmount: completed.length > 0 ? totalRevenue / completed.length : 0,
    conversionRate: sessions.length > 0 ? (completed.length / sessions.length) * 100 : 0,
    averageTimeToConfirm: Math.round(avgTimeToConfirm / 1000 / 60), // minutes
    topChains,
    topTokens,
  };
}

export async function trackWidgetEvent(
  sessionId: string,
  eventType: string,
  metadata?: Record<string, any>
) {
  const supabase = await createClient();

  await supabase.from("widget_events").insert({
    session_id: sessionId,
    event_type: eventType,
    metadata: metadata || {},
  });
}
