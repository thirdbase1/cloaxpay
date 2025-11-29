"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface UnresolvedTransaction {
  id: string;
  deposit_address: string;
  deposit_chain: string;
  amount_received: number;
  reason: string;
  status: string;
  created_at: string;
  metadata: any;
  merchants: {
    business_name: string;
    email: string;
  };
}

export default function UnresolvedPage() {
  const [transactions, setTransactions] = useState<UnresolvedTransaction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUnresolved();
  }, []);

  async function fetchUnresolved() {
    try {
      const response = await fetch("/api/admin/unresolved");
      const data = await response.json();
      if (data.unresolved) {
        setTransactions(data.unresolved);
      }
    } catch (error) {
      console.error("[v0] Failed to fetch unresolved:", error);
    }
  }

  async function resolveTransaction(id: string, resolution: "resolved" | "refunded") {
    try {
      const response = await fetch("/api/admin/unresolved/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unresolvedId: id,
          resolution,
          notes: resolutionNotes,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Transaction marked as ${resolution}`,
        });
        setSelectedId(null);
        setResolutionNotes("");
        fetchUnresolved();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resolve transaction",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-orange-500" />
        <div>
          <h1 className="text-3xl font-bold">Unresolved Transactions</h1>
          <p className="text-muted-foreground">Payments requiring manual intervention</p>
        </div>
      </div>

      <div className="grid gap-4">
        {transactions.map((tx) => (
          <Card key={tx.id} className="border-l-4 border-l-orange-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{tx.merchants.business_name}</CardTitle>
                <StatusBadge status={tx.status} />
              </div>
              <CardDescription>
                {tx.merchants.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Reason</p>
                  <Badge variant="destructive" className="mt-1">
                    {tx.reason.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">${tx.amount_received || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Chain</p>
                  <p className="font-mono text-xs">{tx.deposit_chain}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-mono text-xs truncate">{tx.deposit_address}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(tx.created_at).toLocaleString()}</p>
                </div>
              </div>

              {tx.metadata?.error_details && (
                <div className="p-3 bg-muted rounded text-sm">
                  <p className="font-semibold mb-1">Error Details:</p>
                  <p className="text-muted-foreground">{tx.metadata.error_details}</p>
                </div>
              )}

              {selectedId === tx.id ? (
                <div className="space-y-3 pt-4 border-t">
                  <Textarea
                    placeholder="Add resolution notes..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => resolveTransaction(tx.id, "resolved")}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Resolved
                    </Button>
                    <Button
                      onClick={() => resolveTransaction(tx.id, "refunded")}
                      variant="outline"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Mark Refunded
                    </Button>
                    <Button
                      onClick={() => setSelectedId(null)}
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : tx.status === "pending" ? (
                <Button
                  onClick={() => setSelectedId(tx.id)}
                  variant="outline"
                  className="w-full"
                >
                  Resolve Transaction
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {transactions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-lg font-semibold">No unresolved transactions</p>
            <p className="text-muted-foreground">All payments are processing normally</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-orange-100 text-orange-800",
    investigating: "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
    refunded: "bg-blue-100 text-blue-800",
  };

  return (
    <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
      {status}
    </Badge>
  );
}
