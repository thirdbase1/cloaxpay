import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, DollarSign, Globe, Hash, Clock, CheckCircle2, XCircle, Timer, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function SessionDetailsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  // Fetch complete session data with related transaction logs and merchant profile
  const [sessionResult, transactionsResult, merchantResult] = await Promise.all([
    supabase
      .from("payment_sessions")
      .select("*")
      .eq("session_id", resolvedParams.sessionId)
      .eq("merchant_id", data.user.id)
      .single(),
    supabase
      .from("transaction_logs")
      .select("*")
      .eq("session_id", resolvedParams.sessionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("merchant_profiles")
      .select("*")
      .eq("id", data.user.id)
      .single()
  ]);

  if (sessionResult.error || !sessionResult.data) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-2 border-red-200">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Session not found</p>
            <div className="flex justify-center mt-4">
              <Button asChild variant="outline">
                <Link href="/dashboard/transactions">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Transactions
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = sessionResult.data;
  const transactions = transactionsResult.data || [];
  const merchantProfile = merchantResult.data;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/dashboard/transactions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </Link>
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Session Details</h1>
            <p className="text-muted-foreground font-mono text-sm">{session.session_id}</p>
          </div>
          <StatusBadge status={session.status} />
        </div>
      </div>

      {/* Session Overview */}
      <div className="grid gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <InfoRow label="Amount" value={`${session.amount} ${session.currency}`} />
              <InfoRow label="Status" value={session.status} badge />
              <InfoRow 
                label="Created At" 
                value={new Date(session.created_at).toLocaleString()} 
                icon={<Calendar className="h-4 w-4" />}
              />
              {session.expires_at && (
                <InfoRow 
                  label="Expires At" 
                  value={new Date(session.expires_at).toLocaleString()} 
                  icon={<Clock className="h-4 w-4" />}
                />
              )}
            </div>
            <div className="space-y-4">
              {session.updated_at && (
                <InfoRow 
                  label="Last Updated" 
                  value={new Date(session.updated_at).toLocaleString()} 
                />
              )}
              {session.metadata && typeof session.metadata === 'object' && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Metadata</p>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                    {JSON.stringify(session.metadata, null, 2)}
                  </div>
                </div>
              )}
              {transactions.length > 0 && transactions[0].settle_address && (
                <>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Merchant Information</p>
                    <div className="space-y-2">
                      {transactions[0].merchant_name && (
                        <div>
                          <p className="text-xs text-muted-foreground">Company Name</p>
                          <p className="text-sm font-semibold">{transactions[0].merchant_name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Settlement Wallet ({transactions[0].settle_coin})</p>
                        <p className="text-xs font-mono bg-slate-100 p-2 rounded break-all">
                          {transactions[0].settle_address}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Funds will be sent here after platform fee (1.5%) and gas deduction
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Logs Timeline */}
        {transactions.length > 0 && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Transaction Timeline
              </CardTitle>
              <CardDescription>Complete payment flow from start to finish</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((tx, index) => (
                  <div key={tx.id} className="relative pl-8 pb-4 last:pb-0">
                    {/* Timeline connector */}
                    {index !== transactions.length - 1 && (
                      <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1.5">
                      <StatusDot status={tx.status} />
                    </div>

                    {/* Transaction details */}
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-semibold text-sm">
                            {getActionLabel(tx.status, tx)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                        <StatusBadge status={tx.status} small />
                      </div>

                      {/* Transaction details grid */}
                      <div className="grid md:grid-cols-2 gap-3 text-xs">
                        {tx.sideshift_id && (
                          <div>
                            <p className="text-muted-foreground">SideShift ID</p>
                            <p className="font-mono">{tx.sideshift_id}</p>
                          </div>
                        )}
                        {tx.deposit_coin && (
                          <div>
                            <p className="text-muted-foreground">Deposit Coin</p>
                            <p className="font-medium">{tx.deposit_coin} / {tx.deposit_network}</p>
                          </div>
                        )}
                        {tx.settle_coin && (
                          <div>
                            <p className="text-muted-foreground">Settlement Coin</p>
                            <p className="font-medium">{tx.settle_coin} / {tx.settle_network}</p>
                          </div>
                        )}
                        {tx.deposit_address && (
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground mb-1">Deposit Address</p>
                            <p className="font-mono text-xs bg-black text-white p-2 rounded break-all">
                              {tx.deposit_address}
                            </p>
                          </div>
                        )}
                        {tx.deposit_tx_hash && (
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground mb-1">Deposit TX Hash</p>
                            <p className="font-mono text-xs bg-black text-white p-2 rounded break-all">
                              {tx.deposit_tx_hash}
                            </p>
                          </div>
                        )}
                        {tx.settle_tx_hash && (
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground mb-1">Settlement TX Hash</p>
                            <p className="font-mono text-xs bg-black text-white p-2 rounded break-all">
                              {tx.settle_tx_hash}
                            </p>
                          </div>
                        )}
                        {tx.user_ip && (
                          <div>
                            <p className="text-muted-foreground">IP Address</p>
                            <p className="font-mono">{tx.user_ip}</p>
                          </div>
                        )}
                        {tx.user_agent && (
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground">User Agent</p>
                            <p className="text-xs truncate">{tx.user_agent}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state for no transactions */}
        {transactions.length === 0 && (
          <Card className="border-2 border-yellow-200 bg-yellow-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No transaction logs recorded for this session yet.
                  {session.status === 'pending' && ' Payment initialization may still be in progress.'}
                  {(session.status === 'cancelled' || session.status === 'expired') && ' Session was closed before payment address was generated.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, badge, icon }: { label: string; value: string; badge?: boolean; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
        {icon}
        {label}
      </p>
      {badge ? (
        <StatusBadge status={value} />
      ) : (
        <p className="text-sm font-semibold">{value}</p>
      )}
    </div>
  );
}

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const variants: Record<string, { bg: string; icon: any }> = {
    pending: { bg: "bg-gray-100 text-gray-800", icon: Clock },
    awaiting_payment: { bg: "bg-blue-100 text-blue-800", icon: Timer },
    processing: { bg: "bg-yellow-100 text-yellow-800", icon: Globe },
    completed: { bg: "bg-green-100 text-green-800", icon: CheckCircle2 },
    settled: { bg: "bg-green-100 text-green-800", icon: CheckCircle2 },
    failed: { bg: "bg-red-100 text-red-800", icon: XCircle },
    expired: { bg: "bg-gray-100 text-gray-800", icon: XCircle },
    cancelled: { bg: "bg-orange-100 text-orange-800", icon: XCircle },
  };

  const variant = variants[status] || variants.pending;
  const Icon = variant.icon;
  const textSize = small ? 'text-xs' : 'text-sm';
  const iconSize = small ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <span className={`${textSize} px-3 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit ${variant.bg}`}>
      <Icon className={iconSize} />
      {status.replace("_", " ")}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-gray-400",
    awaiting_payment: "bg-blue-500",
    processing: "bg-yellow-500",
    completed: "bg-green-500",
    settled: "bg-green-500",
    failed: "bg-red-500",
    expired: "bg-gray-400",
    cancelled: "bg-orange-500",
  };

  return (
    <div className={`w-4 h-4 rounded-full ${colors[status] || colors.pending} border-2 border-white shadow-sm`} />
  );
}

function getActionLabel(status: string, tx: any): string {
  if (tx.sideshift_id && status === 'pending') return 'Shift Created';
  if (tx.deposit_address) return 'Deposit Address Generated';
  if (tx.deposit_tx_hash) return 'Payment Received';
  if (tx.settle_tx_hash) return 'Settlement Complete';
  if (status === 'cancelled') return 'Payment Cancelled';
  if (status === 'expired') return 'Session Expired';
  if (status === 'failed') return 'Payment Failed';
  return 'Status Update';
}
