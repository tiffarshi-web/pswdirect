import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";

interface Props {
  bookingId: string;
}

export const CommunicationSessionPanel = ({ bookingId }: Props) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("communication_sessions")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setSession(data);
      setLoading(false);
    };
    fetch();
  }, [bookingId]);

  if (loading) return null;

  if (!session) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Phone className="w-3.5 h-3.5" />
        <span>No communication session</span>
      </div>
    );
  }

  const statusColor = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    active: "bg-green-100 text-green-700 border-green-300",
    expired: "bg-gray-100 text-gray-600 border-gray-300",
  }[session.status as string] || "bg-muted text-muted-foreground";

  return (
    <div className="flex items-center gap-2">
      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Comm Session:</span>
      <Badge variant="outline" className={`text-xs ${statusColor}`}>
        {session.status}
      </Badge>
    </div>
  );
};
