import { useState, useRef, useEffect, useMemo } from "react";
import { FileText, AlertCircle, Send, CheckCircle2, Upload, Hospital, X, Phone, Shield, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CareSheetData } from "@/lib/shiftStore";
import { DEFAULT_OFFICE_NUMBER } from "@/lib/messageTemplates";
import { checkPSWPrivacy } from "@/lib/privacyFilter";

export type CareSheetDraftStatus = "idle" | "saving" | "saved" | "error";

interface CareSheetDraftFields {
  moodOnArrival: string;
  moodOnDeparture: string;
  tasksCompleted: string[];
  observations: string;
  isHospitalDischarge: boolean;
  dischargeNotes: string;
}

interface PSWCareSheetProps {
  services: string[];
  pswFirstName: string;
  onSubmit: (careSheet: CareSheetData) => void;
  isSubmitting?: boolean;
  officeNumber?: string;
  // Doctor/Hospital info from booking (visible to PSW for coordination)
  doctorOfficeName?: string;
  doctorPhone?: string;
  // Server-hydrated initial draft (loaded via psw_safe_booking_view, never localStorage).
  initialDraft?: Partial<CareSheetData> | null;
  // Debounced draft change handler — parent persists via authenticated RPC.
  // No care-sheet clinical text is ever written to localStorage/sessionStorage/cookies.
  onDraftChange?: (draft: CareSheetDraftFields) => void;
  draftStatus?: CareSheetDraftStatus;
}

/**
 * Safely hydrate a care-sheet draft from any legacy / partial / null / malformed
 * server payload. This must NEVER throw and NEVER expose unknown keys back into
 * state — a PSW with a corrupt draft must still be able to open, edit, and
 * submit their report.
 *
 * Approved fields ONLY:
 *   moodOnArrival, moodOnDeparture, tasksCompleted, observations,
 *   pswFirstName, officeNumber, isHospitalDischarge, dischargeNotes.
 */
const normalizeCareSheet = (raw: unknown): {
  moodOnArrival: string;
  moodOnDeparture: string;
  tasksCompleted: string[];
  observations: string;
  pswFirstName: string;
  officeNumber: string;
  isHospitalDischarge: boolean;
  dischargeNotes: string;
} => {
  const defaults = {
    moodOnArrival: "",
    moodOnDeparture: "",
    tasksCompleted: [] as string[],
    observations: "",
    pswFirstName: "",
    officeNumber: "",
    isHospitalDischarge: false,
    dischargeNotes: "",
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const src = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const bool = (v: unknown) => v === true;
  const tasks = Array.isArray(src.tasksCompleted)
    ? (src.tasksCompleted as unknown[]).filter((t): t is string => typeof t === "string")
    : [];
  return {
    moodOnArrival: str(src.moodOnArrival),
    moodOnDeparture: str(src.moodOnDeparture),
    tasksCompleted: tasks,
    observations: str(src.observations),
    pswFirstName: str(src.pswFirstName),
    officeNumber: str(src.officeNumber),
    isHospitalDischarge: bool(src.isHospitalDischarge),
    dischargeNotes: str(src.dischargeNotes),
  };
};

export const PSWCareSheet = ({
  services,
  pswFirstName,
  onSubmit,
  isSubmitting = false,
  officeNumber = DEFAULT_OFFICE_NUMBER,
  doctorOfficeName,
  doctorPhone,
  initialDraft = null,
  onDraftChange,
  draftStatus = "idle",
}: PSWCareSheetProps) => {
  // Never crash on null / older-version / partially populated / malformed drafts.
  const normalized = useMemo(() => normalizeCareSheet(initialDraft), [initialDraft]);

  const [moodOnArrival, setMoodOnArrival] = useState(normalized.moodOnArrival);
  const [moodOnDeparture, setMoodOnDeparture] = useState(normalized.moodOnDeparture);
  const [tasksCompleted, setTasksCompleted] = useState<string[]>(normalized.tasksCompleted);
  const [observations, setObservations] = useState(normalized.observations);

  // Hospital Discharge Protocol
  const [isHospitalDischarge, setIsHospitalDischarge] = useState(normalized.isHospitalDischarge);
  const [dischargeDocuments, setDischargeDocuments] = useState<string>("");
  const [dischargeFileName, setDischargeFileName] = useState<string>("");
  const [dischargeNotes, setDischargeNotes] = useState(normalized.dischargeNotes);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notify parent of draft changes (parent debounces + saves via secure RPC).
  // We intentionally do NOT persist any clinical text to localStorage.
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (!onDraftChange) return;
    if (firstRunRef.current) { firstRunRef.current = false; return; }
    onDraftChange({
      moodOnArrival, moodOnDeparture, tasksCompleted, observations,
      isHospitalDischarge, dischargeNotes,
    });
  }, [moodOnArrival, moodOnDeparture, tasksCompleted, observations, isHospitalDischarge, dischargeNotes, onDraftChange]);


  // Use privacy filter for PSW-specific blocking
  const privacyCheck = useMemo(() => checkPSWPrivacy(observations), [observations]);
  
  // Hospital discharge requires document upload
  const isDischargeValid = !isHospitalDischarge || (isHospitalDischarge && dischargeDocuments);
  const isValid = moodOnArrival && moodOnDeparture && tasksCompleted.length > 0 && !privacyCheck.shouldBlock && isDischargeValid;

  const handleTaskToggle = (task: string, checked: boolean) => {
    if (checked) {
      setTasksCompleted(prev => [...prev, task]);
    } else {
      setTasksCompleted(prev => prev.filter(t => t !== task));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (images and PDFs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload an image (JPEG, PNG) or PDF file.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB.");
      return;
    }

    // Convert to base64 for storage
    const reader = new FileReader();
    reader.onload = () => {
      setDischargeDocuments(reader.result as string);
      setDischargeFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setDischargeDocuments("");
    setDischargeFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!isValid) return;

    const careSheet: CareSheetData = {
      moodOnArrival,
      moodOnDeparture,
      tasksCompleted,
      observations,
      pswFirstName,
      officeNumber,
      // Hospital Discharge data
      isHospitalDischarge,
      dischargeDocuments: isHospitalDischarge ? dischargeDocuments : undefined,
      dischargeNotes: isHospitalDischarge ? dischargeNotes : undefined,
    };

    onSubmit(careSheet);
  };

  const moodOptions = [
    { value: "happy", label: "Happy" },
    { value: "content", label: "Content" },
    { value: "neutral", label: "Neutral" },
    { value: "anxious", label: "Anxious" },
    { value: "sad", label: "Sad" },
    { value: "agitated", label: "Agitated" },
  ];

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Client Care Sheet
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete this form before signing out. It will be emailed to the ordering client.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mandatory Completion Warning Banner */}
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">Required Before Sign-Out</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            You must complete this care sheet before ending your shift. It will be sent to the ordering client.
          </AlertDescription>
        </Alert>
        {/* Doctor/Hospital Contact Info (visible to PSW for coordination) */}
        {doctorOfficeName && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
              <Hospital className="w-4 h-4" />
              <span className="font-medium">{doctorOfficeName}</span>
            </div>
            {doctorPhone && (
              <a 
                href={`tel:${doctorPhone}`}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mt-1 hover:underline"
              >
                <Phone className="w-3 h-3" />
                {doctorPhone}
              </a>
            )}
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Contact for medical coordination if needed
            </p>
          </div>
        )}

        {/* Mood Assessment */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">Client Assessment</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mood on Arrival <span className="text-destructive">*</span></Label>
              <Select value={moodOnArrival} onValueChange={setMoodOnArrival}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {moodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mood on Departure <span className="text-destructive">*</span></Label>
              <Select value={moodOnDeparture} onValueChange={setMoodOnDeparture}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {moodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tasks Completed (based on order) */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">
            Tasks Completed <span className="text-destructive">*</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Check all services you provided during this visit
          </p>
          <div className="grid grid-cols-1 gap-3">
            {services.map((service) => (
              <div key={service} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`task-${service}`}
                  checked={tasksCompleted.includes(service)}
                  onCheckedChange={(checked) => handleTaskToggle(service, checked === true)}
                />
                <Label 
                  htmlFor={`task-${service}`} 
                  className="flex-1 cursor-pointer font-medium"
                >
                  {service}
                </Label>
                {tasksCompleted.includes(service) && (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                )}
              </div>
            ))}
          </div>
          {tasksCompleted.length === 0 && (
            <p className="text-sm text-destructive">Please select at least one task completed</p>
          )}
        </div>

        {/* Hospital Discharge Protocol */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <Hospital className="w-5 h-5 text-amber-600" />
              <div>
                <Label htmlFor="hospital-discharge" className="font-medium cursor-pointer">
                  Hospital/Doctor Discharge?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable if patient was discharged from hospital or doctor's office today
                </p>
              </div>
            </div>
            <Switch
              id="hospital-discharge"
              checked={isHospitalDischarge}
              onCheckedChange={setIsHospitalDischarge}
            />
          </div>

          {isHospitalDischarge && (
            <div className="space-y-4 p-4 rounded-lg border-2 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium text-sm">Discharge Documentation Required</span>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label>
                  Upload Discharge Papers <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Take a photo or upload the discharge documents (PDF, JPEG, PNG - max 10MB)
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {!dischargeDocuments ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-20 border-dashed border-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Tap to take photo or upload file
                      </span>
                    </div>
                  </Button>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {dischargeFileName}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                {isHospitalDischarge && !dischargeDocuments && (
                  <p className="text-sm text-destructive">
                    Discharge papers are required for hospital/doctor discharges
                  </p>
                )}
              </div>

              {/* Private Notes (Admin only) */}
              <div className="space-y-2">
                <Label>Private Notes (Admin only)</Label>
                <Textarea
                  placeholder="Any additional notes about the discharge for admin review..."
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  These notes are only visible to admin and will not be shared with the client.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Observations/Notes */}
        <div className="space-y-2">
          <Label>Observations / Notes</Label>
          <Textarea
            placeholder="Document any observations, client condition, activities, or concerns..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="min-h-[120px]"
          />
          
          {privacyCheck.shouldBlock && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                {privacyCheck.message} Use the office number ({officeNumber}) for all follow-ups.
              </p>
            </div>
          )}
        </div>

        {/* Enhanced Privacy Notice */}
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-300 text-sm">Your Privacy is Protected</p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  This care sheet will only show your first name (<strong>{pswFirstName}</strong>) and the 
                  office contact number (<strong>{officeNumber}</strong>). Your last name and personal 
                  phone number are never shared with clients.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Draft save status — draft persists on the server only, never in browser storage */}
        {onDraftChange && (
          <p className="text-xs text-center text-muted-foreground" aria-live="polite">
            {draftStatus === "saving" && (<><Loader2 className="inline w-3 h-3 mr-1 animate-spin" />Saving…</>)}
            {draftStatus === "saved" && "Draft saved"}
            {draftStatus === "error" && (
              <span className="text-destructive">Could not save — keep this screen open and retry.</span>
            )}
          </p>
        )}


        {/* Submit Button */}
        <Button
          variant="brand"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Sign Out & Send Care Sheet
            </>
          )}
        </Button>

        {!isValid && (
          <p className="text-sm text-center text-muted-foreground">
            Please complete all required fields to sign out
          </p>
        )}
      </CardContent>
    </Card>
  );
};
