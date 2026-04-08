import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MapPin, Phone, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PendingJob {
  id: string;
  clientFirstName: string;
  serviceType: string[];
  scheduledDate: string;
  startTime: string;
  endTime: string;
  city: string;
}

interface PSWCandidate {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  phone: string;
  email: string;
  homeLat: number | null;
  homeLng: number | null;
  hasOverlap: boolean;
}

interface AssignPSWDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: PendingJob | null;
  onAssigned: () => void;
}

export const AssignPSWDialog = ({ open, onOpenChange, job, onAssigned }: AssignPSWDialogProps) => {
  const [search, setSearch] = useState("");
  const [psws, setPSWs] = useState<PSWCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (open && job) {
      loadPSWs();
      setSearch("");
    }
  }, [open, job]);

  const loadPSWs = async () => {
    if (!job) return;
    setLoading(true);
    try {
      const { data: pswData, error } = await supabase
        .from("psw_profiles")
        .select("id, first_name, last_name, home_city, phone, email, home_lat, home_lng")
        .eq("vetting_status", "approved")
        .eq("is_test", false)
        .order("first_name");

      if (error) throw error;

      // Check for shift overlaps on the same date
      const { data: overlaps } = await supabase
        .from("bookings")
        .select("psw_assigned, start_time, end_time")
        .eq("scheduled_date", job.scheduledDate)
        .in("status", ["active", "confirmed", "in-progress"])
        .not("psw_assigned", "is", null);

      const overlappingPswIds = new Set<string>();
      (overlaps || []).forEach((b) => {
        if (b.psw_assigned && timesOverlap(job.startTime, job.endTime, b.start_time, b.end_time)) {
          overlappingPswIds.add(b.psw_assigned);
        }
      });

      const candidates: PSWCandidate[] = (pswData || []).map((p) => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        city: p.home_city || "Unknown",
        phone: p.phone || "",
        email: p.email,
        homeLat: p.home_lat ? Number(p.home_lat) : null,
        homeLng: p.home_lng ? Number(p.home_lng) : null,
        hasOverlap: overlappingPswIds.has(p.id),
      }));

      setPSWs(candidates);
    } catch (err: any) {
      console.error("Error loading PSWs for assignment:", err);
      toast.error("Failed to load PSW list");
    } finally {
      setLoading(false);
    }
  };

  const timesOverlap = (s1: string, e1: string, s2: string, e2: string) => {
    return s1 < e2 && s2 < e1;
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return psws;
    const q = search.toLowerCase();
    return psws.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [psws, search]);

  const handleAssign = async (psw: PSWCandidate) => {
    if (!job) return;
    setAssigning(psw.id);
    try {
      // Update booking: assign PSW, set status to active
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          psw_assigned: psw.id,
          psw_first_name: psw.firstName,
          status: "active",
          claimed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (bookingError) throw bookingError;

      // Update dispatch_logs if exists
      const { data: booking } = await supabase
        .from("bookings")
        .select("booking_code")
        .eq("id", job.id)
        .single();

      if (booking?.booking_code) {
        await supabase
          .from("dispatch_logs")
          .update({
            claimed_by_psw_id: psw.id,
            claimed_at: new Date().toISOString(),
            admin_assigned: true,
            admin_assigned_at: new Date().toISOString(),
            notes: `Manual admin assignment from Coverage Map`,
          })
          .eq("booking_code", booking.booking_code);
      }

      // Remove from unserved_orders if present
      await supabase
        .from("unserved_orders")
        .update({ status: "RESOLVED", admin_notes: `Manually assigned to ${psw.firstName} ${psw.lastName} from Coverage Map` })
        .eq("booking_id", job.id);

      // Fetch booking details + PSW details for email
      const [{ data: bookingDetails }, { data: pswDetails }] = await Promise.all([
        supabase
          .from("bookings")
          .select("client_email, client_first_name, booking_code, scheduled_date, start_time, end_time, service_type")
          .eq("id", job.id)
          .single(),
        supabase
          .from("psw_profiles")
          .select("gender, languages")
          .eq("id", psw.id)
          .single(),
      ]);

      // Send PSW Assigned email to client
      if (bookingDetails?.client_email) {
        const { sendPSWAssignedNotification } = await import("@/lib/notificationService");
        sendPSWAssignedNotification(
          bookingDetails.client_email,
          bookingDetails.client_first_name || job.clientFirstName || "Valued Client",
          bookingDetails.booking_code || job.id,
          bookingDetails.scheduled_date || job.scheduledDate,
          bookingDetails.start_time || job.startTime,
          bookingDetails.end_time || job.endTime,
          bookingDetails.service_type || job.serviceType || [],
          psw.firstName,
          pswDetails?.gender,
          pswDetails?.languages,
        );
      }

      // Send notification to PSW
      await supabase.from("notifications").insert({
        user_email: psw.email,
        title: "📋 New Shift Assigned",
        body: `You have been assigned a shift on ${job.scheduledDate} (${job.startTime}–${job.endTime}). Please check your dashboard for details.`,
        type: "shift_assigned",
      });

      toast.success(`Assigned to ${psw.firstName} ${psw.lastName}`);
      onOpenChange(false);
      onAssigned();
    } catch (err: any) {
      console.error("Assignment error:", err);
      toast.error("Failed to assign PSW");
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Assign PSW to Job</DialogTitle>
          {job && (
            <DialogDescription>
              {job.clientFirstName} · {job.serviceType.join(", ") || "General Care"} · {job.scheduledDate} · {job.startTime}–{job.endTime}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, phone, or PSW ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[350px] pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No PSWs found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((psw) => (
                <div
                  key={psw.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {psw.firstName} {psw.lastName}
                      </p>
                      {psw.hasOverlap && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Overlap
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {psw.city}
                      </span>
                      {psw.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {psw.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={psw.hasOverlap ? "outline" : "default"}
                    onClick={() => handleAssign(psw)}
                    disabled={assigning === psw.id}
                    className="shrink-0"
                  >
                    {assigning === psw.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Assign"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
