import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { api_key } = await request.json();

    if (!api_key) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    const result: any = {
      valid: false,
      message: "",
      format_valid: false,
      prefix: null,
      environment: null,
      db_record: null
    };

    // 1. Check format
    if (api_key.startsWith("sk_")) {
      result.format_valid = true;
      const parts = api_key.split("_");
      if (parts.length >= 3) {
        result.prefix = parts[0];
        result.environment = parts[1];
      }
    } else {
      result.message = "Invalid format. Secret keys must start with 'sk_'";
      return NextResponse.json(result);
    }

    // 2. Check database
    const supabase = await createServiceRoleClient();
    
    // First try exact match
    const { data: exactMatch, error: exactError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_value", api_key)
      .single();

    if (exactMatch) {
      result.db_record = {
        id: exactMatch.id,
        merchant_id: exactMatch.merchant_id,
        created_at: exactMatch.created_at,
        revoked: !!exactMatch.revoked_at,
        is_live: exactMatch.is_live
      };

      if (exactMatch.revoked_at) {
        result.message = "Key exists but has been revoked";
      } else {
        result.valid = true;
        result.message = "Key is valid and active";
      }
    } else {
      // If not found, check if it exists but with whitespace issues
      const { data: fuzzyMatch } = await supabase
        .from("api_keys")
        .select("key_value")
        .ilike("key_value", `%${api_key.trim()}%`)
        .limit(1);

      if (fuzzyMatch && fuzzyMatch.length > 0) {
        result.message = "Key not found exactly, but a similar key exists. Check for whitespace.";
      } else {
        result.message = "Key not found in database";
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("[v0] Debug API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
