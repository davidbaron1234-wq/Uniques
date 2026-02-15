"use client";

import { X, Star } from "lucide-react";

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
  const now = new Date("2026-02-15");
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
  if (!isOpen) return null;

  const avgRating = trustScore;
  const reviewCount = MOCK_REVIEWS.length;

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
          {MOCK_REVIEWS.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl bg-background-light p-4"
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
                  </div>
                  <ReviewStars rating={review.rating} />
                </div>
              </div>

              {/* Comment */}
              <p className="text-xs text-cream/50 leading-relaxed">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
