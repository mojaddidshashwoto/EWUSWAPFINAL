import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { submitReview } from "@/lib/supabase";

export interface LeaveReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeId: string;
  courseId: string;
  courseTitle: string;
  providerName: string;
  exchangeStatus: string;
  onReviewSubmitted?: () => void;
}

export function LeaveReviewModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  providerName,
  exchangeStatus,
  onReviewSubmitted,
}: LeaveReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Strict UI Guard: Must be completed or verified
  const isEligible = ["completed", "verified", "released"].includes(exchangeStatus);

  const handleSubmit = async () => {
    if (!isEligible) {
      toast.error("Reviews can only be submitted for completed exchanges.");
      return;
    }
    if (!body.trim()) {
      toast.error("Please write a short feedback comment.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReview(courseId, rating, body, headline);
      toast.success(`Review for ${providerName} published successfully!`);
      onReviewSubmitted?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-semibold mb-1">
            <Sparkles className="w-4 h-4" />
            Authentic Peer Review
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Leave a Review for {providerName}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Share your experience for session: <span className="font-semibold text-slate-700 dark:text-slate-300">"{courseTitle}"</span>.
          </DialogDescription>
        </DialogHeader>

        {!isEligible ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
            ⚠️ <strong>Review Guard Activated:</strong> You can only submit a review after an exchange has been completed and funds released.
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Star Rating Selector */}
            <div className="space-y-1 text-center bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Your Rating
              </span>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          active
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-amber-500 block mt-1">
                {rating === 5 ? "5.0 — Excellent!" : rating === 4 ? "4.0 — Very Good" : `${rating}.0 Stars`}
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Review Headline</label>
              <Input
                placeholder="e.g. Saved me weeks of refactoring!"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
              />
            </div>

            {/* Written Feedback */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Written Feedback</label>
              <Textarea
                placeholder="Describe what you learned and how the provider conducted the session..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs min-h-[90px]"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          {isEligible && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md"
            >
              {isSubmitting ? "Publishing..." : "Submit Review"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
