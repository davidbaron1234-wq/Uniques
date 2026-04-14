"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useInventory } from "@/lib/InventoryContext";

/**
 * Mounted once in layout — listens for ?upgraded=true on any page.
 * When detected:
 *  1. Strips the param via router.replace (no new history entry → fixes back-button loop).
 *  2. Shows a global "Welcome to Pro!" toast (skipped on /settings which has its own richer toast).
 *  3. Calls update() so the JWT/session reflects the new Pro tier immediately.
 */
export default function UpgradeSuccessHandler() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const { update }   = useSession();
  const { showToast } = useInventory();

  useEffect(() => {
    if (searchParams.get("upgraded") !== "true") return;

    // Strip ?upgraded=true immediately to prevent re-firing on back/forward
    router.replace(pathname);

    // /settings has its own richer upgrade toast — don't double-toast
    if (pathname !== "/settings") {
      showToast("Welcome to Pro! All features unlocked.");
    }

    // Refresh JWT so isPro reflects immediately without re-login
    const t = setTimeout(() => { update(); }, 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
