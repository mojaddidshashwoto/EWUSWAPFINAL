import { useState } from "react";
import { X, QrCode, Printer, Share2, Copy, Check, MapPin, Clock, ShieldCheck } from "lucide-react";
import { Report, itemEmoji } from "@/lib/demo";

interface LostItemPosterModalProps {
  report: Report;
  onClose: () => void;
}

export function LostItemPosterModal({ report, onClose }: LostItemPosterModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/#report-${report.id}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card max-w-xl p-0 overflow-hidden" role="dialog">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <Share2 size={20} className="text-coral" />
            <h2 className="text-lg font-bold text-navy m-0">Printable Lost Item Poster</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Poster Printable Card */}
        <div className="p-6 bg-muted/20">
          <div className="bg-white border-4 border-coral rounded-2xl p-6 shadow-xl space-y-5 text-center">
            {/* Header Banner */}
            <div className="bg-coral text-white py-2 px-4 rounded-xl font-black text-xl tracking-widest uppercase">
              ★ MISSING ITEM NOTICE ★
            </div>

            {/* Icon & Title */}
            <div className="flex flex-col items-center">
              <div className="size-20 rounded-2xl bg-coral-soft text-coral flex items-center justify-center text-4xl mb-3 shadow-inner">
                {itemEmoji(report.icon)}
              </div>
              <h1 className="text-2xl font-black text-navy uppercase tracking-tight">{report.title}</h1>
              <div className="text-xs font-bold text-coral uppercase tracking-wider mt-1">{report.category} · Ref {report.id}</div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-3 text-left bg-muted/40 p-4 rounded-xl text-xs border border-border">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-coral shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Last Seen At</span>
                  <strong className="text-navy">{report.location}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock size={16} className="text-blue shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Date & Time</span>
                  <strong className="text-navy">{report.date} ({report.time})</strong>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="text-left text-xs text-foreground bg-card p-3.5 rounded-xl border border-border italic leading-relaxed">
              "{report.description}"
            </div>

            {/* QR Code & Contact Callout */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-navy text-white text-left">
              <div>
                <div className="text-xs font-bold text-mint flex items-center gap-1.5">
                  <ShieldCheck size={14} /> EWU LOOP Verified Notice
                </div>
                <div className="text-[11px] text-white/80 mt-1 max-w-[280px]">
                  Found this item? Scan the QR code or visit EWU LOOP to contact the owner safely.
                </div>
              </div>

              <div className="size-16 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center shadow-md">
                <QrCode size={52} className="text-navy" />
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground font-mono">
              EAST WEST UNIVERSITY CAMPUS COMMUNITY NETWORK
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-card border-t border-border flex items-center justify-between">
          <button onClick={copyShareLink} className="button button-ghost text-xs flex items-center gap-1.5">
            {copied ? <Check size={14} className="text-mint" /> : <Copy size={14} />}
            <span>{copied ? "Link Copied!" : "Copy Share Link"}</span>
          </button>
          <button onClick={() => window.print()} className="button button-primary text-xs flex items-center gap-1.5">
            <Printer size={14} /> Print Poster Notice
          </button>
        </div>
      </div>
    </div>
  );
}
