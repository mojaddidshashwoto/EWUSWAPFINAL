import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Repeat, Calendar, Clock, CheckCircle2, ShieldCheck, AlertCircle, Laptop, Users,
  Coins, Wallet, ArrowRight, RefreshCw, MessageSquare, Plus
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { listMyEscrowTransactions, openEscrowDispute, submitEscrowProof } from "@/lib/supabase";

interface ExchangeItem {
  id: string;
  title: string;
  category: string;
  teacherName: string;
  teacherAvatar: string;
  learnerName: string;
  learnerAvatar: string;
  date: string;
  time: string;
  format: "Online" | "Offline";
  grossCredits: number;
  netCredits: number;
  feeCredits: number;
  status: "upcoming" | "pending" | "active" | "completed" | "cancelled" | "disputed";
  escrowStatus: "pending" | "submitted" | "verified" | "released" | "rejected";
  isPayer: boolean;
}

const SAMPLE_EXCHANGES: ExchangeItem[] = [
  {
    id: "ex-101",
    title: "Figma Systems & Component Architecture Sprint",
    category: "Design",
    teacherName: "Noah Williams",
    teacherAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    learnerName: "Aisha Rahman",
    learnerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    date: "Today, Sep 26",
    time: "4:00 PM - 5:30 PM",
    format: "Online",
    grossCredits: 24,
    netCredits: 23,
    feeCredits: 1,
    status: "active",
    escrowStatus: "submitted",
    isPayer: true,
  },
  {
    id: "ex-102",
    title: "Build Your First Tableau Data Story",
    category: "Technology",
    teacherName: "Priya Shah",
    teacherAvatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80",
    learnerName: "Aisha Rahman",
    learnerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    date: "Tomorrow, Sep 27",
    time: "11:00 AM - 12:00 PM",
    format: "Offline",
    grossCredits: 18,
    netCredits: 17,
    feeCredits: 1,
    status: "upcoming",
    escrowStatus: "pending",
    isPayer: true,
  },
  {
    id: "ex-103",
    title: "React & TypeScript Architecture Code Review",
    category: "Technology",
    teacherName: "Aisha Rahman",
    teacherAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    learnerName: "Jordan Kim",
    learnerAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80",
    date: "Sep 20, 2026",
    time: "2:00 PM - 3:00 PM",
    format: "Online",
    grossCredits: 25,
    netCredits: 24,
    feeCredits: 1,
    status: "completed",
    escrowStatus: "released",
    isPayer: true,
  },
  {
    id: "ex-104",
    title: "Brand Voice & Copywriting Fundamentals",
    category: "Marketing",
    teacherName: "Elliot Brooks",
    teacherAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80",
    learnerName: "Aisha Rahman",
    learnerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    date: "Sep 16, 2026",
    time: "3:00 PM - 4:00 PM",
    format: "Online",
    grossCredits: 20,
    netCredits: 19,
    feeCredits: 1,
    status: "disputed",
    escrowStatus: "submitted",
    isPayer: true,
  },
];

export default function ExchangesPage() {
  const [, setLocation] = useLocation();
  const [exchanges, setExchanges] = useState<ExchangeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [selectedDisputeExId, setSelectedDisputeExId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const loadExchanges = async () => {
    try {
      const rows = await listMyEscrowTransactions();
      setExchanges(rows.map((row) => ({
        id: row.id,
        title: row.course?.title || "Skill exchange",
        category: row.course?.category || "Other",
        teacherName: row.payee.display_name,
        teacherAvatar: row.payee.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
        learnerName: row.payer.display_name,
        learnerAvatar: row.payer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
        date: new Date(row.created_at).toLocaleDateString(),
        time: new Date(row.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        format: "Online",
        grossCredits: Number(row.gross_amount_credits ?? row.amount_credits),
        netCredits: Number(row.net_amount_credits ?? row.amount_credits),
        feeCredits: Number(row.platform_fee_credits ?? 0),
        status: row.dispute ? "disputed" : row.status === "released" ? "completed" : row.status === "rejected" ? "cancelled" : row.status === "pending" ? "pending" : "active",
        escrowStatus: row.status,
        isPayer: row.isPayer,
      })));
    } catch (error: any) {
      toast.error(error?.message || "Could not load exchange data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExchanges();
  }, []);

  const handleReleaseFunds = async (id: string) => {
    try {
      await submitEscrowProof(id);
      toast.success("Satisfaction confirmed. The exchange was submitted for verification.");
      await loadExchanges();
    } catch (error: any) {
      toast.error(error?.message || "Could not submit this exchange for verification.");
    }
  };

  const handleOpenDisputeModal = (id: string) => {
    setSelectedDisputeExId(id);
    setDisputeModalOpen(true);
  };

  const handleConfirmDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error("Please enter a reason for the dispute.");
      return;
    }
    if (selectedDisputeExId) {
      try {
        await openEscrowDispute(selectedDisputeExId, disputeReason);
        toast.info("Dispute ticket opened for moderation.");
        await loadExchanges();
      } catch (error: any) {
        toast.error(error?.message || "Could not open this dispute.");
        return;
      }
    }
    setDisputeModalOpen(false);
    setDisputeReason("");
  };

  const renderExchangeCards = (statusFilter: ExchangeItem["status"]) => {
    const list = exchanges.filter((ex) => ex.status === statusFilter);

    if (list.length === 0) {
      return (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-center py-12">
          <CardContent className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isLoading ? "Loading exchanges..." : `No ${statusFilter} exchanges found.`}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {list.map((ex) => (
          <Card key={ex.id} className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {ex.category}
                </Badge>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">{ex.title}</CardTitle>
              </div>

              <Badge className={`text-[10px] capitalize ${
                ex.status === "completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                ex.status === "active" ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" :
                ex.status === "disputed" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }`}>
                {ex.status}
              </Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Participants Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                {/* Teacher */}
                <div className="flex items-center gap-2.5">
                  <img src={ex.teacherAvatar} alt={ex.teacherName} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Teacher / Provider</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      {ex.teacherName}
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                    </span>
                  </div>
                </div>

                {/* Learner */}
                <div className="flex items-center gap-2.5 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-3">
                  <img src={ex.learnerAvatar} alt={ex.learnerName} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Learner / Student</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{ex.learnerName}</span>
                  </div>
                </div>
              </div>

              {/* Date, Time & Escrow Quote info */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> {ex.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {ex.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Laptop className="w-3.5 h-3.5 text-sky-500" /> {ex.format}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> {ex.grossCredits} Credits Reserved
                  </span>
                  <span className="text-[10px] text-slate-400">(Net Provider: {ex.netCredits} Credits)</span>
                </div>
              </div>
            </CardContent>

            {/* Actions for Active / Pending / Verified */}
            {(ex.status === "active" || ex.status === "upcoming" || ex.status === "pending") && (
              <CardFooter className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDisputeModal(ex.id)}
                  disabled={ex.escrowStatus !== "submitted" && ex.escrowStatus !== "verified"}
                  className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900"
                >
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  Report Issue / Dispute
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleReleaseFunds(ex.id)}
                  disabled={!ex.isPayer || ex.escrowStatus !== "pending"}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Satisfaction & Submit for Verification
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Repeat className="w-6 h-6 text-indigo-500" />
              Exchange Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage active sessions, confirm satisfaction, and release escrow settlements safely.
            </p>
          </div>
          <Button onClick={() => setLocation("/discover")} className="gap-2">
            <Plus className="h-4 w-4" /> Post a Service
          </Button>
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
            <TabsTrigger value="active" className="text-xs">Active ({exchanges.filter(e => e.status === "active").length})</TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs">Upcoming ({exchanges.filter(e => e.status === "upcoming").length})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Pending ({exchanges.filter(e => e.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Completed ({exchanges.filter(e => e.status === "completed").length})</TabsTrigger>
            <TabsTrigger value="disputed" className="text-xs">Disputed ({exchanges.filter(e => e.status === "disputed").length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">{renderExchangeCards("active")}</TabsContent>
          <TabsContent value="upcoming">{renderExchangeCards("upcoming")}</TabsContent>
          <TabsContent value="pending">{renderExchangeCards("pending")}</TabsContent>
          <TabsContent value="completed">{renderExchangeCards("completed")}</TabsContent>
          <TabsContent value="disputed">{renderExchangeCards("disputed")}</TabsContent>
        </Tabs>
      </div>

      {/* DISPUTE MODAL */}
      <Dialog open={disputeModalOpen} onOpenChange={setDisputeModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              Open Dispute Ticket
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide evidence or reasons why the session was unsatisfactory or incomplete.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold">Reason for Dispute</label>
            <Textarea
              placeholder="Explain the issue clearly for staff review..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDisputeModalOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleConfirmDispute} className="bg-rose-600 hover:bg-rose-500 text-white text-xs">
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
