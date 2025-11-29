import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Clock, ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from "next/link";

export default async function UserDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  // Get user's merchant profile
  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    redirect("/dashboard");
  }

  // Get transaction stats
  const { data: transactions } = await supabase
    .from("transaction_logs")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Calculate stats
  const completedTxs = transactions?.filter(tx => tx.status === "settled") || [];
  const totalVolume = completedTxs.reduce((sum, tx) => sum + (parseFloat(tx.settle_amount || "0")), 0);
  const totalTxCount = transactions?.length || 0;
  
  // Calculate PNL (simplified - fees vs revenue)
  const totalFees = completedTxs.reduce((sum, tx) => sum + (parseFloat(tx.sideshift_fee || "0")), 0);
  const pnl = totalVolume - totalFees;
  const pnlPercent = totalVolume > 0 ? ((pnl / totalVolume) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {merchant.business_name}</h1>
          <p className="text-muted-foreground">Your payment dashboard</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalVolume.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedTxs.length} completed payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net PNL</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {pnl >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                ${Math.abs(pnl).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {pnlPercent.toFixed(2)}% profit margin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTxCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Settlement Wallet */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Settlement Wallet
            </CardTitle>
            <CardDescription>
              Crypto payments are automatically converted and sent here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <p className="text-sm text-muted-foreground">Wallet Address</p>
                <p className="font-mono text-sm mt-1">
                  {merchant.settlement_wallet || "Not configured"}
                </p>
              </div>
              <Link href="/dashboard/settings">
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest payment activity</CardDescription>
            </div>
            <Link href="/explorer">
              <Button variant="outline" size="sm" className="gap-2">
                View All
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'settled' ? 'bg-green-100 text-green-700' :
                          tx.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {tx.status}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1 font-mono">
                        {tx.deposit_coin} → {merchant.settlement_token}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        ${parseFloat(tx.settle_amount || "0").toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {parseFloat(tx.deposit_amount || "0").toFixed(6)} {tx.deposit_coin}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <Link href="/dashboard/integration">
                  <Button variant="link" className="mt-2">
                    View integration guide
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/integration">
                <Button variant="outline" className="w-full justify-start">
                  Integration Guide
                </Button>
              </Link>
              <Link href="/dashboard/test">
                <Button variant="outline" className="w-full justify-start">
                  Test Payment Widget
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/settings">
                <Button variant="outline" className="w-full justify-start">
                  Configure Wallet
                </Button>
              </Link>
              <Link href="/dashboard/api-keys">
                <Button variant="outline" className="w-full justify-start">
                  Manage API Keys
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
