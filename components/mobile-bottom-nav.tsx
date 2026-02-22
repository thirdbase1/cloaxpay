"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Activity, Search, Settings, Key } from "lucide-react"
import { usePlatform } from "./platform-provider"

const mobileNavItems = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Activity", href: "/dashboard/transactions", icon: Activity },
  { title: "Explorer", href: "/explorer", icon: Search },
  { title: "API", href: "/dashboard/api-keys", icon: Key },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { isMobileApp } = usePlatform()

  const hideOnPaths = ["/auth", "/pay/", "/p/", "/widget/"]
  const shouldHide = hideOnPaths.some(path => pathname.startsWith(path))

  if (!isMobileApp || shouldHide) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 px-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors",
                isActive ? "text-blue-600" : "text-gray-500"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "animate-in zoom-in duration-300")} />
              <span className="text-[10px] font-medium leading-none">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
