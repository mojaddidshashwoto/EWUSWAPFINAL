import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { SkillCard, SkillCardProps } from "@/components/SkillCard";
import { LeaderboardSection } from "@/components/LeaderboardSection";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins, Wallet, Plus, Calendar, Clock, ArrowRight, Sparkles, TrendingUp,
  ShieldCheck, History, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getCurrentUser, listMyEscrowTransactions, listPublishedSkillCourses } from "@/lib/supabase";

const RECOMMENDED_SKILLS: SkillCardProps[] = [
  {
    id: "l1",
    title: "Figma Systems & Component Sprint",
    providerName: "Noah Williams",
    providerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    category: "Design",
    type: "Service",
    creditCost: 24,
    bdtCost: 1200,
    duration: "90 min",
    rating: 4.9,
    reviewsCount: 28,
    description: "Turn a messy product design file into a calm, reusable component system.",
  },
  {
    id: "l2",
    title: "Build Your First Tableau Data Story",
    providerName: "Priya Shah",
    providerAvatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    category: "Technology",
    type: "Course",
    creditCost: 18,
    bdtCost: 900,
    duration: "60 min",
    rating: 5.0,
    reviewsCount: 19,
    description: "A practical introduction to making analytics clear, visual, and useful.",
  },
  {
    id: "l3",
    title: "Brand Voice & Copywriting Fundamentals",
    providerName: "Elliot Brooks",
    providerAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    category: "Marketing",
    type: "Course",
    creditCost: 20,
    bdtCost: 1000,
    duration: "75 min",
    rating: 4.8,
    reviewsCount: 41,
    description: "Find a brand voice that feels specific, memorable, and unmistakably yours.",
  },
  {
    id: "l4",
    title: "Conversational Bengali & Cultural Practice",
    providerName: "Tanvir Hasan",
    providerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    category: "Languages",
    type: "Service",
    creditCost: 15,
    bdtCost: 750,
    duration: "45 min",
    rating: 4.9,
    reviewsCount: 32,
    description: "Practice everyday Bengali vocabulary with a friendly peer partner.",
  },
];

const UPCOMING_EXCHANGES = [
  {
    id: "ex-1",
    title: "Figma Systems Sprint",
    counterpartyName: "Noah Williams",
    counterpartyAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    date: "Today, Sep 26",
    time: "4:00 PM - 5:30 PM",
    format: "Online (Google Meet)",
    credits: 24,
    status: "Held in escrow",
  },
  {
    id: "ex-2",
    title: "Tableau Data Visualization",
    counterpartyName: "Priya Shah",
    counterpartyAvatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",
    date: "Tomorrow, Sep 27",
    time: "11:00 AM - 12:00 PM",
    format: "Offline (Campus Library Circle)",
    credits: 18,
    status: "Confirmed",
  },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user: authUser } = useAuth();
  const [earnModalOpen, setEarnModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [user, setUser] = useState({ displayName: "", creditsBalance: 0, bdtBalance: 0 });
  const [escrowHistory, setEscrowHistory] = useState<Array<{ id: string; title: string; counterpartyName: string; counterpartyAvatar: string; date: string; time: string; format: string; credits: number; status: string }>>([]);
  const [activeEscrows, setActiveEscrows] = useState<Array<{ id: string; title: string; counterpartyName: string; counterpartyAvatar: string; date: string; time: string; format: string; credits: number; status: string }>>([]);
  const [recommendedSkills, setRecommendedSkills] = useState<SkillCardProps[]>([]);

  useEffect(() => {
    let isActive = true;
    Promise.all([getCurrentUser(), listMyEscrowTransactions(), listPublishedSkillCourses()])
      .then(([currentUser, transactions, courses]) => {
        if (!isActive) return;
        setUser({
          displayName: currentUser?.displayName || currentUser?.name || authUser?.displayName || "Member",
          creditsBalance: currentUser?.credits ?? 0,
          bdtBalance: currentUser?.bdtBalance ?? 0,
        });
        const mappedTransactions = transactions.map((transaction) => {
            const counterparty = transaction.isPayer ? transaction.payee : transaction.payer;
            const createdAt = new Date(transaction.created_at);
            return {
              id: transaction.id,
              title: transaction.course?.title || "Skill exchange",
              counterpartyName: counterparty.display_name,
              counterpartyAvatar: counterparty.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
              date: createdAt.toLocaleDateString(),
              time: createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
              format: "Coordinate with your exchange partner",
              credits: Number(transaction.gross_amount_credits ?? transaction.amount_credits),
              status: transaction.status,
            };
          });
        setEscrowHistory(mappedTransactions);
        setActiveEscrows(mappedTransactions.filter((transaction) => ["pending", "submitted", "verified"].includes(transaction.status)));
        setRecommendedSkills(courses.slice(0, 4).map((course) => ({
          id: course.id,
          title: course.title,
          providerName: course.instructorName,
          providerAvatar: course.instructorAvatar,
          isVerified: course.isVerified,
          category: course.category,
          type: course.type === "service" ? "Service" : "Course",
          creditCost: course.creditCost,
          bdtCost: course.creditCost * 120,
          duration: `${course.durationMinutes} min`,
          rating: course.averageRating,
          reviewsCount: course.reviewCount,
          description: course.description,
        })));
      })
      .catch((error) => {
        if (isActive) toast.error(error?.message || "Could not load your dashboard data.");
      });
    return () => {
      isActive = false;
    };
  }, [authUser?.id, authUser?.displayName]);

  const handleBookSkill = (skillId: string) => {
    setLocation(`/skills/${skillId}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* GREETING HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Good morning, {user.displayName || "..."} 👋
              </h1>
              <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                Active Member
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ready to learn new skills or host a teaching session today?
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setLocation("/discover")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Explore All Listings
            </Button>
            <Button
              onClick={() => setLocation("/discover")}
              variant="outline"
              className="text-xs rounded-xl gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Post a Service
            </Button>
          </div>
        </div>

        {/* WALLET / BALANCE CARD & UPCOMING EXCHANGES GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Card */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white border-indigo-800/40 shadow-xl overflow-hidden relative">
            {/* Background Glow Spheres */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Your Wallet</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                  5% Platform Fee Protected
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Balances */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-indigo-500/20">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Available Credits</p>
                  <div className="flex items-center gap-1.5 text-xl font-black text-indigo-300 mt-0.5">
                    <Coins className="w-5 h-5 text-indigo-400" />
                    <span>{user.creditsBalance}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">BDT Equivalent</p>
                  <div className="flex items-center gap-1.5 text-xl font-black text-emerald-400 mt-0.5">
                    <Wallet className="w-5 h-5" />
                    <span>৳ {user.bdtBalance}</span>
                  </div>
                </div>
              </div>

              {/* Wallet Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  onClick={() => setEarnModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Earn Credits
                </Button>
                <Button
                  onClick={() => setHistoryModalOpen(true)}
                  variant="outline"
                  className="border-indigo-700/50 bg-indigo-950/40 text-indigo-200 hover:bg-indigo-900 hover:text-white text-xs rounded-xl gap-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  History
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Exchanges List */}
          <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  Active Exchanges
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Escrow-backed sessions associated with your account.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/exchanges")}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800"
              >
                View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {activeEscrows.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No active exchanges yet.</p>
              ) : activeEscrows.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.counterpartyAvatar}
                      alt={item.counterpartyName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>with {item.counterpartyName}</span>
                        <span>•</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">{item.format}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                    <div className="text-xs">
                      <div className="font-semibold text-slate-900 dark:text-slate-200">{item.date}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {item.time}
                      </div>
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* RECOMMENDED SKILLS HORIZONTAL SCROLL */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Recommended Skill Swaps
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Handpicked listings matching your learning interests.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/discover")}
              className="text-xs text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
            >
              Browse All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {/* Horizontal Scroll Flex Container */}
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            {recommendedSkills.length === 0 ? (
              <p className="py-8 text-xs text-slate-500">No published services are available yet.</p>
            ) : recommendedSkills.map((skill) => (
              <SkillCard key={skill.id} {...skill} onBook={handleBookSkill} />
            ))}
          </div>
        </div>

        {/* LEADERBOARD INTEGRATION */}
        <div className="pt-2">
          <LeaderboardSection />
        </div>
      </div>

      {/* EARN CREDITS MODAL */}
      <Dialog open={earnModalOpen} onOpenChange={setEarnModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Coins className="w-5 h-5 text-indigo-500" />
              How to Earn Credits
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              EwuSwap operates on a peer-to-peer credit model. Here's how to build your credit balance:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">1. Teach a Skill Session</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Publish a course or service listing. Earn credits directly when members book and complete exchanges with you.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">2. Host a Group Study Session</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lead a multi-student group session in your group space to earn credit rewards from multiple participants simultaneously.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
              <p className="font-semibold text-indigo-400">5% Platform Fee Note:</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Every escrow transaction holds funds safely until completed. Providers receive net credits (`gross - 5% fee`) after verification.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HISTORY MODAL */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <History className="w-5 h-5 text-indigo-500" />
              Recent Escrow Transactions
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Escrow payment history and status tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {escrowHistory.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No escrow history yet.</p>
            ) : escrowHistory.slice(0, 5).map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="text-[10px] text-slate-400">with {item.counterpartyName} · {item.date}</p>
                </div>
                <Badge className={`${item.status === "released" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : item.status === "rejected" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"} text-[10px]`}>
                  {item.status} ({item.credits} Credits)
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
