import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase, updateSupabaseCallSignaling, updateSupabaseCallStatus } from "@/lib/supabase";

export interface CallSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  callSessionId: string;
  currentUserId: string;
  isCaller: boolean;
  peerName: string;
  peerAvatar: string;
  callType?: "video" | "audio";
}

type CallSignalRow = {
  id: string;
  caller_id: string;
  callee_id: string;
  status: string;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  caller_ice_candidates: RTCIceCandidateInit[] | null;
  callee_ice_candidates: RTCIceCandidateInit[] | null;
};

const SIGNAL_SELECT = "id, caller_id, callee_id, status, offer, answer, caller_ice_candidates, callee_ice_candidates";

export function CallSessionModal({
  isOpen,
  onClose,
  callSessionId,
  currentUserId,
  isCaller,
  peerName,
  peerAvatar,
  callType = "video",
}: CallSessionModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const onCloseRef = useRef(onClose);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const endingCallRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "audio");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [connectionState, setConnectionState] = useState("Connecting");
  const [callError, setCallError] = useState<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleHangup = useCallback(async () => {
    if (endingCallRef.current) return;
    endingCallRef.current = true;
    setIsEnding(true);
    try {
      await updateSupabaseCallStatus(callSessionId, "ended");
    } catch (error: any) {
      toast.error(error?.message || "Could not update the call status.");
    } finally {
      onCloseRef.current();
    }
  }, [callSessionId]);

  useEffect(() => {
    if (!isOpen || !callSessionId || !currentUserId) return;

    let isActive = true;
    let isConnectedStatusSaved = false;
    let initializationStarted = false;
    let signalQueue = Promise.resolve();
    const seenCandidates = new Set<string>();
    const pendingCandidates: RTCIceCandidateInit[] = [];
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = peerConnection;
    endingCallRef.current = false;
    setIsEnding(false);
    setCallError(null);
    setConnectionState("Connecting");
    setIsVideoOff(callType === "audio");

    const showConnectionError = (error: unknown) => {
      if (!isActive) return;
      const message = error instanceof Error ? error.message : "Could not establish the call.";
      setCallError(message);
      setConnectionState("Call failed");
      toast.error(message);
    };

    const addRemoteCandidate = async (candidate: RTCIceCandidateInit) => {
      const candidateKey = JSON.stringify(candidate);
      if (seenCandidates.has(candidateKey)) return;
      seenCandidates.add(candidateKey);
      if (!peerConnection.remoteDescription) {
        pendingCandidates.push(candidate);
        return;
      }
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const flushPendingCandidates = async () => {
      while (pendingCandidates.length > 0) {
        const candidate = pendingCandidates.shift();
        if (candidate) await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const applySignalRow = async (row: CallSignalRow) => {
      if (!isActive) return;
      const remoteDescription = isCaller ? row.answer : row.offer;
      if (remoteDescription && !peerConnection.remoteDescription) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDescription));
        await flushPendingCandidates();

        if (!isCaller) {
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          await updateSupabaseCallSignaling(callSessionId, "answer", answer);
        }
      }

      const remoteCandidates = isCaller
        ? row.callee_ice_candidates ?? []
        : row.caller_ice_candidates ?? [];
      for (const candidate of remoteCandidates) {
        await addRemoteCandidate(candidate);
      }

      if (row.status === "declined" || row.status === "ended" || row.status === "missed") {
        setConnectionState(row.status === "declined" ? "Call declined" : "Call ended");
        if (row.status === "declined") toast.info(`${peerName} declined the call.`);
        endingCallRef.current = true;
        onCloseRef.current();
      }
    };

    const enqueueSignalRow = (row: CallSignalRow) => {
      signalQueue = signalQueue
        .then(() => applySignalRow(row))
        .catch(showConnectionError);
      return signalQueue;
    };

    peerConnection.ontrack = (event) => {
      const stream = event.streams[0];
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !isActive) return;
      void updateSupabaseCallSignaling(callSessionId, "ice", event.candidate.toJSON())
        .catch(showConnectionError);
    };

    peerConnection.onconnectionstatechange = () => {
      if (!isActive) return;
      const state = peerConnection.connectionState;
      setConnectionState(state === "connected" ? "Connected" : state === "failed" ? "Connection failed" : state === "disconnected" ? "Connection interrupted" : "Connecting");
      if (state === "connected" && !isConnectedStatusSaved) {
        isConnectedStatusSaved = true;
        void updateSupabaseCallStatus(callSessionId, "active").catch(showConnectionError);
      }
      if (state === "failed") {
        setCallError("The peer connection failed. Check your network and try again.");
      }
    };

    const channel = supabase
      .channel(`call-signaling:${callSessionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "ss_call_sessions",
        filter: `id=eq.${callSessionId}`,
      }, (payload) => {
        enqueueSignalRow(payload.new as CallSignalRow);
      })
      .subscribe((status) => {
        if (!isActive) return;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          showConnectionError(new Error("Could not connect to call signaling."));
          return;
        }
        if (status !== "SUBSCRIBED" || initializationStarted) return;
        initializationStarted = true;

        void (async () => {
          try {
            const localStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: callType === "video",
            });
            if (!isActive) {
              localStream.getTracks().forEach((track) => track.stop());
              return;
            }
            localStreamRef.current = localStream;
            if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
            localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

            const { data: row, error } = await supabase
              .from("ss_call_sessions")
              .select(SIGNAL_SELECT)
              .eq("id", callSessionId)
              .single();
            if (error) throw error;
            if ((isCaller && row.caller_id !== currentUserId) || (!isCaller && row.callee_id !== currentUserId)) {
              throw new Error("You are not the expected participant for this call.");
            }

            await enqueueSignalRow(row as CallSignalRow);
            if (isCaller && !row.offer) {
              const offer = await peerConnection.createOffer();
              await peerConnection.setLocalDescription(offer);
              await updateSupabaseCallSignaling(callSessionId, "offer", offer);
            }
          } catch (error) {
            showConnectionError(error);
            void updateSupabaseCallStatus(callSessionId, "ended")
              .catch((statusError: unknown) => {
                if (isActive) toast.error(statusError instanceof Error ? statusError.message : "Could not end the failed call.");
              });
          }
        })();
      });

    return () => {
      isActive = false;
      void supabase.removeChannel(channel);
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current = null;
      localStreamRef.current = null;
      screenStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
  }, [callSessionId, callType, currentUserId, isCaller, isOpen, peerName]);

  const toggleMicrophone = () => {
    const nextMuted = !isMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  };

  const toggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !nextVideoOff;
    });
    setIsVideoOff(nextVideoOff);
  };

  const toggleScreenShare = async () => {
    const peerConnection = peerConnectionRef.current;
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    if (!peerConnection || !cameraTrack) return;

    try {
      if (isScreenSharing) {
        const sender = peerConnection.getSenders().find((item) => item.track?.kind === "video");
        await sender?.replaceTrack(cameraTrack);
        screenStreamRef.current?.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
        setIsScreenSharing(false);
        return;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) throw new Error("No screen video track was provided.");
      const sender = peerConnection.getSenders().find((item) => item.track?.kind === "video");
      if (!sender) throw new Error("Screen sharing is unavailable for this call.");
      await sender.replaceTrack(screenTrack);
      screenStreamRef.current = screenStream;
      screenTrack.onended = () => {
        void sender.replaceTrack(cameraTrack).catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Could not restore the camera stream.");
        });
        screenStreamRef.current = null;
        setIsScreenSharing(false);
      };
      setIsScreenSharing(true);
    } catch (error: any) {
      if (error?.name !== "NotAllowedError") {
        toast.error(error?.message || "Could not start screen sharing.");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !endingCallRef.current) void handleHangup(); }}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 bg-slate-950 border-slate-800 text-white flex flex-col justify-between overflow-hidden shadow-2xl">
        <div className="p-4 bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <img src={peerAvatar} alt={peerName} className="w-10 h-10 rounded-full object-cover border border-indigo-500/40" />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                {peerName}
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">{connectionState}</p>
            </div>
          </div>
          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
            {callType === "audio" ? "Audio call" : "WebRTC video call"}
          </Badge>
        </div>

        <div className="flex-1 relative flex items-center justify-center bg-slate-900">
          <div className="absolute inset-0 flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-contain ${callType === "audio" ? "hidden" : ""}`}
            />
            {callType === "audio" && (
              <div className="text-center space-y-3">
                <img src={peerAvatar} alt="" className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-slate-800 shadow-xl" />
                <p className="text-xs text-slate-300">{peerName}</p>
              </div>
            )}
            {callError && (
              <p role="alert" className="absolute bottom-4 left-4 right-4 rounded-lg bg-rose-950/90 p-3 text-center text-xs text-rose-200">
                {callError}
              </p>
            )}
          </div>

          <div className="absolute top-4 right-4 w-40 h-28 bg-slate-950 border-2 border-indigo-500/40 rounded-xl overflow-hidden shadow-2xl z-20">
            {callType === "video" && !isVideoOff ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                {isVideoOff ? "Camera off" : "Audio only"}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-center gap-4 z-20">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
            onClick={toggleMicrophone}
            className={`rounded-full w-12 h-12 border-slate-700 ${
              isMuted ? "bg-rose-600/20 text-rose-400 border-rose-500/40 hover:bg-rose-600/30" : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
            disabled={callType === "audio"}
            onClick={toggleVideo}
            className={`rounded-full w-12 h-12 border-slate-700 ${
              isVideoOff ? "bg-rose-600/20 text-rose-400 border-rose-500/40 hover:bg-rose-600/30" : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={isScreenSharing ? "Stop screen sharing" : "Share screen"}
            disabled={callType === "audio"}
            onClick={() => { void toggleScreenShare(); }}
            className={`rounded-full w-12 h-12 border-slate-700 ${
              isScreenSharing ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            <Monitor className="w-5 h-5" />
          </Button>

          <Button
            type="button"
            size="icon"
            aria-label="End call"
            disabled={isEnding}
            onClick={() => { void handleHangup(); }}
            className="rounded-full w-12 h-12 bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
