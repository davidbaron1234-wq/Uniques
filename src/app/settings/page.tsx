"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ArrowLeft, User, Shield, Bell, CreditCard,
  Eye, EyeOff, Trash2, LogOut, Zap, Check,
  Monitor, Smartphone, Globe, ChevronRight,
  ShieldCheck, AlertTriangle, Crown,
} from "lucide-react";
import Logo from "@/components/Logo";

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = "account" | "security" | "notifications" | "subscription";

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "account",       label: "Account",       icon: User       },
  { id: "security",      label: "Security",       icon: Shield     },
  { id: "notifications", label: "Alerts",         icon: Bell       },
  { id: "subscription",  label: "Plan",           icon: CreditCard },
];

// ── Mock recent logins ──────────────────────────────────────────────────────
const RECENT_LOGINS = [
  { device: "iPhone 15 Pro",   location: "Tel Aviv, IL",    time: "Now",       icon: Smartphone, current: true  },
  { device: "Chrome / macOS",  location: "Tel Aviv, IL",    time: "2h ago",    icon: Monitor,    current: false },
  { device: "Safari / iOS",    location: "Haifa, IL",       time: "Yesterday", icon: Smartphone, current: false },
  { device: "Chrome / Windows",location: "New York, US",    time: "3 days ago",icon: Globe,      current: false },
];

// ── Notification storage keys ──────────────────────────────────────────────
const NOTIF_KEYS = {
  push:   "uniques_notif_push",
  trades: "uniques_notif_trades",
  market: "uniques_notif_market",
};

function Toggle({ enabled, onToggle, disabled }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        enabled ? "bg-primary" : "bg-white/10"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const isPro = session?.user?.tier === "pro";

  // Security
  const [showOld,      setShowOld]      = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [oldPass,      setOldPass]      = useState("");
  const [newPass,      setNewPass]      = useState("");
  const [passSaved,    setPassSaved]    = useState(false);

  // Notifications
  const [notifPush,   setNotifPush]   = useState(true);
  const [notifTrades, setNotifTrades] = useState(true);
  const [notifMarket, setNotifMarket] = useState(false);

  useEffect(() => {
    try {
      setNotifPush(  localStorage.getItem(NOTIF_KEYS.push)   !== "false");
      setNotifTrades(localStorage.getItem(NOTIF_KEYS.trades) !== "false");
      setNotifMarket(localStorage.getItem(NOTIF_KEYS.market) === "true");
    } catch { /* noop */ }
  }, []);

  const saveNotif = (key: string, val: boolean) => {
    try { localStorage.setItem(key, String(val)); } catch { /* noop */ }
  };

  const handlePassSave = () => {
    if (!oldPass || !newPass) return;
    setPassSaved(true);
    setOldPass(""); setNewPass("");
    setTimeout(() => setPassSaved(false), 3000);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-xl hover:bg-white/[0.06] text-cream/50 hover:text-cream transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Logo />
          <div className="flex-1" />
          <p className="text-sm font-bold text-cream">Settings</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-[57px] z-30 bg-background/90 backdrop-blur-sm border-b border-white/[0.05]">
        <div className="flex max-w-lg mx-auto px-2 overflow-x-auto scrollbar-hide gap-1 py-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${
                activeTab === id
                  ? "bg-primary/15 text-primary border border-primary/25"
                  : "text-cream/40 hover:text-cream/60 hover:bg-white/[0.04]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-5 space-y-4 pb-10">

        {/* ── ACCOUNT ── */}
        {activeTab === "account" && (
          <>
            <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-[11px] font-bold text-cream/30 uppercase tracking-wider">Profile</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                <Row label="Email" value={session?.user?.email ?? "—"} />
                <Row label="Display Name" value={session?.user?.name ?? "—"} />
                <button
                  onClick={() => router.push("/inventory")}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors group"
                >
                  <span className="text-sm text-cream/70">Edit Display Name &amp; Avatar</span>
                  <ChevronRight className="w-4 h-4 text-cream/25 group-hover:text-cream/50 transition-colors" />
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-[11px] font-bold text-cream/30 uppercase tracking-wider">Subscription</p>
              </div>
              <button
                onClick={() => setActiveTab("subscription")}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-cream/70">Current Plan</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isPro
                      ? "text-primary bg-primary/15 border-primary/30"
                      : "text-cream/40 bg-white/[0.04] border-white/[0.08]"
                  }`}>
                    {isPro ? "Pro" : "Free"}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-cream/25 group-hover:text-cream/50 transition-colors" />
              </button>
            </div>

            {/* Danger zone */}
            <div className="rounded-3xl bg-red-500/5 border border-red-500/15 overflow-hidden">
              <div className="px-5 py-4 border-b border-red-500/10">
                <p className="text-[11px] font-bold text-red-400/60 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Danger Zone
                </p>
              </div>
              <div className="divide-y divide-red-500/10">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-5 py-4 text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-semibold">Sign Out</span>
                </button>
                <button className="w-full flex items-center gap-3 px-5 py-4 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-colors">
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Delete Account</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── SECURITY ── */}
        {activeTab === "security" && (
          <>
            <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-[11px] font-bold text-cream/30 uppercase tracking-wider">Change Password</p>
              </div>
              <div className="p-5 space-y-3">
                <PasswordInput
                  label="Current Password"
                  value={oldPass}
                  show={showOld}
                  onToggle={() => setShowOld(v => !v)}
                  onChange={setOldPass}
                />
                <PasswordInput
                  label="New Password"
                  value={newPass}
                  show={showNew}
                  onToggle={() => setShowNew(v => !v)}
                  onChange={setNewPass}
                />
                <button
                  onClick={handlePassSave}
                  disabled={!oldPass || !newPass}
                  className="w-full py-3 rounded-2xl bg-primary/15 text-primary text-sm font-bold border border-primary/25 hover:bg-primary/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {passSaved ? <><Check className="w-4 h-4" />Saved!</> : "Update Password"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-[11px] font-bold text-cream/30 uppercase tracking-wider">Recent Logins</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {RECENT_LOGINS.map((login, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${login.current ? "bg-primary/20" : "bg-white/[0.05]"}`}>
                      <login.icon className={`w-4.5 h-4.5 ${login.current ? "text-primary" : "text-cream/30"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-cream/80 truncate">{login.device}</p>
                      <p className="text-[10px] text-cream/30">{login.location}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-cream/30">{login.time}</p>
                      {login.current && (
                        <span className="text-[9px] font-bold text-green-400">Active</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeTab === "notifications" && (
          <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <p className="text-[11px] font-bold text-cream/30 uppercase tracking-wider">Notification Preferences</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              <NotifRow
                label="Push Notifications"
                description="In-app alerts and reminders"
                enabled={notifPush}
                onToggle={() => { const v = !notifPush; setNotifPush(v); saveNotif(NOTIF_KEYS.push, v); }}
              />
              <NotifRow
                label="Trade Offers"
                description="Get notified of incoming trade requests"
                enabled={notifTrades}
                onToggle={() => { const v = !notifTrades; setNotifTrades(v); saveNotif(NOTIF_KEYS.trades, v); }}
              />
              <NotifRow
                label="Market Alerts"
                description={isPro ? "Price change alerts for your watchlist" : "Pro feature — upgrade to enable"}
                enabled={notifMarket}
                onToggle={() => {
                  if (!isPro) { setActiveTab("subscription"); return; }
                  const v = !notifMarket; setNotifMarket(v); saveNotif(NOTIF_KEYS.market, v);
                }}
                proLocked={!isPro}
              />
            </div>
          </div>
        )}

        {/* ── SUBSCRIPTION ── */}
        {activeTab === "subscription" && (
          <>
            {isPro ? (
              /* ── Pro active card ── */
              <div className="relative rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/15 to-primary/10" />
                <div className="relative bg-charcoal-dark/80 border border-primary/30 rounded-3xl p-6 space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-primary" />
                        <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Uniques Pro</p>
                      </div>
                      <p className="text-2xl font-extrabold text-cream">Active</p>
                    </div>
                    <ShieldCheck className="w-10 h-10 text-primary/40" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.04] rounded-2xl p-3">
                      <p className="text-[9px] text-cream/30 uppercase tracking-wider mb-1">Next Billing</p>
                      <p className="text-sm font-bold text-cream">Apr 7, 2026</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-2xl p-3">
                      <p className="text-[9px] text-cream/30 uppercase tracking-wider mb-1">Plan Price</p>
                      <p className="text-sm font-bold text-cream">$4.99 / mo</p>
                    </div>
                  </div>
                  <button className="w-full py-3 rounded-2xl border border-white/[0.1] text-cream/50 text-sm font-semibold hover:border-white/20 hover:text-cream/70 transition-all">
                    Manage / Cancel Subscription
                  </button>
                </div>
              </div>
            ) : (
              /* ── Free plan + upgrade CTA ── */
              <>
                <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-cream">Current Plan</p>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-cream/40">Free</span>
                  </div>
                  {[
                    "Up to 10 items",
                    "Manual item search",
                    "Basic profile page",
                    "Trade messaging",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2.5">
                      <Check className="w-3.5 h-3.5 text-cream/30 flex-shrink-0" />
                      <span className="text-sm text-cream/50">{f}</span>
                    </div>
                  ))}
                </div>

                <div className="relative rounded-3xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-purple-500/10 to-primary/5 blur-[2px]" />
                  <div className="relative bg-charcoal-dark rounded-3xl p-6 border border-primary/25 space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      <p className="text-base font-extrabold text-cream">Upgrade to Pro</p>
                    </div>
                    {[
                      "Unlimited items",
                      "AI Auto-Scanner",
                      "Wall-Street Market Analytics",
                      "Pro Badge on your profile",
                      "Priority trade matching",
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-2.5">
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-sm text-cream/70">{f}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => router.push("/upgrade")}
                      className="w-full py-3.5 rounded-2xl bg-primary text-charcoal-dark font-extrabold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 relative overflow-hidden group mt-2"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <span className="relative flex items-center justify-center gap-2">
                        <Zap className="w-4 h-4" />$4.99 / month
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-sm text-cream/50">{label}</span>
      <span className="text-sm font-semibold text-cream/80 truncate max-w-[55%] text-right">{value}</span>
    </div>
  );
}

function PasswordInput({
  label, value, show, onToggle, onChange,
}: {
  label: string; value: string; show: boolean;
  onToggle: () => void; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-cream/30 uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 pr-11 rounded-2xl bg-background-light border border-white/[0.06] text-cream placeholder:text-cream/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        <button type="button" onClick={onToggle} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cream/25 hover:text-cream/50 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function NotifRow({
  label, description, enabled, onToggle, proLocked,
}: {
  label: string; description: string; enabled: boolean;
  onToggle: () => void; proLocked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-cream/80">{label}</p>
          {proLocked && (
            <span className="text-[8px] font-bold text-primary bg-primary/15 border border-primary/30 px-1.5 py-0.5 rounded-md leading-none">PRO</span>
          )}
        </div>
        <p className="text-[10px] text-cream/30 mt-0.5">{description}</p>
      </div>
      <Toggle enabled={enabled && !proLocked} onToggle={onToggle} disabled={proLocked} />
    </div>
  );
}
