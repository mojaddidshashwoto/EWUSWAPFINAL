import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Coins,
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Percent,
  LockKeyhole,
  History,
  TrendingUp,
  PlusCircle,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  supabase,
  getCurrentUser,
  listWalletTransactions,
  type WalletTransaction,
} from "@/lib/supabase";

const CONVERSION_RATE = 120; // 1 Credit = 120 BDT

export default function WalletPage() {
  const [filter, setFilter] = useState<"all" | "earned" | "spent" | "refund" | "fee" | "topup" | "withdrawal">("all");
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [userBdt, setUserBdt] = useState(0);
  const [userCredits, setUserCredits] = useState(0);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Modals state
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  // Top-Up Form State
  const [topUpMethod, setTopUpMethod] = useState<"bkash" | "nagad">("bkash");
  const [topUpAmountBdt, setTopUpAmountBdt] = useState<string>("1200");
  const [topUpSenderPhone, setTopUpSenderPhone] = useState<string>("01712345678");
  const [topUpTrxId, setTopUpTrxId] = useState<string>("");
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Withdraw Form State
  const [withdrawMethod, setWithdrawMethod] = useState<"bkash" | "nagad">("bkash");
  const [withdrawAmountBdt, setWithdrawAmountBdt] = useState<string>("600");
  const [withdrawTargetPhone, setWithdrawTargetPhone] = useState<string>("01712345678");
  const [withdrawAccountType, setWithdrawAccountType] = useState<"personal" | "agent">("personal");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const pendingEscrowCredits = transactions
    .filter((transaction) => transaction.status === "Held in escrow")
    .reduce((total, transaction) => total + transaction.amountCredits, 0);
  const pendingEscrowBdt = pendingEscrowCredits * CONVERSION_RATE;
  const lifetimeEarnedCredits = transactions
    .filter((transaction) => transaction.type === "earned" && transaction.status === "Released")
    .reduce((total, transaction) => total + transaction.amountCredits, 0);
  const lifetimeEarnedBdt = lifetimeEarnedCredits * CONVERSION_RATE;

  // Load balances and transactions
  const loadData = async () => {
    try {
      const [user, txs] = await Promise.all([getCurrentUser(), listWalletTransactions()]);
      setUserBdt(user?.bdtBalance || 0);
      setUserCredits(user?.credits || 0);
      setTransactions(txs);
    } catch (error: any) {
      toast.error(error?.message || "Could not load wallet data.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const loadAndSubscribe = async () => {
      await loadData();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        toast.error(error.message || "Could not subscribe to wallet updates.");
        return;
      }
      if (!user || !isMounted) return;

      const refresh = () => { void loadData(); };
      channel = supabase
        .channel(`wallet:${user.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ss_profiles", filter: `id=eq.${user.id}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "ss_escrow_transactions", filter: `payer_id=eq.${user.id}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "ss_escrow_transactions", filter: `payee_id=eq.${user.id}` }, refresh)
        .subscribe();
    };
    void loadAndSubscribe();
    const handleUpdate = () => loadData();
    window.addEventListener("ss_wallet_updated", handleUpdate);
    window.addEventListener("ss_user_changed", handleUpdate);
    return () => {
      isMounted = false;
      if (channel) void supabase.removeChannel(channel);
      window.removeEventListener("ss_wallet_updated", handleUpdate);
      window.removeEventListener("ss_user_changed", handleUpdate);
    };
  }, []);

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(true);
    toast.success(`Copied ${num} to clipboard`);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.error("Top-ups are unavailable until a verified payment gateway is connected. No payment was submitted.");
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.error("Cashouts are unavailable until a verified payout gateway is connected. No withdrawal was submitted.");
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true;
    return tx.type === filter;
  });

  const getTypeBadge = (type: WalletTransaction["type"], method?: string) => {
    if (type === "topup") {
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
          method === "bkash"
            ? "text-pink-600 dark:text-pink-400 bg-pink-500/10 border border-pink-500/20"
            : "text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20"
        }`}>
          <PlusCircle className="w-3 h-3" /> {method === "bkash" ? "bKash Top-Up" : "Nagad Top-Up"} (+)
        </span>
      );
    }
    if (type === "withdrawal") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full">
          <Smartphone className="w-3 h-3" /> Cashout Payout (-)
        </span>
      );
    }
    if (type === "earned") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          <ArrowDownLeft className="w-3 h-3" /> Earned (+)
        </span>
      );
    }
    if (type === "spent") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
          <ArrowUpRight className="w-3 h-3" /> Spent (-)
        </span>
      );
    }
    if (type === "refund") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          <RotateCcw className="w-3 h-3" /> Refund (+)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-500/10 border border-slate-500/20 px-2.5 py-0.5 rounded-full">
        <Percent className="w-3 h-3" /> Platform Fee (5%)
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header with Top-Up & Withdraw Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <WalletIcon className="w-6 h-6 text-indigo-500" />
              Financial Dashboard & Wallet
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live account balances and escrow activity. Mobile-money payments are not connected yet.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setTopUpOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              Top-Up (bKash/Nagad)
            </Button>
            <Button
              onClick={() => setWithdrawOpen(true)}
              variant="outline"
              className="border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Smartphone className="w-4 h-4 text-orange-500" />
              Withdraw Funds
            </Button>
          </div>
        </div>

        {/* TOP SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Available Balance with Quick Buttons */}
          <Card className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white border-indigo-800/40 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <CardHeader className="pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Available Balance</span>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{userCredits} Credits</span>
                </div>
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <WalletIcon className="w-3.5 h-3.5" />
                  ৳ {userBdt.toLocaleString()} BDT Available
                </p>
              </div>

              {/* In-Card Quick Buttons */}
              <div className="pt-2 border-t border-indigo-800/50 flex items-center gap-2">
                <button
                  onClick={() => setTopUpOpen(true)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Top-Up
                </button>
                <button
                  onClick={() => setWithdrawOpen(true)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1"
                >
                  <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                  Cashout
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 2. Pending in Escrow */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending in Escrow</span>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{pendingEscrowCredits} Credits</span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <LockKeyhole className="w-3.5 h-3.5" />
                ৳ {pendingEscrowBdt.toLocaleString()} BDT Reserved
              </p>
              <p className="text-[10px] text-slate-400 mt-2">
                Secured in smart escrow until exchange completion notes are confirmed.
              </p>
            </CardContent>
          </Card>

          {/* 3. Lifetime Earned */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Lifetime Earned</span>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{lifetimeEarnedCredits} Credits</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ৳ {lifetimeEarnedBdt.toLocaleString()} BDT Net Total
              </p>
              <p className="text-[10px] text-slate-400 mt-2">
                Calculated from released provider transactions on your account.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* BANGLADESH PAYMENT GATEWAYS BANNER */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 via-amber-500/10 to-indigo-500/10 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2">
              <div className="w-9 h-9 rounded-xl bg-[#E2136E] text-white flex items-center justify-center font-black text-xs shadow-sm">
                bK
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#F7921E] text-white flex items-center justify-center font-black text-xs shadow-sm">
                না
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                bKash & Nagad payments unavailable
                <Badge className="bg-amber-500/10 text-amber-700 text-[9px] px-1.5 py-0 h-4 font-bold">Not connected</Badge>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Balances change only after a verified payment provider is connected.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setTopUpMethod("bkash");
                setTopUpOpen(true);
              }}
              className="bg-[#E2136E] hover:bg-[#c20f5c] text-white text-xs font-bold h-8 px-3"
            >
              Pay via bKash
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setTopUpMethod("nagad");
                setTopUpOpen(true);
              }}
              className="bg-[#F7921E] hover:bg-[#d87c14] text-white text-xs font-bold h-8 px-3"
            >
              Pay via Nagad
            </Button>
          </div>
        </div>

        {/* TRANSACTION HISTORY LIST */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                Transaction History
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Comprehensive record of top-ups, payouts, escrow charges, and 5% platform fees.
              </CardDescription>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs">
              {(["all", "topup", "withdrawal", "earned", "spent", "fee"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all ${
                    filter === t
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t === "all" ? "All" : t === "topup" ? "Top-Ups" : t === "withdrawal" ? "Cashouts" : t === "fee" ? "Fees (5%)" : t}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No transactions found under this category.
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(tx.type, tx.method)}
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{tx.title}</h4>
                      {tx.trxId && (
                        <span className="text-[10px] font-mono bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          {tx.trxId}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Channel: <span className="font-semibold text-slate-700 dark:text-slate-300">{tx.counterparty}</span> • {tx.date}
                    </p>
                    {tx.note && <p className="text-[10px] text-slate-400 italic">{tx.note}</p>}
                  </div>

                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 dark:border-slate-800">
                    <div
                      className={`text-sm font-extrabold ${
                        tx.type === "earned" || tx.type === "refund" || tx.type === "topup"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : tx.type === "spent" || tx.type === "withdrawal"
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-500"
                      }`}
                    >
                      {tx.type === "earned" || tx.type === "refund" || tx.type === "topup" ? "+" : "-"}
                      {tx.amountCredits} Credits
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ৳ {tx.amountBdt.toLocaleString()} BDT
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 1. BKASH / NAGAD TOP-UP MODAL */}
      {/* ========================================================================= */}
      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0">
          {/* Header Banner */}
          <div
            className={`p-6 text-white transition-colors ${
              topUpMethod === "bkash" ? "bg-[#E2136E]" : "bg-[#F7921E]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-sm">
                  {topUpMethod === "bkash" ? "bK" : "না"}
                </div>
                <div>
                  <DialogTitle className="text-white text-lg font-black">
                    Top-ups unavailable
                  </DialogTitle>
                  <DialogDescription className="text-white/80 text-xs">
                    A verified bKash/Nagad payment integration is not configured.
                  </DialogDescription>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-[10px] uppercase font-bold">
                Not connected
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">No payment will be submitted. Do not send money to any number for a wallet top-up.</p>
            <Button type="button" variant="outline" onClick={() => setTopUpOpen(false)}>Close</Button>
          </div>
          <form onSubmit={handleTopUpSubmit} className="hidden">
            {/* Method Toggle Buttons */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select MFS Provider</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTopUpMethod("bkash")}
                  className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    topUpMethod === "bkash"
                      ? "border-[#E2136E] bg-pink-500/5 text-[#E2136E] shadow-sm font-bold"
                      : "border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <div className="w-7 h-7 rounded-md bg-[#E2136E] text-white flex items-center justify-center font-black text-xs">
                    bK
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">bKash</div>
                    <div className="text-[10px] text-slate-400 font-normal">App / *247#</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTopUpMethod("nagad")}
                  className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    topUpMethod === "nagad"
                      ? "border-[#F7921E] bg-amber-500/5 text-[#F7921E] shadow-sm font-bold"
                      : "border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <div className="w-7 h-7 rounded-md bg-[#F7921E] text-white flex items-center justify-center font-black text-xs">
                    না
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">Nagad</div>
                    <div className="text-[10px] text-slate-400 font-normal">App / *167#</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Merchant / Instruction Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  {topUpMethod === "bkash" ? "Personal bKash Number (Send Money):" : "Nagad Merchant Number (Payment):"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyNumber(topUpMethod === "bkash" ? "01712-345678" : "01898-765432")}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {copiedNumber ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {topUpMethod === "bkash" ? "01712-345678" : "01898-765432"}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                1. Open {topUpMethod === "bkash" ? "bKash" : "Nagad"} app ➔ Send Money / Payment to number above.<br />
                2. Enter amount, complete transaction, and copy the <strong>TrxID</strong> from SMS.
              </p>
            </div>

            {/* Amount Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount (BDT ৳)</Label>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  ≈ {Math.floor((parseFloat(topUpAmountBdt) || 0) / CONVERSION_RATE)} Skill Credits
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">৳</span>
                <Input
                  type="number"
                  min="100"
                  step="50"
                  value={topUpAmountBdt}
                  onChange={(e) => setTopUpAmountBdt(e.target.value)}
                  placeholder="e.g. 1200"
                  className="pl-8 text-sm font-bold"
                  required
                />
              </div>

              {/* Amount Shortcut Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[300, 600, 1200, 2400, 4800].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmountBdt(amt.toString())}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      topUpAmountBdt === amt.toString()
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    ৳ {amt} ({amt / CONVERSION_RATE} cr)
                  </button>
                ))}
              </div>
            </div>

            {/* Sender Phone Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Sender {topUpMethod === "bkash" ? "bKash" : "Nagad"} Phone Number
              </Label>
              <Input
                type="tel"
                value={topUpSenderPhone}
                onChange={(e) => setTopUpSenderPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="text-xs"
                required
              />
              <p className="text-[10px] text-slate-400">The mobile wallet number you sent the money from.</p>
            </div>

            {/* Transaction ID (TrxID) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Transaction ID (TrxID)
              </Label>
              <Input
                type="text"
                value={topUpTrxId}
                onChange={(e) => setTopUpTrxId(e.target.value.toUpperCase())}
                placeholder="e.g. BL83920AKJ"
                className="text-xs font-mono uppercase tracking-wider"
                required
              />
              <p className="text-[10px] text-slate-400">Found in your SMS receipt (e.g. TrxID BL83920AKJ).</p>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTopUpOpen(false)}
                className="text-xs w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={topUpLoading}
                className={`text-xs font-bold w-full sm:w-auto text-white ${
                  topUpMethod === "bkash" ? "bg-[#E2136E] hover:bg-[#c20f5c]" : "bg-[#F7921E] hover:bg-[#d87c14]"
                }`}
              >
                {topUpLoading ? "Verifying TrxID..." : "Verify & Add Credits"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 2. BKASH / NAGAD WITHDRAWAL MODAL */}
      {/* ========================================================================= */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0">
          <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-white text-lg font-black">
                    Withdraw to Mobile Banking
                  </DialogTitle>
                  <DialogDescription className="text-white/70 text-xs">
                    Cash out your earnings directly to bKash or Nagad.
                  </DialogDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400">Available to Withdraw</div>
                <div className="text-xs font-extrabold text-emerald-400">৳ {userBdt.toLocaleString()} BDT</div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">Payout processing is not configured. No withdrawal request has been submitted.</p>
            <Button type="button" variant="outline" onClick={() => setWithdrawOpen(false)}>Close</Button>
          </div>
          <form onSubmit={handleWithdrawSubmit} className="hidden">
            {/* Method Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Cashout Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWithdrawMethod("bkash")}
                  className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    withdrawMethod === "bkash"
                      ? "border-[#E2136E] bg-pink-500/5 text-[#E2136E] shadow-sm font-bold"
                      : "border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <div className="w-7 h-7 rounded-md bg-[#E2136E] text-white flex items-center justify-center font-black text-xs">
                    bK
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">bKash Payout</div>
                    <div className="text-[10px] text-slate-400 font-normal">Personal / Agent</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setWithdrawMethod("nagad")}
                  className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    withdrawMethod === "nagad"
                      ? "border-[#F7921E] bg-amber-500/5 text-[#F7921E] shadow-sm font-bold"
                      : "border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <div className="w-7 h-7 rounded-md bg-[#F7921E] text-white flex items-center justify-center font-black text-xs">
                    না
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">Nagad Payout</div>
                    <div className="text-[10px] text-slate-400 font-normal">Personal / Agent</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Account Type Radio Buttons */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Account Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWithdrawAccountType("personal")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    withdrawAccountType === "personal"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                      : "border-slate-200 dark:border-slate-800 text-slate-500"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${withdrawAccountType === "personal" ? "bg-indigo-600" : "bg-slate-300"}`} />
                  Personal Account
                </button>

                <button
                  type="button"
                  onClick={() => setWithdrawAccountType("agent")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    withdrawAccountType === "agent"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                      : "border-slate-200 dark:border-slate-800 text-slate-500"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${withdrawAccountType === "agent" ? "bg-indigo-600" : "bg-slate-300"}`} />
                  Agent Account
                </button>
              </div>
            </div>

            {/* Target Phone Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target {withdrawMethod === "bkash" ? "bKash" : "Nagad"} Phone Number
              </Label>
              <Input
                type="tel"
                value={withdrawTargetPhone}
                onChange={(e) => setWithdrawTargetPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="text-xs"
                required
              />
              <p className="text-[10px] text-slate-400">Double-check number carefully. Payouts are non-reversible.</p>
            </div>

            {/* Withdrawal Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Withdraw Amount (BDT ৳)</Label>
                <span className="text-[11px] text-slate-400">
                  Equivalent: {Math.ceil((parseFloat(withdrawAmountBdt) || 0) / CONVERSION_RATE)} credits
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">৳</span>
                <Input
                  type="number"
                  min="200"
                  max={userBdt}
                  step="50"
                  value={withdrawAmountBdt}
                  onChange={(e) => setWithdrawAmountBdt(e.target.value)}
                  placeholder="e.g. 600"
                  className="pl-8 text-sm font-bold"
                  required
                />
              </div>

              {/* Percentage shortcut buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                  const amt = Math.floor(userBdt * ratio);
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setWithdrawAmountBdt(amt.toString())}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      {ratio === 1 ? "100% (Max)" : `${ratio * 100}%`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Settlement Fee Preview */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span>Withdrawal Amount:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ৳ {(parseFloat(withdrawAmountBdt) || 0).toLocaleString()} BDT
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Cashout Network Fee:</span>
                <span className="font-bold text-emerald-600">৳ 0 (Subsidized for EWU Students)</span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>Net You Receive:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ৳ {(parseFloat(withdrawAmountBdt) || 0).toLocaleString()} BDT
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWithdrawOpen(false)}
                className="text-xs w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={withdrawLoading || userBdt < 200}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold w-full sm:w-auto"
              >
                {withdrawLoading ? "Submitting Payout..." : "Confirm Withdrawal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
