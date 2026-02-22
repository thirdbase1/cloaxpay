import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { PlatformProvider } from "@/components/platform-provider"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CloaxPay - Accept Crypto Payments Anywhere",
  description:
    "The easiest way to accept cryptocurrency payments. 200+ coins, 40+ chains, zero fees. Non-custodial and decentralized.",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon-multi.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  themeColor: "#0ea5e9",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased mobile-app-styles`}>
        <PlatformProvider>
          <div className="flex flex-col min-h-screen mobile-app-content-wrapper">
            <main className="flex-1">
              {children}
            </main>
            <MobileBottomNav />
          </div>
        </PlatformProvider>
        <Analytics />
      </body>
    </html>
  )
}
