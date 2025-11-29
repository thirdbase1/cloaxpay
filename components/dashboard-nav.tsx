"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Key, Activity, Settings, TestTube, Globe, Search, Menu, X } from "lucide-react"
import { useState } from "react"

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Transactions", href: "/dashboard/transactions", icon: Activity },
  { title: "Explorer", href: "/explorer", icon: Search },
  { title: "API Keys", href: "/dashboard/api-keys", icon: Key },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
  { title: "Test Widget", href: "/dashboard/try-widget", icon: TestTube },
  { title: "Integration", href: "/dashboard/integration", icon: Globe },
]

export function DashboardNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop Navigation - horizontal links */}
      <nav className="hidden lg:flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* Mobile/Tablet Navigation - Button on LEFT */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </button>

        {mobileOpen && (
          <>
            {/* Backdrop - highest z-index */}
            <div className="fixed inset-0 bg-black/60" style={{ zIndex: 9998 }} onClick={() => setMobileOpen(false)} />

            {/* Sidebar panel - SOLID WHITE, highest z-index */}
            <div
              className="fixed top-0 left-0 h-full w-[280px] max-w-[85vw] bg-white shadow-2xl flex flex-col"
              style={{ zIndex: 9999 }}
            >
              {/* Header with close button */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="h-9 w-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors bg-white"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
                <span className="font-bold text-lg text-gray-900">CloaxPay</span>
              </div>

              {/* Nav items */}
              <nav className="flex-1 p-4 overflow-y-auto bg-white">
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                          isActive ? "bg-blue-500 text-white shadow-md" : "text-gray-700 hover:bg-gray-100",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    )
                  })}
                </div>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <p className="text-xs text-gray-500 text-center">Powered by SideShift.ai</p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
