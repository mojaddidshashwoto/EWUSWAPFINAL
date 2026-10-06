import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { SkillCard, SkillCardProps } from "@/components/SkillCard";
import { LeaderboardSection } from "@/components/LeaderboardSection";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, MagneticButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins, Wallet, Plus, Calendar, Clock, ArrowRight, Sparkles, TrendingUp,
  ShieldCheck, History, CheckCircle2, ChevronRight, HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase, getCurrentUser, listMyEscrowTransactions, listPublishedSkillCourses } from "@/lib/supabase";
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
  const [userBdt, setUserBdt] = useState(0);
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

  // Fetch user profile and actual BDT balance from database exactly like Wallet.tsx
  const loadUserData = async () => {
    try {
      const currentUser = await getCurrentUser();
      const balance = currentUser?.bdtBalance ?? 0;
      setUserBdt(balance);
      setUser((prev) => ({
        ...prev,
        displayName: currentUser?.displayName || currentUser?.name || authUser?.displayName || "Member",
        bdtBalance: balance,
      }));
    } catch (err) {
      console.error("Could not load user wallet data:", err);
    }
  };

  const loadDashboardData = async () => {
    await loadUserData();
    try {
      const [transactions, courses] = await Promise.all([
        listMyEscrowTransactions().catch(() => []),
        listPublishedSkillCourses().catch(() => []),
      ]);
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
    } catch (error: any) {
      toast.error(error?.message || "Could not load your dashboard data.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const loadAndSubscribe = async () => {
      await loadDashboardData();
      const { data: { user: sbUser }, error } = await supabase.auth.getUser();
      if (error || !sbUser || !isMounted) return;

      const refresh = () => { void loadUserData(); };
      channel = supabase
        .channel(`dashboard_wallet:${sbUser.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ss_profiles", filter: `id=eq.${sbUser.id}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "ss_escrow_transactions", filter: `payer_id=eq.${sbUser.id}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "ss_escrow_transactions", filter: `payee_id=eq.${sbUser.id}` }, refresh)
        .subscribe();
    };

    void loadAndSubscribe();

    const handleUpdate = () => { void loadUserData(); };
    window.addEventListener("ss_wallet_updated", handleUpdate);
    window.addEventListener("ss_user_changed", handleUpdate);

    return () => {
      isMounted = false;
      if (channel) void supabase.removeChannel(channel);
      window.removeEventListener("ss_wallet_updated", handleUpdate);
      window.removeEventListener("ss_user_changed", handleUpdate);
    };
  }, [authUser?.id]);

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
        {/* 1. THE LIVING HERO SECTION - Deep Space Spatial Glass */}
        <motion.div
          variants={itemVariants}
          className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl p-6 sm:p-10 bg-white/[0.025] backdrop-blur-3xl text-white"
        >
          {/* Animated Mesh Gradient Background Layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/70 via-black to-slate-950/80 opacity-90 -z-20" />

          {/* Drifting Floating Blurred Gradient Orbs */}
          {/* Orb 1: Deep Indigo / Violet */}
          <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-600/35 to-purple-600/30 blur-[95px] animate-float-1 pointer-events-none -z-10" />

          {/* Orb 2: Glowing Mint / Emerald */}
          <div className="absolute top-1/2 -right-16 w-80 h-80 rounded-full bg-gradient-to-tr from-emerald-500/30 to-teal-400/25 blur-[90px] animate-float-2 pointer-events-none -z-10" />

          {/* Orb 3: Radiant Coral / Rose */}
          <div className="absolute -bottom-24 left-1/3 w-88 h-88 rounded-full bg-gradient-to-r from-rose-500/25 to-amber-500/20 blur-[90px] animate-float-3 pointer-events-none -z-10" />

          {/* Micro Grid Overlay for High-Tech Texture */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none -z-10 opacity-60" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              {/* Top Greeting Badge + Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-white/[0.06] hover:bg-white/[0.1] text-indigo-200 border-white/10 backdrop-blur-md text-[10px] px-3 py-1 font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  East West University Peer Swap
                </Badge>
                <span className="text-xs text-zinc-400 font-medium">
                  Welcome back, <strong className="text-white font-bold">{user.displayName || "Member"}</strong>
                </span>
              </div>

              {/* Massive Masking Gradient Shine Headline with Negative Letter Spacing */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.05] text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-emerald-200 animate-gradient-flow">
                Your skills are your currency.
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl font-normal">
                Trade hands-on software, design, and academic expertise directly with peers. Every booking is secured in automated escrow until the session is verified.
              </p>

              {/* 2. THE FOMO ACTIVITY TICKER */}
              <div className="pt-1">
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-white shadow-xl w-fit">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-black uppercase tracking-widest text-emerald-300">
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
                      className="text-[11px] font-medium text-zinc-200 truncate max-w-[260px] sm:max-w-md flex items-center gap-2"
                    >
                      <span>{LIVE_ACTIVITY_ITEMS[tickerIndex].text}</span>
                      <span className="text-[10px] text-zinc-500 shrink-0 hidden sm:inline">· {LIVE_ACTIVITY_ITEMS[tickerIndex].time}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* 3. MAGNETIC & LUMINOUS HERO ACTION CONTROLS */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <MagneticButton
                onClick={() => setLocation("/discover")}
                className="shimmer-btn group px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white font-extrabold text-xs tracking-wide shadow-[0_0_30px_rgba(99,102,241,0.4),0_0_15px_rgba(53,169,133,0.3)] hover:shadow-[0_0_45px_rgba(99,102,241,0.6),0_0_25px_rgba(53,169,133,0.45)] border border-indigo-400/30 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
                <span>Post a Service</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>

              <MagneticButton
                variant="outline"
                onClick={() => setLocation("/discover")}
                className="px-6 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold text-xs border border-white/10 backdrop-blur-xl shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>Find a Skill</span>
              </MagneticButton>
            </div>
          </div>
        </motion.div>

        {/* 4. CASCADE ITEM 2: WALLET & UPCOMING EXCHANGES - Spatial Frosted Glass */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Card with Spatial Panel and Luminous Response */}
          <Card className="card-hover-3d lg:col-span-1 bg-white/[0.025] backdrop-blur-3xl text-white border-white/10 shadow-2xl overflow-hidden relative hover:border-white/20">
            {/* Ambient Background Glow Spheres */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Your Balance</span>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-2.5 py-0.5 rounded-full">
                  5% Platform Protected
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Single BDT Balance Spatial Block */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Available BDT Balance</p>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-4xl font-black tracking-tighter text-emerald-400">৳ {userBdt.toLocaleString()}</span>
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">BDT</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-medium">Single source of truth for skill swaps & escrow</p>
              </div>

              {/* Wallet Action Buttons with Magnetic Physics & Tactile Shimmer */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <MagneticButton
                  onClick={() => setLocation("/wallet")}
                  className="shimmer-btn bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold text-xs rounded-xl shadow-[0_0_25px_rgba(99,102,241,0.35)] hover:shadow-[0_0_35px_rgba(53,169,133,0.4)] border border-indigo-400/30 gap-1.5 w-full"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Manage Wallet
                </MagneticButton>
                <Button
                  onClick={() => setHistoryModalOpen(true)}
                  variant="outline"
                  className="border-white/10 bg-white/[0.03] text-zinc-300 hover:text-white hover:bg-white/[0.07] hover:border-white/20 text-xs rounded-xl gap-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  History
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Exchanges List - No Harsh Table Borders */}
          <Card className="card-hover-3d lg:col-span-2 bg-white/[0.025] backdrop-blur-3xl border-white/10 shadow-2xl flex flex-col justify-between hover:border-white/20">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Active Exchanges
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Escrow-backed sessions associated with your account.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/exchanges")}
                className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-white/[0.06] font-semibold"
              >
                View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-2.5">
              {activeEscrows.length === 0 ? (
                <p className="py-8 text-center text-xs text-zinc-500">No active exchanges yet.</p>
              ) : activeEscrows.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.counterpartyAvatar}
                      alt={item.counterpartyName}
                      className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <span>with {item.counterpartyName}</span>
                        <span>•</span>
                        <span className="text-indigo-400 font-semibold">{item.format}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                    <div className="text-xs">
                      <div className="font-semibold text-zinc-200">{item.date}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1 justify-end font-medium">
                        <Clock className="w-3 h-3" />
                        {item.time}
                      </div>
                    </div>
                    <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] font-bold">
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
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Curated For You</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter flex items-center gap-2 mt-0.5">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Recommended Skill Swaps
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Handpicked listings matching your learning interests with spatial 3D tactile lift.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/discover")}
              className="text-xs text-zinc-300 border-white/10 bg-white/[0.03] hover:text-white hover:bg-white/[0.08] hover:border-white/20"
            >
              Browse All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {/* Horizontal Scroll Flex Container */}
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-thin scrollbar-thumb-zinc-800 px-1">
            {recommendedSkills.length === 0 ? (
              <p className="py-8 text-xs text-zinc-500">No published services are available yet.</p>
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

      {/* EARN CREDITS MODAL - Spatial Glass */}
      <Dialog open={earnModalOpen} onOpenChange={setEarnModalOpen}>
        <DialogContent className="bg-[#0e0f14]/95 backdrop-blur-3xl border-white/10 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
              <Coins className="w-5 h-5 text-indigo-400" />
              How to Earn Credits
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              EwuSwap operates on a peer-to-peer credit model. Here's how to build your credit balance:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/10 space-y-1">
              <h4 className="text-xs font-bold text-white">1. Teach a Skill Session</h4>
              <p className="text-xs text-zinc-400">
                Publish a course or service listing. Earn credits directly when members book and complete exchanges with you.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/10 space-y-1">
              <h4 className="text-xs font-bold text-white">2. Host a Group Study Session</h4>
              <p className="text-xs text-zinc-400">
                Lead a multi-student group session in your group space to earn credit rewards from multiple participants simultaneously.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
              <p className="font-bold text-indigo-300">5% Platform Fee Note:</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Every escrow transaction holds funds safely until completed. Providers receive net credits (`gross - 5% fee`) after verification.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HISTORY MODAL - Spatial Glass */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="bg-[#0e0f14]/95 backdrop-blur-3xl border-white/10 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
              <History className="w-5 h-5 text-indigo-400" />
              Recent Escrow Transactions
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Escrow payment history and status tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {escrowHistory.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">No escrow history yet.</p>
            ) : escrowHistory.slice(0, 5).map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-white/[0.025] border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{item.title}</p>
                  <p className="text-[10px] text-zinc-500 font-medium">with {item.counterpartyName} · {item.date}</p>
                </div>
                <Badge className={`${item.status === "released" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : item.status === "rejected" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"} text-[10px] font-bold`}>
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
