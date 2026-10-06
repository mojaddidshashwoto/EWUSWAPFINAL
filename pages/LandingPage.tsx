import { Link } from "wouter";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Coins,
  Repeat,
  CheckCircle2,
  Star,
  Users,
  TrendingUp,
  Lock,
  ChevronRight,
  GraduationCap,
  Smartphone,
  HeartHandshake,
  Check,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/badge";

const TOP_SKILLS = [
  {
    id: "l1",
    title: "Figma Component Architecture & Design Systems",
    provider: "Noah Williams",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    dept: "Dept. of English / UI Lead",
    category: "Design",
    type: "Service",
    rating: 4.9,
    reviews: 28,
    credits: 24,
    bdt: 2880,
    tags: ["Figma", "UI/UX", "Auto-layout"],
  },
  {
    id: "l2",
    title: "Python Backend & FastAPI Cloud Deployments",
    provider: "Jordan Kim",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80",
    dept: "Dept. of CSE (Semester 8)",
    category: "Programming",
    type: "Course",
    rating: 4.9,
    reviews: 34,
    credits: 25,
    bdt: 3000,
    tags: ["Python", "FastAPI", "Docker"],
  },
  {
    id: "l3",
    title: "Business Analytics & Tableau Interactive Stories",
    provider: "Priya Shah",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",
    dept: "Dept. of BBA / Finance",
    category: "Business",
    type: "Course",
    rating: 5.0,
    reviews: 19,
    credits: 18,
    bdt: 2160,
    tags: ["Tableau", "Excel", "BI"],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. PUBLIC TOP NAVIGATION */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size="md" tone="light" tagline className="transition-transform duration-300 group-hover:scale-[1.02]" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <Link href="/discover" className="hover:text-white transition-colors">
              Discover Skills
            </Link>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#escrow-safety" className="hover:text-white transition-colors">
              Escrow Protection
            </a>
            <a href="#community" className="hover:text-white transition-colors">
              Campus Proof
            </a>
          </nav>

          {/* Auth CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 px-4 rounded-xl"
              >
                Get Started
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-8 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-20 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>The Peer-Powered Campus Knowledge Exchange</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08]">
            Teach what you know. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              Learn what you love.
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            East West University's student-to-student marketplace. Trade knowledge with fellow peers for free or book escrow-protected sessions using <strong>Skill Credits</strong> and <strong>BDT (৳)</strong>.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link href="/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm px-8 py-6 rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 group"
              >
                <span>Start Learning</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/discover">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 font-bold text-sm px-7 py-6 rounded-2xl backdrop-blur-xs"
              >
                Explore Skills
              </Button>
            </Link>
          </div>

          {/* Quick Trust Signals */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Verified Student ID Required
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> 100% Escrow Protection
            </span>
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" /> Instant bKash & Nagad Cashout
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SOCIAL PROOF & PLATFORM METRICS */}
      {/* ========================================================================= */}
      <section id="community" className="py-12 border-y border-slate-800/80 bg-slate-950/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-white">1,280+</div>
              <div className="text-xs text-slate-400 font-medium">Active Campus Learners</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400">468+</div>
              <div className="text-xs text-slate-400 font-medium">Completed Exchanges</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-indigo-400">৳ 384k+</div>
              <div className="text-xs text-slate-400 font-medium">Protected Escrow Volume</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-amber-400">99.4%</div>
              <div className="text-xs text-slate-400 font-medium">Positive Review Score</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS: DUAL-CURRENCY & ESCROW SAFETY */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 md:py-28 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] uppercase font-bold tracking-wider">
            Architecture & Mechanics
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Designed for trust, reciprocity, and peace of mind.
          </h2>
          <p className="text-slate-400 text-sm">
            Everything you need to exchange knowledge securely on campus without awkward price negotiations or scams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: BDT & Barter System */}
          <div className="p-7 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-indigo-500/40 transition-all space-y-4 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Direct BDT & Barter Economy</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trade peer-to-peer for free using pure skill swaps, or price your sessions in <strong>BDT (৳)</strong>. Earn BDT directly by teaching your peers, and spend it to master new tools.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <span>Earn by teaching</span>
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Spend to learn</span>
            </div>
          </div>

          {/* Card 2: Escrow Protection */}
          <div id="escrow-safety" className="p-7 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-emerald-500/40 transition-all space-y-4 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Smart Escrow Protection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When booking a session, BDT funds are reserved safely in escrow. Funds are released to the provider <strong>only after</strong> the session is completed and the learner confirms satisfaction.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Check className="w-3.5 h-3.5" /> 100% money-back dispute guarantee
            </div>
          </div>

          {/* Card 3: Localized bKash & Nagad */}
          <div className="p-7 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-amber-500/40 transition-all space-y-4 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">bKash & Nagad Cashout</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Easily top up your balance or withdraw your earned tutoring revenue directly into your personal <strong>bKash</strong> or <strong>Nagad</strong> account with zero hidden fees.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-amber-400">
              <span>Instant mobile settlement in BDT</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. TOP PEER SKILLS PREVIEW */}
      {/* ========================================================================= */}
      <section className="py-16 bg-slate-950/80 border-t border-slate-800/80 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider mb-2">
                Trending on Campus
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Top Rated Peer Providers
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Verified East West University seniors and students sharing industry-ready skills.
              </p>
            </div>
            <Link href="/discover">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-xs font-bold text-slate-300 hover:text-white"
              >
                View all 120+ listings
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TOP_SKILLS.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-[10px]">
                      {item.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {item.rating} ({item.reviews})
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.tags.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={item.avatar}
                      alt={item.provider}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-200">{item.provider}</div>
                      <div className="text-[10px] text-slate-500">{item.dept}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-400">৳ {item.bdt.toLocaleString()} BDT</div>
                    <div className="text-[10px] text-slate-500">Escrow Protected</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CALL TO ACTION BANNER */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-800/50 p-8 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Ready to trade skills on campus?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Join 1,280+ East West University students accelerating their careers through peer-to-peer mentorship.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 relative z-10">
            <Link href="/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white hover:bg-slate-100 text-indigo-950 font-black text-sm px-8 py-6 rounded-2xl shadow-xl shadow-black/20"
              >
                Create Free Student Account
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-indigo-400/30 text-white hover:bg-white/10 font-bold text-sm px-7 py-6 rounded-2xl"
              >
                Sign In to Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. PRODUCTION FOOTER */}
      {/* ========================================================================= */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950/80 py-12 px-4 sm:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                E
              </div>
              <Logo size="sm" tone="light" />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Peer-to-peer knowledge exchange and escrow marketplace designed for East West University students.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-200 text-xs mb-3">Platform</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <Link href="/discover" className="hover:text-white transition-colors">
                  Browse Skills & Courses
                </Link>
              </li>
              <li>
                <Link href="/groups" className="hover:text-white transition-colors">
                  Study Circles & Groups
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-white transition-colors">
                  Campus Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/wallet" className="hover:text-white transition-colors">
                  Dual-Currency Wallet
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-200 text-xs mb-3">Safety & Escrow</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <a href="#escrow-safety" className="hover:text-white transition-colors">
                  Escrow Guarantee (5% Fee)
                </a>
              </li>
              <li>
                <Link href="/settings/privacy" className="hover:text-white transition-colors">
                  Student ID Verification
                </Link>
              </li>
              <li>
                <Link href="/settings/privacy" className="hover:text-white transition-colors">
                  Dispute Resolution Rules
                </Link>
              </li>
              <li>
                <span className="text-slate-500">MFS (bKash & Nagad) Gateways</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-200 text-xs mb-3">Legal & Support</h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <Link href="/settings/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/settings/privacy" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/settings/privacy" className="hover:text-white transition-colors">
                  Campus Conduct Code
                </Link>
              </li>
              <li>
                <a href="mailto:support@ewuswap.com" className="hover:text-white transition-colors">
                  Contact Campus Moderator
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            © 2026 EwuSwap. All rights reserved. Peer learning network for East West University.
          </div>
          <div className="flex items-center gap-4">
            <span>Aftabnagar, Dhaka, Bangladesh</span>
            <span>•</span>
            <span className="text-emerald-500 font-semibold">System Status: Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
