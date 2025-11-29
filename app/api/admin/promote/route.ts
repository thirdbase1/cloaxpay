import { type NextRequest, NextResponse } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { logActivity, getRequestInfo } from "@/lib/activity-logger"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if current user is admin
    const { data: merchant } = await supabase
      .from("merchants")
      .select("is_admin, email, business_name")
      .eq("id", user.id)
      .single()

    if (!merchant?.is_admin) {
      const { ipAddress, userAgent } = getRequestInfo(request)

      // Log unauthorized admin attempt
      await logActivity({
        merchantId: user.id,
        activityType: "security_alert",
        entityType: "admin",
        description: "Unauthorized admin promotion attempt",
        metadata: { attempted_by: user.email },
        ipAddress,
        userAgent,
      })

      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Use service role to update
    const supabaseAdmin = createServiceRoleClient()

    // Check if target user exists
    const { data: targetUser } = await supabaseAdmin
      .from("merchants")
      .select("id, email, is_admin")
      .eq("email", email)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (targetUser.is_admin) {
      return NextResponse.json({ error: "User is already an admin" }, { status: 400 })
    }

    // Promote user to admin
    const { error: updateError } = await supabaseAdmin
      .from("merchants")
      .update({ is_admin: true, updated_at: new Date().toISOString() })
      .eq("email", email)

    if (updateError) {
      console.error("[v0] Failed to promote user:", updateError)
      throw updateError
    }

    const { ipAddress, userAgent } = getRequestInfo(request)

    // Log admin promotion
    await logActivity({
      merchantId: user.id,
      activityType: "admin_action",
      entityType: "admin",
      entityId: targetUser.id,
      description: `Promoted ${email} to admin`,
      metadata: {
        promoted_by: user.email,
        promoted_user: email,
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      message: `Successfully promoted ${email} to admin`,
    })
  } catch (error) {
    console.error("[v0] Promote admin error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
