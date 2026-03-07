"use client";

import { useInventory } from "@/lib/InventoryContext";

/**
 * Global toast renderer — reads the singleton `toast` string from
 * InventoryContext and shows a slide-up pill above the bottom nav.
 * Auto-clears after 3 s (managed by the context's own timer).
 * Rendered once inside <InventoryProvider> in layout.tsx.
 */
export default function ToastOverlay() {
  const { toast } = useInventory();

  if (!toast) return null;

  return (
    <div className="fixed bottom-24 inset-x-0 z-[300] flex justify-center pointer-events-none px-5">
      <div className="animate-slide-up bg-charcoal-dark/95 border border-white/[0.12] text-cream text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl backdrop-blur-sm max-w-sm text-center">
        {toast}
      </div>
    </div>
  );
}
