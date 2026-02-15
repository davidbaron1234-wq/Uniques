"use client";

import { useState, useRef, useEffect } from "react";
import { X, Camera, Trash2, ImagePlus, Save, Wallet, Truck } from "lucide-react";

export interface UserProfile {
  name: string;
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

export default function EditProfileModal({
  isOpen,
  onClose,
  profile,
  onSave,
}: EditProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(profile.paymentMethods || []);
  const [shippingPreferences, setShippingPreferences] = useState<string[]>(profile.shippingPreferences || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form when profile prop changes (e.g. modal re-opens)
  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setBio(profile.bio);
      setAvatar(profile.avatar);
      setPaymentMethods(profile.paymentMethods || []);
      setShippingPreferences(profile.shippingPreferences || []);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      bio: bio.trim(),
      avatar,
      joinDate: profile.joinDate,
      paymentMethods,
      shippingPreferences,
    });
    onClose();
  };

  const isValid = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-charcoal-dark rounded-t-3xl sm:rounded-3xl shadow-soft-xl animate-slide-up overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-light/20">
          <h2 className="text-lg font-bold text-cream">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-cream/60" />
          </button>
        </div>

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
            <label className="block text-sm font-semibold text-cream/70 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={40}
              className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all"
            />
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
          <ChipSelector
            label="Payment Methods"
            icon={<Wallet className="w-3.5 h-3.5 text-surface-light" />}
            options={PAYMENT_OPTIONS}
            selected={paymentMethods}
            onChange={setPaymentMethods}
            max={3}
          />

          {/* ── Shipping / Meetup ───────────────────────────────── */}
          <ChipSelector
            label="Shipping & Meetup"
            icon={<Truck className="w-3.5 h-3.5 text-surface-light" />}
            options={SHIPPING_OPTIONS}
            selected={shippingPreferences}
            onChange={setShippingPreferences}
            max={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5 pt-1">
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
  );
}
