import { updateSession } from "@/lib/supabase/middleware"
import { type NextRequest, NextResponse } from "next/server"

// Public paths that don't require auth
const PUBLIC_PATHS = [
  "/widget",
  "/pay",
  "/w",
  "/p",
  "/payment",
  "/dashboard/try-widget",
  "/api/widget",
  "/api/webhook",
  "/api/payment",
  "/api/chains",
  "/auth",
  "/explorer",
  "/docs",
  "/",
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path))
}

function getCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://sideshift.ai https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
}

export async function middleware(request: NextRequest) {
  // Skip auth for public paths
  if (isPublicPath(request.nextUrl.pathname)) {
    const response = NextResponse.next()

    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.set("Content-Security-Policy", getCSPHeader())
    response.headers.set("X-Permitted-Cross-Domain-Policies", "none")

    return response
  }

  // Update session for authenticated routes
  const response = await updateSession(request)

  if (response) {
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.set("Content-Security-Policy", getCSPHeader())
    response.headers.set("X-Permitted-Cross-Domain-Policies", "none")
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
