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
import { motion, AnimatePresence, type Variants } from "framer-motion";

const LIVE_ACTIVITY_ITEMS = [
  { id: "act-1", text: "Someone just earned ৳500 for a React bug fix", tag: "Earned", time: "2m ago" },
  { id: "act-2", text: "Photography session swapped for UI Design by Leila Haddad", tag: "Swap", time: "5m ago" },
  { id: "act-3", text: "Escrow funds released for weekend Bhai Bhai Biriyani!", tag: "Settled", time: "8m ago" },
  { id: "act-4", text: "Sajib (CSE '24) reserved ৳1,200 for Machine Learning exam prep", tag: "Escrow", time: "11m ago" },
  { id: "act-5", text: "Tanvir completed a Figma Design System swap with 5.0 rating", tag: "Review", time: "14m ago" },
  { id: "act-6", text: "Priya reviewed Tableau Data Visualization session · ৳900 net settled", tag: "Verified", time: "19m ago" },
  { id: "act-7", text: "Peer exchange requested: 'Conversational Bengali for Python'", tag: "Request", time: "24m ago" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 240,
      damping: 24,
    },
  },
};

const RECOMMENDED_SKILLS: SkillCardProps[] = [
  {
    id: "l1",
    title: "Figma Systems & Component Sprint",
    providerName: "Noah Williams",
    providerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    category: "Design",
    type: "Service",
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
  const [user, setUser] = useState({ displayName: "", bdtBalance: 0 });
  const [escrowHistory, setEscrowHistory] = useState<Array<{ id: string; title: string; counterpartyName: string; counterpartyAvatar: string; date: string; time: string; format: string; amountBdt: number; status: string }>>([]);
  const [activeEscrows, setActiveEscrows] = useState<Array<{ id: string; title: string; counterpartyName: string; counterpartyAvatar: string; date: string; time: string; format: string; amountBdt: number; status: string }>>([]);
  const [recommendedSkills, setRecommendedSkills] = useState<SkillCardProps[]>([]);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % LIVE_ACTIVITY_ITEMS.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isActive = true;
    Promise.all([getCurrentUser(), listMyEscrowTransactions(), listPublishedSkillCourses()])
      .then(([currentUser, transactions, courses]) => {
        if (!isActive) return;
        setUser({
          displayName: currentUser?.displayName || currentUser?.name || authUser?.displayName || "Member",
          bdtBalance: currentUser?.bdtBalance ?? 0,
        });
        const mappedTransactions = transactions.map((transaction) => {
          const counterparty = transaction.isPayer ? transaction.payee : transaction.payer;
          const createdAt = new Date(transaction.created_at);
          const amountBdt = Number(transaction.gross_amount_bdt ?? (transaction.gross_amount_credits ? transaction.gross_amount_credits * 120 : (transaction.amount_bdt ?? transaction.amount_credits * 120)));
          return {
            id: transaction.id,
            title: transaction.course?.title || "Skill exchange",
            counterpartyName: counterparty.display_name,
            counterpartyAvatar: counterparty.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
            date: createdAt.toLocaleDateString(),
            time: createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            format: "Coordinate with your exchange partner",
            bdt: amountBdt,
            amountBdt,
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
          bdtCost: course.priceBdt,
          duration: `${course.durationMinutes} min`,
          rating: course.averageRating,
          reviewsCount: course.reviewCount,
          description: course.description,
          authorId: course.instructorId,
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
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* 1. THE LIVING HERO SECTION */}
        <motion.div
          variants={itemVariants}
          className="relative rounded-3xl overflow-hidden border border-white/20 dark:border-white/10 shadow-2xl p-6 sm:p-10 bg-slate-950/85 backdrop-blur-2xl text-white"
        >
          {/* Animated Mesh Gradient Background Layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/90 via-slate-950 to-slate-900/90 opacity-95 -z-20" />

          {/* Drifting Floating Blurred Gradient Orbs */}
          {/* Orb 1: Deep Indigo / Violet */}
          <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-600/40 to-purple-600/35 blur-[95px] animate-float-1 pointer-events-none -z-10" />

          {/* Orb 2: Glowing Mint / Emerald */}
          <div className="absolute top-1/2 -right-16 w-80 h-80 rounded-full bg-gradient-to-tr from-emerald-500/35 to-teal-400/30 blur-[90px] animate-float-2 pointer-events-none -z-10" />

          {/* Orb 3: Radiant Coral / Rose */}
          <div className="absolute -bottom-24 left-1/3 w-88 h-88 rounded-full bg-gradient-to-r from-rose-500/30 to-amber-500/25 blur-[90px] animate-float-3 pointer-events-none -z-10" />

          {/* Micro Grid Overlay for High-Tech Texture */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0d_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none -z-10 opacity-70" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              {/* Top Greeting Badge + Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-white/10 hover:bg-white/15 text-indigo-200 border-white/15 backdrop-blur-md text-[11px] px-3 py-1 font-semibold flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  East West University Peer Swap
                </Badge>
                <span className="text-xs text-slate-300 font-medium">
                  Good morning, <strong className="text-white">{user.displayName || "Member"}</strong> 👋
                </span>
              </div>

              {/* Masking Gradient Shine Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-emerald-200 animate-gradient-flow">
                Your skills are your currency.
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-xl">
                Trade hands-on software, design, and academic expertise directly with peers. Every booking is secured in automated escrow until the session is verified.
              </p>

              {/* 2. THE FOMO ACTIVITY TICKER */}
              <div className="pt-1">
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/80 dark:bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-lg w-fit">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tickerIndex}
                      initial={{ opacity: 0, y: 7 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -7 }}
                      transition={{ duration: 0.25 }}
                      className="text-[11px] font-medium text-slate-200 truncate max-w-[260px] sm:max-w-md flex items-center gap-2"
                    >
                      <span>{LIVE_ACTIVITY_ITEMS[tickerIndex].text}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">· {LIVE_ACTIVITY_ITEMS[tickerIndex].time}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* 3. TACTILE HERO ACTION CONTROLS */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                onClick={() => setLocation("/discover")}
                className="shimmer-btn group px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-600/35 hover:shadow-xl hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
                <span>Post a Service</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setLocation("/discover")}
                className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>Find a Skill</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* 4. CASCADE ITEM 2: WALLET & UPCOMING EXCHANGES */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Card with 3D Hover Lift and Ambient Glow */}
          <Card className="card-hover-3d lg:col-span-1 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white border-indigo-800/40 shadow-xl overflow-hidden relative">
            {/* Background Glow Spheres */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Your Balance</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                  5% Platform Protected
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Single BDT Balance */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-500/20">
                <p className="text-xs text-indigo-200 font-medium">Available BDT Balance</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black tracking-tight text-emerald-400">৳ {user.bdtBalance.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 font-semibold">BDT</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Single source of truth for skill swaps & escrow</p>
              </div>

              {/* Wallet Action Buttons with Tactile Shimmer */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  onClick={() => setLocation("/wallet")}
                  className="shimmer-btn bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/45 hover:scale-105 active:scale-95 transition-all duration-200 gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Manage Wallet
                </Button>
                <Button
                  onClick={() => setHistoryModalOpen(true)}
                  variant="outline"
                  className="border-indigo-700/50 bg-indigo-950/40 text-indigo-200 hover:bg-indigo-900 hover:text-white text-xs rounded-xl gap-1.5 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <History className="w-3.5 h-3.5" />
                  History
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Exchanges List */}
          <Card className="card-hover-3d lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
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
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all"
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
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-indigo-200 dark:hover:border-indigo-800"
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
        </motion.div>

        {/* 5. CASCADE ITEM 3: RECOMMENDED SKILLS */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Recommended Skill Swaps
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Handpicked listings matching your learning interests with 3D tactile lift.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/discover")}
              className="text-xs text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:scale-105 active:scale-95 transition-all shadow-sm hover:border-indigo-300 hover:text-indigo-600"
            >
              Browse All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {/* Horizontal Scroll Flex Container */}
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 px-1">
            {recommendedSkills.length === 0 ? (
              <p className="py-8 text-xs text-slate-500">No published services are available yet.</p>
            ) : recommendedSkills.map((skill) => (
              <SkillCard key={skill.id} {...skill} onBook={handleBookSkill} />
            ))}
          </div>
        </motion.div>

        {/* 6. CASCADE ITEM 4: LEADERBOARD INTEGRATION */}
        <motion.div variants={itemVariants} className="pt-2">
          <LeaderboardSection />
        </motion.div>
      </motion.div>

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
                  {item.status} (৳ {item.amountBdt.toLocaleString()} BDT)
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
