import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Hash, Clock, CheckCircle2, XCircle, Timer, Globe } from 'lucide-react';
import Link from 'next/link';

export default async function ExplorerTransactionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const supabase = await createClient();
  const resolvedParams = await params;

  const [sessionResult, transactionsResult] = await Promise.all([
    supabase
      .from("payment_sessions")
      .select(`
        *,
        merchants!inner(business_name)
      `)
      .eq("session_id", resolvedParams.sessionId)
      .single(),
    supabase
      .from("transaction_logs")
      .select("*")
      .eq("session_id", resolvedParams.sessionId)
      .order("created_at", { ascending: true })
  ]);

  if (sessionResult.error || !sessionResult.data) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-2 border-red-200">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Transaction not found</p>
            <div className="flex justify-center mt-4">
              <Button asChild variant="outline">
                <Link href="/explorer">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Explorer
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

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/explorer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Explorer
          </Link>
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Transaction Details</h1>
            <p className="text-muted-foreground font-mono text-sm">{session.session_id}</p>
          </div>
          <TransactionStatusBadge status={session.status} />
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <InfoRow label="Amount" value={`${session.amount} ${session.currency}`} />
              <InfoRow label="Status" value={session.status} />
              <InfoRow label="Merchant" value={session.merchants.business_name} />
              <InfoRow 
                label="Created" 
                value={new Date(session.created_at).toLocaleString()} 
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>
            <div className="space-y-4">
              {session.deposit_chain && (
                <InfoRow label="Chain" value={session.deposit_chain.split("/")[0]} />
              )}
              {session.deposit_address && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Deposit Address</p>
                  <code className="text-xs bg-black text-white p-2 rounded block break-all">
                    {session.deposit_address}
                  </code>
                </div>
              )}
              {session.expires_at && (
                <InfoRow 
                  label="Expires" 
                  value={new Date(session.expires_at).toLocaleString()} 
                  icon={<Clock className="h-4 w-4" />}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {transactions.length > 0 && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Transaction Timeline</CardTitle>
              <CardDescription>Complete payment flow from start to finish</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((tx, index) => (
                  <div key={tx.id} className="relative pl-8 pb-4 last:pb-0">
                    {index !== transactions.length - 1 && (
                      <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    
                    <div className="absolute left-0 top-1.5">
                      <StatusDot status={tx.status} />
                    </div>

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
                        <TransactionStatusBadge status={tx.status} />
                      </div>

                      {(tx.deposit_tx_hash || tx.settle_tx_hash || tx.deposit_address) && (
                        <div className="grid gap-3 text-xs">
                          {tx.deposit_address && (
                            <div>
                              <p className="text-muted-foreground mb-1">Deposit Address</p>
                              <code className="text-xs bg-black text-white p-2 rounded block break-all">
                                {tx.deposit_address}
                              </code>
                            </div>
                          )}
                          {tx.deposit_tx_hash && (
                            <div>
                              <p className="text-muted-foreground mb-1">Deposit TX Hash</p>
                              <code className="text-xs bg-black text-white p-2 rounded block break-all">
                                {tx.deposit_tx_hash}
                              </code>
                            </div>
                          )}
                          {tx.settle_tx_hash && (
                            <div>
                              <p className="text-muted-foreground mb-1">Settlement TX Hash</p>
                              <code className="text-xs bg-black text-white p-2 rounded block break-all">
                                {tx.settle_tx_hash}
                              </code>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
        {icon}
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function TransactionStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { bg: string; icon: any }> = {
    pending: { bg: "bg-gray-100 text-gray-800", icon: Clock },
    awaiting_payment: { bg: "bg-blue-100 text-blue-800", icon: Timer },
    processing: { bg: "bg-yellow-100 text-yellow-800", icon: Globe },
    completed: { bg: "bg-green-100 text-green-800", icon: CheckCircle2 },
    settled: { bg: "bg-green-100 text-green-800", icon: CheckCircle2 },
    failed: { bg: "bg-red-100 text-red-800", icon: XCircle },
    expired: { bg: "bg-gray-200 text-gray-900", icon: XCircle },
    cancelled: { bg: "bg-orange-200 text-orange-900", icon: XCircle },
  };

  const variant = variants[status] || variants.pending;
  const Icon = variant.icon;

  return (
    <span className={`text-sm px-3 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit ${variant.bg}`}>
      <Icon className="h-4 w-4" />
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
