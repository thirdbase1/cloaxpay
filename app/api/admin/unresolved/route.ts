import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: unresolved, error } = await supabase
      .from("unresolved_transactions")
      .select("*, merchants(business_name, email)")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ unresolved });
  } catch (error) {
    console.error("[v0] Failed to fetch unresolved:", error);
    return NextResponse.json(
      { error: "Failed to fetch unresolved transactions" },
      { status: 500 }
    );
  }
}
