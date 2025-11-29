import { createServiceRoleClient } from "@/lib/supabase/server";
import { createSideShiftClient } from "@/lib/sideshift";

export async function cleanupExpiredSessions() {
  const supabase = createServiceRoleClient();
  const sideshift = createSideShiftClient();

  // Find expired sessions (older than 15 minutes) that are ONLY pending (no deposit address generated)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: expiredSessions } = await supabase
    .from("payment_sessions")
    .select("id, session_id, metadata, status")
    .eq("status", "pending") // ONLY cancel pending sessions (no address generated)
    .lt("created_at", fifteenMinutesAgo);

  if (!expiredSessions || expiredSessions.length === 0) {
    return { cleaned: 0 };
  }

  let cleaned = 0;

  for (const session of expiredSessions) {
    try {
      // Cancel SideShift shift if exists
      const shiftId = session.metadata?.shift_id;
      if (shiftId) {
        await sideshift.cancelShift(shiftId);
      }

      // Update session status
      await supabase
        .from("payment_sessions")
        .update({ 
          status: "expired",
          updated_at: new Date().toISOString()
        })
        .eq("id", session.id);

      cleaned++;
    } catch (error) {
      console.error(`[v0] Failed to cleanup session ${session.session_id}:`, error);
    }
  }

  return { cleaned };
}
