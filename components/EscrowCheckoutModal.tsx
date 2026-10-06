import { useState } from "react";
import { calculateEscrowQuote } from "@/platform";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Wallet, LockKeyhole, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { createPaidEscrow } from "@/lib/supabase";

export interface EscrowCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillTitle: string;
  providerName: string;
  courseId: string;
  payeeId: string;
  amountCredits?: number;
  amountBdt?: number;
  creditToBdtRate?: number;
  onConfirmSuccess?: () => void;
}

export function EscrowCheckoutModal({
  isOpen,
  onClose,
  skillTitle,
  providerName,
  courseId,
  payeeId,
  amountCredits,
  amountBdt,
  creditToBdtRate = 120,
  onConfirmSuccess,
}: EscrowCheckoutModalProps) {
  const [, setLocation] = useLocation();
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const priceBdt = amountBdt ?? (amountCredits !== undefined ? amountCredits * creditToBdtRate : 500);
  let quote = null;
  let quoteError = "This listing cannot be checked out because its price is invalid.";
  try {
    quote = calculateEscrowQuote(priceBdt);
    quoteError = "";
  } catch (error) {
    if (error instanceof Error) quoteError = error.message;
  }

  const handleConfirmPayment = async () => {
    if (!quote) return;
    setIsAuthorizing(true);
    try {
      const escrow = await createPaidEscrow({
        payeeId,
        courseId,
        amountBdt: quote.grossBdt,
      });
      toast.success(`Escrow reserved for "${skillTitle}". Transaction ${escrow.id.slice(0, 8)}.`);
      onConfirmSuccess?.();
      onClose();
      setLocation("/exchanges");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reserve escrow. Please check your BDT balance.");
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <LockKeyhole className="w-4 h-4" />
            </div>
            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px]">
              5% Escrow Protection
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Escrow Checkout Confirmation
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Reserving funds for <span className="font-semibold text-slate-700 dark:text-slate-300">"{skillTitle}"</span> with {providerName}.
          </DialogDescription>
        </DialogHeader>

        {quote ? <div className="space-y-4 py-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
            {/* Base Service Cost */}
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Service Cost (Gross):</span>
              <div className="text-right">
                <span className="font-bold text-slate-900 dark:text-white">৳ {quote.grossBdt.toLocaleString()} BDT</span>
              </div>
            </div>

            {/* Platform Fee Breakdown */}
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1 font-medium">
                Platform Fee (5% / 500 bps):
              </span>
              <div className="text-right">
                <span className="font-bold">-৳ {quote.platformFeeBdt.toLocaleString()} BDT</span>
              </div>
            </div>

            {/* Provider Net Settlement */}
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="font-medium">Provider Net Settlement:</span>
              <div className="text-right">
                <span className="font-bold">৳ {quote.providerNetBdt.toLocaleString()} BDT</span>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex items-center justify-between text-sm font-extrabold text-slate-900 dark:text-white">
              <span>Total Escrow Reserved:</span>
              <div className="text-right">
                <span className="text-indigo-600 dark:text-indigo-400">৳ {quote.grossBdt.toLocaleString()} BDT</span>
              </div>
            </div>
          </div>

          {/* Trusted Security Note */}
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong className="text-indigo-600 dark:text-indigo-400">Escrow Guarantee:</strong> Funds are held securely in Escrow until you confirm session completion and satisfaction. Provider receives settlement only upon release.
            </p>
          </div>
        </div> : <p role="alert" className="py-4 text-sm text-rose-600 dark:text-rose-400">{quoteError}</p>}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isAuthorizing} className="text-xs text-slate-500">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPayment}
            disabled={isAuthorizing || !quote}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 gap-2"
          >
            {isAuthorizing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                Reserving Escrow...
              </span>
            ) : quote ? (
              <span className="flex items-center gap-1.5">
                Confirm & Authorize Escrow (৳ {quote.grossBdt.toLocaleString()} BDT)
                <ArrowRight className="w-4 h-4" />
              </span>
            ) : (
              <span>Checkout unavailable</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
