"use client";

import { useState } from "react";
import { useSearchParams } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export function ReportIssueForm() {
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get("session");
  
  const [sessionId, setSessionId] = useState(sessionIdFromUrl || "");
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [txHash, setTxHash] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!sessionId || !issueType || !description) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/issues/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          issue_type: issueType,
          description,
          tx_hash: txHash || null,
          user_email: email || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit issue");
      }

      setSubmitted(true);
      toast({
        title: "Issue reported",
        description: "We'll investigate and get back to you soon",
      });
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "Failed to submit issue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Issue Reported</h2>
            <p className="text-muted-foreground">
              We've received your report and will investigate shortly. If you provided an email, we'll update you on the progress.
            </p>
          </div>
          <Button
            onClick={() => window.location.href = "/"}
            className="mt-4"
          >
            Return to Home
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Session ID *</label>
          <Input
            type="text"
            placeholder="sess_abc123..."
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            required
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Found in your payment widget URL or transaction details
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Issue Type *</label>
          <Select value={issueType} onValueChange={setIssueType} required>
            <SelectTrigger>
              <SelectValue placeholder="Select issue type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payment_not_detected">Payment Not Detected</SelectItem>
              <SelectItem value="wrong_amount">Wrong Amount Received</SelectItem>
              <SelectItem value="stuck_transaction">Transaction Stuck</SelectItem>
              <SelectItem value="wrong_network">Sent on Wrong Network</SelectItem>
              <SelectItem value="other">Other Issue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Transaction Hash (Optional)</label>
          <Input
            type="text"
            placeholder="0x... or blockchain tx hash"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Your transaction hash from blockchain explorer
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Description *</label>
          <Textarea
            placeholder="Please describe the issue in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={5}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Your Email (Optional)</label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            We'll use this to update you on the investigation
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            Our team will investigate your issue and respond within 24 hours. Please provide as much detail as possible.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Issue Report"
          )}
        </Button>
      </form>
    </Card>
  );
}
