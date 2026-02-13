"use client";

import { useState } from "react";
import { Menu, X, User, Settings, HelpCircle, LogOut } from "lucide-react";
import Logo from "./Logo";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass">
        <div className="flex items-center justify-between px-5 py-3.5 max-w-lg mx-auto">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-xl hover:bg-charcoal-light/50 transition-colors active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-cream" />
          </button>
          <Logo />
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="relative w-72 bg-charcoal-dark h-full shadow-soft-xl animate-slide-up flex flex-col">
            <div className="flex items-center justify-between p-5">
              <Logo />
              <button onClick={() => setMenuOpen(false)} className="p-2 rounded-xl hover:bg-charcoal-light/50 transition-colors" aria-label="Close menu">
                <X className="w-5 h-5 text-cream" />
              </button>
            </div>

            <div className="px-5 pb-5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-background-light">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-cream text-sm">Collector</p>
                  <p className="text-xs text-cream/40">Premium Member</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-3">
              {[
                { icon: User, label: "My Profile" },
                { icon: Settings, label: "Settings" },
                { icon: HelpCircle, label: "Help & Support" },
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-cream/60 hover:bg-background-light hover:text-cream transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-3 border-t border-charcoal-light/20">
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400/70 hover:bg-red-400/10 hover:text-red-400 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
