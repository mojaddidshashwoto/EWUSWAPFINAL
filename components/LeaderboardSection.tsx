import { useEffect, useState } from "react";
import { Award, Star, CheckCircle2, TrendingUp, Sparkles, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listTopServiceProviders } from "@/lib/supabase";

export interface ProviderLeaderboardItem {
  providerId: string;
  displayName: string;
  avatarUrl: string;
  availabilityStatus: "available" | "busy" | "vacation" | "unavailable";
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  completedServicesCount: number;
  sentimentScore: number; // e.g. 98.5 (% positive reviews)
  rank: number;
}

export function LeaderboardSection() {
  const [filter, setFilter] = useState<"rank" | "rating" | "services">("rank");
  const [providers, setProviders] = useState<ProviderLeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    listTopServiceProviders()
      .then((rows) => {
        if (isActive) setProviders(rows);
      })
      .catch((error) => {
        if (isActive) console.error("Could not load service leaderboard:", error);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const sortedLeaderboard = [...providers].sort((a, b) => {
    if (filter === "rating") return b.averageRating - a.averageRating;
    if (filter === "services") return b.completedServicesCount - a.completedServicesCount;
    return a.rank - b.rank;
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[11px] font-bold">🥇 #1 Top Provider</span>;
    if (rank === 2) return <span className="px-2 py-0.5 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/30 text-[11px] font-bold">🥈 #2</span>;
    if (rank === 3) return <span className="px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/30 text-[11px] font-bold">🥉 #3</span>;
    return <span className="text-xs font-bold text-slate-400">#{rank}</span>;
  };

  return (
    <Card className="bg-white/[0.025] backdrop-blur-3xl border-white/10 shadow-2xl hover:border-white/20">
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Campus Hall of Fame</span>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-white">Top Service Providers</CardTitle>
          </div>
          <CardDescription className="text-xs text-zinc-400 mt-1">
            Ranked by average ratings, completed exchanges, and positive review sentiment.
          </CardDescription>
        </div>

        {/* Filter buttons - Frosted Pills */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 p-1 rounded-xl text-xs backdrop-blur-md">
          <button
            onClick={() => setFilter("rank")}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              filter === "rank" ? "bg-white/[0.1] text-white shadow-xs border border-white/15" : "text-zinc-400 hover:text-white"
            }`}
          >
            Overall Rank
          </button>
          <button
            onClick={() => setFilter("rating")}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              filter === "rating" ? "bg-white/[0.1] text-white shadow-xs border border-white/15" : "text-zinc-400 hover:text-white"
            }`}
          >
            Ratings
          </button>
          <button
            onClick={() => setFilter("services")}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              filter === "services" ? "bg-white/[0.1] text-white shadow-xs border border-white/15" : "text-zinc-400 hover:text-white"
            }`}
          >
            Services
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5">
        {isLoading ? (
          <p className="py-6 text-center text-xs text-zinc-500">Loading provider rankings...</p>
        ) : sortedLeaderboard.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-500">No provider rankings are available yet.</p>
        ) : sortedLeaderboard.map((item) => (
          <div
            key={item.providerId}
            className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 text-center shrink-0">
                {getRankBadge(item.rank)}
              </div>
              <img
                src={item.avatarUrl}
                alt={item.displayName}
                className="w-10 h-10 rounded-full object-cover border border-white/15"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{item.displayName}</h4>
                  {item.isVerified && <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />}
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold uppercase tracking-wider border border-emerald-500/25">
                    {item.availabilityStatus}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {item.averageRating.toFixed(2)} ({item.reviewCount} reviews)
                  </span>
                  <span>•</span>
                  <span className="text-zinc-400">{item.completedServicesCount} exchanges completed</span>
                </div>
              </div>
            </div>

            {/* Sentiment Score Indicator */}
            <div className="flex items-center gap-2 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-xs font-black text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{item.sentimentScore}% Positive</span>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Review Sentiment Score</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
