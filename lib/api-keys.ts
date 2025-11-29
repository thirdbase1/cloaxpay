import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import crypto from "crypto"
import { secureCompare } from "@/lib/encryption"

export type KeyType = "public" | "secret"

export async function generateApiKey(merchantId: string, keyType: KeyType, isLive = false): Promise<string> {
  const prefix = keyType === "public" ? "pk" : "sk"
  const mode = isLive ? "live" : "test"
  const randomBytes = crypto.randomBytes(32).toString("hex")

  // The key format: pk_test_xxx or sk_live_xxx
  const keyValue = `${prefix}_${mode}_${randomBytes}`

  const supabase = await createServiceRoleClient()

  // Revoke old keys of same type
  const { error: revokeError } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("merchant_id", merchantId)
    .eq("key_type", keyType)
    .eq("is_live", isLive)
    .is("revoked_at", null)

  if (revokeError) {
    console.error("[v0] Failed to revoke old keys:", revokeError)
  }

  const { error, data } = await supabase
    .from("api_keys")
    .insert({
      merchant_id: merchantId,
      key_type: keyType,
      key_value: keyValue,
      is_live: isLive,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Failed to insert API key:", error)
    throw new Error(`Failed to generate API key: ${error.message}`)
  }

  console.log("[v0] Successfully created API key:", {
    id: data.id,
    merchant_id: merchantId,
    key_type: keyType,
    is_live: isLive,
    key_prefix: keyValue.substring(0, 15) + "...",
  })

  return keyValue
}

export async function validateApiKey(
  keyValue: string,
): Promise<{ valid: boolean; merchantId?: string; isLive?: boolean }> {
  if (!keyValue || typeof keyValue !== "string") {
    return { valid: false }
  }

  if (!/^sk_(test|live)_[a-f0-9]{64}$/.test(keyValue)) {
    console.log("[v0] Invalid key format")
    return { valid: false }
  }

  const supabase = await createServiceRoleClient()

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, merchant_id, is_live, key_type, key_value")
    .is("revoked_at", null)

  if (error || !keys) {
    console.error("[v0] API key fetch failed:", error)
    return { valid: false }
  }

  for (const key of keys) {
    // Use timing-safe comparison to prevent timing attacks
    if (secureCompare(key.key_value, keyValue)) {
      console.log("[v0] API key validated successfully for merchant:", key.merchant_id)
      return {
        valid: true,
        merchantId: key.merchant_id,
        isLive: key.is_live,
      }
    }
  }

  console.error("[v0] API key validation failed - no match found")
  return { valid: false }
}

export async function revokeApiKey(merchantId: string, keyId: string): Promise<void> {
  const supabase = await createClient()

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(keyId)) {
    throw new Error("Invalid key ID format")
  }

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("merchant_id", merchantId)

  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`)
  }

  console.log("[v0] Successfully revoked API key:", keyId)
}
