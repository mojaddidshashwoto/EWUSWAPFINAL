import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { CallSessionModal } from "@/components/CallSessionModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Send, Phone, Video, Search, ShieldCheck, CheckCheck, Clock, PhoneCall,
  Check, X, Sparkles, MoreVertical, AlertCircle, Ban, Radio, Bot
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  supabase,
  listMyConversations,
  sendSupabaseRealtimeMessage,
  proposeSupabaseRealtimeCall,
  updateSupabaseCallStatus,
} from "@/lib/supabase";

interface Message {
  id: string;
  senderId: string;
  text?: string;
  timestamp: string;
  isCallRequest?: boolean;
  callStatus?: "requested" | "accepted" | "declined" | "ended";
}

interface Conversation {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatar: string;
  lastMessage: string;
  unreadCount: number;
  isOnline: boolean;
  messages: Message[];
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<string>("CONNECTING");

  // Call Modal State
  const [isCallActive, setIsCallActive] = useState(false);
  const [activeCallPeer, setActiveCallPeer] = useState<{ name: string; avatar: string }>({ name: "", avatar: "" });

  const activeConv = conversations.find((c) => c.id === activeConvId);

  useEffect(() => {
    let isActive = true;
    listMyConversations()
      .then((rows) => {
        if (!isActive) return;
        setConversations(rows);
        setActiveConvId((current) => rows.some((conversation) => conversation.id === current) ? current : rows[0]?.id ?? "");
      })
      .catch((error: any) => {
        if (isActive) toast.error(error?.message || "Could not load conversations.");
      })
      .finally(() => {
        if (isActive) setIsLoadingConversations(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  // =========================================================================
  // SUPABASE REALTIME SUBSCRIPTION (ss_messages & ss_call_sessions)
  // =========================================================================
  useEffect(() => {
    if (!activeConvId) return;
    const channelTopic = `room:${activeConvId}`;
    console.log(`[Supabase Realtime] Mounting channel subscription on ${channelTopic}...`);

    const channel = supabase
      .channel(channelTopic)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ss_messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload) => {
          const rec = payload.new;
          if (!rec) return;

          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === (rec.conversation_id || activeConvId)) {
                // Avoid duplicates
                if (c.messages.some((m) => m.id === rec.id)) return c;

                const newMsg: Message = {
                  id: rec.id,
                  senderId: rec.sender_id,
                  text: rec.body,
                  timestamp: new Date(rec.created_at || Date.now()).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                };

                if (rec.sender_id !== user?.id) {
                  toast.info(`Realtime message from ${c.peerName}`, {
                    description: rec.body,
                  });
                }

                return {
                  ...c,
                  lastMessage: newMsg.text || "",
                  messages: [...c.messages, newMsg],
                };
              }
              return c;
            })
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ss_call_sessions",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload) => {
          const rec = payload.new;
          if (!rec) return;

          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === (rec.conversation_id || activeConvId)) {
                if (c.messages.some((m) => m.id === rec.id)) return c;

                const callMsg: Message = {
                  id: rec.id,
                  senderId: rec.caller_id,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  isCallRequest: true,
                  callStatus: rec.status || "requested",
                };

                if (rec.caller_id !== user?.id) {
                  toast.info(`📹 Realtime Call Proposal from ${c.peerName}!`);
                }

                return {
                  ...c,
                  lastMessage: "📹 Call session requested",
                  messages: [...c.messages, callMsg],
                };
              }
              return c;
            })
          );
        }
      )
      .subscribe((status) => {
        setRealtimeStatus(status);
      });

    // Cleanup & Unmount to prevent memory leaks
    return () => {
      console.log(`[Supabase Realtime] Cleaning up subscription for channel ${channelTopic}`);
      supabase.removeChannel(channel);
    };
  }, [activeConvId, user?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConv) return;

    const text = messageInput.trim();
    try {
      const row = await sendSupabaseRealtimeMessage({ conversationId: activeConv.id, text });
      setMessageInput("");
      setConversations((current) => current.map((conversation) => {
        if (conversation.id !== activeConv.id || conversation.messages.some((message) => message.id === row.id)) return conversation;
        return {
          ...conversation,
          lastMessage: row.body,
          messages: [...conversation.messages, {
            id: row.id,
            senderId: row.sender_id,
            text: row.body,
            timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }],
        };
      }));
    } catch (error: any) {
      toast.error(error?.message || "Could not send this message.");
    }
  };

  const handleRequestCall = async () => {
    if (!activeConv) return;
    try {
      await proposeSupabaseRealtimeCall({ conversationId: activeConv.id, calleeId: activeConv.peerId });
      toast.success(`Call request sent to ${activeConv.peerName}.`);
    } catch (error: any) {
      toast.error(error?.message || "Could not send this call request.");
    }
  };

  const handleAcceptCall = async (msgId: string) => {
    if (!activeConv) return;
    try {
      await updateSupabaseCallStatus(msgId, "active");
      setConversations((prev) => prev.map((conversation) => conversation.id === activeConv.id
        ? { ...conversation, messages: conversation.messages.map((message) => message.id === msgId ? { ...message, callStatus: "accepted" } : message) }
        : conversation));
      setActiveCallPeer({ name: activeConv.peerName, avatar: activeConv.peerAvatar });
      setIsCallActive(true);
    } catch (error: any) {
      toast.error(error?.message || "Could not accept this call.");
    }
  };

  const handleDeclineCall = async (msgId: string) => {
    if (!activeConv) return;
    try {
      await updateSupabaseCallStatus(msgId, "declined");
      setConversations((prev) => prev.map((conversation) => conversation.id === activeConv.id
        ? { ...conversation, messages: conversation.messages.map((message) => message.id === msgId ? { ...message, callStatus: "declined" } : message) }
        : conversation));
      toast.info("Call request declined.");
    } catch (error: any) {
      toast.error(error?.message || "Could not decline this call.");
    }
  };

  if (!activeConv) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl py-20 text-center text-sm text-slate-500 dark:text-slate-400">
          {isLoadingConversations ? "Loading conversations..." : "No conversations yet."}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[82vh] max-w-6xl mx-auto flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* LEFT COLUMN: CONVERSATIONS LIST */}
        <aside className="w-full md:w-80 border-r border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
              Messages
              <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px]">
                Privacy Guarded
              </Badge>
            </h2>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {conversations.map((conv) => {
              const active = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                    active ? "bg-indigo-50/60 dark:bg-slate-800/60 border-l-4 border-indigo-600" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img src={conv.peerAvatar} alt={conv.peerName} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                    {conv.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                        {conv.peerName}
                      </h4>
                      <span className="text-[10px] text-slate-400">{conv.messages[conv.messages.length - 1]?.timestamp ?? ""}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* RIGHT COLUMN: ACTIVE CHAT TIMELINE */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/40 dark:bg-slate-950/40">
          {/* Active Chat Header */}
          <div className="p-3.5 px-6 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={activeConv.peerAvatar} alt={activeConv.peerName} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  {activeConv.peerName}
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                </h3>
                <p className="text-[10px] text-emerald-500 font-medium">● Online & Ready for Swaps</p>
              </div>
            </div>

            {/* Realtime Status & Privacy Enforced Actions */}
            <div className="flex items-center gap-2">
              <Badge className="hidden sm:inline-flex bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] items-center gap-1.5 font-semibold py-1 px-2.5">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                <span>{realtimeStatus === "SUBSCRIBED" ? "Realtime Active" : realtimeStatus}</span>
              </Badge>

              <Button
                onClick={handleRequestCall}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-xl shadow-xs gap-1.5"
              >
                <Video className="w-3.5 h-3.5" />
                Request Call
              </Button>

              {/* Conversation actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <DropdownMenuItem
                    onClick={() => toast.warning(`Report filed for ${activeConv.peerName}. Submitted for moderator review.`)}
                    className="text-xs text-amber-600 cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5 mr-2" />
                    Report User
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => toast.error(`User ${activeConv.peerName} has been blocked.`)}
                    className="text-xs text-rose-600 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5 mr-2" />
                    Block User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

          </div>

          {/* Messages Timeline */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {activeConv.messages.map((msg) => {
              const isMe = msg.senderId === user?.id;

              if (msg.isCallRequest) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 max-w-sm w-full text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                        <PhoneCall className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Call Session Requested</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {isMe ? "Waiting for recipient to accept call proposal." : `${activeConv.peerName} is requesting a WebRTC video call session.`}
                        </p>
                      </div>

                      {msg.callStatus === "requested" && !isMe ? (
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <Button size="sm" onClick={() => handleDeclineCall(msg.id)} variant="ghost" className="text-xs text-rose-500">
                            Decline
                          </Button>
                          <Button size="sm" onClick={() => handleAcceptCall(msg.id)} className="bg-emerald-600 text-white text-xs rounded-xl gap-1">
                            <Check className="w-3.5 h-3.5" /> Accept Call
                          </Button>
                        </div>
                      ) : (
                        <Badge className="bg-indigo-500/20 text-indigo-300 text-[10px]">
                          Status: {msg.callStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs sm:max-w-md px-4 py-2.5 rounded-2xl text-xs space-y-1 ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/10"
                        : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white rounded-bl-none shadow-xs"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    <div className={`text-[9px] text-right ${isMe ? "text-indigo-200" : "text-slate-400"}`}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex gap-2">
            <Input
              placeholder="Type your message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs rounded-xl"
            />
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* ACTIVE CALL OVERLAY MODAL */}
      <CallSessionModal
        isOpen={isCallActive}
        onClose={() => setIsCallActive(false)}
        peerName={activeCallPeer.name}
        peerAvatar={activeCallPeer.avatar}
      />
    </DashboardLayout>
  );
}
