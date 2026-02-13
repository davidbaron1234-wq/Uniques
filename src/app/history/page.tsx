"use client";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { tradeHistory } from "@/lib/data";
import { formatValue } from "@/lib/format";
import { History, Check, X, ArrowLeftRight, DollarSign } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5 mb-1">
            <History className="w-5 h-5 text-cream/70" />
            <h1 className="text-xl font-bold text-cream">Trade History</h1>
          </div>
          <p className="text-sm text-cream/40 font-medium">
            {tradeHistory.length} completed trades
          </p>
        </div>

        <div className="space-y-3 px-5">
          {tradeHistory.map((trade, i) => {
            const isAccepted = trade.status === "accepted";
            const date = new Date(trade.completedAt);
            const formattedDate = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={trade.id}
                className="rounded-2xl bg-background-light shadow-soft overflow-hidden animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}
              >
                <div className={`px-5 py-2.5 flex items-center justify-between ${isAccepted ? "bg-primary/8" : "bg-red-400/8"}`}>
                  <div className="flex items-center gap-2">
                    {isAccepted ? <Check className="w-4 h-4 text-primary" /> : <X className="w-4 h-4 text-red-400" />}
                    <span className={`text-sm font-bold ${isAccepted ? "text-primary" : "text-red-400"}`}>
                      {isAccepted ? "Completed" : "Declined"}
                    </span>
                  </div>
                  <span className="text-xs text-cream/30">{formattedDate}</span>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-surface/20 overflow-hidden">
                          <img src={trade.from.avatar} alt={trade.from.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs text-cream/50 font-medium">{trade.from.name}</span>
                      </div>
                      {trade.fromItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 bg-charcoal-dark/40 rounded-xl p-2">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-charcoal-light/20 flex-shrink-0">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-cream/60 truncate font-medium">{item.name}</p>
                            {item.estimatedValue && (
                              <p className="text-[9px] text-primary/60 font-semibold">{formatValue(item.estimatedValue)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {trade.fromCash > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-primary">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-xs font-bold">+{trade.fromCash.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background flex items-center justify-center">
                      <ArrowLeftRight className="w-4 h-4 text-cream/30" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 overflow-hidden">
                          <img src={trade.to.avatar} alt={trade.to.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs text-cream/50 font-medium">{trade.to.name}</span>
                      </div>
                      {trade.toItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 bg-charcoal-dark/40 rounded-xl p-2">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-charcoal-light/20 flex-shrink-0">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-cream/60 truncate font-medium">{item.name}</p>
                            {item.estimatedValue && (
                              <p className="text-[9px] text-primary/60 font-semibold">{formatValue(item.estimatedValue)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {trade.toCash > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-cream/70">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-xs font-bold">+{trade.toCash.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {tradeHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-background-light flex items-center justify-center mb-4 shadow-soft">
              <History className="w-8 h-8 text-cream/20" />
            </div>
            <p className="text-cream/40 font-medium">No trade history yet</p>
            <p className="text-cream/25 text-sm mt-1">Your completed trades will appear here</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
