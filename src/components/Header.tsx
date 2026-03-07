"use client";

import { useState, useMemo, useEffect } from "react";
import { Menu, X, User, Settings, HelpCircle, LogOut, History, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Logo from "./Logo";
import NotificationDropdown from "./NotificationDropdown";
import { useTypewriter } from "@/hooks/useTypewriter";
import { socialUsers } from "@/lib/data";
import { MasterItem } from "@/lib/catalog/types";

// ── Accent-insensitive matching (local util) ──────────────────────────────────
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ── Collector pool (local mock — unchanged) ───────────────────────────────────
const ALL_COLLECTORS = socialUsers.map((s) => s.user);

// ─────────────────────────────────────────────────────────────────────────────

export default function Header() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

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

  // Navigate to full Explore results and close overlay.
  // If already on /search, use replace+scroll:false for seamless in-place update
  // (no remount, no scroll-to-top, just the URL + searchParams update).
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
      <header className="sticky top-0 z-50 glass">
        {/* `relative` so the overlay can be absolutely positioned beneath */}
        <div className="relative flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">

          {/* ── Hamburger ────────────────────────────────────────────────── */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex-shrink-0 p-2 rounded-xl hover:bg-charcoal-light/50 transition-colors active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-cream" />
          </button>

          {/* ── Real search pill ─────────────────────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.07] focus-within:bg-white/[0.11] transition-all"
          >
            <Search className="w-4 h-4 flex-shrink-0 text-cream/35 pointer-events-none" />
            <input
              type="search"
              name="q"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder={typewriterText}
              autoComplete="off"
              className="flex-1 min-w-0 bg-transparent text-sm text-cream placeholder:text-cream/35 focus:outline-none"
              aria-label="Search Uniques"
            />
          </form>

          {/* ── Notification bell ────────────────────────────────────────── */}
          <NotificationDropdown />

          {/* ── Auth state indicator ─────────────────────────────────────── */}
          {status === "authenticated" && session?.user ? (
            <button
              onClick={() => setMenuOpen(true)}
              className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-primary/40 hover:border-primary/70 transition-colors active:scale-95"
              aria-label="Open menu"
            >
              {session.user.image ? (
                <img src={session.user.image} alt={session.user.name ?? "User"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>
          ) : status === "unauthenticated" ? (
            <Link
              href="/login"
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-primary/15 text-primary text-xs font-bold hover:bg-primary/25 active:scale-95 transition-all border border-primary/25"
            >
              Sign In
            </Link>
          ) : null}

          {/* ── Logo icon mark ───────────────────────────────────────────── */}
          <div className="flex-shrink-0">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="4" width="18" height="24" rx="3" fill="#AA95C5" opacity="0.7" />
              <rect x="8" y="8" width="18" height="24" rx="3" fill="#CAE6CE" />
              <path d="M20 16L24 18L20 20" stroke="#221F1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 20L12 18L16 16" stroke="#221F1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="13" x2="22" y2="13" stroke="#221F1F" strokeWidth="1" opacity="0.3" />
              <line x1="12" y1="24" x2="22" y2="24" stroke="#221F1F" strokeWidth="1" opacity="0.3" />
            </svg>
          </div>

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
          <div className="relative w-72 bg-charcoal-dark h-full shadow-soft-xl animate-slide-up flex flex-col">
            <div className="flex items-center justify-between p-5">
              <Logo />
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-xl hover:bg-charcoal-light/50 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-cream" />
              </button>
            </div>

            <div className="px-5 pb-5">
              {session?.user ? (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-background-light">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-primary/20 flex items-center justify-center">
                    {session.user.image ? (
                      <img src={session.user.image} alt={session.user.name ?? "User"} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-cream text-sm truncate">{session.user.name ?? "Collector"}</p>
                    <p className="text-xs text-cream/40 truncate">{session.user.email}</p>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-primary/15 text-primary text-sm font-bold border border-primary/25 hover:bg-primary/25 transition-all"
                >
                  Sign In to your account
                </Link>
              )}
            </div>

            <nav className="flex-1 px-3 space-y-0.5">
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-cream/60 hover:bg-background-light hover:text-cream transition-colors"
                onClick={() => { setMenuOpen(false); router.push("/history"); }}
              >
                <History className="w-5 h-5" />
                <span className="font-medium text-sm flex-1 text-left">Trade History</span>
              </button>

              {[
                { icon: User,        label: "My Profile",     href: "/inventory" },
                { icon: Settings,    label: "Settings",       href: "/settings"  },
                { icon: HelpCircle,  label: "Help & Support", href: null         },
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-cream/60 hover:bg-background-light hover:text-cream transition-colors"
                  onClick={() => { setMenuOpen(false); if (item.href) router.push(item.href); }}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-3 border-t border-charcoal-light/20">
              {session?.user ? (
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400/70 hover:bg-red-400/10 hover:text-red-400 transition-colors"
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/login" }); }}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium text-sm">Sign Out</span>
                </button>
              ) : (
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-cream/50 hover:bg-background-light hover:text-cream transition-colors"
                >
                  <User className="w-5 h-5" />
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
