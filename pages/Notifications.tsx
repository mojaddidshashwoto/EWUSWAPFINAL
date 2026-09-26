import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Sparkles, ShieldCheck, Coins, MessageSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  type: "escrow" | "review" | "call" | "system";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-1",
    type: "escrow",
    title: "Escrow Payment Reserved",
    message: "24 Credits held in escrow for your Figma Systems Sprint with Noah Williams.",
    timestamp: "10 min ago",
    isRead: false,
  },
  {
    id: "n-2",
    type: "review",
    title: "New Review Received",
    message: "Jordan Kim left a 5.0 star review on your React Architecture session!",
    timestamp: "2 hours ago",
    isRead: false,
  },
  {
    id: "n-3",
    type: "call",
    title: "WebRTC Call Session Proposed",
    message: "Priya Shah sent a video call request for your upcoming Tableau session.",
    timestamp: "Yesterday",
    isRead: true,
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem("ss_notifications");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem("ss_notifications");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setNotifications(parsed);
          }
        }
      } catch {}
    };

    window.addEventListener("ss_notifications_updated", handleUpdate);
    window.addEventListener("ss_notification_received", handleUpdate);
    return () => {
      window.removeEventListener("ss_notifications_updated", handleUpdate);
      window.removeEventListener("ss_notification_received", handleUpdate);
    };
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      localStorage.setItem("ss_notifications", JSON.stringify(updated));
      return updated;
    });
    toast.success("All notifications marked as read.");
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem("ss_notifications");
    toast.info("Notifications cleared.");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-indigo-500" />
              Notifications & Activity Stream
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Realtime alerts for escrow state changes, call requests, and reviews.
            </p>
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
              <Button onClick={markAllRead} variant="outline" size="sm" className="text-xs">
                <Check className="w-3.5 h-3.5 mr-1" />
                Mark all read
              </Button>
              <Button onClick={clearAll} variant="ghost" size="sm" className="text-xs text-rose-500">
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* NOTIFICATIONS LIST OR EMPTY STATE */}
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`border-slate-200/80 dark:border-slate-800 shadow-sm transition-all ${
                  !n.isRead ? "bg-indigo-50/40 dark:bg-slate-900/90 border-l-4 border-l-indigo-600" : "bg-white dark:bg-slate-900"
                }`}
              >
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0 mt-0.5">
                      {n.type === "escrow" ? <Coins className="w-4 h-4" /> : n.type === "review" ? <Sparkles className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {n.title}
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{n.timestamp}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* EMPTY STATE */
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-center py-16">
            <CardContent className="space-y-3">
              <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
                <Bell className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No notifications yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                You're all caught up! Updates regarding your exchanges, calls, and credits will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
