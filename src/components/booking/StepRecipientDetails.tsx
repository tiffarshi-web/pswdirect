import { User, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CareConditionsChecklist } from "@/components/client/CareConditionsChecklist";
import { detectContactInfo } from "@/lib/careConditions";
import type { GenderPreference } from "@/lib/shiftStore";
import type { ServiceForType } from "./types";

interface StepRecipientDetailsProps {
  serviceFor: ServiceForType;
  patientFirstName: string;
  patientLastName: string;
  patientRelationship: string;
  preferredGender: GenderPreference;
  preferredLanguages: string[];
  careConditions: string[];
  careConditionsOther: string;
  careConditionsOtherError: string | null;
  specialNotes: string;
  specialNotesError: string | null;
  clientEmail: string;
  onFieldChange: (field: string, value: string) => void;
  onLanguagesChange: (langs: string[]) => void;
  onCareConditionsChange: (c: string[]) => void;
  onCareConditionsOtherChange: (text: string) => void;
  onCareConditionsOtherErrorChange: (e: string | null) => void;
  onSpecialNotesErrorChange: (e: string | null) => void;
}

export const StepRecipientDetails = ({
  serviceFor,
  patientFirstName,
  patientLastName,
  patientRelationship,
  preferredGender,
  preferredLanguages,
  careConditions,
  careConditionsOther,
  careConditionsOtherError,
  specialNotes,
  specialNotesError,
  clientEmail,
  onFieldChange,
  onLanguagesChange,
  onCareConditionsChange,
  onCareConditionsOtherChange,
  onCareConditionsOtherErrorChange,
  onSpecialNotesErrorChange,
}: StepRecipientDetailsProps) => {
  const handleSpecialNotesChange = (value: string) => {
    onFieldChange("specialNotes", value);
    const err = detectContactInfo(value);
    onSpecialNotesErrorChange(err);
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {serviceFor === "someone-else" ? "Care Recipient & Preferences" : "Care Preferences"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient Info (only for someone-else) */}
        {serviceFor === "someone-else" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Recipient First Name *</Label>
                <Input
                  placeholder="Margaret"
                  value={patientFirstName}
                  onChange={(e) => onFieldChange("patientFirstName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Recipient Last Name</Label>
                <Input
                  placeholder="Thompson"
                  value={patientLastName}
                  onChange={(e) => onFieldChange("patientLastName", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Your Relationship</Label>
              <Select value={patientRelationship} onValueChange={(v) => onFieldChange("patientRelationship", v)}>
                <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Son/Daughter</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="guardian">Legal Guardian</SelectItem>
                  <SelectItem value="friend">Friend</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Caregiver Preferences */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-sm">Caregiver Preferences (Optional)</h3>
          <div className="space-y-2">
            <Label>Gender Preference</Label>
            <Select value={preferredGender} onValueChange={(v) => onFieldChange("preferredGender", v)}>
              <SelectTrigger><SelectValue placeholder="No preference" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no-preference">No Preference</SelectItem>
                <SelectItem value="female">Female PSW</SelectItem>
                <SelectItem value="male">Male PSW</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language Preference</Label>
            <LanguageSelector
              selectedLanguages={preferredLanguages}
              onLanguagesChange={onLanguagesChange}
              maxLanguages={3}
              label=""
              description="Select languages you'd prefer your caregiver to speak"
              placeholder="Add preferred languages..."
            />
          </div>
        </div>

        {/* Care Conditions */}
        <CareConditionsChecklist
          selectedConditions={careConditions}
          onConditionsChange={onCareConditionsChange}
          otherText={careConditionsOther}
          onOtherTextChange={onCareConditionsOtherChange}
          otherTextError={careConditionsOtherError}
          onOtherTextErrorChange={onCareConditionsOtherErrorChange}
        />

        {/* Special Notes */}
        <div className="space-y-2">
          <Label>Special Instructions (Optional)</Label>
          <Textarea
            placeholder="Entry instructions, parking notes, or other details for the caregiver..."
            value={specialNotes}
            onChange={(e) => handleSpecialNotesChange(e.target.value)}
            className={specialNotesError ? "border-destructive" : ""}
          />
          {specialNotesError && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs text-destructive">{specialNotesError}</span>
            </div>
          )}
        </div>

        {serviceFor === "someone-else" && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> All confirmations, invoices, and care reports will be sent to your email ({clientEmail}).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
