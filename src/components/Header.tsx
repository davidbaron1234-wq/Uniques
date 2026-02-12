"use client";

import { useState } from "react";
import { Menu, X, User, Settings, HelpCircle, LogOut } from "lucide-react";
import Logo from "./Logo";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-charcoal-light/30">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-charcoal-light/50 transition-colors active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-cream" />
          </button>

          <Logo />
        </div>
      </header>

      {/* Side menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="relative w-72 bg-charcoal-dark h-full shadow-2xl animate-slide-up flex flex-col">
            {/* Close button */}
            <div className="flex items-center justify-between p-4 border-b border-charcoal-light/30">
              <Logo />
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-charcoal-light/50 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-cream" />
              </button>
            </div>

            {/* User info */}
            <div className="p-4 border-b border-charcoal-light/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-mint/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-mint" />
                </div>
                <div>
                  <p className="font-bold text-cream">Collector</p>
                  <p className="text-sm text-cream/60">24 items in inventory</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <nav className="flex-1 p-2">
              {[
                { icon: User, label: "My Profile" },
                { icon: Settings, label: "Settings" },
                { icon: HelpCircle, label: "Help & Support" },
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-cream/80 hover:bg-charcoal-light/50 hover:text-cream transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Sign out */}
            <div className="p-2 border-t border-charcoal-light/30">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400/80 hover:bg-red-400/10 hover:text-red-400 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
