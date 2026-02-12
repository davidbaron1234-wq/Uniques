"use client";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo icon: two cards with exchange arrows */}
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Back card */}
        <rect x="10" y="4" width="18" height="24" rx="3" fill="#AA95C5" opacity="0.7" />
        {/* Front card */}
        <rect x="8" y="8" width="18" height="24" rx="3" fill="#CAE6CE" />
        {/* Arrow right */}
        <path d="M20 16L24 18L20 20" stroke="#321F1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Arrow left */}
        <path d="M16 20L12 18L16 16" stroke="#321F1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Lines on card */}
        <line x1="12" y1="13" x2="22" y2="13" stroke="#321F1F" strokeWidth="1" opacity="0.3" />
        <line x1="12" y1="24" x2="22" y2="24" stroke="#321F1F" strokeWidth="1" opacity="0.3" />
      </svg>
      <span className="text-xl font-bold tracking-tight text-cream">
        Uniques
      </span>
    </div>
  );
}
