// PSW Database Store - Manages PSW profiles with Supabase backend
// This replaces the localStorage-based pswProfileStore for production use

import { supabase } from "@/integrations/supabase/client";

export type VettingStatus = "pending" | "approved" | "rejected";
export type PSWGender = "female" | "male" | "other" | "prefer-not-to-say";

export interface VehicleDisclaimerAcceptance {
  accepted: boolean;
  acceptedAt: string;
  disclaimerVersion: string;
}

export interface PSWProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: PSWGender;
  homePostalCode?: string;
  homeCity?: string;
  profilePhotoUrl?: string;
  profilePhotoName?: string;
  hscpoaNumber?: string;
  policeCheckUrl?: string;
  policeCheckName?: string;
  policeCheckDate?: string;
  languages: string[];
  vettingStatus: VettingStatus;
  vettingUpdatedAt?: string;
  vettingNotes?: string;
  expiredDueToPoliceCheck?: boolean;
  appliedAt: string;
  approvedAt?: string;
  yearsExperience?: string;
  certifications?: string;
  hasOwnTransport?: string;
  licensePlate?: string;
  availableShifts?: string;
  vehicleDisclaimer?: VehicleDisclaimerAcceptance;
  vehiclePhotoUrl?: string;
  vehiclePhotoName?: string;
}

// Convert database row to PSWProfile
const mapRowToProfile = (row: any): PSWProfile => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone || "",
  gender: row.gender as PSWGender | undefined,
  homePostalCode: row.home_postal_code,
  homeCity: row.home_city,
  profilePhotoUrl: row.profile_photo_url,
  profilePhotoName: row.profile_photo_name,
  hscpoaNumber: row.hscpoa_number,
  policeCheckUrl: row.police_check_url,
  policeCheckName: row.police_check_name,
  policeCheckDate: row.police_check_date,
  languages: row.languages || ["en"],
  vettingStatus: row.vetting_status as VettingStatus,
  vettingUpdatedAt: row.vetting_updated_at,
  vettingNotes: row.vetting_notes,
  expiredDueToPoliceCheck: row.expired_due_to_police_check,
  appliedAt: row.applied_at,
  approvedAt: row.approved_at,
  yearsExperience: row.years_experience,
  certifications: row.certifications,
  hasOwnTransport: row.has_own_transport,
  licensePlate: row.license_plate,
  availableShifts: row.available_shifts,
  vehicleDisclaimer: row.vehicle_disclaimer as VehicleDisclaimerAcceptance | undefined,
  vehiclePhotoUrl: row.vehicle_photo_url,
  vehiclePhotoName: row.vehicle_photo_name,
});

// Convert PSWProfile to database insert format
const mapProfileToInsert = (profile: Omit<PSWProfile, "id">) => ({
  first_name: profile.firstName,
  last_name: profile.lastName,
  email: profile.email,
  phone: profile.phone,
  gender: profile.gender,
  home_postal_code: profile.homePostalCode,
  home_city: profile.homeCity,
  profile_photo_url: profile.profilePhotoUrl,
  profile_photo_name: profile.profilePhotoName,
  hscpoa_number: profile.hscpoaNumber,
  police_check_url: profile.policeCheckUrl,
  police_check_name: profile.policeCheckName,
  police_check_date: profile.policeCheckDate,
  languages: profile.languages,
  vetting_status: profile.vettingStatus,
  vetting_notes: profile.vettingNotes,
  years_experience: profile.yearsExperience,
  certifications: profile.certifications,
  has_own_transport: profile.hasOwnTransport,
  license_plate: profile.licensePlate,
  available_shifts: profile.availableShifts,
  vehicle_disclaimer: profile.vehicleDisclaimer ? JSON.parse(JSON.stringify(profile.vehicleDisclaimer)) : null,
  vehicle_photo_url: profile.vehiclePhotoUrl,
  vehicle_photo_name: profile.vehiclePhotoName,
  applied_at: profile.appliedAt,
});

// Get all PSW profiles from database
export const getPSWProfilesFromDB = async (): Promise<PSWProfile[]> => {
  const { data, error } = await supabase
    .from("psw_profiles")
    .select("*")
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Error fetching PSW profiles:", error);
    return [];
  }

  return (data || []).map(mapRowToProfile);
};

// Get approved PSWs only
export const getApprovedPSWsFromDB = async (): Promise<PSWProfile[]> => {
  const { data, error } = await supabase
    .from("psw_profiles")
    .select("*")
    .eq("vetting_status", "approved")
    .order("approved_at", { ascending: false });

  if (error) {
    console.error("Error fetching approved PSW profiles:", error);
    return [];
  }

  return (data || []).map(mapRowToProfile);
};

// Get pending PSWs only
export const getPendingPSWsFromDB = async (): Promise<PSWProfile[]> => {
  const { data, error } = await supabase
    .from("psw_profiles")
    .select("*")
    .eq("vetting_status", "pending")
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending PSW profiles:", error);
    return [];
  }

  return (data || []).map(mapRowToProfile);
};

// Get a single profile by ID
export const getPSWProfileByIdFromDB = async (id: string): Promise<PSWProfile | null> => {
  const { data, error } = await supabase
    .from("psw_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching PSW profile:", error);
    return null;
  }

  return data ? mapRowToProfile(data) : null;
};

// Get a single profile by email
export const getPSWProfileByEmailFromDB = async (email: string): Promise<PSWProfile | null> => {
  const { data, error } = await supabase
    .from("psw_profiles")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();

  if (error) {
    if (error.code !== "PGRST116") { // Not found is expected
      console.error("Error fetching PSW profile by email:", error);
    }
    return null;
  }

  return data ? mapRowToProfile(data) : null;
};

// Get a single profile by phone
export const getPSWProfileByPhoneFromDB = async (phone: string): Promise<PSWProfile | null> => {
  // Normalize phone number for comparison
  const normalizedPhone = phone.replace(/\D/g, "");
  
  const { data, error } = await supabase
    .from("psw_profiles")
    .select("*");

  if (error) {
    console.error("Error fetching PSW profiles:", error);
    return null;
  }

  // Find matching profile by normalized phone
  const match = data?.find(row => {
    const rowPhone = (row.phone || "").replace(/\D/g, "");
    return rowPhone === normalizedPhone || 
           rowPhone.endsWith(normalizedPhone) ||
           normalizedPhone.endsWith(rowPhone);
  });

  return match ? mapRowToProfile(match) : null;
};

// Create a new PSW profile
export const createPSWProfileInDB = async (
  profile: Omit<PSWProfile, "id">
): Promise<PSWProfile | null> => {
  const insertData = mapProfileToInsert(profile);
  
  const { data, error } = await supabase
    .from("psw_profiles")
    .insert([insertData])
    .select()
    .single();

  if (error) {
    console.error("Error creating PSW profile:", error);
    throw error;
  }

  return data ? mapRowToProfile(data) : null;
};

// Update vetting status
export const updateVettingStatusInDB = async (
  id: string,
  status: VettingStatus,
  notes?: string
): Promise<PSWProfile | null> => {
  const updates: any = {
    vetting_status: status,
    vetting_updated_at: new Date().toISOString(),
  };
  
  if (notes !== undefined) {
    updates.vetting_notes = notes;
  }
  
  if (status === "approved") {
    updates.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("psw_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating vetting status:", error);
    return null;
  }

  return data ? mapRowToProfile(data) : null;
};

// Update PSW profile fields
export const updatePSWProfileInDB = async (
  id: string,
  updates: Partial<PSWProfile>
): Promise<PSWProfile | null> => {
  const dbUpdates: any = {};
  
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
  if (updates.homePostalCode !== undefined) dbUpdates.home_postal_code = updates.homePostalCode;
  if (updates.homeCity !== undefined) dbUpdates.home_city = updates.homeCity;
  if (updates.profilePhotoUrl !== undefined) dbUpdates.profile_photo_url = updates.profilePhotoUrl;
  if (updates.profilePhotoName !== undefined) dbUpdates.profile_photo_name = updates.profilePhotoName;
  if (updates.hscpoaNumber !== undefined) dbUpdates.hscpoa_number = updates.hscpoaNumber;
  if (updates.policeCheckUrl !== undefined) dbUpdates.police_check_url = updates.policeCheckUrl;
  if (updates.policeCheckName !== undefined) dbUpdates.police_check_name = updates.policeCheckName;
  if (updates.policeCheckDate !== undefined) dbUpdates.police_check_date = updates.policeCheckDate;
  if (updates.languages !== undefined) dbUpdates.languages = updates.languages;
  if (updates.yearsExperience !== undefined) dbUpdates.years_experience = updates.yearsExperience;
  if (updates.certifications !== undefined) dbUpdates.certifications = updates.certifications;
  if (updates.hasOwnTransport !== undefined) dbUpdates.has_own_transport = updates.hasOwnTransport;
  if (updates.licensePlate !== undefined) dbUpdates.license_plate = updates.licensePlate;
  if (updates.availableShifts !== undefined) dbUpdates.available_shifts = updates.availableShifts;
  if (updates.vehicleDisclaimer !== undefined) dbUpdates.vehicle_disclaimer = updates.vehicleDisclaimer;
  if (updates.vehiclePhotoUrl !== undefined) dbUpdates.vehicle_photo_url = updates.vehiclePhotoUrl;
  if (updates.vehiclePhotoName !== undefined) dbUpdates.vehicle_photo_name = updates.vehiclePhotoName;

  const { data, error } = await supabase
    .from("psw_profiles")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating PSW profile:", error);
    return null;
  }

  return data ? mapRowToProfile(data) : null;
};

// Convert file to base64 data URL (for uploads)
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};