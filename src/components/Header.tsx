"use client";

import { useState, useMemo, useEffect } from "react";
import { useTypewriter } from "@/hooks/useTypewriter";
import { X, User, Settings, HelpCircle, LogOut, RotateCcw, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Logo from "./Logo";
import NotificationDropdown from "./NotificationDropdown";
import { socialUsers } from "@/lib/data";
import { MasterItem } from "@/lib/catalog/types";

// ── Custom SVG Icons ──────────────────────────────────────────────────────────

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path d="M4 18C3.71667 18 3.47934 17.904 3.288 17.712C3.09667 17.52 3.00067 17.2827 3 17C2.99934 16.7173 3.09534 16.48 3.288 16.288C3.48067 16.096 3.718 16 4 16H20C20.2833 16 20.521 16.096 20.713 16.288C20.905 16.48 21.0007 16.7173 21 17C20.9993 17.2827 20.9033 17.5203 20.712 17.713C20.5207 17.9057 20.2833 18.0013 20 18H4ZM4 13C3.71667 13 3.47934 12.904 3.288 12.712C3.09667 12.52 3.00067 12.2827 3 12C2.99934 11.7173 3.09534 11.48 3.288 11.288C3.48067 11.096 3.718 11 4 11H20C20.2833 11 20.521 11.096 20.713 11.288C20.905 11.48 21.0007 11.7173 21 12C20.9993 12.2827 20.9033 12.5203 20.712 12.713C20.5207 12.9057 20.2833 13.0013 20 13H4ZM4 8C3.71667 8 3.47934 7.904 3.288 7.712C3.09667 7.52 3.00067 7.28267 3 7C2.99934 6.71733 3.09534 6.48 3.288 6.288C3.48067 6.096 3.718 6 4 6H20C20.2833 6 20.521 6.096 20.713 6.288C20.905 6.48 21.0007 6.71733 21 7C20.9993 7.28267 20.9033 7.52033 20.712 7.713C20.5207 7.90567 20.2833 8.00133 20 8H4Z" fill="currentColor"/>
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path d="M13.6199 14.5927L9.2421 10.2149C8.89465 10.4929 8.49509 10.7129 8.04341 10.875C7.59173 11.0372 7.1111 11.1183 6.60151 11.1183C5.33912 11.1183 4.27084 10.6809 3.39667 9.80631C2.5225 8.93167 2.08518 7.86339 2.08472 6.60147C2.08425 5.33954 2.52157 4.27126 3.39667 3.39663C4.27177 2.52199 5.34005 2.08467 6.60151 2.08467C7.86297 2.08467 8.93148 2.52199 9.80704 3.39663C10.6826 4.27126 11.1197 5.33954 11.1183 6.60147C11.1183 7.11105 11.0372 7.59169 10.8751 8.04337C10.7129 8.49505 10.4929 8.89461 10.2149 9.24205L14.5928 13.6199L13.6199 14.5927ZM6.60151 9.72848C7.47012 9.72848 8.20856 9.42458 8.81682 8.81678C9.42508 8.20898 9.72898 7.47054 9.72852 6.60147C9.72806 5.73239 9.42416 4.99418 8.81682 4.38685C8.20949 3.77951 7.47105 3.47538 6.60151 3.47446C5.73197 3.47353 4.99376 3.77766 4.38689 4.38685C3.78002 4.99604 3.47589 5.73424 3.4745 6.60147C3.47311 7.46869 3.77724 8.20713 4.38689 8.81678C4.99654 9.42643 5.73475 9.73033 6.60151 9.72848Z" fill="currentColor"/>
    </svg>
  );
}

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg width="32" height="29" viewBox="0 0 32 29" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path d="M16.2933 0.373009H2.61109C1.37505 0.373009 0.373047 1.37502 0.373047 2.61106V20.3029C0.373047 21.5389 1.37505 22.5409 2.61109 22.5409H16.2933C17.5293 22.5409 18.5314 21.5389 18.5314 20.3029V2.61106C18.5314 1.37502 17.5293 0.373009 16.2933 0.373009Z" fill="#CAE6CE" stroke="#221F1F" strokeWidth="0.746016" strokeMiterlimit="10"/>
      <path d="M16.0196 3.43778H2.8551V18.118H16.0196V3.43778Z" fill="#FCF9D5"/>
      <path d="M15.443 17.7794H3.43387C2.77073 17.7794 2.23315 18.317 2.23315 18.9801V18.9821C2.23315 19.6452 2.77073 20.1828 3.43387 20.1828H15.443C16.1061 20.1828 16.6437 19.6452 16.6437 18.9821V18.9801C16.6437 18.317 16.1061 17.7794 15.443 17.7794Z" fill="#AA95C5"/>
      <path d="M29.2689 7.3705L16.4044 2.71111C15.2423 2.29019 13.9589 2.89108 13.538 4.05324L7.51319 20.6876C7.09226 21.8497 7.69315 23.1331 8.85531 23.554L21.7197 28.2134C22.8819 28.6343 24.1652 28.0334 24.5861 26.8713L30.611 10.2369C31.0319 9.07477 30.431 7.79143 29.2689 7.3705Z" fill="#CAE6CE" stroke="#221F1F" strokeWidth="0.746016" strokeMiterlimit="10"/>
      <path d="M27.9669 10.159L15.5892 5.67591L10.59 19.4786L22.9677 23.9617L27.9669 10.159Z" fill="#FCF9D5"/>
      <path d="M22.54 23.4476L11.2487 19.358C10.6252 19.1322 9.93668 19.4546 9.71086 20.0781L9.71019 20.0799C9.48436 20.7034 9.80674 21.3919 10.4302 21.6178L21.7215 25.7074C22.345 25.9332 23.0335 25.6108 23.2594 24.9873L23.26 24.9855C23.4859 24.362 23.1635 23.6735 22.54 23.4476Z" fill="#AA95C5"/>
      <path d="M12.4038 16.3917C14.6182 16.3917 16.4133 14.5966 16.4133 12.3821C16.4133 10.1677 14.6182 8.37254 12.4038 8.37254C10.1893 8.37254 8.39417 10.1677 8.39417 12.3821C8.39417 14.5966 10.1893 16.3917 12.4038 16.3917Z" fill="#CAE6CE" stroke="#221F1F" strokeWidth="0.807036" strokeMiterlimit="10"/>
      <path d="M13.705 12.697L12.8074 11.142H12.2346L13.705 13.6891L15.1754 11.142H14.6026L13.705 12.697Z" fill="#221F1F" stroke="#221F1F" strokeWidth="0.147629" strokeMiterlimit="10"/>
      <path d="M11.0968 12.0672L10.2032 13.6242L9.63037 13.6261L11.0948 11.0751L12.5711 13.6183H11.9983L11.0968 12.0672Z" fill="#221F1F" stroke="#221F1F" strokeWidth="0.147629" strokeMiterlimit="10"/>
    </svg>
  );
}

// ── Accent-insensitive matching (local util) ──────────────────────────────────
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ── Collector pool (local mock — unchanged) ───────────────────────────────────
const ALL_COLLECTORS = socialUsers.map((s) => s.user);

// ─────────────────────────────────────────────────────────────────────────────

export default function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // ── Drawer profile: read same localStorage key as inventory/page.tsx ─────
  const [drawerProfile, setDrawerProfile] = useState<{ name: string; avatar: string } | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("uniques_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) setDrawerProfile({ name: parsed.name, avatar: parsed.avatar ?? session?.user?.image ?? "" });
      }
    } catch { /* ignore */ }
  }, [menuOpen]); // re-read every time the drawer opens

  // ── Catalog quick-search state ────────────────────────────────────────────
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const [quickSearchItems, setQuickSearchItems] = useState<MasterItem[]>([]);

  const router = useRouter();
  const pathname = usePathname();
  const typewriterText = useTypewriter();

  const q = headerQuery.trim();
  const showOverlay = q.length > 0 && isFocused;

  // Debounce: push headerQuery to debouncedQuery after 300 ms of quiet
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(headerQuery), 300);
    return () => clearTimeout(timer);
  }, [headerQuery]);

  // Fetch catalog items from the real API whenever debouncedQuery changes
  useEffect(() => {
    const dq = debouncedQuery.trim();
    if (dq.length < 2) {
      setQuickSearchItems([]);
      return;
    }

    const controller = new AbortController();
    setIsFetchingItems(true);

    (async () => {
      try {
        const url = `/api/catalog/search?q=${encodeURIComponent(dq)}&pageSize=4&categoryIds=1,220,64482,11116,281`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        setQuickSearchItems(data.items ?? []);
      } catch (err: unknown) {
        if (!(err instanceof Error && err.name === "AbortError")) {
          console.error("Header quick-search failed:", err);
          setQuickSearchItems([]);
        }
      } finally {
        setIsFetchingItems(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery]);

  // Collectors filtered locally (unchanged)
  const topCollectors = useMemo(() => {
    if (!q) return [];
    const nq = normalize(q);
    return ALL_COLLECTORS.filter((u) => normalize(u.name).includes(nq)).slice(0, 2);
  }, [q]);

  const navigateSearch = () => {
    if (!q) return;
    setIsFocused(false);
    setHeaderQuery("");
    const url = `/search?q=${encodeURIComponent(q)}`;
    if (pathname === "/search") {
      router.replace(url, { scroll: false });
    } else {
      router.push(url);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigateSearch();
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-[58px] bg-background shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
        {/* `relative` so the overlay can be absolutely positioned beneath */}
        <div className="relative flex items-center h-full px-[13px] gap-[9px] max-w-lg mx-auto">

          {/* ── Hamburger ────────────────────────────────────────────────── */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex-shrink-0 rounded-xl hover:bg-charcoal-light/50 transition-colors active:scale-95"
            aria-label="Open menu"
          >
            <HamburgerIcon className="w-6 h-6 text-cream" />
          </button>

          {/* ── Bell ─────────────────────────────────────────────────────── */}
          <NotificationDropdown />

          {/* ── Search pill (fills remaining space) ──────────────────────── */}
          <form
            data-tour="header-search"
            onSubmit={handleSubmit}
            className="flex-1 flex items-center gap-2 h-[30px] px-3 mr-[4px] rounded-full bg-background-light focus-within:bg-charcoal-light transition-colors"
          >
            <SearchIcon className="w-[14px] h-[14px] flex-shrink-0 text-cream/35 pointer-events-none" />
            <input
              type="search"
              name="q"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder={typewriterText}
              autoComplete="off"
              className="flex-1 min-w-0 bg-transparent text-[10px] leading-none py-0 text-cream placeholder:text-cream/35 focus:outline-none"
              aria-label="Search Uniques"
            />
          </form>

          {/* ── Logo (far right) ─────────────────────────────────────────── */}
          <LogoIcon className="flex-shrink-0 w-8 h-8" />

          {/* ── Quick search overlay ──────────────────────────────────────── */}
          {showOverlay && (
            <div className="absolute top-[calc(100%+8px)] left-4 right-4 bg-charcoal-dark border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-fade-in">

              {/* Items — live catalog results */}
              <div>
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-cream/30 uppercase tracking-widest">
                  Items
                </p>

                {isFetchingItems ? (
                  <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-cream/35">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>Searching catalog…</span>
                  </div>
                ) : quickSearchItems.length > 0 ? (
                  quickSearchItems.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={`/search?q=${encodeURIComponent(item.name)}&itemId=${encodeURIComponent(item.id)}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                        <img
                          src={item.imageSmall}
                          alt={item.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-cream/85 font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-cream/35">{item.category}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-cream/30 italic">No items found in catalog.</p>
                )}
              </div>

              {/* Collectors — unchanged local mock */}
              {topCollectors.length > 0 && (
                <div className="border-t border-white/[0.06]">
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-cream/30 uppercase tracking-widest">
                    Collectors
                  </p>
                  {topCollectors.map((user) => (
                    <Link
                      key={user.id}
                      href={`/u/${(user.handle ?? user.name).toLowerCase()}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-white/[0.08]">
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-cream/85 font-medium">{user.name}</p>
                        {user.handle && (
                          <p className="text-[10px] text-cream/35">@{user.handle}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* See all footer — always shown */}
              <div className="border-t border-white/[0.06]">
                <button
                  onClick={navigateSearch}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-primary font-semibold hover:bg-white/[0.05] transition-colors"
                >
                  <span>See all results for &ldquo;{q}&rdquo;</span>
                  <span aria-hidden>→</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </header>

      {/* ── Slide-out menu drawer ─────────────────────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="relative w-64 bg-[#1A1818] border-r border-white/[0.06] h-full shadow-2xl animate-slide-up flex flex-col">

            {/* Single top row: LogoIcon | avatar+name (link to profile) | X */}
            <div className="flex items-center gap-2 px-3 pt-5 pb-4 border-b border-white/[0.05]">
              <LogoIcon className="w-7 h-7 flex-shrink-0" />

              {session?.user ? (
                <Link
                  href="/inventory"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1.5 flex-1 min-w-0 active:opacity-70 transition-opacity"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-primary/20">
                    <img
                      src={drawerProfile?.avatar ?? session.user.image ?? session?.user?.image ?? ""}
                      alt={drawerProfile?.name ?? session.user.name ?? "Collector"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-semibold text-cream text-[13px] tracking-tight truncate leading-tight">
                    {drawerProfile?.name ?? session.user.name ?? "Collector"}
                  </span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-sm font-semibold text-primary active:opacity-70 transition-opacity"
                >
                  Sign In
                </Link>
              )}

              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-xl active:bg-white/10 transition-colors flex-shrink-0"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-cream/60" />
              </button>
            </div>

            {/* Nav items — iOS-style with dividers */}
            <nav className="flex-1 px-3">
              {[
                { icon: RotateCcw,  label: "Trade History",  href: "/history"  },
                { icon: Settings,   label: "Settings",       href: "/settings" },
                { icon: HelpCircle, label: "Help & Support", href: null        },
              ].map((item, idx, arr) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-3.5 text-cream/60 active:bg-white/10 active:scale-[0.98] active:text-cream transition-all ${
                    idx < arr.length - 1 ? "border-b border-white/[0.05]" : ""
                  }`}
                  onClick={() => { setMenuOpen(false); if (item.href) router.push(item.href); }}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-semibold text-sm tracking-wide">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Sign out */}
            <div className="border-t border-white/[0.06] p-3">
              {session?.user ? (
                <button
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white/40 active:bg-white/[0.06] active:text-white/70 transition-colors"
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/login" }); }}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-semibold text-sm tracking-wide">Sign Out</span>
                </button>
              ) : (
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-cream/40 active:bg-white/[0.06] active:text-cream transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="font-medium text-sm">Create Account</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
