"use client";

import { useRef } from "react";
import { DollarSign, FileText, Shield, Tag, Camera, ImagePlus, Trash2, Calendar, Layers, Award } from "lucide-react";
import { ItemStatus } from "@/lib/types";

export interface ItemConfig {
  askingPrice: number | undefined;
  condition: string;
  status: ItemStatus;
  notes: string;
  customImage?: string;
  year?: string;
  pieces?: string;
  graded?: boolean;
  grader?: string;
  gradeNum?: string;
}

interface ItemConfigFormProps {
  config: ItemConfig;
  onChange: (config: ItemConfig) => void;
  category?: string;
}

// ── הגדרות מצב לפי קטגוריה ──

const CARD_CONDITIONS = [
  { value: "Mint", label: "Mint (M)" },
  { value: "Near Mint", label: "Near Mint (NM)" },
  { value: "Lightly Played", label: "Lightly Played (LP)" },
  { value: "Played", label: "Played (MP)" },
  { value: "Damaged", label: "Damaged (HP)" },
];

const FUNKO_CONDITIONS = [
  { value: "Mint Box", label: "Mint Box 📦" },
  { value: "Damaged Box", label: "Damaged Box 💥" },
  { value: "Out of Box", label: "Out of Box (OOB) 🧘" },
];

const LEGO_CONDITIONS = [
  { value: "Sealed", label: "Sealed (NIB) ✨" },
  { value: "Complete", label: "Built (Complete) ✅" },
  { value: "Incomplete", label: "Incomplete ⚠️" },
];

const GAME_CONDITIONS = [
  { value: "Sealed", label: "Sealed 🔒" },
  { value: "CIB", label: "Complete (CIB) 💿" },
  { value: "No Manual", label: "Boxed (No Manual) 📄" },
  { value: "Loose", label: "Loose (Disc/Cart) 💾" },
];

const SNEAKER_CONDITIONS = [
  { value: "Deadstock", label: "Deadstock (New) 👟" },
  { value: "VNDS", label: "VNDS (Tried On) ✨" },
  { value: "Used", label: "Used / Worn 🚶" },
  { value: "Beaters", label: "Beaters 💀" },
];

const COMIC_CONDITIONS = [
  { value: "Near Mint", label: "Near Mint (9.0+) 💎" },
  { value: "Very Fine", label: "Very Fine (7.0-9.0) ✨" },
  { value: "Fine", label: "Fine (5.0-7.0) 👌" },
  { value: "Reader", label: "Reader Copy 📖" },
];

const WATCH_CONDITIONS = [
  { value: "New", label: "Brand New ⌚" },
  { value: "Box & Papers", label: "Box & Papers ✅" },
  { value: "Watch Only", label: "Watch Only 🛑" },
  { value: "Needs Service", label: "Needs Service 🔧" },
];

const COIN_CONDITIONS = [
  { value: "Raw", label: "Raw / Circulated 🪙" },
  { value: "Uncirculated", label: "Uncirculated (MS) ✨" },
  { value: "Proof", label: "Proof (PF/PR) 💎" },
  { value: "Bullion", label: "Bullion Value ⚖️" },
];

const GENERIC_CONDITIONS = [
  { value: "New", label: "New / Sealed" },
  { value: "Like New", label: "Like New" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
  { value: "Poor", label: "Poor" },
];

const STATUSES: { value: ItemStatus; label: string; desc: string }[] = [
  { value: "Showcase", label: "Showcase", desc: "Not available" },
  { value: "For Trade", label: "For Trade", desc: "Open to offers" },
  { value: "For Sale", label: "For Sale", desc: "Accepting cash" },
];

export default function ItemConfigForm({ config, onChange, category }: ItemConfigFormProps) {
  const update = (partial: Partial<ItemConfig>) => onChange({ ...config, ...partial });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getConditionList = () => {
    switch (category) {
        case "Pokémon TCG":
        case "Sports Cards":
        case "Other TCG":
            return CARD_CONDITIONS;
        case "Funko Pop":
            return FUNKO_CONDITIONS;
        case "Lego":
            return LEGO_CONDITIONS;
        case "Video Games":
            return GAME_CONDITIONS;
        case "Sneakers":
            return SNEAKER_CONDITIONS;
        case "Comics":
            return COMIC_CONDITIONS;
        case "Watches":
            return WATCH_CONDITIONS;
        case "Coins":
            return COIN_CONDITIONS;
        default:
            return GENERIC_CONDITIONS;
    }
  };

  const conditions = getConditionList();
  
  const supportsGrading = category === "Pokémon TCG" || category === "Sports Cards" || category === "Coins" || category === "Other TCG"; 

  // 🔥 כאן השינוי: מנגנון כיווץ תמונות למניעת קריסה 🔥
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // יצירת קנבס לכיווץ
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800; // מגביל לרוחב 800 פיקסלים (מספיק בהחלט למובייל)
        const scaleSize = MAX_WIDTH / img.width;
        
        // חישוב מימדים חדשים
        if (scaleSize < 1) {
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
        } else {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // המרה ל-JPG באיכות 70% (מוריד משקל בטירוף)
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        update({ customImage: compressedBase64 });
      };
    };
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* 1. תמונה */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">
          <Camera className="w-3.5 h-3.5" />
          Custom Photo
          <span className="text-[10px] text-cream/20 font-normal normal-case ml-1">optional</span>
        </label>

        {config.customImage ? (
          <div className="relative w-full rounded-2xl overflow-hidden bg-background-light">
            <div className="aspect-[4/3] overflow-hidden">
              <img src={config.customImage} alt="Custom upload" className="w-full h-full object-contain bg-charcoal-dark" />
            </div>
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-xl bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
              >
                <Camera className="w-4 h-4 text-white/80" />
              </button>
              <button
                type="button"
                onClick={() => update({ customImage: undefined })}
                className="w-8 h-8 rounded-xl bg-red-500/70 hover:bg-red-500/90 flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-4 h-4 text-white/80" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className="relative w-full rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-surface/40 bg-background-light/50 hover:bg-background-light transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={handleDrop}
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-10 h-10 rounded-xl bg-charcoal-light/30 flex items-center justify-center flex-shrink-0">
                <ImagePlus className="w-5 h-5 text-cream/30" />
              </div>
              <div>
                <p className="text-xs text-cream/50 font-medium">Tap to upload or drag & drop</p>
                <p className="text-[10px] text-cream/25 mt-0.5">Auto-compressed for storage</p>
              </div>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
      </div>

      {/* 2. שדות מיוחדים ללגו (שנה / חלקים) */}
      {category === "Lego" && (
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
           <div className="space-y-2">
             <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" /> Year
             </label>
             <input 
               type="text" 
               value={config.year || ""} 
               onChange={(e) => update({ year: e.target.value })}
               className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream focus:outline-none focus:ring-2 focus:ring-surface/30"
               placeholder="2024"
             />
           </div>
           <div className="space-y-2">
             <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" /> Pieces
             </label>
             <input 
               type="text" 
               value={config.pieces || ""} 
               onChange={(e) => update({ pieces: e.target.value })}
               className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream focus:outline-none focus:ring-2 focus:ring-surface/30"
               placeholder="1234"
             />
           </div>
        </div>
      )}

      {/* 3. Grading (דינמי) */}
      {supportsGrading && (
         <div className="space-y-3 animate-fade-in bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-bold text-cream">
                    <Award className="w-4 h-4 text-yellow-500" />
                    Is this item Graded?
                </label>
                <input 
                    type="checkbox" 
                    checked={config.graded || false}
                    onChange={(e) => update({ graded: e.target.checked })}
                    className="w-5 h-5 accent-primary rounded cursor-pointer"
                />
            </div>
            
            {config.graded && (
                <div className="grid grid-cols-2 gap-3 mt-3 animate-slide-up">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-cream/40 uppercase">Company</label>
                        <select 
                            value={config.grader || "PSA"}
                            onChange={(e) => update({ grader: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl bg-charcoal-dark text-cream border border-white/10 focus:outline-none"
                        >
                            {["PSA", "BGS", "CGC", "SGC", "PCGS", "NGC", "ANACS"].map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-cream/40 uppercase">Grade</label>
                        <input 
                            type="text" 
                            value={config.gradeNum || "10"}
                            onChange={(e) => update({ gradeNum: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl bg-charcoal-dark text-cream border border-white/10 focus:outline-none text-center font-mono"
                            placeholder="10 / MS70"
                        />
                    </div>
                </div>
            )}
         </div>
      )}

      {/* 4. מחיר */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">
          <DollarSign className="w-3.5 h-3.5" />
          Asking Price
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/30 text-sm font-semibold">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={config.askingPrice ?? ""}
            onChange={(e) => update({ askingPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all [appearance:textfield]"
          />
        </div>
      </div>

      {/* 5. מצב (דינמי!) */}
      {!config.graded && (
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              Condition
            </label>
            <div className="flex flex-wrap gap-2">
              {conditions.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => update({ condition: c.value })}
                  className={`py-2 px-3.5 rounded-xl border text-center transition-all ${
                    config.condition === c.value
                      ? "bg-surface/20 border-surface/40 text-surface-light shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                      : "bg-background-light border-transparent text-cream/35 hover:text-cream/60 hover:bg-white/5"
                  }`}
                >
                  <span className="text-xs font-bold">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
      )}

      {/* 6. סטטוס */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">
          <Tag className="w-3.5 h-3.5" />
          Status
        </label>
        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => update({ status: s.value })}
              className={`py-2.5 px-2 rounded-xl border text-center transition-all ${
                config.status === s.value
                  ? "bg-surface/20 border-surface/40 text-surface-light"
                  : "bg-background-light border-transparent text-cream/35 hover:text-cream/60"
              }`}
            >
              <span className="text-xs font-bold block">{s.label}</span>
              <span className="text-[9px] opacity-60 block mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 7. הערות */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5" />
          Notes
          <span className="text-[10px] text-cream/20 font-normal normal-case ml-1">optional</span>
        </label>
        <textarea
          value={config.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Any details about the item..."
          rows={2}
          className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream text-sm placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all resize-none"
        />
      </div>
    </div>
  );
}