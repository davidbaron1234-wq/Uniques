"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, Trash2, ImagePlus, Save, Wallet, Truck, ShieldCheck, Info, AtSign } from "lucide-react";
import ImageCropModal from "@/components/ImageCropModal";

export interface UserProfile {
  name: string;
  handle?: string;
  bio: string;
  avatar: string;
  joinDate: string;
  paymentMethods?: string[];
  shippingPreferences?: string[];
}

const PAYMENT_OPTIONS = ["PayPal", "Venmo", "Cash", "Bank Transfer", "Crypto", "Trade Only"];
const SHIPPING_OPTIONS = ["Worldwide Shipping", "Local Pickup", "Convention Meetup", "Insured Shipping", "Middleman Service"];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  isPro?: boolean;
}

function ChipSelector({
  label,
  icon,
  options,
  selected,
  onChange,
  max,
}: {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  max: number;
}) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else if (selected.length < max) {
      onChange([...selected, option]);
    }
  };

  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-semibold text-cream/70 mb-2">
        {icon}
        {label}
        <span className="text-[10px] text-cream/30 font-normal ml-1">
          {selected.length}/{max} max
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          const isDisabled = !isSelected && selected.length >= max;
          return (
            <button
              key={option}
              type="button"
              onClick={() => !isDisabled && toggle(option)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-surface/25 text-surface-light ring-1 ring-surface/40"
                  : isDisabled
                  ? "bg-background-light/50 text-cream/15 cursor-not-allowed"
                  : "bg-background-light text-cream/40 hover:text-cream/60 hover:bg-charcoal-light/40"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const NAME_CHANGE_KEY = "last_name_change";
const LOCK_DAYS = 90;

export default function EditProfileModal({
  isOpen,
  onClose,
  profile,
  onSave,
  isPro = false,
}: EditProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle ?? "");
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(profile.paymentMethods || []);
  const [shippingPreferences, setShippingPreferences] = useState<string[]>(profile.shippingPreferences || []);
  const [nameLocked, setNameLocked] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock body scroll when modal is open to prevent background scroll bleed on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Sync form when profile prop changes (e.g. modal re-opens)
  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setHandle(profile.handle ?? "");
      setHandleStatus("idle");
      setBio(profile.bio);
      setAvatar(profile.avatar);
      setPaymentMethods(profile.paymentMethods || []);
      setShippingPreferences(profile.shippingPreferences || []);

      // Check 90-day name lock
      const raw = localStorage.getItem(NAME_CHANGE_KEY);
      if (raw) {
        const daysSince = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
        if (daysSince < LOCK_DAYS) {
          setNameLocked(true);
          setDaysRemaining(Math.ceil(LOCK_DAYS - daysSince));
        } else {
          setNameLocked(false);
          setDaysRemaining(0);
        }
      } else {
        setNameLocked(false);
        setDaysRemaining(0);
      }
    }
  }, [isOpen, profile]);

  // Debounced handle availability check
  const checkHandle = useCallback((val: string) => {
    if (handleDebounce.current) clearTimeout(handleDebounce.current);
    if (!val) { setHandleStatus("idle"); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(val)) { setHandleStatus("invalid"); return; }
    setHandleStatus("checking");
    handleDebounce.current = setTimeout(() => {
      fetch(`/api/profile/handle-check?handle=${encodeURIComponent(val)}`)
        .then((r) => r.json())
        .then((d: { available?: boolean }) => setHandleStatus(d.available ? "available" : "taken"))
        .catch(() => setHandleStatus("idle"));
    }, 500);
  }, []);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10 MB");
      return;
    }
    // Read to data URL and open the cropper — compression happens after crop
    const reader = new FileReader();
    reader.onloadend = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    // Reset so the same file can be re-selected after a cancel
    e.target.value = "";
  };

  const handleCropDone = (croppedDataUrl: string) => {
    setAvatar(croppedDataUrl);
    setCropSrc(null);
  };

  const handleCropCancel = () => {
    setCropSrc(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (handleStatus === "taken" || handleStatus === "invalid") return;
    const nameChanged = name.trim() !== profile.name;
    if (nameChanged && !nameLocked) {
      localStorage.setItem(NAME_CHANGE_KEY, String(Date.now()));
    }
    onSave({
      name: name.trim(),
      handle: handle.trim() || undefined,
      bio: bio.trim(),
      avatar,
      joinDate: profile.joinDate,
      paymentMethods,
      shippingPreferences,
    });
    onClose();
  };

  const isValid =
    name.trim().length > 0 &&
    name.trim().length <= 16 &&
    handleStatus !== "taken" &&
    handleStatus !== "invalid" &&
    handleStatus !== "checking";

  return (
    <>
    {cropSrc && (
      <ImageCropModal
        imageSrc={cropSrc}
        onCropComplete={handleCropDone}
        onCancel={handleCropCancel}
      />
    )}
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal shell — flex column so header+footer are sticky while body scrolls */}
      <div className="relative w-full max-w-md bg-charcoal-dark rounded-3xl shadow-2xl border border-white/10 animate-slide-up flex flex-col max-h-[85dvh]">
        {/* Sticky header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <h2 className="text-lg font-bold text-cream">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-cream/60" />
          </button>
        </div>

        {/* Scrollable body — inherits global 4px lilac webkit scrollbar; thin on Firefox */}
        <div className="overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:#AA95C5_transparent]">
        <div className="p-5 space-y-5">
          {/* ── Avatar Upload ──────────────────────────────────── */}
          <div className="flex flex-col items-center">
            <div
              className="relative w-24 h-24 rounded-2xl overflow-hidden bg-primary/20 border-2 border-primary/30 cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <img
                src={avatar}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white/80" />
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background-light text-cream/60 text-xs font-semibold hover:bg-charcoal-light/50 transition-colors"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Upload Photo
              </button>
              {avatar.startsWith("data:") && (
                <button
                  type="button"
                  onClick={() => setAvatar(profile.avatar.startsWith("data:") ? "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=CAE6CE" : profile.avatar)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 text-red-400/80 text-xs font-semibold hover:bg-red-500/25 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* ── Name ───────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-cream/70">Display Name</label>
              {isPro && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-bold text-primary">
                  <ShieldCheck className="w-3 h-3" />
                  Pro · Verified
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => !nameLocked && setName(e.target.value)}
                readOnly={nameLocked}
                placeholder="Your name"
                maxLength={16}
                className={`w-full px-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none transition-all ${
                  nameLocked
                    ? "opacity-50 cursor-not-allowed select-none"
                    : "focus:ring-2 focus:ring-surface/30"
                }`}
              />
              {!nameLocked && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-cream/25 pointer-events-none tabular-nums">
                  {name.length}/16
                </span>
              )}
            </div>
            {nameLocked ? (
              <div className="flex items-start gap-1.5 mt-2 px-1">
                <span className="text-[10px] text-red-400/80 font-semibold leading-relaxed">
                  🔒 Display name locked for {daysRemaining} more day{daysRemaining !== 1 ? "s" : ""}.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-1.5 mt-2 px-1">
                <Info className="w-3 h-3 text-amber-400/70 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-cream/35 leading-relaxed">
                  Display names can only be changed{" "}
                  <span className="text-amber-400/70 font-semibold">once every 90 days</span>{" "}
                  to maintain community trust and prevent scams.
                </p>
              </div>
            )}
          </div>

          {/* ── Handle ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-cream/70">Username</label>
              {handleStatus === "available" && (
                <span className="text-[10px] font-bold text-green-400">Available</span>
              )}
              {handleStatus === "taken" && (
                <span className="text-[10px] font-bold text-red-400">Already taken</span>
              )}
              {handleStatus === "checking" && (
                <span className="text-[10px] text-cream/30">Checking…</span>
              )}
            </div>
            <div className="relative">
              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/30 pointer-events-none" />
              <input
                type="text"
                value={handle}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                  setHandle(val);
                  checkHandle(val);
                }}
                placeholder="your_handle"
                maxLength={20}
                className={`w-full pl-9 pr-12 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none transition-all ${
                  handleStatus === "taken" || handleStatus === "invalid"
                    ? "ring-2 ring-red-500/40"
                    : handleStatus === "available"
                    ? "ring-2 ring-green-500/40"
                    : "focus:ring-2 focus:ring-surface/30"
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-cream/25 pointer-events-none tabular-nums">
                {handle.length}/20
              </span>
            </div>
            <p className="text-[10px] text-cream/30 mt-1.5 px-1">
              3–20 chars · lowercase letters, numbers, underscores only
            </p>
          </div>

          {/* ── Bio ────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-cream/70 mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other collectors about yourself..."
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all resize-none"
            />
            <p className="text-[10px] text-cream/20 mt-1 text-right">
              {bio.length}/200
            </p>
          </div>

          {/* ── Payment Methods ─────────────────────────────────── */}
          <div className="rounded-2xl bg-white/5 border border-charcoal-light/20 p-4">
            <ChipSelector
              label="Payment Methods"
              icon={<Wallet className="w-3.5 h-3.5 text-surface-light" />}
              options={PAYMENT_OPTIONS}
              selected={paymentMethods}
              onChange={setPaymentMethods}
              max={3}
            />
          </div>

          {/* ── Shipping / Meetup ───────────────────────────────── */}
          <div className="rounded-2xl bg-white/5 border border-charcoal-light/20 p-4">
            <ChipSelector
              label="Shipping & Meetup"
              icon={<Truck className="w-3.5 h-3.5 text-surface-light" />}
              options={SHIPPING_OPTIONS}
              selected={shippingPreferences}
              onChange={setShippingPreferences}
              max={3}
            />
          </div>
        </div>
        </div>{/* end scrollable body */}

        {/* Sticky footer */}
        <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-background-light text-cream/60 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all ${
              isValid
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "bg-background-light text-cream/20 cursor-not-allowed"
            }`}
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
