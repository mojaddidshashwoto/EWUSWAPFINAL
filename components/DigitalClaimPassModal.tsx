import { useState } from "react";
import { X, ShieldCheck, QrCode, MapPin, Clock, KeyRound, Printer, Download, CheckCircle2 } from "lucide-react";
import { Claim, Report, currentUser, itemEmoji } from "@/lib/demo";

interface DigitalClaimPassModalProps {
  claim: Claim;
  report: Report;
  onClose: () => void;
  onPrint?: () => void;
}

export function DigitalClaimPassModal({
  claim,
  report,
  onClose,
  onPrint,
}: DigitalClaimPassModalProps) {
  const [copied, setCopied] = useState(false);

  const claimPin = claim.claimPin || "849201";
  const pickupSlot = claim.pickupSlot || "Today, 3:30 PM - 5:00 PM";
  const securityDesk = claim.securityDesk || "Main Gate Security Desk #02";

  const copyPin = () => {
    navigator.clipboard.writeText(claimPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card max-w-lg p-0 overflow-hidden" role="dialog">
        {/* Header */}
        <div className="bg-navy text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-mint/20 text-mint flex items-center justify-center font-bold">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-mint uppercase tracking-wider">Official EWU Verification</div>
              <h2 className="text-lg font-bold text-white m-0">Digital Claim Pass</h2>
            </div>
          </div>
          <button className="icon-button text-white/70 hover:text-white" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Card Content */}
        <div className="p-6 space-y-5 bg-card">
          {/* Status Badge */}
          <div className="p-3.5 rounded-xl bg-mint-soft border border-mint/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={20} className="text-mint shrink-0" />
              <div>
                <div className="text-xs font-bold text-navy">Ownership Verification Complete</div>
                <div className="text-[10px] text-muted-foreground">Ready for pickup at EWU Security Desk</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-mint text-white uppercase tracking-wider">
              {claim.status}
            </span>
          </div>

          {/* Item & Claimant Details */}
          <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <div className="size-14 rounded-xl bg-blue-soft text-blue flex items-center justify-center text-3xl font-light shrink-0">
              {itemEmoji(report.icon)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">{report.category} · {report.id}</div>
              <h3 className="text-sm font-bold text-navy mt-0.5 truncate">{report.title}</h3>
              <div className="text-xs text-muted-foreground mt-1">Claimed by <strong>{claim.claimantName}</strong> ({currentUser.identifier})</div>
            </div>
          </div>

          {/* QR & Security PIN Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-navy/5 border border-navy/10 text-center">
            {/* PIN Code Box */}
            <div className="flex flex-col items-center justify-center border-r border-border/80 pr-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <KeyRound size={12} className="text-coral" /> Claim Verification PIN
              </div>
              <div className="text-2xl font-black tracking-widest text-navy mt-1">{claimPin}</div>
              <button
                onClick={copyPin}
                className="text-[10px] text-blue font-semibold mt-1 hover:underline cursor-pointer"
              >
                {copied ? "PIN Copied!" : "Copy PIN"}
              </button>
            </div>

            {/* QR Code Representation */}
            <div className="flex flex-col items-center justify-center pl-2">
              <div className="size-16 bg-white p-1.5 rounded-lg border border-border flex items-center justify-center shadow-sm">
                <QrCode size={48} className="text-navy" />
              </div>
              <div className="text-[9px] text-muted-foreground mt-1 font-mono">Scan at Security Desk</div>
            </div>
          </div>

          {/* Pickup Instructions */}
          <div className="space-y-2 text-xs text-foreground">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-blue shrink-0" />
              <span>Location: <strong>{securityDesk}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-coral shrink-0" />
              <span>Recommended Slot: <strong>{pickupSlot}</strong></span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-soft border border-amber/30 text-[11px] text-navy">
            <strong>Important:</strong> Please present your valid EWU Student ID card along with this pass to Officer on duty.
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between">
          <button
            onClick={() => {
              if (onPrint) onPrint();
              window.print();
            }}
            className="button button-ghost text-xs flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Pass
          </button>
          <button className="button button-primary text-xs" onClick={onClose}>
            Done & Save Pass
          </button>
        </div>
      </div>
    </div>
  );
}
