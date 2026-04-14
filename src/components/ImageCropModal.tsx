"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, Crop } from "lucide-react";
import { getCroppedImg } from "@/lib/cropImage";

interface ImageCropModalProps {
  /** Raw image src (data URL or object URL) to crop */
  imageSrc: string;
  /** Called with the cropped JPEG data URL when user confirms */
  onCropComplete: (croppedDataUrl: string) => void;
  /** Called when user cancels — no changes applied */
  onCancel: () => void;
  /**
   * Shape of the crop overlay.
   * "round" = circular (avatar use-case)
   * "rect"  = square (item photo use-case)
   * @default "round"
   */
  cropShape?: "round" | "rect";
  /**
   * Output size in pixels (square). The cropped region is scaled to this.
   * @default 400
   */
  outputSize?: number;
}

export default function ImageCropModal({
  imageSrc,
  onCropComplete,
  onCancel,
  cropShape = "round",
  outputSize = 400,
}: ImageCropModalProps) {
  const [crop,   setCrop]   = useState({ x: 0, y: 0 });
  const [zoom,   setZoom]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const result = await getCroppedImg(imageSrc, croppedAreaPixels, outputSize);
      onCropComplete(result);
    } catch (err) {
      console.error("Crop failed:", err);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-charcoal-dark rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Crop className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-cream">Crop Photo</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors"
            aria-label="Cancel crop"
          >
            <X className="w-5 h-5 text-cream/60" />
          </button>
        </div>

        {/* Cropper canvas — fixed square area */}
        <div className="relative w-full bg-black" style={{ height: 320 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape={cropShape}
            showGrid={cropShape === "rect"}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            style={{
              containerStyle: { background: "#0a0a0a" },
              cropAreaStyle:  {
                border: "2px solid rgba(170,149,197,0.8)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
                borderRadius: cropShape === "rect" ? "12px" : "50%",
              },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-white/[0.04]">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
            className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-cream/50 hover:text-cream/80"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-primary cursor-pointer"
            aria-label="Zoom"
          />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-cream/50 hover:text-cream/80"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Hint */}
        <p className="text-center text-[11px] text-cream/25 pb-1">
          {cropShape === "rect"
            ? "Drag to reposition · Zoom to fit your item in the safe area"
            : "Drag to reposition · Pinch or use slider to zoom"}
        </p>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5 pt-2 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-background-light text-cream/60 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Crop className="w-4 h-4" />
                Crop &amp; Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
