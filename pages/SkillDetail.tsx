import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Star, Clock, Coins, Wallet, ShieldCheck, ArrowLeft, CheckCircle2, MessageCircle,
  Sparkles, Laptop, Users, RefreshCw, LockKeyhole, Heart
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { EscrowCheckoutModal } from "@/components/EscrowCheckoutModal";
import { listPublishedSkillCourses } from "@/lib/supabase";

const SAMPLE_SKILL_DATA = {
  id: "l1",
  title: "Figma Systems & Component Architecture Sprint",
  category: "Design",
  type: "Service" as "Service" | "Course",
  creditCost: 24,
  bdtCost: 1200,
  duration: "90 min",
  format: "Online (Zoom / Figma Multi-player)",
  rating: 4.95,
  reviewsCount: 28,
  description: "Turn a messy product file into a clean, reusable component system with auto-layout variants, interactive component states, and tokenized color styles.",
  learningOutcomes: [
    "Master Figma auto-layout 5.0 and responsive component property properties.",
    "Build a production-ready design token library for web and mobile.",
    "Establish clean naming conventions and component documentation.",
    "Receive a 1-on-1 file audit of your existing project during the session.",
  ],
  prerequisites: "Basic familiarity with Figma interface and vector tools.",
  teacher: {
    id: "usr-noah",
    name: "Noah Williams",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
    role: "Senior Product Designer",
    isVerified: true,
    trustScore: 4.95,
    availabilityStatus: "available" as "available" | "busy" | "vacation" | "unavailable",
    bio: "Product designer with 6+ years shipping design systems for fast-growing startups.",
  },
  reviews: [
    {
      id: "r1",
      reviewerName: "Aisha Rahman",
      reviewerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
      rating: 5,
      date: "3 days ago",
      comment: "Noah's Figma sprint saved me weeks of refactoring. His component variant setup is incredibly clean!",
    },
    {
      id: "r2",
      reviewerName: "Priya Shah",
      reviewerAvatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",
      rating: 5,
      date: "1 week ago",
      comment: "Super clear explanation of auto-layout. Highly recommended for any designer looking to build scalable systems.",
    },
  ],
};

export default function SkillDetail() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [skill, setSkill] = useState(SAMPLE_SKILL_DATA);
  const [isLiveListing, setIsLiveListing] = useState(false);
  const [isLoadingSkill, setIsLoadingSkill] = useState(true);
  const [isListingNotFound, setIsListingNotFound] = useState(false);
  const [offeredSkill, setOfferedSkill] = useState("React & TypeScript Development");
  const [swapNote, setSwapNote] = useState("");
  const [isLiked, setIsLiked] = useState(false);

  const courseId = location.split("/")[2];
  const isOwnListing = Boolean(user?.id && skill.teacher.id === user.id);

  useEffect(() => {
    let isActive = true;
    setIsLoadingSkill(true);
    setIsLiveListing(false);
    setIsListingNotFound(false);
    if (!courseId) {
      setIsListingNotFound(true);
      setIsLoadingSkill(false);
      return () => {
        isActive = false;
      };
    }

    listPublishedSkillCourses()
      .then((courses) => {
        const course = courses.find((item) => item.id === courseId);
        if (!isActive) return;
        if (!course) {
          setIsListingNotFound(true);
          return;
        }
        setSkill((current) => ({
          ...current,
          id: course.id,
          title: course.title,
          category: course.category,
          type: course.type === "service" ? "Service" : "Course",
          creditCost: course.creditCost,
          bdtCost: course.creditCost * 120,
          duration: `${course.durationMinutes} min`,
          rating: course.averageRating,
          reviewsCount: course.reviewCount,
          description: course.description,
          format: "Session format coordinated with the provider",
          learningOutcomes: [],
          prerequisites: "Coordinate prerequisites with the provider before the session.",
          reviews: [],
          teacher: {
            ...current.teacher,
            id: course.instructorId,
            name: course.instructorName,
            avatar: course.instructorAvatar,
            role: course.instructorEducation || "EwuSwap provider",
            bio: course.instructorBio,
            availabilityStatus: course.availabilityStatus,
            isVerified: course.isVerified,
            trustScore: course.trustScore,
          },
        }));
        setIsLiveListing(true);
      })
      .catch((error) => {
        if (isActive) {
          toast.error(error?.message || "Could not load this course.");
          setIsListingNotFound(true);
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingSkill(false);
      });

    return () => {
      isActive = false;
    };
  }, [courseId]);

  const handleRequestSwap = () => {
    toast.success("Skill Swap request sent to " + skill.teacher.name + "!");
    setSwapModalOpen(false);
  };

  if (isLoadingSkill) {
    return (
      <DashboardLayout>
        <p className="py-16 text-center text-sm text-slate-500">Loading skill details...</p>
      </DashboardLayout>
    );
  }

  if (isListingNotFound) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Skill not found</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">This course or service is no longer published or the link is invalid.</p>
          <Link href="/discover" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500">
            <ArrowLeft className="h-4 w-4" />
            Back to Discovery
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Back Link */}
        <Link href="/discover" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Discovery
        </Link>

        {/* HERO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                  {skill.category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {skill.type}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {skill.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {skill.description}
              </p>

              {/* Quick Specs */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>{skill.duration}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-sky-500" />
                  <span>{skill.format}</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-500 font-semibold">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{skill.rating.toFixed(2)} ({skill.reviewsCount} reviews)</span>
                </div>
              </div>
            </div>

            {/* WHAT YOU'LL LEARN */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">What You'll Learn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {skill.learningOutcomes.map((outcome, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* VERIFIED REVIEWS */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Verified Peer Reviews</CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Ratings from members who completed exchanges with Noah.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {skill.reviews.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No published reviews yet.</p>
                ) : skill.reviews.map((rev) => (
                  <div key={rev.id} className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={rev.reviewerAvatar} alt={rev.reviewerName} className="w-7 h-7 rounded-full object-cover" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{rev.reviewerName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{rev.rating}.0</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{rev.comment}"</p>
                    <p className="text-[10px] text-slate-400">{rev.date}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* SIDEBAR CTA CARD & TEACHER PROFILE SUMMARY */}
          <div className="space-y-6">
            {/* Booking CTAs Card */}
            <Card className="bg-white dark:bg-slate-900 border-indigo-500/30 dark:border-indigo-500/30 shadow-xl overflow-hidden sticky top-20">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
                <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">Exchange Pricing</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black">{skill.creditCost} Credits</span>
                  <span className="text-xs text-indigo-200">or ৳ {skill.bdtCost} BDT</span>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  {isOwnListing ? (
                    <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-center space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        You are the instructor of this listing
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Self-booking is disabled. Other students and peers can book this session from Discovery.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Primary CTA 1: Request Free Swap */}
                      <Button
                        onClick={() => setSwapModalOpen(true)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 gap-2 py-5"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Request Free Swap (Skill Exchange)
                      </Button>

                      {/* Primary CTA 2: Pay for Service */}
                      <Button
                        onClick={() => setPayModalOpen(true)}
                        disabled={!isLiveListing}
                        title={isLiveListing ? "Pay for this published service" : "This preview listing is not available for checkout"}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 gap-2 py-5"
                      >
                        <Coins className="w-4 h-4" />
                        Pay for Service ({skill.creditCost} Credits)
                      </Button>
                    </>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                    <LockKeyhole className="w-3.5 h-3.5 text-indigo-500" />
                    <span>5% Escrow Protection</span>
                  </div>
                  <p>Credits are held safely in escrow and released only after your session is verified.</p>
                </div>
              </CardContent>
            </Card>

            {/* Teacher Profile Summary Card */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">About the Teacher</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={skill.teacher.avatar}
                    alt={skill.teacher.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      {skill.teacher.name}
                      {skill.teacher.isVerified && <ShieldCheck className="w-4 h-4 text-indigo-500" />}
                    </h4>
                    <p className="text-xs text-slate-400">{skill.teacher.role}</p>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] mt-1">
                      {skill.teacher.availabilityStatus}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {skill.teacher.bio}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/profile/${skill.teacher.id}`)}
                  className="w-full text-xs border-slate-200 dark:border-slate-800"
                >
                  View Full Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* MODAL 1: REQUEST FREE SWAP */}
      <Dialog open={swapModalOpen} onOpenChange={setSwapModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <RefreshCw className="w-5 h-5 text-emerald-500" />
              Propose a Skill Swap with {skill.teacher.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Select one of your offered skills to trade 1-on-1 without using credits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Your Skill to Offer</label>
              <input
                value={offeredSkill}
                onChange={(e) => setOfferedSkill(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Message Note</label>
              <Textarea
                placeholder="Explain what project or goal you'd like to work on together..."
                value={swapNote}
                onChange={(e) => setSwapNote(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRequestSwap} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl">
              Send Swap Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EscrowCheckoutModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        skillTitle={skill.title}
        providerName={skill.teacher.name}
        courseId={skill.id}
        payeeId={skill.teacher.id}
        amountCredits={skill.creditCost}
        onConfirmSuccess={() => setPayModalOpen(false)}
      />
    </DashboardLayout>
  );
}
