import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Repeat,
  DollarSign,
  Percent,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Eye,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Scale,
  Sparkles,
  Lock,
  UserCheck,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Building,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCurrentUser,
  setUserRole,
  listVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
  listAdminWalletUsers,
  adminDepositBdt,
  listDisputes,
  resolveDispute,
  type VerificationRequest,
  type PlatformDispute,
  type AdminWalletUser,
  type UserRole,
} from "@/lib/supabase";

export default function AdminDashboard() {
  const { user, hasRole, isLoading: isLoadingAuth } = useAuth();
  const [, setLocation] = useLocation();

  // Tabs: overview | verifications | disputes
  const [activeTab, setActiveTab] = useState("overview");
  const [walletUsers, setWalletUsers] = useState<AdminWalletUser[]>([]);
  const [walletUsersLoading, setWalletUsersLoading] = useState(false);
  const [depositAmounts, setDepositAmounts] = useState<Record<string, string>>({});
  const [depositingUserId, setDepositingUserId] = useState<string | null>(null);

  // Verifications State
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [verifFilter, setVerifFilter] = useState<"all" | "pending" | "verified" | "rejected">("pending");
  const [verifSearch, setVerifSearch] = useState("");
  const [selectedVerif, setSelectedVerif] = useState<VerificationRequest | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [verifPreviewOpen, setVerifPreviewOpen] = useState(false);

  // Disputes State
  const [disputes, setDisputes] = useState<PlatformDispute[]>([]);
  const [disputeFilter, setDisputeFilter] = useState<"all" | "open" | "resolved">("open");
  const [selectedDispute, setSelectedDispute] = useState<PlatformDispute | null>(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionChoice, setResolutionChoice] = useState<"refund_payer" | "release_provider" | "split">("refund_payer");
  const [resolutionNote, setResolutionNote] = useState("");

  const loadData = async () => {
    const [vList, dList] = await Promise.all([listVerificationRequests(), listDisputes()]);
    setVerifications(vList);
    setDisputes(dList);
  };

  useEffect(() => {
    loadData();

    const handleVerifChanged = () => listVerificationRequests().then(setVerifications);
    const handleDisputesChanged = () => listDisputes().then(setDisputes);

    window.addEventListener("ss_verifications_changed", handleVerifChanged);
    window.addEventListener("ss_disputes_changed", handleDisputesChanged);

    return () => {
      window.removeEventListener("ss_verifications_changed", handleVerifChanged);
      window.removeEventListener("ss_disputes_changed", handleDisputesChanged);
    };
  }, []);

  const loadWalletUsers = async () => {
    setWalletUsersLoading(true);
    try {
      setWalletUsers(await listAdminWalletUsers());
    } catch (error: any) {
      toast.error(error?.message || "Could not load wallet users.");
    } finally {
      setWalletUsersLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") loadWalletUsers();
  }, [user?.role]);

  const handleManualDeposit = async (targetUser: AdminWalletUser) => {
    const amount = Number(depositAmounts[targetUser.id]);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
      toast.error("Enter a valid deposit amount between ৳1 and ৳1,000,000 BDT.");
      return;
    }

    setDepositingUserId(targetUser.id);
    try {
      const result = await adminDepositBdt(targetUser.id, amount);
      if (!result) throw new Error("Deposit completed but no audit result was returned.");
      setWalletUsers((current) => current.map((profile) => profile.id === targetUser.id
        ? { ...profile, bdt_balance: result.balance_after }
        : profile));
      setDepositAmounts((current) => ({ ...current, [targetUser.id]: "" }));
      toast.success(`৳ ${amount} BDT deposited to ${targetUser.display_name}.`, {
        description: `New balance: ৳ ${result.balance_after} BDT. Audit transaction recorded.`,
      });
    } catch (error: any) {
      toast.error(error?.message || "BDT deposit failed.");
    } finally {
      setDepositingUserId(null);
    }
  };

  // Verification actions
  const handleApproveVerification = async (id: string, name: string) => {
    try {
      await approveVerificationRequest(id);
      toast.success(`Verified ${name}'s document successfully!`, {
        description: "Student badge updated to 'Verified Campus Provider'.",
      });
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve verification");
    }
  };

  const handleRejectVerification = async () => {
    if (!selectedVerif) return;
    try {
      await rejectVerificationRequest(selectedVerif.id, rejectReason);
      toast.error(`Rejected verification request for ${selectedVerif.userName}.`, {
        description: `Reason: ${rejectReason || "Unreadable ID document"}`,
      });
      setRejectModalOpen(false);
      setRejectReason("");
      setSelectedVerif(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to reject verification");
    }
  };

  // Dispute actions
  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    try {
      await resolveDispute(selectedDispute.id, resolutionChoice, resolutionNote);
      toast.success(`Dispute ${selectedDispute.id} marked as resolved!`, {
        description:
          resolutionChoice === "refund_payer"
            ? `100% refunded to ${selectedDispute.learnerName}.`
            : resolutionChoice === "release_provider"
            ? `Funds released to ${selectedDispute.providerName} (5% platform fee collected).`
            : "50/50 compromise split settled between both students.",
      });
      setResolveModalOpen(false);
      setResolutionNote("");
      setSelectedDispute(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to resolve dispute");
    }
  };

  // Check Role Protection strictly against user session
  const isAuthorized = hasRole(["admin", "moderator"]);
  const isAdmin = user?.role === "admin";

  if (!isLoadingAuth && !isAuthorized) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Admin Access Restricted</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              This dashboard is strictly protected. Only users with the <span className="font-semibold text-rose-600">admin</span> or{" "}
              <span className="font-semibold text-rose-600">moderator</span> role are authorized to review documents, resolve disputes, and access platform financial reserves.
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => setLocation("/dashboard")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              Return to Student Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Filtered lists
  const pendingVerifCount = verifications.filter((v) => v.status === "pending").length;
  const openDisputeCount = disputes.filter((d) => d.status === "open" || d.status === "under_review").length;

  const filteredVerifications = verifications.filter((v) => {
    if (verifFilter !== "all" && v.status !== verifFilter) return false;
    if (verifSearch.trim()) {
      const q = verifSearch.toLowerCase();
      return (
        v.userName.toLowerCase().includes(q) ||
        v.userEmail.toLowerCase().includes(q) ||
        v.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredDisputes = disputes.filter((d) => {
    if (disputeFilter === "open") return d.status === "open" || d.status === "under_review";
    if (disputeFilter === "resolved") return d.status === "resolved" || d.status === "closed";
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Admin Header with Institutional Status Badge */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-rose-500 text-white font-bold text-[10px] tracking-wide uppercase px-2 py-0.5">
                Staff Restricted
              </Badge>
              <Badge className="bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold">
                Active Role: {user?.role.toUpperCase() || "STAFF"}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <ShieldAlert className="w-7 h-7 text-indigo-400" />
              EwuSwap Admin & Moderation Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Platform administration, student NID/ID verification queue, and automated escrow dispute arbitration with 5% platform fee settlement.
            </p>
          </div>

          {/* Institutional Session Info */}
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15 space-y-1 shrink-0 text-left sm:text-right">
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center sm:justify-end gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Institutional Session</span>
            </div>
            <div className="text-xs font-mono text-emerald-400 font-bold">
              Active Officer: {user?.displayName || "Aisha Rahman"}
            </div>
            <div className="text-[10px] text-slate-400">
              East West University Moderation Council
            </div>
          </div>
        </div>

        {/* MAIN ADMIN TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl grid ${isAdmin ? "grid-cols-4 max-w-3xl" : "grid-cols-3 max-w-md"} shadow-xs`}>
            <TabsTrigger
              value="overview"
              className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="verifications"
              className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white relative"
            >
              Verifications
              {pendingVerifCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingVerifCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="disputes"
              className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white relative"
            >
              Disputes
              {openDisputeCount > 0 && (
                <span className="ml-1.5 bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {openDisputeCount}
                </span>
              )}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="credit-management"
                className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
              >
                Wallet & BDT Management
              </TabsTrigger>
            )}
          </TabsList>

          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW METRICS & PLATFORM REVENUE */}
          {/* ========================================================================= */}
          <TabsContent value="overview" className="space-y-6 m-0">
            {/* 4 PRIMARY METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Total Registered Users */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Users</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">1,280</div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3.5 h-3.5" /> +14% this semester
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">942 EWU Verified Students</p>
                </CardContent>
              </Card>

              {/* 2. Total Exchanges */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Exchanges</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Repeat className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">468</div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 99.4% completion rate
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">214 Barter Swaps • 254 Paid/Credit</p>
                </CardContent>
              </Card>

              {/* 3. Total Gross Escrow Volume */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Volume</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">৳ 384,000</div>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1">
                    3,200 Total Credits reserved
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Secured via automatic escrow locks</p>
                </CardContent>
              </Card>

              {/* 4. Platform Revenue from 5% Fee */}
              <Card className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white border-indigo-800/40 shadow-md">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">5% Platform Revenue</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                    <Percent className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-white">৳ 19,200</div>
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3.5 h-3.5" /> 160 Credits earned (500 bps)
                  </p>
                  <p className="text-[10px] text-indigo-300/80 mt-1">Directly funds campus lab perks & moderation</p>
                </CardContent>
              </Card>
            </div>

            {/* PLATFORM REVENUE ARCHITECTURE EXPLANATION & ACTIVITY SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fee Mechanics Card */}
              <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Percent className="w-4 h-4 text-indigo-500" />
                    Automated 5% Platform Fee Engine (500 BPS)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Transparent protocol enforcement directly inside the Postgres/tRPC layer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-2 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-semibold text-slate-500">Platform Fee Formula:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">ceil(grossCredits × 0.05)</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-semibold text-slate-500">Provider Settlement:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">grossCredits - platformFeeCredits</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-500">Minimum Escrow Guard:</span>
                      <span className="font-bold text-slate-900 dark:text-white">Amount &gt; 1 credit (ensures provider &gt; 0)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Small Session (10 cr / ৳1,200)</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">Fee: 1 cr (৳120)</div>
                      <div className="text-[11px] text-emerald-600 font-medium">Provider receives: 9 cr (৳1,080)</div>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Medium Sprint (24 cr / ৳2,880)</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">Fee: 2 cr (৳240)</div>
                      <div className="text-[11px] text-emerald-600 font-medium">Provider receives: 22 cr (৳2,640)</div>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Bootcamp (50 cr / ৳6,000)</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">Fee: 3 cr (৳360)</div>
                      <div className="text-[11px] text-emerald-600 font-medium">Provider receives: 47 cr (৳5,640)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Moderation Queue Summary */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-500" />
                    Action Required
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Live queues waiting for moderator review.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    onClick={() => setActiveTab("verifications")}
                    className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                        {pendingVerifCount}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Pending ID Verifications</div>
                        <div className="text-[10px] text-slate-500">Student ID & NID submissions</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>

                  <div
                    onClick={() => setActiveTab("disputes")}
                    className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-sm">
                        {openDisputeCount}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Active Disputes</div>
                        <div className="text-[10px] text-slate-500">Awaiting refund or release decision</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <p className="text-[10px] text-slate-400">
                    Audited under East West University Skill Swap terms of service.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="credit-management" className="space-y-4 m-0">
              <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Coins className="h-4 w-4 text-amber-500" /> Manual BDT Wallet Deposits
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Deposit BDT funds received via campus cash/bKash. Every deposit increments `bdt_balance` and records an immutable audit entry.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {walletUsersLoading ? (
                    <p className="py-8 text-center text-sm text-slate-500">Loading users…</p>
                  ) : walletUsers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">No user profiles found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left text-xs">
                        <thead className="border-b text-[10px] uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-3 font-semibold">User</th>
                            <th className="px-3 py-3 font-semibold">Email</th>
                            <th className="px-3 py-3 text-right font-semibold">Current BDT Balance</th>
                            <th className="px-3 py-3 font-semibold">Deposit BDT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {walletUsers.map((profile) => (
                            <tr key={profile.id} className="border-b last:border-0">
                              <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">{profile.display_name}</td>
                              <td className="px-3 py-3 text-slate-500">{profile.email}</td>
                              <td className="px-3 py-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                ৳ {(profile.bdt_balance ?? 0).toLocaleString()} BDT
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <Input
                                    aria-label={`BDT to deposit for ${profile.display_name}`}
                                    type="number"
                                    min="1"
                                    max="1000000"
                                    step="10"
                                    inputMode="numeric"
                                    placeholder="Amount ৳"
                                    value={depositAmounts[profile.id] ?? ""}
                                    onChange={(event) => setDepositAmounts((current) => ({ ...current, [profile.id]: event.target.value }))}
                                    className="h-9 w-28"
                                  />
                                  <Button
                                    size="sm"
                                    disabled={depositingUserId === profile.id}
                                    onClick={() => handleManualDeposit(profile)}
                                  >
                                    {depositingUserId === profile.id ? "Depositing…" : "Deposit BDT"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: VERIFICATION QUEUE (ss_verification_requests) */}
          {/* ========================================================================= */}
          <TabsContent value="verifications" className="space-y-4 m-0">
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-500" />
                    Identity Verification Queue (`ss_verification_requests`)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Review submitted Student IDs and Smart NIDs. Verifying grants the official verified campus provider badge.
                  </CardDescription>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search name, department..."
                      value={verifSearch}
                      onChange={(e) => setVerifSearch(e.target.value)}
                      className="pl-8 text-xs h-8 w-48 rounded-xl"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs">
                    {(["pending", "verified", "rejected", "all"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setVerifFilter(s)}
                        className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                          verifFilter === s
                            ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {s === "all" ? "All" : s}
                        {s === "pending" && pendingVerifCount > 0 && ` (${pendingVerifCount})`}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {filteredVerifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No verification requests found in this view.
                  </div>
                ) : (
                  filteredVerifications.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: User details */}
                      <div className="flex items-start gap-3.5">
                        <img
                          src={req.userAvatar}
                          alt={req.userName}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{req.userName}</h4>
                            <Badge
                              className={`text-[9px] px-1.5 py-0 h-4 font-bold uppercase ${
                                req.method === "student_id"
                                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
                              }`}
                            >
                              {req.method === "student_id" ? "Student ID" : "National NID"}
                            </Badge>
                            {req.status === "verified" && (
                              <Badge className="bg-emerald-500 text-[9px] px-1.5 py-0 h-4 font-bold">Verified</Badge>
                            )}
                            {req.status === "rejected" && (
                              <Badge className="bg-rose-500 text-[9px] px-1.5 py-0 h-4 font-bold">Rejected</Badge>
                            )}
                            {req.status === "pending" && (
                              <Badge className="bg-amber-500 text-[9px] px-1.5 py-0 h-4 font-bold">Needs Review</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {req.department} • <span className="font-mono text-slate-600 dark:text-slate-300">{req.userEmail}</span>
                          </p>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>Document: <strong className="text-slate-600 dark:text-slate-300">{req.documentNumberHint}</strong></span>
                            <span>•</span>
                            <span>Submitted: {req.submittedAt}</span>
                          </div>
                          {req.moderatorNotes && (
                            <p className="text-[10px] text-rose-500 italic mt-0.5">Note: {req.moderatorNotes}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedVerif(req);
                            setVerifPreviewOpen(true);
                          }}
                          className="text-xs h-8 px-2.5 border-slate-300 dark:border-slate-700 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Document
                        </Button>

                        {req.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveVerification(req.id, req.userName)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3 flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedVerif(req);
                                setRejectModalOpen(true);
                              }}
                              className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold h-8 px-3 flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 3: DISPUTES QUEUE (ss_resolve_dispute) */}
          {/* ========================================================================= */}
          <TabsContent value="disputes" className="space-y-4 m-0">
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-rose-500" />
                    Open Dispute Arbitration Queue (`ss_resolve_dispute`)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Resolve payment and session grievances with three legal rulings: <strong>Refund Learner</strong>,{" "}
                    <strong>Release to Provider</strong>, or <strong>Split 50/50</strong>.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setDisputeFilter("open")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      disputeFilter === "open"
                        ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Open & Pending ({openDisputeCount})
                  </button>
                  <button
                    onClick={() => setDisputeFilter("resolved")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      disputeFilter === "resolved"
                        ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Resolved Cases
                  </button>
                  <button
                    onClick={() => setDisputeFilter("all")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      disputeFilter === "all"
                        ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    All Cases
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {filteredDisputes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No disputes found under this filter. All campus exchanges in harmony!
                  </div>
                ) : (
                  filteredDisputes.map((dsp) => (
                    <div
                      key={dsp.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs space-y-4"
                    >
                      {/* Top Bar: Dispute ID + Escrow Amount */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                            {dsp.id}
                          </span>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {dsp.courseTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {dsp.amountCredits} Credits
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1.5">(৳ {dsp.amountBdt.toLocaleString()})</span>
                          </div>
                          {dsp.status === "resolved" ? (
                            <Badge className="bg-emerald-500 text-[10px] font-bold">
                              Resolved: {dsp.resolution?.replace("_", " ").toUpperCase()}
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-500 text-[10px] font-bold animate-pulse">
                              Action Required
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Middle: Learner vs Provider Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                          <img
                            src={dsp.learnerAvatar}
                            alt={dsp.learnerName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Learner (Payer)</span>
                            <div className="font-bold text-slate-900 dark:text-white">{dsp.learnerName}</div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                          <img
                            src={dsp.providerAvatar}
                            alt={dsp.providerName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Provider (Tutor)</span>
                            <div className="font-bold text-slate-900 dark:text-white">{dsp.providerName}</div>
                          </div>
                        </div>
                      </div>

                      {/* Grievance & Evidence */}
                      <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs space-y-1.5">
                        <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          Learner's Dispute Claim:
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                          "{dsp.disputeReason}"
                        </p>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-rose-200/40 dark:border-rose-900/40 flex items-center justify-between">
                          <span>Evidence: {dsp.evidenceNotes}</span>
                          <span>Filed: {dsp.disputeDate}</span>
                        </div>
                      </div>

                      {/* Resolution Memo if already resolved */}
                      {dsp.resolutionNote && (
                        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 text-xs">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">Ruling Memo: </span>
                          <span className="text-slate-700 dark:text-slate-300">{dsp.resolutionNote}</span>
                        </div>
                      )}

                      {/* Bottom Action Footer */}
                      {dsp.status !== "resolved" && (
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[11px] text-slate-400">
                            Escrow funds are safely frozen. Ruling moves credits irrevocably.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedDispute(dsp);
                              setResolveModalOpen(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-4 flex items-center gap-1.5"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            Arbitrate & Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ========================================================================= */}
      {/* DIALOG 1: REJECT VERIFICATION DIALOG */}
      {/* ========================================================================= */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Reject Document Verification
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide a clear reason for rejecting {selectedVerif?.userName}'s document. The student will be notified to re-upload.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Rejection Reason</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Student ID expiration date unreadable, or blurry photo..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {["Blurry image / text unreadable", "Expired semester validity", "Document name does not match profile", "Invalid EWU ID format"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRejectReason(preset)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRejectVerification}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: DOCUMENT PREVIEW MODAL */}
      {/* ========================================================================= */}
      <Dialog open={verifPreviewOpen} onOpenChange={setVerifPreviewOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Document Preview: {selectedVerif?.userName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedVerif?.method === "student_id" ? "East West University Student ID Card" : "Government Smart NID Card"} • Reference: {selectedVerif?.documentNumberHint}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-slate-100 dark:bg-slate-950 aspect-video flex items-center justify-center">
              <img
                src={selectedVerif?.documentImageUrl}
                alt="Document preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-mono px-2 py-1 rounded backdrop-blur-xs">
                Encrypted Storage: private_docs/{selectedVerif?.id}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Student Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedVerif?.userName}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Institutional Email:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedVerif?.userEmail}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Department:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedVerif?.department}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setVerifPreviewOpen(false)} className="text-xs">
              Close
            </Button>
            {selectedVerif?.status === "pending" && (
              <Button
                size="sm"
                onClick={() => {
                  setVerifPreviewOpen(false);
                  if (selectedVerif) handleApproveVerification(selectedVerif.id, selectedVerif.userName);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Approve Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: RESOLVE DISPUTE MODAL (3 RULINGS) */}
      {/* ========================================================================= */}
      <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-500" />
              Arbitrate Dispute ({selectedDispute?.id})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select one binding resolution for this <strong>{selectedDispute?.amountCredits} Credits (৳ {selectedDispute?.amountBdt.toLocaleString()})</strong> exchange.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 3 Resolution Choice Buttons */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Resolution Decision</Label>
              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. Refund Learner */}
                <button
                  type="button"
                  onClick={() => setResolutionChoice("refund_payer")}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    resolutionChoice === "refund_payer"
                      ? "border-emerald-500 bg-emerald-500/5 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Refund Learner (100%)
                      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0 text-[9px]">
                        ৳ {selectedDispute?.amountBdt.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Full refund sent back to {selectedDispute?.learnerName}'s wallet balance. 0 credits to provider.
                    </div>
                  </div>
                </button>

                {/* 2. Release to Provider */}
                <button
                  type="button"
                  onClick={() => setResolutionChoice("release_provider")}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    resolutionChoice === "release_provider"
                      ? "border-indigo-500 bg-indigo-500/5 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-indigo-500 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Release to Provider (Net Payout)
                      <Badge className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-0 text-[9px]">
                        Net + 5% Fee
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Settles payout to {selectedDispute?.providerName}. Platform fee of 5% is preserved.
                    </div>
                  </div>
                </button>

                {/* 3. Split */}
                <button
                  type="button"
                  onClick={() => setResolutionChoice("split")}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    resolutionChoice === "split"
                      ? "border-amber-500 bg-amber-500/5 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Split 50 / 50 (Fair Compromise)
                      <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[9px]">
                        50% Each
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Both learner and provider receive {Math.floor((selectedDispute?.amountCredits || 0) / 2)} credits.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Moderator Resolution Note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Official Resolution Ruling Memo
              </Label>
              <Textarea
                rows={2}
                placeholder="Explain the basis of this decision for platform logs and student notifications..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setResolveModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleResolveDispute}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              Execute Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
