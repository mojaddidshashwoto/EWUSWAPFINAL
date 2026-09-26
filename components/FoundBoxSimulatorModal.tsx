import { useState } from "react";
import { X, Package, KeyRound, CheckCircle2, Lock, Unlock, ShieldCheck, QrCode, ArrowRight } from "lucide-react";
import { LockerHub, seedLockers } from "@/lib/demo";

interface FoundBoxSimulatorModalProps {
  onClose: () => void;
  onToast: (msg: string) => void;
}

export function FoundBoxSimulatorModal({ onClose, onToast }: FoundBoxSimulatorModalProps) {
  const [activeTab, setActiveTab] = useState<"drop" | "pickup">("drop");
  const [selectedHub, setSelectedHub] = useState<LockerHub>(seedLockers[0]);
  const [itemTitle, setItemTitle] = useState("");
  const [itemCategory, setItemCategory] = useState("Mobile Phone");
  const [passcode, setPasscode] = useState("");
  const [lockerDoorOpen, setLockerDoorOpen] = useState(false);
  const [generatedPass, setGeneratedPass] = useState<{ pin: string; lockerNumber: number } | null>(null);

  const handleSimulateDropOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle) return;
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const lockerNum = Math.floor(1 + Math.random() * 8);

    setLockerDoorOpen(true);
    setGeneratedPass({ pin, lockerNumber: lockerNum });
    onToast(`FoundBox Locker #${lockerNum} unlocked for deposit!`);
  };

  const handleSimulatePickup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;

    if (passcode.length === 6) {
      setLockerDoorOpen(true);
      onToast(`Passcode verified! Locker unlocked for retrieval.`);
    } else {
      onToast(`Invalid passcode. Enter a 6-digit code.`);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card modal-wide flex flex-col max-h-[92vh] p-0 overflow-hidden" role="dialog">
        {/* Header */}
        <div className="bg-navy text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-mint/20 text-mint flex items-center justify-center font-bold">
              <Package size={22} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-mint uppercase tracking-wider">Campus Automated Drop-Off</div>
              <h2 className="text-lg font-bold text-white m-0">EWU FoundBox Locker Simulator</h2>
            </div>
          </div>
          <button className="icon-button text-white/70 hover:text-white" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-border bg-card">
          <button
            onClick={() => {
              setActiveTab("drop");
              setLockerDoorOpen(false);
              setGeneratedPass(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "drop" ? "border-coral text-coral bg-coral-soft/30" : "border-transparent text-muted-foreground hover:text-navy"
            }`}
          >
            <Package size={16} /> 1. Drop Off Found Item
          </button>
          <button
            onClick={() => {
              setActiveTab("pickup");
              setLockerDoorOpen(false);
              setGeneratedPass(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "pickup" ? "border-mint text-mint bg-mint-soft/30" : "border-transparent text-muted-foreground hover:text-navy"
            }`}
          >
            <Unlock size={16} /> 2. Retrieve Claimed Item
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-6 bg-background overflow-y-auto">
          {/* Locker Location Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-navy block">Select Campus FoundBox Hub</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {seedLockers.map((hub) => (
                <button
                  key={hub.id}
                  onClick={() => setSelectedHub(hub)}
                  className={`p-3 text-left rounded-xl border transition-all text-xs ${
                    selectedHub.id === hub.id ? "border-mint bg-mint-soft/40 shadow-sm font-semibold" : "border-border bg-card hover:border-mint/50"
                  }`}
                >
                  <div className="font-bold text-navy truncate">{hub.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{hub.building}</div>
                  <div className="text-[10px] text-mint font-bold mt-2 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-mint" /> {hub.availableLockers} lockers ready
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Locker Visualizer */}
          <div className="p-6 rounded-2xl bg-navy text-white text-center space-y-4 relative overflow-hidden">
            <div className="text-[10px] font-bold text-mint uppercase tracking-widest">
              Locker Status: {selectedHub.name}
            </div>

            {/* Locker Door Animated Container */}
            <div className="size-36 mx-auto rounded-2xl bg-navy-2 border-4 border-mint/40 flex flex-col items-center justify-center relative shadow-2xl transition-all">
              {lockerDoorOpen ? (
                <div className="space-y-1 animate-in fade-in zoom-in duration-300">
                  <Unlock size={44} className="text-mint mx-auto" />
                  <div className="text-xs font-bold text-mint">DOOR UNLOCKED</div>
                  <div className="text-[10px] text-white/70">Insert/Remove Item</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Lock size={44} className="text-white/60 mx-auto" />
                  <div className="text-xs font-bold text-white/80">LOCKER SECURED</div>
                  <div className="text-[10px] text-white/40">Enter Code Below</div>
                </div>
              )}
            </div>

            {/* Generated Pass Result */}
            {generatedPass && (
              <div className="p-4 rounded-xl bg-card text-navy text-left space-y-2 border border-mint">
                <div className="text-xs font-bold text-mint flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Deposit Authorized!
                </div>
                <div className="text-xs">
                  Assigned Locker: <strong>Door #{generatedPass.lockerNumber}</strong>
                </div>
                <div className="text-xs">
                  Access Pass Code: <strong className="font-mono text-coral text-sm">{generatedPass.pin}</strong>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Security notified automatically. EWU custody record updated.
                </div>
              </div>
            )}
          </div>

          {/* Forms */}
          {activeTab === "drop" ? (
            <form onSubmit={handleSimulateDropOff} className="space-y-4 bg-card p-4 rounded-xl border border-border">
              <h3 className="text-xs font-bold text-navy uppercase tracking-wider m-0">Drop-Off Item Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="field">
                  <span>What item are you dropping off?</span>
                  <input
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    placeholder="e.g. White Wireless Earbuds Case"
                    required
                  />
                </label>
                <label className="field"><span>Category</span>
                  <select value={itemCategory} onChange={(e) => setItemCategory(e.target.value)}>
                    <option value="Mobile Phone">Mobile Phone</option>
                    <option value="Earbuds">Earbuds</option>
                    <option value="Keys">Keys</option>
                    <option value="Wallet">Wallet</option>
                    <option value="ID Card">ID Card</option>
                  </select>
                </label>
              </div>

              <button type="submit" className="button button-primary w-full py-2.5 text-xs flex items-center justify-center gap-2">
                <span>Simulate Unlocking Locker for Drop-Off</span>
                <ArrowRight size={14} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSimulatePickup} className="space-y-4 bg-card p-4 rounded-xl border border-border">
              <h3 className="text-xs font-bold text-navy uppercase tracking-wider m-0">Enter 6-Digit Pickup Passcode</h3>
              <label className="field">
                <span>Verification Passcode</span>
                <input
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="e.g. 849201"
                  maxLength={6}
                  required
                  className="font-mono text-lg tracking-widest text-center"
                />
              </label>

              <button type="submit" className="button button-secondary w-full py-2.5 text-xs flex items-center justify-center gap-2">
                <span>Verify Code & Unlock Locker Door</span>
                <Unlock size={14} />
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-muted/40 border-t border-border flex justify-end">
          <button className="button button-ghost text-xs" onClick={onClose}>
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
}
