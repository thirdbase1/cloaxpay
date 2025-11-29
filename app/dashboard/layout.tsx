import type React from "react"
import { DashboardNav } from "@/components/dashboard-nav"
import Link from "next/link"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <header className="border-b bg-white sticky top-0 z-40">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex h-14 sm:h-16 items-center gap-4">
            {/* Mobile menu button - LEFT side */}
            <div className="lg:hidden">
              <DashboardNav />
            </div>

            {/* Logo - LEFT side */}
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-sm">
                CP
              </div>
              <h1 className="text-lg sm:text-xl font-semibold hidden sm:block">CloaxPay</h1>
            </Link>

            {/* Desktop Navigation - RIGHT side with flex-1 to push it right */}
            <div className="flex-1 hidden lg:flex justify-end">
              <DashboardNav />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="container mx-auto px-4 py-4 sm:py-6 max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
