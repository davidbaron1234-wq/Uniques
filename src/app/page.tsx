"use client";

import { useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import TradeOfferCard from "@/components/TradeOfferCard";
import { tradeOffers } from "@/lib/data";
import { ArrowLeftRight } from "lucide-react";

export default function HomePage() {
  const [offers, setOffers] = useState(tradeOffers);

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5 mb-1">
            <ArrowLeftRight className="w-5 h-5 text-surface-light" />
            <h1 className="text-xl font-bold text-cream">Trade Offers</h1>
          </div>
          <p className="text-sm text-cream/40 font-medium">
            {offers.filter((o) => o.status === "pending").length} pending offers
          </p>
        </div>

        <div className="space-y-0">
          {offers.map((offer, i) => (
            <TradeOfferCard
              key={offer.id}
              offer={offer}
              index={i}
              onAccept={(id) =>
                setOffers((prev) =>
                  prev.map((o) => (o.id === id ? { ...o, status: "accepted" as const } : o))
                )
              }
              onDecline={(id) =>
                setOffers((prev) =>
                  prev.map((o) => (o.id === id ? { ...o, status: "declined" as const } : o))
                )
              }
              onCounter={() => {}}
            />
          ))}
        </div>

        {offers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-background-light flex items-center justify-center mb-4 shadow-soft">
              <ArrowLeftRight className="w-8 h-8 text-cream/20" />
            </div>
            <p className="text-cream/40 font-medium">No trade offers yet</p>
            <p className="text-cream/25 text-sm mt-1">
              Mark items as &quot;Up for Trade&quot; to start receiving offers
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
