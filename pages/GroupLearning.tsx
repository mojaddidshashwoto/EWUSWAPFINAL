import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Sparkles, Calendar, Clock, Coins, Wallet, ShieldCheck, CheckCircle2,
  TrendingUp, Plus, UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface GroupSession {
  id: string;
  title: string;
  category: string;
  providerName: string;
  providerAvatar: string;
  isVerified: boolean;
  date: string;
  time: string;
  creditCost: number;
  bdtCost: number;
  enrolledStudents: number;
  maxCapacity: number;
  description: string;
  isJoined?: boolean;
}

const SAMPLE_GROUPS: GroupSession[] = [
  {
    id: "grp-1",
    title: "Designing in Public: Product Critique Circle",
    category: "Design",
    providerName: "Noah Williams",
    providerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    date: "Tomorrow, Sep 27",
    time: "7:00 PM - 8:30 PM",
    creditCost: 10, // More affordable than 1-on-1 (24 credits)
    bdtCost: 500,
    enrolledStudents: 12,
    maxCapacity: 20,
    description: "Weekly interactive critique session for product builders. Bring your designs and get live group feedback!",
    isJoined: true,
  },
  {
    id: "grp-2",
    title: "Creative Analytics & Data Story Club",
    category: "Technology",
    providerName: "Priya Shah",
    providerAvatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    date: "Thu, Sep 29",
    time: "6:30 PM - 8:00 PM",
    creditCost: 8,
    bdtCost: 400,
    enrolledStudents: 14,
    maxCapacity: 15,
    description: "Learn Tableau dashboards through real dataset practice sessions in a friendly group setting.",
    isJoined: false,
  },
  {
    id: "grp-3",
    title: "Bengali Language & Culture Practice Circle",
    category: "Languages",
    providerName: "Tanvir Hasan",
    providerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80",
    isVerified: true,
    date: "Fri, Oct 02",
    time: "5:00 PM - 6:00 PM",
    creditCost: 6,
    bdtCost: 300,
    enrolledStudents: 9,
    maxCapacity: 12,
    description: "Group conversation practice for everyday Bengali vocabulary and idiom usage.",
    isJoined: false,
  },
];

export default function GroupLearningPage() {
  const [groups, setGroups] = useState<GroupSession[]>(SAMPLE_GROUPS);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupCost, setNewGroupCost] = useState("10");

  const handleJoinGroup = (id: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === id
          ? {
              ...g,
              isJoined: !g.isJoined,
              enrolledStudents: g.isJoined ? g.enrolledStudents - 1 : g.enrolledStudents + 1,
            }
          : g
      )
    );
    const target = groups.find((g) => g.id === id);
    if (target?.isJoined) {
      toast.info(`Left group session "${target.title}".`);
    } else {
      toast.success(`Joined group session "${target?.title}"! ${target?.creditCost} Credits reserved.`);
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupTitle.trim()) {
      toast.error("Please enter a group session topic.");
      return;
    }
    const cost = parseInt(newGroupCost, 10) || 10;
    const newSession: GroupSession = {
      id: "grp-" + Date.now(),
      title: newGroupTitle.trim(),
      category: "Technology",
      providerName: "Aisha Rahman",
      providerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85",
      isVerified: true,
      date: "Next Week",
      time: "6:00 PM - 7:30 PM",
      creditCost: cost,
      bdtCost: cost * 50,
      enrolledStudents: 1,
      maxCapacity: 15,
      description: "Hosted group session for collaborative learning and live code review.",
      isJoined: true,
    };
    setGroups([newSession, ...groups]);
    setCreateModalOpen(false);
    setNewGroupTitle("");
    toast.success("New Group Study Session published!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-500" />
              Group Learning & Study Circles
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Join multi-student study sessions or host your own group class.
            </p>
          </div>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Host Group Session
          </Button>
        </div>

        {/* VALUE EMPHASIS BANNER */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white border border-indigo-800/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Why Group Learning Works Better on EwuSwap
              </h3>
              <p className="text-xs text-indigo-200 leading-relaxed max-w-2xl">
                Group learning makes sessions <strong className="text-emerald-300">more affordable for students</strong> (lower credit cost per student) while providers <strong className="text-amber-300">earn higher total returns</strong> from multiple enrolled students simultaneously!
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs shrink-0 self-start sm:self-center">
            Win-Win Economy
          </Badge>
        </div>

        {/* GROUP CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((grp) => (
            <Card key={grp.id} className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
              <div>
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    {grp.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{grp.enrolledStudents} / {grp.maxCapacity} Enrolled</span>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-3">
                  {/* Provider */}
                  <div className="flex items-center gap-2.5">
                    <img src={grp.providerAvatar} alt={grp.providerName} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        {grp.providerName}
                        {grp.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />}
                      </h4>
                      <p className="text-[10px] text-slate-400">Host / Teacher</p>
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{grp.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {grp.description}
                    </p>
                  </div>

                  {/* Schedule */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" /> {grp.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {grp.time}
                    </span>
                  </div>
                </CardContent>
              </div>

              {/* Price & Join CTA */}
              <CardFooter className="px-5 py-3 bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
                    <Coins className="w-4 h-4" />
                    <span>{grp.creditCost} Credits</span>
                  </div>
                  <span className="text-[10px] text-slate-400">৳ {grp.bdtCost} BDT</span>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleJoinGroup(grp.id)}
                  variant={grp.isJoined ? "outline" : "default"}
                  className={`text-xs rounded-xl ${
                    grp.isJoined ? "border-slate-300 dark:border-slate-700" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  }`}
                >
                  {grp.isJoined ? "Leave Session" : "Join Group Session"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* CREATE GROUP MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Host a Group Study Session
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Schedule a multi-student teaching session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Session Topic / Title</label>
              <Input
                placeholder="e.g. Next.js App Router Masterclass"
                value={newGroupTitle}
                onChange={(e) => setNewGroupTitle(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Price per Student (Credits)</label>
              <Input
                type="number"
                value={newGroupCost}
                onChange={(e) => setNewGroupCost(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleCreateGroup} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-xl">
              Publish Group Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
