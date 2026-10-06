import { Star, Clock, Coins, Wallet, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface SkillCardProps {
  id: string;
  title: string;
  providerName: string;
  providerAvatar: string;
  isVerified?: boolean;
  category: string;
  type: "Course" | "Service";
  bdtCost: number;
  duration: string;
  rating: number;
  reviewsCount: number;
  description: string;
  mode?: "swap" | "paid";
  onBook?: (id: string) => void;
}

export function SkillCard({
  id,
  title,
  providerName,
  providerAvatar,
  isVerified = true,
  category,
  type,
  bdtCost,
  duration,
  rating,
  reviewsCount,
  description,
  mode = "paid",
  onBook,
}: SkillCardProps) {
  return (
    <Card className="group w-[300px] shrink-0 overflow-hidden border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl sm:w-[320px]">
      <div>
        {/* Header Badges */}
        <div className="p-4 pb-2 flex items-center justify-between">
          <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
            {category}
          </Badge>
          <Badge className={`text-[10px] font-semibold ${mode === "swap" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-indigo-500/10 text-indigo-600 border-indigo-500/30"}`}>
            {type}
          </Badge>
        </div>

        <CardContent className="px-4 py-2 space-y-3">
          {/* Provider Header */}
          <div className="flex items-center gap-2.5">
            <img
              src={providerAvatar}
              alt={providerName}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                {providerName}
                {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{rating.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">({reviewsCount})</span>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Duration info */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{duration} session</span>
          </div>
        </CardContent>
      </div>

      {/* Footer Price & Booking CTA */}
      <CardFooter className="px-4 py-3 bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
            <Wallet className="w-4 h-4" />
            <span>৳ {bdtCost.toLocaleString()} BDT</span>
          </div>
          <p className="text-[10px] text-slate-400">Escrow Protected</p>
        </div>

        <Button
          size="sm"
          onClick={() => onBook?.(id)}
          className="gap-1 text-xs"
        >
          Book Swap
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
