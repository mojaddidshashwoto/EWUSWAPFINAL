import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertCircle, Paperclip, ShieldCheck, FileText } from "lucide-react";
import { toast } from "sonner";

export interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeId: string;
  courseTitle: string;
  counterpartyName: string;
  onDisputeOpened?: () => void;
}

export function DisputeModal({
  isOpen,
  onClose,
  exchangeId,
  courseTitle,
  counterpartyName,
  onDisputeOpened,
}: DisputeModalProps) {
  const [reason, setReason] = useState("");
  const [evidenceLink, setEvidenceLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error("Please describe the dispute reason in at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      toast.info(`Dispute ticket opened for "${courseTitle}". Assigned to EwuSwap moderation staff.`);
      setIsSubmitting(false);
      onDisputeOpened?.();
      onClose();
    }, 600);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold mb-1">
            <AlertCircle className="w-4 h-4" />
            Formal Resolution Ticket
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            File a Dispute for "{courseTitle}"
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Dispute opened with <span className="font-semibold text-slate-700 dark:text-slate-300">{counterpartyName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reason Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Dispute Reason & Description
            </label>
            <Textarea
              placeholder="Explain why the session wasn't provided properly (e.g. provider absent, incomplete duration)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs min-h-[90px]"
            />
          </div>

          {/* Evidence Attachment */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
              Attach Evidence (Chat History or Screenshot URL)
            </label>
            <Input
              placeholder="https://imgur.com/screenshot or evidence URL..."
              value={evidenceLink}
              onChange={(e) => setEvidenceLink(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
            />
          </div>

          {/* Admin Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Admin Resolution Process
            </div>
            <p className="leading-relaxed">
              EwuSwap admins will review the evidence and issue a full refund, provider settlement, or split resolution within 24 hours.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-md"
          >
            {isSubmitting ? "Submitting..." : "Submit Dispute Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
