"use client";

import { useEffect, useState } from "react";
import { Home, Compass, User, MessageSquare } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

// Initial unread counts from seed data (matches inbox/page.tsx SEED)
const SEED_UNREAD: Record<string, number> = {
  drew:   2,
  ethan:  1,
  sam:    0,
  alex:   0,
  jordan: 0,
};

const navItems = [
  { icon: Home,          label: "Home",     path: "/"          },
  { icon: Compass,       label: "Explore",  path: "/search"    },
  { icon: MessageSquare, label: "Messages", path: "/inbox"     },
  { icon: User,          label: "Profile",  path: "/inventory" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const compute = () => {
      let count = 0;
      for (const [id, initial] of Object.entries(SEED_UNREAD)) {
        // Skip deleted or blocked conversations
        if (
          localStorage.getItem(`inbox_del_${id}`) ||
          localStorage.getItem(`inbox_block_${id}`)
        ) continue;

        const isRead = !!localStorage.getItem(`inbox_read_${id}`);
        const hasDot = !!localStorage.getItem(`inbox_dot_${id}`);

        if ((!isRead && initial > 0) || hasDot) count++;
      }
      setUnreadCount(count);
    };

    compute();
    window.addEventListener("focus", compute);
    document.addEventListener("visibilitychange", compute);
    return () => {
      window.removeEventListener("focus", compute);
      document.removeEventListener("visibilitychange", compute);
    };
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass">
      <div className="flex items-center justify-around max-w-lg mx-auto py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isInbox = item.path === "/inbox";
          const isActive = isInbox
            ? pathname === "/inbox" || pathname.startsWith("/inbox/")
            : pathname === item.path;

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
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
                {/* Unread badge — only on Messages when not active */}
                {isInbox && !isActive && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-[9px] font-extrabold text-white flex items-center justify-center leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
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
