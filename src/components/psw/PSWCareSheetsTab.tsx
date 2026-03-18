import { useState, useEffect, useMemo } from "react";
import { FileText, CheckCircle2, Clock, AlertCircle, ArrowLeft, Save, Send } from "lucide-react";
import { CareSheetDocUpload } from "./CareSheetDocUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type CareSheetData } from "@/lib/shiftStore";
import { checkPSWPrivacy } from "@/lib/privacyFilter";
import { fetchOfficeNumber, DEFAULT_OFFICE_NUMBER } from "@/lib/messageTemplates";
import { sendVisitSummaryEmail } from "@/lib/notificationService";
import { getFirstNameOnly } from "@/lib/privacyUtils";
import { format } from "date-fns";

interface CareSheetBooking {
  id: string;
  booking_code: string;
  client_name: string;
  client_email: string;
  patient_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  service_type: string[];
  care_sheet: CareSheetData | null;
  care_sheet_status: string;
  care_sheet_submitted_at: string | null;
  care_sheet_last_saved_at: string | null;
  psw_first_name: string | null;
}

const moodOptions = [
  { value: "happy", label: "Happy" },
  { value: "content", label: "Content" },
  { value: "neutral", label: "Neutral" },
  { value: "anxious", label: "Anxious" },
  { value: "sad", label: "Sad" },
  { value: "agitated", label: "Agitated" },
];

export const PSWCareSheetsTab = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<CareSheetBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<CareSheetBooking | null>(null);
  const [officeNumber, setOfficeNumber] = useState(DEFAULT_OFFICE_NUMBER);

  // Form state
  const [moodOnArrival, setMoodOnArrival] = useState("");
  const [moodOnDeparture, setMoodOnDeparture] = useState("");
  const [tasksCompleted, setTasksCompleted] = useState<string[]>([]);
  const [observations, setObservations] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; url: string; type: string; size: number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pswProfileId, setPswProfileId] = useState<string>("");

  const pswFirstName = useMemo(() => {
    const name = user?.name || "PSW";
    return name.split(" ")[0];
  }, [user]);

  const privacyCheck = useMemo(() => checkPSWPrivacy(observations), [observations]);

  useEffect(() => {
    fetchOfficeNumber().then(setOfficeNumber);
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user?.email) return;
    setIsLoading(true);

    try {
      // Get PSW profile ID
      const { data: profile } = await supabase
        .from("psw_profiles")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!profile) {
        setIsLoading(false);
        return;
      }
      setPswProfileId(profile.id);

      // Fetch bookings assigned to this PSW that are completed or in-progress
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, client_name, client_email, patient_name, scheduled_date, start_time, end_time, service_type, care_sheet, care_sheet_status, care_sheet_submitted_at, care_sheet_last_saved_at, psw_first_name")
        .eq("psw_assigned", profile.id)
        .in("status", ["completed", "in-progress", "active"])
        .order("scheduled_date", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching care sheet bookings:", error);
      } else {
        setBookings((data || []).map(b => ({
          ...b,
          care_sheet: b.care_sheet as unknown as CareSheetData | null,
          care_sheet_status: (b as any).care_sheet_status || "missing",
          care_sheet_last_saved_at: (b as any).care_sheet_last_saved_at || null,
        })));
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const openBooking = (booking: CareSheetBooking) => {
    setSelectedBooking(booking);
    // Load existing care sheet data
    if (booking.care_sheet) {
      setMoodOnArrival(booking.care_sheet.moodOnArrival || "");
      setMoodOnDeparture(booking.care_sheet.moodOnDeparture || "");
      setTasksCompleted(booking.care_sheet.tasksCompleted || []);
      setObservations(booking.care_sheet.observations || "");
      setUploadedDocs((booking.care_sheet as any).uploadedDocuments || []);
    } else {
      setMoodOnArrival("");
      setMoodOnDeparture("");
      setTasksCompleted([]);
      setObservations("");
      setUploadedDocs([]);
    }
  };

  const handleBack = () => {
    setSelectedBooking(null);
  };

  const handleTaskToggle = (task: string, checked: boolean) => {
    if (checked) {
      setTasksCompleted(prev => [...prev, task]);
    } else {
      setTasksCompleted(prev => prev.filter(t => t !== task));
    }
  };

  const isSpecialtyShift = useMemo(() => {
    if (!selectedBooking) return false;
    const specialtyKeywords = ["doctor escort", "hospital discharge", "hospital", "discharge"];
    return selectedBooking.service_type.some(s =>
      specialtyKeywords.some(k => s.toLowerCase().includes(k))
    );
  }, [selectedBooking]);

  const buildCareSheetData = (): CareSheetData => ({
    moodOnArrival,
    moodOnDeparture,
    tasksCompleted,
    observations,
    pswFirstName,
    officeNumber,
    ...(isSpecialtyShift && uploadedDocs.length > 0 ? { uploadedDocuments: uploadedDocs } as any : {}),
  });

  const handleSaveDraft = async () => {
    if (!selectedBooking) return;
    setIsSaving(true);

    try {
      const careSheet = buildCareSheetData();
      const { error } = await supabase
        .from("bookings")
        .update({
          care_sheet: careSheet as any,
          care_sheet_status: "draft",
          care_sheet_last_saved_at: new Date().toISOString(),
          care_sheet_psw_name: pswFirstName,
        })
        .eq("id", selectedBooking.id);

      if (error) throw error;

      toast.success("Draft saved");
      // Update local state
      setBookings(prev => prev.map(b =>
        b.id === selectedBooking.id
          ? { ...b, care_sheet: careSheet, care_sheet_status: "draft", care_sheet_last_saved_at: new Date().toISOString() }
          : b
      ));
      setSelectedBooking(prev => prev ? { ...prev, care_sheet: careSheet, care_sheet_status: "draft" } : null);
    } catch (err) {
      console.error("Error saving draft:", err);
      toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBooking) return;
    if (!moodOnArrival || !moodOnDeparture || tasksCompleted.length === 0) {
      toast.error("Please complete all required fields");
      return;
    }
    if (privacyCheck.shouldBlock) {
      toast.error("Please remove personal contact information from observations");
      return;
    }

    setIsSubmitting(true);

    try {
      const careSheet = buildCareSheetData();
      const now = new Date().toISOString();

      // Server-side contact detection (non-blocking)
      const { scanCareSheet, flagCareSheet } = await import("@/lib/careSheetDetection");
      const detection = scanCareSheet(careSheet);

      const { error } = await supabase
        .from("bookings")
        .update({
          care_sheet: careSheet as any,
          care_sheet_status: "submitted",
          care_sheet_submitted_at: now,
          care_sheet_last_saved_at: now,
          care_sheet_psw_name: pswFirstName,
          ...(detection.flagged ? { care_sheet_flagged: true, care_sheet_flag_reason: detection.patterns } : {}),
        } as any)
        .eq("id", selectedBooking.id);

      if (error) throw error;

      // Log audit if flagged
      if (detection.flagged) {
        const { data: profile } = await supabase
          .from("psw_profiles")
          .select("id")
          .eq("email", user?.email || "")
          .single();
        if (profile) {
          flagCareSheet(selectedBooking.id, profile.id, detection);
        }
      }

      // Send visit summary email to client
      await sendVisitSummaryEmail(
        selectedBooking.client_email,
        selectedBooking.client_name,
        pswFirstName,
        selectedBooking.scheduled_date,
        selectedBooking.start_time,
        selectedBooking.end_time,
        careSheet.tasksCompleted,
        careSheet.observations,
        officeNumber
      );

      toast.success("Care sheet submitted and visit summary sent to client");

      // Update local state
      setBookings(prev => prev.map(b =>
        b.id === selectedBooking.id
          ? { ...b, care_sheet: careSheet, care_sheet_status: "submitted", care_sheet_submitted_at: now }
          : b
      ));
      setSelectedBooking(null);
    } catch (err) {
      console.error("Error submitting care sheet:", err);
      toast.error("Failed to submit care sheet");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-primary/10 text-primary border-primary/20"><CheckCircle2 className="w-3 h-3 mr-1" />Submitted</Badge>;
      case "draft":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      default:
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="w-3 h-3 mr-1" />Needs Completion</Badge>;
    }
  };

  // Detail form view
  if (selectedBooking) {
    const isLocked = selectedBooking.care_sheet_status === "submitted";
    const isValid = moodOnArrival && moodOnDeparture && tasksCompleted.length > 0 && !privacyCheck.shouldBlock;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">Care Sheet</h2>
            <p className="text-sm text-muted-foreground">
              {selectedBooking.booking_code} • {selectedBooking.scheduled_date}
            </p>
          </div>
          {getStatusBadge(selectedBooking.care_sheet_status)}
        </div>

        {isLocked ? (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground">Care Sheet Submitted</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Visit summary was sent to the client on {selectedBooking.care_sheet_submitted_at
                    ? format(new Date(selectedBooking.care_sheet_submitted_at), "MMM d, yyyy 'at' h:mm a")
                    : "submission"}.
                </p>
              </div>

              {selectedBooking.care_sheet && (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Mood on Arrival</Label>
                    <p className="text-sm capitalize">{selectedBooking.care_sheet.moodOnArrival}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Mood on Departure</Label>
                    <p className="text-sm capitalize">{selectedBooking.care_sheet.moodOnDeparture}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Tasks Completed</Label>
                    <ul className="text-sm list-disc list-inside">
                      {selectedBooking.care_sheet.tasksCompleted.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                  {selectedBooking.care_sheet.observations && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Observations</Label>
                      <p className="text-sm">{selectedBooking.care_sheet.observations}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 space-y-5">
              {/* Client Info */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm"><span className="text-muted-foreground">Client:</span> {getFirstNameOnly(selectedBooking.client_name)}</p>
                <p className="text-sm"><span className="text-muted-foreground">Date:</span> {selectedBooking.scheduled_date}</p>
                <p className="text-sm"><span className="text-muted-foreground">Time:</span> {selectedBooking.start_time} – {selectedBooking.end_time}</p>
              </div>

              {/* Mood Assessment */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-foreground">Client Assessment</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Mood on Arrival <span className="text-destructive">*</span></Label>
                    <Select value={moodOnArrival} onValueChange={setMoodOnArrival}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {moodOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mood on Departure <span className="text-destructive">*</span></Label>
                    <Select value={moodOnDeparture} onValueChange={setMoodOnDeparture}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {moodOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-foreground">Tasks Completed <span className="text-destructive">*</span></h3>
                <div className="space-y-2">
                  {selectedBooking.service_type.map((service) => (
                    <div key={service} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50">
                      <Checkbox
                        id={`cs-task-${service}`}
                        checked={tasksCompleted.includes(service)}
                        onCheckedChange={(checked) => handleTaskToggle(service, checked === true)}
                      />
                      <Label htmlFor={`cs-task-${service}`} className="flex-1 cursor-pointer text-sm">
                        {service}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Upload for Specialty Shifts */}
              {isSpecialtyShift && (
                <CareSheetDocUpload
                  bookingId={selectedBooking.id}
                  pswId={pswProfileId}
                  uploadedDocs={uploadedDocs}
                  onDocsChange={setUploadedDocs}
                  disabled={false}
                />
              )}

              {/* Observations */}
              <div className="space-y-1">
                <Label className="text-xs">Observations / Notes</Label>
                <Textarea
                  placeholder="Document observations, client condition, concerns..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="min-h-[100px]"
                />
                {privacyCheck.shouldBlock && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {privacyCheck.message} Use office number ({officeNumber}).
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSaveDraft}
                  disabled={isSaving || isSubmitting}
                >
                  <Save className="w-4 h-4 mr-1" />
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!isValid || isSubmitting || isSaving}
                >
                  <Send className="w-4 h-4 mr-1" />
                  {isSubmitting ? "Submitting..." : "Submit & Email"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Submitting will send a visit summary to the client (first name only, no personal contact info).
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Care Sheets</h2>
        <p className="text-sm text-muted-foreground">Complete and manage visit care sheets</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No bookings found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking) => (
            <Card
              key={booking.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openBooking(booking)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {getFirstNameOnly(booking.client_name)}
                    </span>
                    <span className="text-xs text-muted-foreground">{booking.booking_code}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {booking.scheduled_date} • {booking.start_time}–{booking.end_time}
                  </p>
                </div>
                {getStatusBadge(booking.care_sheet_status)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
