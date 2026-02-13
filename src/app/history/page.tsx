"use client";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { tradeHistory } from "@/lib/data";
import { History, Check, X, ArrowLeftRight, DollarSign } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">
        {/* Page title */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-cream" />
            <h1 className="text-xl font-bold text-cream">Trade History</h1>
          </div>
          <p className="text-sm text-cream/50">
            {tradeHistory.length} completed trades
          </p>
        </div>

        {/* History cards */}
        <div className="space-y-3 px-4">
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
                className="rounded-2xl border border-charcoal-light/30 bg-charcoal-dark/60 overflow-hidden animate-slide-up"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationFillMode: "both",
                }}
              >
                {/* Status bar */}
                <div
                  className={`px-4 py-2 flex items-center justify-between ${
                    isAccepted ? "bg-mint/10" : "bg-red-400/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isAccepted ? (
                      <Check className="w-4 h-4 text-mint" />
                    ) : (
                      <X className="w-4 h-4 text-red-400" />
                    )}
                    <span
                      className={`text-sm font-bold ${
                        isAccepted ? "text-mint" : "text-red-400"
                      }`}
                    >
                      {isAccepted ? "Completed" : "Declined"}
                    </span>
                  </div>
                  <span className="text-xs text-cream/40">{formattedDate}</span>
                </div>

                {/* Trade details */}
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {/* From */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-lavender/20 overflow-hidden">
                          <img
                            src={trade.from.avatar}
                            alt={trade.from.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-cream/60">{trade.from.name}</span>
                      </div>
                      {trade.fromItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 bg-charcoal/40 rounded-lg p-1.5"
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-charcoal-light/30 flex-shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-[10px] text-cream/70 truncate">
                            {item.name}
                          </p>
                        </div>
                      ))}
                      {trade.fromCash > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 text-mint">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-xs font-bold">+{trade.fromCash}</span>
                        </div>
                      )}
                    </div>

                    {/* Swap icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-charcoal-light/30 flex items-center justify-center">
                      <ArrowLeftRight className="w-4 h-4 text-cream/40" />
                    </div>

                    {/* To */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-mint/20 overflow-hidden">
                          <img
                            src={trade.to.avatar}
                            alt={trade.to.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-cream/60">{trade.to.name}</span>
                      </div>
                      {trade.toItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 bg-charcoal/40 rounded-lg p-1.5"
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-charcoal-light/30 flex-shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-[10px] text-cream/70 truncate">
                            {item.name}
                          </p>
                        </div>
                      ))}
                      {trade.toCash > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 text-cream">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-xs font-bold">+{trade.toCash}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {tradeHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-charcoal-light/30 flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-cream/30" />
            </div>
            <p className="text-cream/50 font-medium">No trade history yet</p>
            <p className="text-cream/30 text-sm mt-1">
              Your completed trades will appear here
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
