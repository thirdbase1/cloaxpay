"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

const PlatformContext = createContext({ isMobileApp: false })

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [isMobileApp, setIsMobileApp] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const isMobile = params.get("platform") === "mobile"

      // Also check for Capacitor or common WebView indicators
      const isCapacitor = !!(window as any).Capacitor
      const isWebView = /Capacitor|wv/.test(navigator.userAgent)

      if (isMobile || isCapacitor || isWebView) {
        setIsMobileApp(true)
        document.body.classList.add("mobile-app-mode")
      }
    }
  }, [])

  return (
    <PlatformContext.Provider value={{ isMobileApp }}>
      {children}
    </PlatformContext.Provider>
  )
}

export const usePlatform = () => useContext(PlatformContext)
