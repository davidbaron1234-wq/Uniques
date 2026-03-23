"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, ArrowLeft } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { usePreferences } from "@/lib/UserPreferencesContext";

const ONBOARDING_CATS = CATEGORIES.filter((c) => c !== "Other");

// ── Local cover images ────────────────────────────────────────────────────────
const CATEGORY_COVERS: Record<string, string> = {
  "Pokémon TCG":  "/category-covers/Pokemon Cards.png",
  "Sports Cards": "/category-covers/Sports Cards.png",
  "Other TCG":    "/category-covers/Other TCG.png",
  "Funko Pop":    "/category-covers/Funko Pop.png",
  Lego:           "/category-covers/Lego.png",
  Sneakers:       "/category-covers/Sneakers.png",
  "Video Games":  "/category-covers/Video Games.png",
  Comics:         "/category-covers/Comics.png",
  Watches:        "/category-covers/Watches.png",
  Coins:          "/category-covers/Coins.png",
};

// ── Floating hero images (Step 1) ─────────────────────────────────────────────
const FLOAT_ITEMS = [
  {
    src: "/category-covers/Pokemon Cards.png",
    label: "Pokémon",
    rotate: -18,
    x: -90,
    y: -20,
    delay: 0,
    size: 80,
  },
  {
    src: "/category-covers/Sneakers.png",
    label: "Sneakers",
    rotate: 6,
    x: 70,
    y: 10,
    delay: 0.4,
    size: 90,
  },
  {
    src: "/category-covers/Watches.png",
    label: "Watches",
    rotate: 12,
    x: -10,
    y: 60,
    delay: 0.8,
    size: 75,
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const { setFavoriteCategories } = usePreferences();
  const router = useRouter();

  const handleDiveIn = () => {
    setFavoriteCategories(selected);
    localStorage.setItem("needsTour", "true");
    localStorage.setItem("needsTour_ts", String(Date.now()));
    router.push("/");
  };

  const handleSkip = () => router.push("/");

  const toggle = (cat: string) =>
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  return (
    <div className="min-h-screen bg-[#1A1818] flex flex-col relative overflow-x-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#CAE6CE]/4 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-5 pt-12 pb-32">
        {/* ── STEP 1 ── */}
        {step === 1 && (
          <>
            <div className="flex items-center justify-center gap-3 mb-8">
              <svg width="51" height="46" viewBox="0 0 32 29" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <span className="text-xl font-extrabold tracking-tight text-cream">Uniques</span>
            </div>

            {/* Floating items */}
            <div className="relative h-52 w-full max-w-xs mx-auto my-10">
              {FLOAT_ITEMS.map((item, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{ left: "50%", top: "50%", x: item.x, y: item.y }}
                  initial={{ opacity: 0, scale: 0.6, rotate: item.rotate }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    rotate: [item.rotate, item.rotate + 4, item.rotate],
                    y: [item.y, item.y - 12, item.y],
                  }}
                  transition={{
                    opacity: { duration: 0.6, delay: item.delay },
                    scale:   { duration: 0.6, delay: item.delay },
                    rotate:  { duration: 4, repeat: Infinity, ease: "easeInOut", delay: item.delay },
                    y:       { duration: 4, repeat: Infinity, ease: "easeInOut", delay: item.delay },
                  }}
                >
                  <div
                    className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-[#221F1F]"
                    style={{ width: item.size, height: item.size }}
                  >
                    <img
                      src={item.src}
                      alt={item.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>
              ))}
              <div className="absolute inset-0 bg-[#CAE6CE]/5 blur-[80px] rounded-full pointer-events-none" />
            </div>

            <h1 className="text-3xl font-bold text-cream text-center leading-tight mb-3">
              Welcome to Uniques.
              <br />
              <span className="text-[#CAE6CE]">The Collector&apos;s Collective.</span>
            </h1>
            <p className="text-sm text-cream/45 text-center leading-relaxed max-w-xs mx-auto mb-10">
              Unlock the world of high-end collectibles. Curate your vault,
              discover rarities, and trade with Verified Collectors.
            </p>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-2xl bg-[#CAE6CE] text-[#1A1818] text-base font-bold hover:bg-[#CAE6CE]/90 active:scale-[0.98] transition-all shadow-lg mb-3"
            >
              Let&apos;s Start &rarr;
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-2.5 text-sm text-cream/30 hover:text-cream/50 transition-colors"
            >
              Skip Onboarding
            </button>
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <>
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={() => setStep(1)}
                className="p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-cream/40" />
              </button>
              <div>
                <p className="text-[10px] text-cream/30 font-bold uppercase tracking-widest">
                  Step 2 of 2
                </p>
                <h2 className="text-xl font-bold text-cream">Personalize Your Feed.</h2>
              </div>
            </div>
            <p className="text-sm text-cream/40 mb-6 pl-10">
              We&apos;ll curate trending items and trade suggestions based on what you love.
            </p>

            {/* Category grid */}
            <div className="grid grid-cols-2 gap-3">
              {ONBOARDING_CATS.map((label) => {
                const isSelected = selected.includes(label);
                const src = CATEGORY_COVERS[label];

                return (
                  <button
                    key={label}
                    onClick={() => toggle(label)}
                    aria-pressed={isSelected}
                    aria-label={label}
                    className={`relative flex flex-col bg-[#1A1818] rounded-2xl overflow-hidden aspect-[4/3] transition-all duration-300 ease-in-out active:scale-95 group ${
                      isSelected
                        ? "ring-2 ring-[#CAE6CE] ring-offset-2 ring-offset-[#1A1818] shadow-[0_0_20px_rgba(202,230,206,0.25)]"
                        : "ring-1 ring-white/[0.08] hover:ring-white/20"
                    }`}
                  >
                    {/* Image fills container; translateY lifts subject upward, extra height closes the gap */}
                    <div className="flex-grow overflow-hidden">
                      {src ? (
                        <img
                          src={src}
                          alt={label}
                          loading="lazy"
                          style={{ transform: "translateY(-16px)", height: "calc(100% + 16px)" }}
                          className={`w-full object-cover transition-all duration-300 ease-in-out ${
                            isSelected
                              ? "grayscale-0 opacity-100 scale-105"
                              : "grayscale opacity-60 group-hover:opacity-75 group-hover:grayscale-0"
                          }`}
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{ background: "linear-gradient(135deg, #2a2020 0%, #1a1818 100%)" }}
                        />
                      )}
                    </div>

                    {/* Gradient for label readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                    {/* Selected tint */}
                    {isSelected && <div className="absolute inset-0 bg-[#CAE6CE]/10 pointer-events-none" />}

                    {/* Label — plain text, zero background */}
                    <div className="absolute bottom-0 inset-x-0 p-3">
                      <p className="text-xs font-bold text-white drop-shadow-sm">{label}</p>
                    </div>

                    {/* Check badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#CAE6CE] flex items-center justify-center shadow-lg">
                        <Check className="w-3 h-3 text-[#1A1818]" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Fixed footer — step 2 */}
      {step === 2 && (
        <div className="fixed bottom-0 inset-x-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#1A1818] via-[#1A1818]/95 to-transparent z-20">
          <button
            onClick={handleDiveIn}
            className="w-full py-4 rounded-2xl bg-[#CAE6CE] text-[#1A1818] text-base font-bold hover:bg-[#CAE6CE]/90 active:scale-[0.98] transition-all shadow-lg"
          >
            {selected.length === 0
              ? "Continue \u2192"
              : `Continue with ${selected.length} selected \u2192`}
          </button>
          {selected.length === 0 && (
            <p className="text-[10px] text-cream/25 text-center mt-2">
              You can skip this — add preferences later in Settings
            </p>
          )}
        </div>
      )}
    </div>
  );
}
