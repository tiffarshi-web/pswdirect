import { useState, useRef } from "react";
import { MapPin, Hospital, Camera, Phone, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPostalCode, isValidCanadianPostalCode } from "@/lib/postalCodeUtils";
import type { ServiceCategory } from "@/lib/taskConfig";
import type { BookingFormData } from "./types";
import { CaregiverAvailabilityBadge } from "./CaregiverAvailabilityBadge";
import { AddressAutocomplete, type ResolvedAddress } from "./AddressAutocomplete";

interface StepLocationProps {
  formData: BookingFormData;
  selectedCategory: ServiceCategory;
  onFieldChange: (field: string, value: string) => void;
  onCheckboxChange: (field: string, value: boolean) => void;
  entryPhoto: File | null;
  onPhotoChange: (file: File | null) => void;
  addressError: string | null;
  postalCodeError: string | null;
  pickupPostalCodeError: string | null;
  isCheckingAddress: boolean;
}

export const StepLocation = ({
  formData,
  selectedCategory,
  onFieldChange,
  onCheckboxChange,
  entryPhoto,
  onPhotoChange,
  addressError,
  postalCodeError,
  pickupPostalCodeError,
  isCheckingAddress,
}: StepLocationProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTransport = selectedCategory === "doctor-appointment" || selectedCategory === "hospital-discharge";
  const isDoctorEscort = selectedCategory === "doctor-appointment";
  const isHospitalDischarge = selectedCategory === "hospital-discharge";

  const handlePostalCodeChange = (value: string) => {
    onFieldChange("postalCode", formatPostalCode(value));
  };

  const handlePickupPostalCodeChange = (value: string) => {
    onFieldChange("pickupPostalCode", formatPostalCode(value));
  };

  const handleDropoffPostalCodeChange = (value: string) => {
    onFieldChange("dropoffPostalCode", formatPostalCode(value));
  };

  // Handle "same as home" toggle for pickup
  const handlePickupSameAsHome = (checked: boolean) => {
    onCheckboxChange("pickupSameAsHome", checked);
    if (checked) {
      const homeAddr = `${formData.streetNumber} ${formData.streetName}`.trim();
      if (formData.unitNumber) {
        onFieldChange("pickupAddress", `${homeAddr}, Unit ${formData.unitNumber}, ${formData.city}, ${formData.province}`);
      } else {
        onFieldChange("pickupAddress", `${homeAddr}, ${formData.city}, ${formData.province}`);
      }
      onFieldChange("pickupPostalCode", formData.postalCode);
    }
  };

  // Handle "same as home" toggle for dropoff
  const handleDropoffSameAsHome = (checked: boolean) => {
    onCheckboxChange("dropoffSameAsHome", checked);
    if (checked) {
      const homeAddr = `${formData.streetNumber} ${formData.streetName}`.trim();
      if (formData.unitNumber) {
        onFieldChange("dropoffAddress", `${homeAddr}, Unit ${formData.unitNumber}, ${formData.city}, ${formData.province}`);
      } else {
        onFieldChange("dropoffAddress", `${homeAddr}, ${formData.city}, ${formData.province}`);
      }
      onFieldChange("dropoffPostalCode", formData.postalCode);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          {isTransport ? "Addresses" : "Service Address"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CaregiverAvailabilityBadge
          postalCode={formData.postalCode}
          city={formData.city}
        />

        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-sm">
            {isTransport ? "Home Address" : "Where should the caregiver go?"}
          </h3>

          <AddressAutocomplete
            id="addressSearch"
            label="Search address"
            placeholder="Start typing — e.g. 175 Rutledge Rd, Mississauga"
            value={`${formData.streetNumber} ${formData.streetName}`.trim()}
            resolvedConfidence={formData.geocodeConfidence ? parseFloat(formData.geocodeConfidence) : null}
            onChange={(v) => {
              if (formData.geocodeLat != null) {
                onFieldChange("geocodeLat", "");
                onFieldChange("geocodeLng", "");
                onFieldChange("geocodeConfidence", "");
              }
              const parts = v.trim().split(/\s+/);
              if (parts.length >= 2 && /^\d+[A-Za-z]?$/.test(parts[0])) {
                onFieldChange("streetNumber", parts[0]);
                onFieldChange("streetName", parts.slice(1).join(" "));
              } else {
                onFieldChange("streetName", v);
              }
            }}
            onResolved={(r) => {
              if (r.streetNumber) onFieldChange("streetNumber", r.streetNumber);
              if (r.streetName) onFieldChange("streetName", r.streetName);
              if (r.city) onFieldChange("city", r.city);
              if (r.province) onFieldChange("province", r.province);
              if (r.postalCode) onFieldChange("postalCode", formatPostalCode(r.postalCode));
              onFieldChange("geocodeLat", String(r.lat));
              onFieldChange("geocodeLng", String(r.lng));
              onFieldChange("geocodeConfidence", String(r.confidence));
              onFieldChange("geocodeSource", "client_autocomplete");
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="streetNumber">Street Number *</Label>
              <Input
                id="streetNumber"
                placeholder="123"
                value={formData.streetNumber}
                onChange={(e) => onFieldChange("streetNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="streetName">Street Name *</Label>
              <Input
                id="streetName"
                placeholder="Main Street"
                value={formData.streetName}
                onChange={(e) => onFieldChange("streetName", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="unitNumber">Unit / Suite / Apt #</Label>
              <Input
                id="unitNumber"
                placeholder="Unit 4B"
                value={formData.unitNumber}
                onChange={(e) => onFieldChange("unitNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="Belleville"
                value={formData.city}
                onChange={(e) => onFieldChange("city", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Select value={formData.province} onValueChange={(v) => onFieldChange("province", v)}>
                <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ON">Ontario</SelectItem>
                  <SelectItem value="QC">Quebec</SelectItem>
                  <SelectItem value="BC">British Columbia</SelectItem>
                  <SelectItem value="AB">Alberta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code *</Label>
              <Input
                id="postalCode"
                placeholder="K8N 1A1"
                value={formData.postalCode}
                onChange={(e) => handlePostalCodeChange(e.target.value)}
                maxLength={7}
                className={postalCodeError ? "border-destructive" : ""}
              />
              {postalCodeError && <p className="text-xs text-destructive">{postalCodeError}</p>}
            </div>
          </div>

          {/* Entry details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="buzzerCode">Buzzer Code</Label>
              <Input
                id="buzzerCode"
                placeholder="#1234"
                value={formData.buzzerCode}
                onChange={(e) => onFieldChange("buzzerCode", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entryPoint">Entry Point</Label>
              <Select value={formData.entryPoint} onValueChange={(v) => onFieldChange("entryPoint", v)}>
                <SelectTrigger><SelectValue placeholder="Select entry" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="front-door">Front Door</SelectItem>
                  <SelectItem value="side-door">Side Door</SelectItem>
                  <SelectItem value="back-door">Back Door</SelectItem>
                  <SelectItem value="concierge">Concierge / Lobby</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Photo upload */}
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => onPhotoChange(e.target.files?.[0] || null)} className="hidden" />
            <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
              <Camera className="w-4 h-4 mr-2" />
              {entryPhoto ? entryPhoto.name : "Upload Entry Photo"}
            </Button>
            {entryPhoto && (
              <Button variant="ghost" size="sm" onClick={() => onPhotoChange(null)} className="text-destructive">Remove</Button>
            )}
          </div>
        </div>

        {/* Transport: facility + destination */}
        {isTransport && (
          <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Hospital className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-foreground">
                {isDoctorEscort ? "Doctor / Clinic" : "Pickup — Hospital"}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">
              {isDoctorEscort
                ? "The client is collected at the home address above, then escorted to this appointment."
                : "Where the caregiver collects the patient. The destination below is where they are taken afterwards."}
            </p>

            <div className="space-y-2">
              <Label>{isDoctorEscort ? "Doctor / Clinic Name *" : "Hospital Name *"}</Label>
              <Input
                placeholder={isDoctorEscort ? "Dr. Smith Family Clinic" : "e.g., Belleville General Hospital"}
                value={formData.facilityName}
                onChange={(e) => onFieldChange("facilityName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{isDoctorEscort ? "Clinic Address *" : "Hospital Address *"}</Label>
              <Input
                placeholder={isDoctorEscort ? "e.g., 123 King St W, Belleville" : "e.g., 265 Dundas St E, Belleville"}
                value={formData.pickupAddress}
                onChange={(e) => onFieldChange("pickupAddress", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{isDoctorEscort ? "Clinic Postal Code *" : "Hospital Postal Code *"}</Label>
              <Input
                placeholder="K8N 1A1"
                value={formData.pickupPostalCode}
                onChange={(e) => handlePickupPostalCodeChange(e.target.value)}
                maxLength={7}
                className={pickupPostalCodeError ? "border-destructive" : ""}
              />
              {pickupPostalCodeError && <p className="text-xs text-destructive">{pickupPostalCodeError}</p>}
            </div>
            <div className="space-y-2">
              <Label>{isDoctorEscort ? "Suite / Floor / Department" : "Department / Unit / Floor / Room"}</Label>
              <Input
                placeholder={isDoctorEscort ? "Suite 200" : "e.g., 4 West, Room 412"}
                value={formData.facilityUnit}
                onChange={(e) => onFieldChange("facilityUnit", e.target.value)}
              />
            </div>
            {isDoctorEscort && (
              <div className="space-y-2">
                <Label>Appointment Time (if different from start time)</Label>
                <Input
                  placeholder="e.g., 2:30 PM"
                  value={formData.appointmentTime}
                  onChange={(e) => onFieldChange("appointmentTime", e.target.value)}
                />
              </div>
            )}
            {isHospitalDischarge && (
              <div className="space-y-2">
                <Label>Patient Pickup Instructions</Label>
                <Textarea
                  placeholder="e.g., Ask for the discharge nurse at the east entrance"
                  value={formData.pickupInstructions}
                  onChange={(e) => onFieldChange("pickupInstructions", e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {/* Destination / return */}
            <div className="pt-3 border-t border-blue-200 dark:border-blue-700 space-y-4">
              <h4 className="font-medium text-foreground text-sm">
                {isDoctorEscort ? "Return Destination" : "Destination — Home"}
              </h4>

              {isDoctorEscort && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isRoundTrip"
                    checked={formData.isRoundTrip}
                    onCheckedChange={(c) => onCheckboxChange("isRoundTrip", c as boolean)}
                  />
                  <Label htmlFor="isRoundTrip" className="text-sm cursor-pointer">
                    Round trip — return the client to the home address above
                  </Label>
                </div>
              )}

              {isHospitalDischarge && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="dropoffSameAsHome"
                    checked={formData.dropoffSameAsHome}
                    onCheckedChange={(c) => handleDropoffSameAsHome(c as boolean)}
                  />
                  <Label htmlFor="dropoffSameAsHome" className="text-sm cursor-pointer">
                    Destination is same as home address
                  </Label>
                </div>
              )}

              {(isHospitalDischarge || !formData.isRoundTrip) && (
                <>
                  <div className="space-y-2">
                    <Label>Destination Address {isHospitalDischarge ? "*" : ""}</Label>
                    <Input
                      placeholder="Home or destination address"
                      value={formData.dropoffAddress}
                      onChange={(e) => onFieldChange("dropoffAddress", e.target.value)}
                      disabled={formData.dropoffSameAsHome}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Destination Postal Code {isHospitalDischarge ? "*" : ""}</Label>
                    <Input
                      placeholder="K8N 1A1"
                      value={formData.dropoffPostalCode}
                      onChange={(e) => handleDropoffPostalCodeChange(e.target.value)}
                      maxLength={7}
                      disabled={formData.dropoffSameAsHome}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}



        {/* Privacy note */}
        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Privacy Note:</strong> PSWs are instructed to only use the office line for access issues.
          </p>
        </div>

        {/* Errors */}
        {isCheckingAddress && <p className="text-sm text-muted-foreground">Verifying address coverage...</p>}
        {addressError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{addressError}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
