import { Star, Clock, Coins, Wallet, ShieldCheck, ArrowUpRight, Settings, MapPin, Video } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, MagneticButton } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

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
  authorId?: string;
  isOwner?: boolean;
  deliveryMode?: "on_campus" | "online" | "On-Campus" | "Online" | string;
  onBook?: (id: string) => void;
  onManage?: (id: string) => void;
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
  authorId,
  isOwner: isOwnerProp,
  deliveryMode = "online",
  onBook,
  onManage,
}: SkillCardProps) {
  const { user } = useAuth();
  const isOwner = isOwnerProp ?? Boolean(authorId && user?.id && authorId === user.id);
  const isOnCampus = deliveryMode === "on_campus" || deliveryMode === "On-Campus" || deliveryMode === "Offline";

  return (
    <Card className="group w-[300px] shrink-0 overflow-hidden border-white/10 bg-white/[0.025] backdrop-blur-3xl shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-white/25 hover:shadow-[0_25px_50px_-10px_rgba(99,102,241,0.35),0_0_25px_rgba(16,185,129,0.2)] sm:w-[320px] relative will-change-transform">
      <div>
        {/* Header Badges */}
        <div className="p-4 pb-2 flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="bg-white/[0.05] text-zinc-300 border-white/10 text-[9px] font-bold uppercase tracking-widest">
              {category}
            </Badge>
            {isOnCampus ? (
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                On-Campus
              </Badge>
            ) : (
              <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                <Video className="w-2.5 h-2.5" />
                Online
              </Badge>
            )}
          </div>
          <Badge className={`text-[9px] font-black uppercase tracking-wider ${mode === "swap" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"}`}>
            {type}
          </Badge>
        </div>

        <CardContent className="px-4 py-2 space-y-3">
          {/* Provider Header */}
          <div className="flex items-center gap-2.5">
            <img
              src={providerAvatar}
              alt={providerName}
              className="w-8 h-8 rounded-full object-cover border border-white/15"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                {providerName}
                {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{rating.toFixed(1)}</span>
                <span className="text-zinc-500 font-normal">({reviewsCount})</span>
              </div>
            </div>
          </div>

          {/* Title & Description with Extreme Contrast */}
          <div>
            <h3 className="text-sm font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
              {title}
            </h3>
            <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed font-normal">
              {description}
            </p>
          </div>

          {/* Duration info */}
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{duration} session</span>
          </div>
        </CardContent>
      </div>

      {/* Footer Price & Booking CTA */}
      <CardFooter className="px-4 py-3 bg-white/[0.015] border-t border-white/10 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-emerald-400 font-black text-sm tracking-tight">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>৳ {bdtCost.toLocaleString()} BDT</span>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Escrow Protected</p>
        </div>

        {isOwner ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onManage ? onManage(id) : onBook?.(id)}
            className="gap-1 text-xs border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.08]"
          >
            <Settings className="w-3.5 h-3.5" />
            Manage
          </Button>
        ) : (
          <MagneticButton
            size="sm"
            onClick={() => onBook?.(id)}
            className="gap-1 text-xs font-bold shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(53,169,133,0.45)]"
          >
            Book Swap
            <ArrowUpRight className="w-3.5 h-3.5" />
          </MagneticButton>
        )}
      </CardFooter>
    </Card>
  );
}
