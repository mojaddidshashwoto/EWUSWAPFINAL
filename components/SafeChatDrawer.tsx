import { useState, useRef, useEffect } from "react";
import { X, Send, ShieldCheck, LockKeyhole, UserCheck, MessageSquare, Check, Sparkles } from "lucide-react";
import { AppState, ChatMessage, ChatThread, currentUser, itemEmoji } from "@/lib/demo";

interface SafeChatDrawerProps {
  threadId: string | null;
  state: AppState;
  onClose: () => void;
  onSendMessage: (threadId: string, text: string) => void;
  onSelectThread: (threadId: string) => void;
}

export function SafeChatDrawer({
  threadId,
  state,
  onClose,
  onSendMessage,
  onSelectThread,
}: SafeChatDrawerProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeThread = state.chatThreads.find((t) => t.id === threadId) || state.chatThreads[0];
  const messages = activeThread ? state.chatMessages[activeThread.id] || [] : [];
  const relatedReport = activeThread ? state.reports.find((r) => r.id === activeThread.reportId) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeThread) return;
    onSendMessage(activeThread.id, inputText.trim());
    setInputText("");
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card modal-wide flex flex-col h-[640px] max-h-[90vh] p-0 overflow-hidden" role="dialog">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="eyebrow accent-text flex items-center gap-1.5">
                <ShieldCheck size={13} /> EWU Safe Communications
              </div>
              <h2 className="text-lg font-bold text-navy m-0">In-App Safe Chat</h2>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          {/* Thread List Sidebar */}
          <div className="border-r border-border bg-muted/30 flex flex-col overflow-y-auto">
            <div className="p-3 border-b border-border bg-card/50">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Conversations</div>
            </div>
            {state.chatThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`w-full text-left p-3.5 border-b border-border transition-colors flex items-start gap-3 ${
                  activeThread?.id === thread.id ? "bg-accent/80 font-medium" : "hover:bg-accent/40"
                }`}
              >
                <div className="size-9 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {thread.otherPartyName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-navy truncate">{thread.otherPartyName}</span>
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">{thread.updatedAt}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">{thread.reportTitle}</div>
                  <div className="text-[10px] text-foreground/70 truncate mt-1 italic">"{thread.lastMessage}"</div>
                </div>
              </button>
            ))}
          </div>

          {/* Chat Messages Panel */}
          <div className="md:col-span-2 flex flex-col bg-background h-full">
            {activeThread ? (
              <>
                {/* Active Thread Bar */}
                <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {relatedReport && (
                      <span className="text-lg shrink-0">{itemEmoji(relatedReport.icon)}</span>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-navy truncate m-0">{activeThread.reportTitle}</h3>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <UserCheck size={11} className="text-mint" /> Chatting with {activeThread.otherPartyName}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] px-2 py-1 rounded bg-mint-soft text-mint font-semibold flex items-center gap-1 shrink-0">
                    <LockKeyhole size={11} /> Private & Encrypted
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  <div className="p-3 rounded-lg bg-blue-soft/60 border border-blue/20 text-xs text-navy flex items-start gap-2">
                    <ShieldCheck size={16} className="text-blue shrink-0 mt-0.5" />
                    <div>
                      <strong>EWU Safety Guidance:</strong> Never share sensitive bank details, passwords, or personal phone numbers. Keep conversations inside EWU LOOP.
                    </div>
                  </div>

                  {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div className="text-[9px] text-muted-foreground mb-1 px-1">
                          {msg.senderName} · {msg.createdAt}
                        </div>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                            isMe
                              ? "bg-navy text-white rounded-tr-none shadow-sm"
                              : "bg-card border border-border text-foreground rounded-tl-none shadow-sm"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSend} className="p-3 bg-card border-t border-border flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a safe message..."
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-mint/50"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="button button-primary px-4 py-2.5 text-xs flex items-center gap-1.5"
                  >
                    <span>Send</span>
                    <Send size={13} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <MessageSquare size={32} className="opacity-30 mb-2" />
                <p className="text-xs">Select a conversation thread to view messages.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
