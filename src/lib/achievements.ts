import {
  Crown, Zap, Flame, Globe, Target, TrendingUp, Rocket,
  Heart, Gem, Telescope, ArrowLeftRight, ShieldCheck, Shield, Star, Database,
  type LucideIcon,
} from "lucide-react";

export type Achievement = {
  id:            string;
  title:         string;
  description:   string;
  icon:          LucideIcon;
  status:        "unlocked" | "locked";
  /** Tailwind color class for icon when unlocked */
  color:         string;
  /** rgba() string used for box-shadow / border glow */
  glow:          string;
  unlockedAt?:   string;
  catalystItem?: { name: string; imageUrl: string };
};

export const ACHIEVEMENTS: Achievement[] = [
  // ── Unlocked ──────────────────────────────────────────────────────────
  {
    id:          "heavyweight",
    title:       "The Heavyweight",
    description: "Surpass $50,000 in total collection value",
    icon:        Crown,
    status:      "unlocked",
    color:       "text-[#D4AF37]",
    glow:        "rgba(212,175,55,0.35)",
    unlockedAt:  "Feb 12, 2026",
    catalystItem: {
      name:     "Rolex Datejust 41",
      imageUrl: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=200&q=80",
    },
  },
  {
    id:          "dealmaker",
    title:       "Dealmaker",
    description: "Complete 10 successful trades",
    icon:        Zap,
    status:      "unlocked",
    color:       "text-primary",
    glow:        "rgba(202,230,206,0.3)",
    unlockedAt:  "Jan 3, 2026",
    catalystItem: {
      name:     "Mew ex SAR",
      imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png",
    },
  },
  {
    id:          "first-blood",
    title:       "First Blood",
    description: "Complete your very first trade",
    icon:        Flame,
    status:      "unlocked",
    color:       "text-orange-400",
    glow:        "rgba(251,146,60,0.35)",
    unlockedAt:  "Sep 14, 2024",
    catalystItem: {
      name:     "Charizard VMAX Rainbow",
      imageUrl: "https://images.pokemontcg.io/swsh35/74_hires.png",
    },
  },
  {
    id:          "high-roller",
    title:       "High Roller",
    description: "Propose a trade with a total value over $10,000",
    icon:        TrendingUp,
    status:      "unlocked",
    color:       "text-emerald-400",
    glow:        "rgba(52,211,153,0.3)",
    unlockedAt:  "Dec 1, 2025",
    catalystItem: {
      name:     "LEGO Millennium Falcon #75192",
      imageUrl: "https://cdn.rebrickable.com/media/sets/75192-1.jpg",
    },
  },
  {
    id:          "early-adopter",
    title:       "Early Adopter",
    description: "Joined Uniques during the Beta phase",
    icon:        Rocket,
    status:      "unlocked",
    color:       "text-violet-400",
    glow:        "rgba(167,139,250,0.35)",
    unlockedAt:  "Aug 1, 2024",
  },
  // ── Locked ────────────────────────────────────────────────────────────
  {
    id:          "sniper",
    title:       "The Sniper",
    description: "Secure a Grail directly from your Radar",
    icon:        Target,
    status:      "locked",
    color:       "text-rose-400",
    glow:        "rgba(251,113,133,0.3)",
  },
  {
    id:          "worldwide",
    title:       "Mr. Worldwide",
    description: "Complete an international trade",
    icon:        Globe,
    status:      "locked",
    color:       "text-sky-400",
    glow:        "rgba(56,189,248,0.3)",
  },
  {
    id:          "curator",
    title:       "The Curator",
    description: "Add 50 items to your collection",
    icon:        Database,
    status:      "locked",
    color:       "text-purple-400",
    glow:        "rgba(192,132,252,0.3)",
  },
  {
    id:          "trendsetter",
    title:       "Trendsetter",
    description: "Receive 100 total likes across your Feed posts",
    icon:        Heart,
    status:      "locked",
    color:       "text-pink-400",
    glow:        "rgba(244,114,182,0.3)",
  },
  {
    id:          "diamond-hands",
    title:       "Diamond Hands",
    description: "Hold an item for over 1 year without trading it",
    icon:        Gem,
    status:      "locked",
    color:       "text-cyan-400",
    glow:        "rgba(34,211,238,0.3)",
  },
  {
    id:          "whale-watcher",
    title:       "Whale Watcher",
    description: "Follow 5 users with collections over $1M",
    icon:        Telescope,
    status:      "locked",
    color:       "text-blue-400",
    glow:        "rgba(96,165,250,0.3)",
  },
  {
    id:          "the-negotiator",
    title:       "The Negotiator",
    description: "Successfully counter-offer and close a deal",
    icon:        ArrowLeftRight,
    status:      "locked",
    color:       "text-amber-400",
    glow:        "rgba(251,191,36,0.3)",
  },
  {
    id:          "flawless",
    title:       "Flawless",
    description: "Own 10 items graded PSA 10 or BGS 9.5+",
    icon:        ShieldCheck,
    status:      "locked",
    color:       "text-teal-400",
    glow:        "rgba(45,212,191,0.3)",
  },
  {
    id:          "mint-condition",
    title:       "Mint Condition",
    description: "Add 5 PSA 10 graded items to your collection",
    icon:        Shield,
    status:      "locked",
    color:       "text-surface-light",
    glow:        "rgba(170,149,197,0.3)",
  },
  {
    id:          "completionist",
    title:       "Completionist",
    description: "Complete a full Pokémon set from a single era",
    icon:        Star,
    status:      "locked",
    color:       "text-yellow-300",
    glow:        "rgba(253,224,71,0.3)",
  },
];
