"use client";

import { useState } from "react";
import { Check, ChevronDown, Pencil, Star, Trash2, X } from "lucide-react";

interface Review {
  id: string;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number;
  comment: string;
  date: string;
}

const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    reviewerName: "Alex",
    reviewerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5",
    rating: 5,
    comment: "Great trader, fast shipping! Card was double-sleeved and in perfect condition. Would trade again in a heartbeat.",
    date: "2026-02-13T10:00:00Z",
  },
  {
    id: "r2",
    reviewerName: "Sam",
    reviewerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=FCF9D5",
    rating: 5,
    comment: "Item exactly as described. Super fair on pricing. 10/10 experience.",
    date: "2026-02-08T14:30:00Z",
  },
  {
    id: "r3",
    reviewerName: "Jordan",
    reviewerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=CAE6CE",
    rating: 4,
    comment: "Smooth trade overall. Shipping took a bit longer than expected but the item was well packaged.",
    date: "2026-01-25T09:15:00Z",
  },
  {
    id: "r4",
    reviewerName: "Riley",
    reviewerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=AA95C5",
    rating: 5,
    comment: "Incredible collection! Traded sneakers and they were in pristine condition. Very communicative throughout the process.",
    date: "2026-01-18T16:00:00Z",
  },
  {
    id: "r5",
    reviewerName: "Morgan",
    reviewerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan&backgroundColor=D4EDDA",
    rating: 5,
    comment: "Best trader on the platform. Fair prices, fast responses, and top-notch packaging. Highly recommend!",
    date: "2026-01-05T11:30:00Z",
  },
  {
    id: "r6",
    reviewerName: "Casey",
    reviewerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Casey&backgroundColor=E8D5F5",
    rating: 4,
    comment: "Good experience. The coin had a tiny scratch not shown in photos, but seller offered a partial refund right away. Solid trader.",
    date: "2025-12-20T08:45:00Z",
  },
];

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < rating
              ? "text-yellow-400 fill-yellow-400"
              : "text-cream/15"
          }`}
        />
      ))}
    </div>
  );
}

interface ReviewsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  trustScore: number;
}

export default function ReviewsListModal({
  isOpen,
  onClose,
  userName,
  trustScore,
}: ReviewsListModalProps) {
  const [reviews, setReviews]         = useState<Review[]>(MOCK_REVIEWS);
  const [myReviewId, setMyReviewId]   = useState<string | null>(null);
  const [sortBy, setSortBy]           = useState<"newest" | "highest" | "lowest">("newest");
  const [formOpen, setFormOpen]       = useState(false);
  const [writeRating, setWriteRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [writeText, setWriteText]     = useState("");
  const [writeSuccess, setWriteSuccess] = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [deleteToast, setDeleteToast]   = useState(false);

  const handleDeleteReview = () => {
    setReviews((prev) => prev.filter((r) => r.id !== myReviewId));
    setMyReviewId(null);
    setDeletingId(null);
    setDeleteToast(true);
    setTimeout(() => setDeleteToast(false), 2500);
  };

  const handleSubmitReview = () => {
    if (writeRating === 0) return;
    const now = new Date().toISOString();
    if (myReviewId) {
      // Update the user's existing review in place
      setReviews((prev) =>
        prev.map((r) =>
          r.id === myReviewId
            ? { ...r, rating: writeRating, comment: writeText, date: now }
            : r
        )
      );
    } else {
      // Prepend a new review
      const newId = `my-review-${Date.now()}`;
      setMyReviewId(newId);
      setReviews((prev) => [
        {
          id:             newId,
          reviewerName:   "You",
          reviewerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=CAE6CE",
          rating:         writeRating,
          comment:        writeText,
          date:           now,
        },
        ...prev,
      ]);
    }
    setWriteSuccess(true);
    setWriteRating(0);
    setWriteText("");
    setTimeout(() => {
      setWriteSuccess(false);
      setFormOpen(false);
    }, 2000);
  };

  if (!isOpen) return null;

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const reviewCount = reviews.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-charcoal-dark rounded-t-3xl sm:rounded-3xl shadow-soft-xl animate-slide-up overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-light/20 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-cream">
              Reviews for {userName === "You" ? "you" : userName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(avgRating)
                        ? "text-yellow-400 fill-yellow-400"
                        : i === Math.floor(avgRating) && avgRating % 1 >= 0.5
                        ? "text-yellow-400 fill-yellow-400/50"
                        : "text-cream/15"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-cream/50 font-semibold">
                {avgRating.toFixed(1)} / 5
              </span>
              <span className="text-[10px] text-cream/30">
                ({reviewCount} reviews)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-cream/60" />
          </button>
        </div>

        {/* Reviews list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Delete success toast ── */}
          {deleteToast && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 animate-slide-up">
              <Trash2 className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" />
              <span className="text-xs font-semibold text-red-400/80">Review deleted.</span>
            </div>
          )}

          {/* ── Write a Review ── */}
          <div className="rounded-2xl bg-background-light border border-white/[0.06] overflow-hidden">
            <button
              onClick={() => { setFormOpen((o) => !o); setWriteSuccess(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5 text-primary/70" />
                <span className="text-xs font-bold text-cream/70">Write a Review</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-cream/30 transition-transform duration-200 ${formOpen ? "rotate-180" : ""}`} />
            </button>

            {formOpen && (
              writeSuccess ? (
                <div className="px-4 pb-5 flex flex-col items-center gap-2.5 text-center">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" strokeWidth={2.5} />
                  </div>
                  <p className="text-xs font-semibold text-cream/60">Review submitted — thanks!</p>
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-3">
                  {/* Interactive star selector */}
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        onMouseEnter={() => setHoverRating(i + 1)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setWriteRating(i + 1)}
                        className="p-1 transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            i < (hoverRating || writeRating)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-cream/15"
                          }`}
                        />
                      </button>
                    ))}
                    {writeRating > 0 && (
                      <span className="text-xs text-cream/40 ml-1 font-semibold">{writeRating}/5</span>
                    )}
                  </div>

                  {/* Review text */}
                  <textarea
                    value={writeText}
                    onChange={(e) => setWriteText(e.target.value)}
                    placeholder="Share your experience trading with this collector..."
                    maxLength={300}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-cream/80 placeholder:text-cream/25 resize-none focus:outline-none focus:border-primary/30 transition-colors"
                  />

                  <button
                    onClick={handleSubmitReview}
                    disabled={writeRating === 0}
                    className="w-full py-2.5 rounded-xl bg-primary/20 text-primary font-bold text-xs hover:bg-primary/30 active:scale-[0.97] transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Submit Review
                  </button>
                </div>
              )
            )}
          </div>

          {/* ── Sort controls ── */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-cream/25 font-medium mr-0.5">Sort:</span>
            {(["newest", "highest", "lowest"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  sortBy === opt
                    ? "bg-primary/20 text-primary"
                    : "bg-white/[0.05] text-cream/30 hover:text-cream/60"
                }`}
              >
                {opt === "newest" ? "Newest" : opt === "highest" ? "Highest ★" : "Lowest ★"}
              </button>
            ))}
          </div>

          {[...reviews]
            .sort((a, b) => {
              if (sortBy === "highest") return b.rating - a.rating;
              if (sortBy === "lowest")  return a.rating - b.rating;
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            })
            .map((review) => {
              const isMyReview = review.id === myReviewId;
              return (
                <div
                  key={review.id}
                  className={`rounded-2xl bg-background-light p-4 ${isMyReview ? "ring-1 ring-primary/30" : ""}`}
                >
                  {/* Reviewer header */}
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary/20 flex-shrink-0">
                      <img
                        src={review.reviewerAvatar}
                        alt={review.reviewerName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-cream/80 font-semibold">
                          {review.reviewerName}
                        </p>
                        <span className="text-[10px] text-cream/25">
                          {formatRelativeDate(review.date)}
                        </span>
                        {isMyReview && (
                          <span className="text-[9px] font-bold text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-md">
                            you
                          </span>
                        )}
                      </div>
                      <ReviewStars rating={review.rating} />
                    </div>
                    {isMyReview && (
                      deletingId === review.id ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] text-cream/40 font-medium whitespace-nowrap">Sure?</span>
                          <button
                            onClick={handleDeleteReview}
                            className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/30 transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-1 rounded-lg bg-white/[0.06] text-cream/40 text-[10px] font-bold hover:bg-white/10 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              setWriteRating(review.rating);
                              setWriteText(review.comment);
                              setWriteSuccess(false);
                              setFormOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 transition-colors"
                          >
                            <Pencil className="w-3 h-3 text-cream/40" />
                            <span className="text-[10px] text-cream/40 font-semibold">Edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingId(review.id)}
                            className="flex items-center px-2 py-1.5 rounded-lg bg-white/[0.06] hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-cream/30 hover:text-red-400" />
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  {/* Comment */}
                  <p className="text-xs text-cream/50 leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
