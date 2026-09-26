import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

export interface CallSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  peerName: string;
  peerAvatar: string;
  callType?: "video" | "audio";
}

export function CallSessionModal({
  isOpen,
  onClose,
  peerName,
  peerAvatar,
  callType = "video",
}: CallSessionModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const handleEndCall = () => {
    toast.info("Call session ended.");
    onClose();
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    toast.success(!isScreenSharing ? "Screen sharing started." : "Screen sharing stopped.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 bg-slate-950 border-slate-800 text-white flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Call Header Overlay */}
        <div className="p-4 bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <img src={peerAvatar} alt={peerName} className="w-10 h-10 rounded-full object-cover border border-indigo-500/40" />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                {peerName}
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              </h3>
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Encrypted Session • 02:45
              </p>
            </div>
          </div>

          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
            WebRTC Media Stream
          </Badge>
        </div>

        {/* Video Canvas Container */}
        <div className="flex-1 relative flex items-center justify-center bg-slate-900">
          {/* Main Remote Participant Stream View */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isVideoOff ? (
              <div className="text-center space-y-3">
                <img src={peerAvatar} alt={peerName} className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-slate-800 shadow-xl" />
                <p className="text-xs text-slate-400">{peerName} (Camera Off)</p>
              </div>
            ) : (
              <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center">
                <img src={peerAvatar} alt={peerName} className="w-48 h-48 rounded-full object-cover border-4 border-indigo-500/30 shadow-2xl opacity-80" />
                <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]" />
                <div className="absolute bottom-6 left-6 bg-slate-900/80 px-3 py-1.5 rounded-xl text-xs font-semibold text-white border border-slate-800">
                  {peerName} {isScreenSharing && "(Sharing Screen)"}
                </div>
              </div>
            )}
          </div>

          {/* Self Camera Picture-in-Picture */}
          <div className="absolute top-4 right-4 w-40 h-28 bg-slate-950 border-2 border-indigo-500/40 rounded-xl overflow-hidden shadow-2xl z-20">
            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs text-slate-400">
              <span>You (Local Stream)</span>
            </div>
          </div>
        </div>

        {/* Floating Bottom Toolbar Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-center gap-4 z-20">
          {/* Mic Toggle */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className={`rounded-full w-12 h-12 border-slate-700 ${
              isMuted ? "bg-rose-600/20 text-rose-400 border-rose-500/40 hover:bg-rose-600/30" : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Video Camera Toggle */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`rounded-full w-12 h-12 border-slate-700 ${
              isVideoOff ? "bg-rose-600/20 text-rose-400 border-rose-500/40 hover:bg-rose-600/30" : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>

          {/* Screen Share */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleScreenShare}
            className={`rounded-full w-12 h-12 border-slate-700 ${
              isScreenSharing ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            <Monitor className="w-5 h-5" />
          </Button>

          {/* End Call Button */}
          <Button
            type="button"
            size="icon"
            onClick={handleEndCall}
            className="rounded-full w-12 h-12 bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
