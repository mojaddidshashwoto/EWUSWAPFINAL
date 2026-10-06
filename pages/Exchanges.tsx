import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Repeat, Calendar, Clock, CheckCircle2, ShieldCheck, AlertCircle, Laptop, Users,
  Coins, Wallet, ArrowRight, RefreshCw, MessageSquare, Plus, Video, MapPin, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LeaveReviewModal } from "@/components/LeaveReviewModal";
import { listMyEscrowTransactions, openEscrowDispute, releaseEscrowByPayer, submitEscrowProof, updateEscrowMeetingDetails } from "@/lib/supabase";

interface ExchangeItem {
  id: string;
  courseId?: string;
  title: string;
  category: string;
  teacherName: string;
  teacherAvatar: string;
  learnerName: string;
  learnerAvatar: string;
  date: string;
  time: string;
  format: "Online" | "Offline";
  grossBdt: number;
  netBdt: number;
  feeBdt: number;
  status: "upcoming" | "pending" | "active" | "completed" | "cancelled" | "disputed";
  escrowStatus: "pending" | "submitted" | "verified" | "released" | "rejected";
  isPayer: boolean;
  meetingDetails?: string;
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
    grossBdt: 300,
    netBdt: 285,
    feeBdt: 15,
    status: "active",
    escrowStatus: "submitted",
    isPayer: true,
    meetingDetails: "https://meet.google.com/ewu-swap-sprint",
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
    grossBdt: 250,
    netBdt: 237.5,
    feeBdt: 12.5,
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
    grossBdt: 500,
    netBdt: 475,
    feeBdt: 25,
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
    grossBdt: 200,
    netBdt: 190,
    feeBdt: 10,
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
  const [reviewExchange, setReviewExchange] = useState<ExchangeItem | null>(null);
  const [meetingInputs, setMeetingInputs] = useState<Record<string, string>>({});
  const [isSavingMeeting, setIsSavingMeeting] = useState<Record<string, boolean>>({});
  const [editingMeetingIds, setEditingMeetingIds] = useState<Record<string, boolean>>({});

  const loadExchanges = async () => {
    try {
      const rows = await listMyEscrowTransactions();
      setExchanges(rows.map((row) => {
        const grossBdt = Number(row.gross_amount_bdt ?? (row.gross_amount_credits ? row.gross_amount_credits * 120 : (row.amount_bdt ?? row.amount_credits * 120)));
        const netBdt = Number(row.net_amount_bdt ?? (row.net_amount_credits ? row.net_amount_credits * 120 : grossBdt * 0.95));
        const feeBdt = Number(row.platform_fee_bdt ?? (row.platform_fee_credits ? row.platform_fee_credits * 120 : grossBdt * 0.05));

        return {
          id: row.id,
          courseId: row.course?.id,
          title: row.course?.title || "Skill exchange",
          category: row.course?.category || "Other",
          teacherName: row.payee.display_name,
          teacherAvatar: row.payee.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
          learnerName: row.payer.display_name,
          learnerAvatar: row.payer.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
          date: new Date(row.created_at).toLocaleDateString(),
          time: new Date(row.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          format: "Online",
          grossBdt,
          netBdt,
          feeBdt,
          status: row.dispute ? "disputed" : row.status === "released" ? "completed" : row.status === "rejected" ? "cancelled" : row.status === "pending" ? "pending" : "active",
          escrowStatus: row.status,
          isPayer: row.isPayer,
          meetingDetails: row.meeting_details ?? undefined,
        };
      }));
    } catch (error: any) {
      toast.error(error?.message || "Could not load exchange data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExchanges();
    const handleUpdate = () => { void loadExchanges(); };
    window.addEventListener("ss_exchanges_updated", handleUpdate);
    return () => {
      window.removeEventListener("ss_exchanges_updated", handleUpdate);
    };
  }, []);

  const handleSaveMeetingDetails = async (exchangeId: string) => {
    const val = (meetingInputs[exchangeId] ?? "").trim();
    if (!val) {
      toast.error("Please enter a meeting link or campus meetup location.");
      return;
    }
    setIsSavingMeeting((prev) => ({ ...prev, [exchangeId]: true }));
    try {
      await updateEscrowMeetingDetails(exchangeId, val);
      toast.success("Meeting details saved and shared with the learner!");
      setEditingMeetingIds((prev) => ({ ...prev, [exchangeId]: false }));
      await loadExchanges();
    } catch (err: any) {
      toast.error(err?.message || "Could not save meeting details.");
    } finally {
      setIsSavingMeeting((prev) => ({ ...prev, [exchangeId]: false }));
    }
  };

  const isWebUrl = (text?: string) => {
    if (!text) return false;
    const trimmed = text.trim();
    return /^https?:\/\//i.test(trimmed) || /^(meet\.google\.com|zoom\.us|chat\.whatsapp\.com|teams\.microsoft\.com)/i.test(trimmed);
  };

  const getHref = (text: string) => {
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleReleaseFunds = async (exchange: ExchangeItem) => {
    try {
      await releaseEscrowByPayer(exchange.id);
      toast.success("Payment released directly to the provider. Thank you for confirming!");
      await loadExchanges();
      if (exchange.isPayer && exchange.courseId) setReviewExchange(exchange);
    } catch (error: any) {
      toast.error(error?.message || "Could not release funds.");
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
    const list = statusFilter === "active"
      ? exchanges.filter((ex) => ex.status === "active" || ex.status === "pending")
      : exchanges.filter((ex) => ex.status === statusFilter);

    if (list.length === 0) {
      const emptyMessage = statusFilter === "active"
        ? "No active or pending exchanges found."
        : `No ${statusFilter} exchanges found.`;

      return (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-center py-12">
          <CardContent className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isLoading ? "Loading exchanges..." : emptyMessage}
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

              {/* Meeting Link Hand-off for Active / Pending Exchanges */}
              {(ex.status === "active" || ex.status === "pending" || ex.status === "upcoming") && (
                <div className="pt-1">
                  {ex.isPayer ? (
                    /* BUYER (STUDENT) VIEW */
                    ex.meetingDetails ? (
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 via-sky-50/80 to-emerald-50/90 dark:from-indigo-950/40 dark:via-sky-950/30 dark:to-emerald-950/40 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                              {isWebUrl(ex.meetingDetails) ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block">
                                Meeting Hand-Off Details
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {isWebUrl(ex.meetingDetails) ? "Live Online Session Link" : "On-Campus Meeting Location"}
                              </span>
                            </div>
                          </div>

                          {isWebUrl(ex.meetingDetails) ? (
                            <Button
                              size="sm"
                              asChild
                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 gap-1.5 h-8 px-3.5"
                            >
                              <a href={getHref(ex.meetingDetails)} target="_blank" rel="noreferrer">
                                Join Session
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                          ) : (
                            <Badge className="bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs px-2.5 py-1 font-bold">
                              View Location Details
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-950 break-all select-all flex items-center justify-between gap-2">
                          <span className="truncate">{ex.meetingDetails}</span>
                          {isWebUrl(ex.meetingDetails) && (
                            <a href={getHref(ex.meetingDetails)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-500 text-[11px] font-semibold shrink-0 flex items-center gap-1">
                              Open Link <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Awaiting instructor to share Google Meet / Zoom link or campus meeting location.</span>
                      </div>
                    )
                  ) : (
                    /* SELLER (INSTRUCTOR) VIEW */
                    ex.meetingDetails && !editingMeetingIds[ex.id] ? (
                      <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                            {isWebUrl(ex.meetingDetails) ? <Video className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                            Meeting Link / Location Shared With Learner:
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMeetingInputs((prev) => ({ ...prev, [ex.id]: ex.meetingDetails || "" }));
                              setEditingMeetingIds((prev) => ({ ...prev, [ex.id]: true }));
                            }}
                            className="h-6 text-[11px] px-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                          >
                            Edit Link
                          </Button>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-950 flex items-center justify-between gap-2">
                          <span className="truncate">{ex.meetingDetails}</span>
                          {isWebUrl(ex.meetingDetails) && (
                            <a href={getHref(ex.meetingDetails)} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline shrink-0 flex items-center gap-1">
                              Test Link <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            Add Meeting Link / Location
                          </span>
                          {editingMeetingIds[ex.id] && ex.meetingDetails && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMeetingIds((prev) => ({ ...prev, [ex.id]: false }))}
                              className="h-6 text-[10px] px-2 text-slate-500"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Paste your Google Meet / Zoom link, WhatsApp group, or campus meetup spot (e.g. EWU Library 3rd Floor) for the student.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <Input
                            value={meetingInputs[ex.id] ?? (ex.meetingDetails || "")}
                            onChange={(e) => setMeetingInputs((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                            placeholder="e.g. https://meet.google.com/xyz or EWU Library 2nd Floor..."
                            className="text-xs bg-white dark:bg-slate-900 h-9"
                          />
                          <Button
                            size="sm"
                            disabled={isSavingMeeting[ex.id] || !(meetingInputs[ex.id] ?? ex.meetingDetails ?? "").trim()}
                            onClick={() => handleSaveMeetingDetails(ex.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 font-semibold shrink-0"
                          >
                            {isSavingMeeting[ex.id] ? "Saving..." : "Add Meeting Link / Location"}
                          </Button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

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
                    <Wallet className="w-3.5 h-3.5" /> ৳ {ex.grossBdt.toLocaleString()} BDT Reserved
                  </span>
                  <span className="text-[10px] text-slate-400">(Net Provider: ৳ {ex.netBdt.toLocaleString()} BDT)</span>
                </div>
              </div>
            </CardContent>

            {/* Actions for Active / Pending / Verified */}
            {(ex.status === "active" || ex.status === "upcoming" || ex.status === "pending") && (
              <CardFooter className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDisputeModal(ex.id)}
                  className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900"
                >
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  Report Issue / Dispute
                </Button>

                {ex.isPayer && (
                  <div className="flex flex-col items-end gap-1.5 sm:ml-auto">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium text-right">
                      ⚠️ Only release funds after you have completed the session and learned the skill.
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleReleaseFunds(ex)}
                      disabled={ex.escrowStatus === "released" || ex.escrowStatus === "rejected"}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Satisfaction & Release ৳ {ex.netBdt} BDT
                    </Button>
                  </div>
                )}
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
            <TabsTrigger value="active" className="text-xs">Active & Pending ({exchanges.filter(e => e.status === "active" || e.status === "pending").length})</TabsTrigger>
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
      {reviewExchange?.courseId && (
        <LeaveReviewModal
          isOpen={Boolean(reviewExchange)}
          onClose={() => setReviewExchange(null)}
          exchangeId={reviewExchange.id}
          courseId={reviewExchange.courseId}
          courseTitle={reviewExchange.title}
          providerName={reviewExchange.teacherName}
          exchangeStatus="released"
        />
      )}
    </DashboardLayout>
  );
}
