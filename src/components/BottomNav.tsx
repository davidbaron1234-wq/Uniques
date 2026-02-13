"use client";

import { Search, Home, Package, History } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { icon: Search, label: "Search", path: "/search" },
  { icon: Home, label: "Home", path: "/" },
  { icon: Package, label: "Inventory", path: "/inventory" },
  { icon: History, label: "History", path: "/history" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass">
      <div className="flex items-center justify-around max-w-lg mx-auto py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200 min-w-[4.5rem] ${
                isActive ? "text-primary" : "text-cream/35 hover:text-cream/60"
              }`}
            >
              <div className="relative">
                <item.icon
                  className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={`text-[10px] leading-tight ${isActive ? "font-bold" : "font-normal"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
