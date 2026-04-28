import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, User, Lock } from "lucide-react";
import { BookingChatPanel } from "./BookingChatPanel";
import type { ChatViewerRole } from "./BookingChatPanel";

interface ConversationRow {
  id: string;
  booking_code: string;
  status: string;
  scheduled_date: string | null;
  start_time: string | null;
  psw_first_name: string | null;
  client_first_name: string | null;
  client_name: string | null;
  psw_assigned: string | null;
}

interface MessagesInboxProps {
  viewerRole: Extract<ChatViewerRole, "client" | "psw">;
}

export const MessagesInbox = ({ viewerRole }: MessagesInboxProps) => {
  const [convos, setConvos] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConversationRow | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const email = userRes.user?.email;
      const uid = userRes.user?.id;
      if (!email) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from("bookings")
        .select(
          "id, booking_code, status, scheduled_date, start_time, psw_first_name, client_first_name, client_name, psw_assigned, client_email"
        )
        .not("psw_assigned", "is", null)
        .order("scheduled_date", { ascending: false })
        .limit(30);

      if (viewerRole === "client") {
        query = query.eq("client_email", email);
      } else {
        // PSW: bookings assigned to them
        const { data: profile } = await supabase
          .from("psw_profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (!profile?.id) {
          setLoading(false);
          return;
        }
        query = query.eq("psw_assigned", profile.id);
      }

      const { data } = await query;
      setConvos((data ?? []) as any);
      setLoading(false);
    };
    load();
  }, [viewerRole]);

  if (selected) {
    const isLocked = selected.status === "completed" || selected.status === "cancelled";
    const otherName =
      viewerRole === "client"
        ? selected.psw_first_name ?? "Caregiver"
        : selected.client_first_name ?? selected.client_name ?? "Client";
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Back to messages
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{otherName}</h3>
            <p className="text-xs text-muted-foreground font-mono">
              {selected.booking_code}
            </p>
          </div>
          <Badge variant={isLocked ? "outline" : "secondary"}>
            {isLocked ? "Closed" : "Open"}
          </Badge>
        </div>
        <BookingChatPanel
          bookingId={selected.id}
          viewerRole={viewerRole}
          locked={isLocked}
          lockedReason="This conversation is closed. Contact PSW Direct support if you need help."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Messages</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Secure in-app conversations. Phone numbers and email are never shared.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : convos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No conversations yet. Messaging opens once a caregiver is assigned.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {convos.map((c) => {
            const isLocked = c.status === "completed" || c.status === "cancelled";
            const otherName =
              viewerRole === "client"
                ? c.psw_first_name ?? "Caregiver"
                : c.client_first_name ?? c.client_name ?? "Client";
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full text-left rounded-lg border bg-card hover:bg-accent/40 transition-colors p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {otherName}
                    </span>
                    {isLocked && (
                      <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {c.booking_code}
                    {c.scheduled_date && ` • ${c.scheduled_date}`}
                  </div>
                </div>
                <Badge variant={isLocked ? "outline" : "secondary"} className="text-xs">
                  {isLocked ? "Closed" : "Open"}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
