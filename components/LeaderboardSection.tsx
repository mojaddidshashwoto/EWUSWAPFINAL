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
    <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Award className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Top Service Providers</CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ranked by average ratings, completed exchanges, and positive review sentiment.
          </CardDescription>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs">
          <button
            onClick={() => setFilter("rank")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filter === "rank" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Overall Rank
          </button>
          <button
            onClick={() => setFilter("rating")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filter === "rating" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Ratings
          </button>
          <button
            onClick={() => setFilter("services")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filter === "services" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Services
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? <p className="py-6 text-center text-xs text-slate-500">Loading provider rankings...</p> : sortedLeaderboard.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">No provider rankings are available yet.</p>
        ) : sortedLeaderboard.map((item) => (
          <div
            key={item.providerId}
            className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 text-center shrink-0">
                {getRankBadge(item.rank)}
              </div>
              <img
                src={item.avatarUrl}
                alt={item.displayName}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.displayName}</h4>
                  {item.isVerified && <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                    {item.availabilityStatus}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {item.averageRating.toFixed(2)} ({item.reviewCount} reviews)
                  </span>
                  <span>•</span>
                  <span>{item.completedServicesCount} exchanges completed</span>
                </div>
              </div>
            </div>

            {/* Sentiment Score Indicator */}
            <div className="flex items-center gap-2 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{item.sentimentScore}% Positive</span>
                </div>
                <p className="text-[10px] text-slate-400">Review Sentiment Score</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
