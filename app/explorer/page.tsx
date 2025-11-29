import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { TransactionExplorerClient } from "@/components/transaction-explorer-client"

export default function ExplorerPage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="bg-[#1e293b] text-white py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">CloaxPay Explorer</h1>
            <p className="text-slate-300 text-lg">
              The most trusted way to track your crypto payments. Search by Session ID, Transaction Hash, or Wallet
              Address.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-20 pb-12">
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <TransactionExplorerClient />
        </Suspense>
      </div>
    </div>
  )
}
