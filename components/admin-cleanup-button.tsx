"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export function AdminCleanupButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCleanup = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/cleanup", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Cleanup failed");
      }

      toast({
        title: "Cleanup Complete",
        description: data.message,
      });
    } catch (error) {
      toast({
        title: "Cleanup Failed",
        description: error instanceof Error ? error.message : "Failed to cleanup sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCleanup}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      Cleanup Expired Sessions
    </Button>
  );
}
