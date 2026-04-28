import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ShieldAlert, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ChatViewerRole = "client" | "psw" | "admin";

interface BookingChatPanelProps {
  bookingId: string;
  viewerRole: ChatViewerRole;
  /** Locked when no PSW assigned, or booking completed/cancelled (clients/PSWs only). */
  locked?: boolean;
  lockedReason?: string;
  /** Compact mode for embedding in narrow detail screens. */
  compact?: boolean;
}

interface ChatMessage {
  id: string;
  booking_id: string;
  sender_user_id: string | null;
  sender_role: "client" | "psw" | "admin" | "system";
  sender_display_name: string | null;
  message_body: string;
  blocked_reason: string | null;
  created_at: string;
}

export const BookingChatPanel = ({
  bookingId,
  viewerRole,
  locked = false,
  lockedReason,
  compact = false,
}: BookingChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load + realtime
  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("in_app_messages" as any)
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      if (!cancelled) {
        if (error) console.error("Load messages failed:", error);
        setMessages(((data as any) ?? []) as ChatMessage[]);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`messages-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "in_app_messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const next = [...prev, payload.new as ChatMessage];
            return next.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // Auto scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Mark as read (best-effort)
    if (messages.length === 0) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) return;
      await supabase
        .from("message_read_receipts" as any)
        .upsert(
          { booking_id: bookingId, user_email: email, last_read_at: new Date().toISOString() },
          { onConflict: "booking_id,user_email" }
        );
    })();
  }, [messages, bookingId]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    if (locked) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-message", {
        body: { booking_id: bookingId, message: body },
      });

      if (error) {
        toast.error(error.message || "Could not send message");
        return;
      }
      const result = data as { blocked: boolean; reasons?: string[]; message?: string };
      if (result?.blocked) {
        toast.warning(
          result.message ||
            "For privacy and safety, please communicate through PSW Direct."
        );
      }
      setDraft("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-card",
        compact ? "h-[380px]" : "h-[520px]"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b text-sm font-medium">
        <ShieldAlert className="w-4 h-4 text-primary" />
        <span>Secure messaging</span>
        <span className="ml-auto text-xs text-muted-foreground">
          Stays inside PSW Direct
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-xs text-muted-foreground text-center py-8">
            Loading conversation…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8">
            No messages yet. Say hello — but never share phone numbers or email.
          </div>
        ) : (
          messages.map((m) => {
            const isSelf =
              (viewerRole === m.sender_role) ||
              (viewerRole === "admin" && m.sender_role === "admin");
            const isAdminMsg = m.sender_role === "admin";
            const isBlocked = !!m.blocked_reason;
            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  isSelf ? "ml-auto items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    isBlocked
                      ? "bg-destructive/10 text-destructive border border-destructive/30"
                      : isAdminMsg
                      ? "bg-primary/10 text-foreground border border-primary/30"
                      : isSelf
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {m.message_body}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {m.sender_display_name ?? m.sender_role} •{" "}
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isBlocked && viewerRole === "admin" && (
                    <span className="ml-1 text-destructive">
                      [blocked: {m.blocked_reason}]
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {locked ? (
        <div className="border-t p-3 flex items-center gap-2 bg-muted/40 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5" />
          <span>
            {lockedReason ??
              "Messaging is currently unavailable. Contact PSW Direct support if you need help."}
          </span>
        </div>
      ) : (
        <div className="border-t p-2 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message… (no phone numbers or email)"
            rows={2}
            className="resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              Sharing contact info is blocked to keep both sides safe.
            </span>
            <Button size="sm" onClick={handleSend} disabled={sending || !draft.trim()}>
              <Send className="w-3.5 h-3.5 mr-1" />
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
