import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, Coins, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

const toNotification = (row: NotificationRow): NotificationItem => ({
  id: row.id,
  type: row.type,
  title: row.title,
  message: row.message,
  createdAt: row.created_at,
  isRead: row.is_read,
});

const mergeNotifications = (current: NotificationItem[], incoming: NotificationItem[]) =>
  [...new Map([...incoming, ...current].map((notification) => [notification.id, notification])).values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const notificationIcon = (type: string) => {
  if (type === "escrow" || type === "wallet") return <Coins className="w-4 h-4" />;
  if (type === "review") return <Sparkles className="w-4 h-4" />;
  if (type === "call") return <MessageSquare className="w-4 h-4" />;
  if (type === "dispute") return <ShieldCheck className="w-4 h-4" />;
  return <Bell className="w-4 h-4" />;
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setNotifications([]);
    setLoadError(null);
    setIsLoading(true);

    if (!user?.id) {
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ss_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = toNotification(payload.new as NotificationRow);
          if (isActive) {
            setNotifications((current) => mergeNotifications(current, [notification]));
          }
        },
      )
      .subscribe((status) => {
        if (isActive && (status === "CHANNEL_ERROR" || status === "TIMED_OUT")) {
          toast.error("Live notification updates are unavailable.");
        }
      });

    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("ss_notifications")
          .select("id, user_id, type, title, message, created_at, is_read")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        if (!isActive) return;

        const rows = (data ?? []).map((row) => toNotification(row as NotificationRow));
        setNotifications((current) => mergeNotifications(current, rows));
      } catch (error: any) {
        if (isActive) {
          const message = error?.message || "Could not load notifications.";
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadNotifications();
    return () => {
      isActive = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user?.id) return;
    setIsMarkingRead(true);
    try {
      const { data, error } = await supabase
        .from("ss_notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .select("id");
      if (error) throw error;

      const updatedIds = new Set((data ?? []).map((row) => row.id));
      setNotifications((current) => current.map((notification) => (
        updatedIds.has(notification.id) ? { ...notification, isRead: true } : notification
      )));
      toast.success("All notifications marked as read.");
    } catch (error: any) {
      toast.error(error?.message || "Could not mark notifications as read.");
    } finally {
      setIsMarkingRead(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
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

          {notifications.some((notification) => !notification.isRead) && (
            <Button onClick={markAllRead} disabled={isMarkingRead} variant="outline" size="sm" className="text-xs">
              <Check className="w-3.5 h-3.5 mr-1" />
              {isMarkingRead ? "Marking read..." : "Mark all read"}
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading notifications...</p>
        ) : loadError && notifications.length === 0 ? (
          <Card className="border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30">
            <CardContent className="p-4 text-sm text-rose-700 dark:text-rose-300" role="alert">
              {loadError}
            </CardContent>
          </Card>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`border-slate-200/80 dark:border-slate-800 shadow-sm transition-all ${
                  !notification.isRead ? "bg-indigo-50/40 dark:bg-slate-900/90 border-l-4 border-l-indigo-600" : "bg-white dark:bg-slate-900"
                }`}
              >
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0 mt-0.5">
                      {notificationIcon(notification.type)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {notification.title}
                        {!notification.isRead && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{notification.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
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
