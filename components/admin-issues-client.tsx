"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Issue {
  id: string;
  session_id: string;
  issue_type: string;
  description: string;
  tx_hash: string | null;
  user_email: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  merchants?: { business_name: string; email: string };
}

export function AdminIssuesClient({ initialIssues }: { initialIssues: Issue[] }) {
  const [issues, setIssues] = useState(initialIssues);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  async function handleResolve(issueId: string, newStatus: string) {
    try {
      const response = await fetch("/api/admin/issues/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue_id: issueId,
          status: newStatus,
          admin_notes: notes || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update issue");

      setIssues(issues.map(issue => 
        issue.id === issueId 
          ? { ...issue, status: newStatus, admin_notes: notes }
          : issue
      ));

      setSelectedIssue(null);
      setNotes("");

      toast({
        title: "Issue updated",
        description: `Status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update issue status",
        variant: "destructive",
      });
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      investigating: "bg-blue-100 text-blue-800 border-blue-200",
      resolved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  }

  const pendingIssues = issues.filter(i => i.status === "pending");
  const otherIssues = issues.filter(i => i.status !== "pending");

  return (
    <div className="space-y-6">
      {/* Pending Issues */}
      {pendingIssues.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Issues ({pendingIssues.length})</h2>
          <div className="space-y-4">
            {pendingIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                isSelected={selectedIssue === issue.id}
                onSelect={setSelectedIssue}
                notes={notes}
                onNotesChange={setNotes}
                onResolve={handleResolve}
                getStatusColor={getStatusColor}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Issues */}
      {otherIssues.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Resolved/Investigating ({otherIssues.length})</h2>
          <div className="space-y-4">
            {otherIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                isSelected={false}
                onSelect={() => {}}
                notes=""
                onNotesChange={() => {}}
                onResolve={() => {}}
                getStatusColor={getStatusColor}
                readOnly
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IssueCard({ 
  issue, 
  isSelected, 
  onSelect, 
  notes, 
  onNotesChange,
  onResolve,
  getStatusColor,
  readOnly = false,
}: {
  issue: Issue;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onResolve: (id: string, status: string) => void;
  getStatusColor: (status: string) => string;
  readOnly?: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-mono text-sm font-semibold">{issue.session_id}</h3>
            <Badge className={getStatusColor(issue.status)}>
              {issue.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(issue.created_at), "PPpp")}
          </p>
          {issue.merchants && (
            <p className="text-sm text-muted-foreground mt-1">
              Merchant: {issue.merchants.business_name} ({issue.merchants.email})
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">Issue Type</p>
          <p className="text-sm">{issue.issue_type.replace(/_/g, " ").toUpperCase()}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">Description</p>
          <p className="text-sm">{issue.description}</p>
        </div>

        {issue.tx_hash && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Transaction Hash</p>
            <p className="text-sm font-mono break-all">{issue.tx_hash}</p>
          </div>
        )}

        {issue.user_email && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">User Email</p>
            <p className="text-sm">{issue.user_email}</p>
          </div>
        )}

        {issue.admin_notes && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Admin Notes</p>
            <p className="text-sm">{issue.admin_notes}</p>
          </div>
        )}

        {!readOnly && (
          <div className="pt-4 border-t space-y-3">
            {!isSelected ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => onSelect(issue.id)}
                  variant="outline"
                  size="sm"
                >
                  Investigate
                </Button>
                <Button
                  onClick={() => window.location.href = `/explorer?q=${issue.session_id}`}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Transaction
                </Button>
              </div>
            ) : (
              <>
                <Textarea
                  placeholder="Add admin notes..."
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => onResolve(issue.id, "resolved")}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                  <Button
                    onClick={() => onResolve(issue.id, "investigating")}
                    size="sm"
                    variant="outline"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Mark Investigating
                  </Button>
                  <Button
                    onClick={() => onResolve(issue.id, "rejected")}
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => onSelect(null)}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
