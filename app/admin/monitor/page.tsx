"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink } from 'lucide-react';

interface Transaction {
  id: string;
  deposit_tx_hash: string;
  deposit_amount: number;
  status: string;
  created_at: string;
  payment_sessions: {
    session_id: string;
    merchants: {
      business_name: string;
    };
  };
}

export default function MonitorPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchTransactions() {
    try {
      const response = await fetch("/api/admin/transactions");
      const data = await response.json();
      if (data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("[v0] Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transaction Monitor</h1>
          <p className="text-muted-foreground">Real-time transaction pipeline monitoring</p>
        </div>
        <Button onClick={fetchTransactions} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {transactions.map((tx) => (
          <Card key={tx.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {tx.payment_sessions.merchants.business_name}
                </CardTitle>
                <StatusBadge status={tx.status} />
              </div>
              <CardDescription>
                Session: {tx.payment_sessions.session_id}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">${tx.deposit_amount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">TX Hash</p>
                  <p className="font-mono text-xs truncate">{tx.deposit_tx_hash || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/admin/transactions/${tx.id}`}>
                      View Details <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && transactions.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No transactions to monitor
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    detected: "bg-blue-100 text-blue-800",
    confirming: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    swapping: "bg-purple-100 text-purple-800",
    settled: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    unresolved: "bg-orange-100 text-orange-800",
  };

  return (
    <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
      {status}
    </Badge>
  );
}
