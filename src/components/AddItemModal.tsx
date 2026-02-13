"use client";

import { useState, useRef } from "react";
import { X, Plus, ImagePlus, ChevronDown } from "lucide-react";
import { Category } from "@/lib/types";
import { categories } from "@/lib/data";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: {
    name: string;
    category: Category;
    upForTrade: boolean;
    imagePreview: string | null;
  }) => void;
}

export default function AddItemModal({ isOpen, onClose, onAdd }: AddItemModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [upForTrade, setUpForTrade] = useState<boolean | "">("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !category) return;
    onAdd({
      name: name.trim(),
      category: category as Category,
      upForTrade: upForTrade === true,
      imagePreview,
    });
    // Reset
    setName("");
    setCategory("");
    setUpForTrade("");
    setImagePreview(null);
    onClose();
  };

  const isValid = name.trim() && category;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-charcoal-dark rounded-t-3xl sm:rounded-3xl border border-charcoal-light/30 shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-light/30">
          <h2 className="text-lg font-bold text-cream">Add New Item</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-charcoal-light/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-cream/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Image upload */}
          <div
            className={`relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
              dragOver
                ? "border-mint bg-mint/10"
                : imagePreview
                ? "border-charcoal-light/30"
                : "border-charcoal-light/50 hover:border-lavender/50 bg-charcoal/40"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-cream text-sm font-medium">Change image</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-charcoal-light/40 flex items-center justify-center mb-3">
                  <ImagePlus className="w-7 h-7 text-cream/40" />
                </div>
                <p className="text-sm text-cream/50 font-medium">Tap to add photo</p>
                <p className="text-xs text-cream/30 mt-1">or drag and drop</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-cream/70 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spider-Man #1"
              className="w-full px-4 py-3 rounded-xl bg-charcoal/60 border border-charcoal-light/40 text-cream placeholder:text-cream/30 focus:outline-none focus:border-lavender/60 focus:ring-1 focus:ring-lavender/30 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-cream/70 mb-1.5">
              Choose Category
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-4 py-3 rounded-xl bg-charcoal/60 border border-charcoal-light/40 text-cream appearance-none focus:outline-none focus:border-lavender/60 focus:ring-1 focus:ring-lavender/30 transition-all"
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-charcoal-dark text-cream">
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/40 pointer-events-none" />
            </div>
          </div>

          {/* Up for trade */}
          <div>
            <label className="block text-sm font-medium text-cream/70 mb-1.5">
              Up For Trade?
            </label>
            <div className="relative">
              <select
                value={upForTrade === "" ? "" : upForTrade ? "yes" : "no"}
                onChange={(e) => setUpForTrade(e.target.value === "yes")}
                className="w-full px-4 py-3 rounded-xl bg-charcoal/60 border border-charcoal-light/40 text-cream appearance-none focus:outline-none focus:border-lavender/60 focus:ring-1 focus:ring-lavender/30 transition-all"
              >
                <option value="" disabled>
                  Choose one
                </option>
                <option value="yes" className="bg-charcoal-dark text-cream">
                  Yes - Available for trade
                </option>
                <option value="no" className="bg-charcoal-dark text-cream">
                  No - Not for trade
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/40 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-charcoal-light/40 text-cream/70 font-bold text-sm hover:bg-charcoal-light/30 active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm active:scale-[0.97] transition-all ${
              isValid
                ? "bg-mint/20 text-mint hover:bg-mint/30"
                : "bg-charcoal-light/20 text-cream/30 cursor-not-allowed"
            }`}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
