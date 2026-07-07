import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
  read_at: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user?.email) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_email", user.email)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    fetchNotifications();
    // Poll every 60s — reduced from 30s to lower background load on mobile.
    // Realtime push still delivers immediate updates; this is only a safety net.
    const interval = setInterval(fetchNotifications, 60000);

    // Realtime subscription: instant delivery without polling pressure.
    const channel = supabase
      .channel(`notifications-${user.email}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_email=eq.${user.email}` },
        () => { fetchNotifications(); }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user?.email]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    if (!user?.email) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_email", user.email)
      .is("read_at", null);
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  return { notifications, unreadCount, loading, markAsRead, markAllRead, refetch: fetchNotifications };
};
