// PSA Profile Store - Manages PSA profiles with compliance fields
// This handles profile photos, HSCPOA numbers, police checks, and vetting status

export type VettingStatus = "pending" | "approved" | "rejected" | "rejected_needs_update" | "rejected_final" | "flagged" | "deactivated";
export type PSAGender = "female" | "male" | "other" | "prefer-not-to-say";
export type PSWGender = PSAGender; // Alias for backward compatibility

export interface VehicleDisclaimerAcceptance {
  accepted: boolean;
  acceptedAt: string; // ISO timestamp
  disclaimerVersion: string;
}

export interface PSAProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Gender for matching
  gender?: PSAGender;
  
  // Home location for distance filtering
  homePostalCode?: string;
  homeCity?: string;
  
  // Compliance fields
  profilePhotoUrl?: string;
  profilePhotoName?: string;
  hscpoaNumber?: string;
  policeCheckUrl?: string;
  policeCheckName?: string;
  policeCheckDate?: string; // Date the police check was issued
  
  // Languages
  languages: string[];
  
  // Vetting
  vettingStatus: VettingStatus;
  vettingUpdatedAt?: string;
  vettingNotes?: string;
  expiredDueToPoliceCheck?: boolean; // Track if auto-expired due to police check
  
  // Metadata
  appliedAt: string;
  approvedAt?: string;
  
  // Experience
  yearsExperience?: string;
  certifications?: string;
  hasOwnTransport?: string;
  licensePlate?: string; // Ontario format: ABCD 123
  availableShifts?: string;
  
  // Vehicle Insurance Disclaimer
  vehicleDisclaimer?: VehicleDisclaimerAcceptance;
  
  // Vehicle Photo (required if hasOwnTransport === "yes-car")
  vehiclePhotoUrl?: string;
  vehiclePhotoName?: string;
}

// Type aliases for backward compatibility
export type PSWProfile = PSAProfile;

// One-time cleanup: remove Sarah Johnson from any existing localStorage data
const cleanupLegacyProfiles = (profiles: PSWProfile[]): PSWProfile[] => {
  const sarahIds = ["psw-1"];
  const sarahEmails = ["sarah.johnson@pswdirect.ca"];
  
  const cleaned = profiles.filter(p => 
    !sarahIds.includes(p.id) && !sarahEmails.includes(p.email)
  );
  
  // If we removed anything, save the cleaned list
  if (cleaned.length !== profiles.length) {
    localStorage.setItem("pswdirect_psw_profiles", JSON.stringify(cleaned));
  }
  
  return cleaned;
};

// Get all PSW profiles
export const getPSWProfiles = (): PSWProfile[] => {
  const stored = localStorage.getItem("pswdirect_psw_profiles");
  if (stored) {
    try {
      const profiles = JSON.parse(stored);
      // Clean up any legacy Sarah profiles
      return cleanupLegacyProfiles(profiles);
    } catch {
      return [];
    }
  }
  return getDefaultPSWProfiles();
};

// Save profiles
const saveProfiles = (profiles: PSWProfile[]): void => {
  localStorage.setItem("pswdirect_psw_profiles", JSON.stringify(profiles));
};

// Get a single profile
export const getPSWProfile = (id: string): PSWProfile | null => {
  const profiles = getPSWProfiles();
  return profiles.find(p => p.id === id) || null;
};

// Add or update a profile
export const savePSWProfile = (profile: PSWProfile): void => {
  const profiles = getPSWProfiles();
  const existingIndex = profiles.findIndex(p => p.id === profile.id);
  
  if (existingIndex >= 0) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }
  
  saveProfiles(profiles);
};

// Update vetting status
export const updateVettingStatus = (
  id: string, 
  status: VettingStatus, 
  notes?: string
): PSWProfile | null => {
  const profile = getPSWProfile(id);
  if (!profile) return null;
  
  const updatedProfile: PSWProfile = {
    ...profile,
    vettingStatus: status,
    vettingUpdatedAt: new Date().toISOString(),
    vettingNotes: notes,
    approvedAt: status === "approved" ? new Date().toISOString() : profile.approvedAt,
  };
  
  savePSWProfile(updatedProfile);
  return updatedProfile;
};

// Update PSW home location
export const updatePSWHomeLocation = (
  id: string,
  homePostalCode: string,
  homeCity?: string
): PSWProfile | null => {
  const profile = getPSWProfile(id);
  if (!profile) return null;
  
  const updatedProfile: PSWProfile = {
    ...profile,
    homePostalCode,
    homeCity,
  };
  
  savePSWProfile(updatedProfile);
  return updatedProfile;
};

// Update PSW gender
export const updatePSWGender = (
  id: string,
  gender: PSWGender
): PSWProfile | null => {
  const profile = getPSWProfile(id);
  if (!profile) return null;
  
  const updatedProfile: PSWProfile = {
    ...profile,
    gender,
  };
  
  savePSWProfile(updatedProfile);
  return updatedProfile;
};

// Get approved PSWs only
export const getApprovedPSWs = (): PSWProfile[] => {
  const profiles = getPSWProfiles();
  return profiles.filter(p => p.vettingStatus === "approved");
};

// Get pending PSWs
export const getPendingPSWs = (): PSWProfile[] => {
  const profiles = getPSWProfiles();
  return profiles.filter(p => p.vettingStatus === "pending");
};

// Check if a PSW is approved
export const isPSWApproved = (id: string): boolean => {
  const profile = getPSWProfile(id);
  return profile?.vettingStatus === "approved";
};

// Get PSW display info for clients (first name + photo only)
export const getPSWClientView = (id: string): { firstName: string; photoUrl?: string } | null => {
  const profile = getPSWProfile(id);
  if (!profile) return null;
  
  return {
    firstName: profile.firstName,
    photoUrl: profile.profilePhotoUrl,
  };
};

// ============= POLICE CHECK EXPIRY FUNCTIONS =============

// Check if police check is expired (older than 1 year)
export const isPoliceCheckExpired = (profile: PSWProfile): boolean => {
  if (!profile.policeCheckDate) return false;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return new Date(profile.policeCheckDate) < oneYearAgo;
};

// Get days until police check expires
export const getDaysUntilPoliceCheckExpires = (profile: PSWProfile): number | null => {
  if (!profile.policeCheckDate) return null;
  const expiryDate = new Date(profile.policeCheckDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check and auto-expire PSWs with old police checks
export const checkAndExpirePoliceChecks = (): void => {
  const profiles = getPSWProfiles();
  profiles.forEach(profile => {
    if (profile.vettingStatus === "approved" && isPoliceCheckExpired(profile)) {
      const formattedDate = profile.policeCheckDate 
        ? new Date(profile.policeCheckDate).toLocaleDateString() 
        : "unknown";
      
      updateVettingStatus(
        profile.id, 
        "pending", 
        `Police check expired (issued ${formattedDate}). PSW must upload a new police clearance check to continue working.`
      );
      
      // Mark as auto-expired
      const updated = getPSWProfile(profile.id);
      if (updated) {
        savePSWProfile({ ...updated, expiredDueToPoliceCheck: true });
      }
    }
  });
};

// ============= PROFILE UPDATE FUNCTIONS WITH RE-VETTING =============

// Update police check (triggers re-vetting)
export const updatePSWPoliceCheck = (
  id: string,
  policeCheckUrl: string,
  policeCheckName: string,
  policeCheckDate: string
): PSWProfile | null => {
  const profile = getPSWProfile(id);
  if (!profile) return null;
  
  const formattedDate = new Date(policeCheckDate).toLocaleDateString();
  
  const updatedProfile: PSWProfile = {
    ...profile,
    policeCheckUrl,
    policeCheckName,
    policeCheckDate,
    vettingStatus: "pending",
    vettingUpdatedAt: new Date().toISOString(),
    vettingNotes: `Police check updated by PSW on ${new Date().toLocaleDateString()} (Check dated: ${formattedDate}). Requires admin review and approval.`,
    approvedAt: undefined,
    expiredDueToPoliceCheck: false,
  };
  
  savePSWProfile(updatedProfile);
  return updatedProfile;
};

// Update home address WITH re-vetting (for address changes)
export const updatePSWHomeLocationWithRevetting = (
  id: string,
  homePostalCode: string,
  homeCity?: string
): PSWProfile | null => {
  const profile = getPSWProfile(id);
  if (!profile) return null;
  
  const updatedProfile: PSWProfile = {
    ...profile,
    homePostalCode,
    homeCity,
    vettingStatus: "pending",
    vettingUpdatedAt: new Date().toISOString(),
    vettingNotes: `Address updated by PSW on ${new Date().toLocaleDateString()}. Requires re-verification of service area.`,
    approvedAt: undefined,
  };
  
  savePSWProfile(updatedProfile);
  return updatedProfile;
};

// Update transport status (no re-vetting)
export const updatePSWTransport = (
  id: string,
  hasOwnTransport: string,
  licensePlate?: string,
  vehicleDisclaimer?: VehicleDisclaimerAcceptance,
  vehiclePhotoUrl?: string,
  vehiclePhotoName?: string
): PSWProfile | null => {
  const profile = getPSWProfile(id);
  if (!profile) return null;
  
  const updatedProfile: PSWProfile = {
    ...profile,
    hasOwnTransport,
    // Only save license plate and vehicle photo if user has a car, clear them otherwise
    licensePlate: hasOwnTransport === "yes-car" ? licensePlate : undefined,
    vehicleDisclaimer: vehicleDisclaimer || profile.vehicleDisclaimer,
    vehiclePhotoUrl: hasOwnTransport === "yes-car" ? vehiclePhotoUrl : undefined,
    vehiclePhotoName: hasOwnTransport === "yes-car" ? vehiclePhotoName : undefined,
  };
  
  savePSWProfile(updatedProfile);
  return updatedProfile;
};

// Update contact information (no re-vetting)
export const updatePSWContact = (
  id: string,
  phone: string,
  email: string
): PSWProfile | null => {
  const profile = getPSWProfile(id);
  if (!profile) return null;
  
  const updatedProfile: PSWProfile = {
    ...profile,
    phone,
    email,
  };
  
  savePSWProfile(updatedProfile);
  return updatedProfile;
};

// Update languages (no re-vetting)
export const updatePSWLanguages = (
  id: string,
  languages: string[]
): PSWProfile | null => {
  const profile = getPSWProfile(id);
  if (!profile) return null;
  
  const updatedProfile: PSWProfile = {
    ...profile,
    languages,
  };
  
  savePSWProfile(updatedProfile);
  return updatedProfile;
};

// Update certifications (no re-vetting)
export const updatePSWCertifications = (
  id: string,
  certifications: string
): PSWProfile | null => {
  const profile = getPSWProfile(id);
  if (!profile) return null;
  
  const updatedProfile: PSWProfile = {
    ...profile,
    certifications,
  };
  
  savePSWProfile(updatedProfile);
  return updatedProfile;
};

// Update profile photo (no re-vetting)
export const updatePSWPhoto = (
  id: string,
  photoUrl: string,
  photoName: string
): PSWProfile | null => {
  const profile = getPSWProfile(id);
  if (!profile) return null;
  
  const updatedProfile: PSWProfile = {
    ...profile,
    profilePhotoUrl: photoUrl,
    profilePhotoName: photoName,
  };
  
  savePSWProfile(updatedProfile);
  return updatedProfile;
};

// Convert file to base64 data URL
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Default mock profiles for demo (with home locations for distance filtering)
const getDefaultPSWProfiles = (): PSWProfile[] => {
  const defaults: PSWProfile[] = [
    {
      id: "psw-test-001",
      firstName: "Test",
      lastName: "PSW",
      email: "test.psw@pswdirect.ca",
      phone: "(416) 555-9999",
      hscpoaNumber: "HSCPOA-2024-TEST1",
      homePostalCode: "M5V 1J9",
      homeCity: "Toronto",
      gender: "female",
      languages: ["en"],
      vettingStatus: "approved",
      appliedAt: "2024-01-01T10:00:00Z",
      approvedAt: "2024-01-15T09:00:00Z",
      yearsExperience: "3-5",
      certifications: "PSW Certificate, First Aid, CPR",
      hasOwnTransport: "yes-car",
      availableShifts: "flexible",
    },
    {
      id: "PSW001",
      firstName: "Jennifer",
      lastName: "Morrison",
      email: "jennifer.m@pswstaff.com",
      phone: "(416) 555-1001",
      hscpoaNumber: "HSCPOA-2024-78234",
      homePostalCode: "M4S 2B8",
      homeCity: "Toronto",
      gender: "female",
      languages: ["en", "fr"],
      vettingStatus: "approved",
      appliedAt: "2024-06-01T10:00:00Z",
      approvedAt: "2024-06-15T14:30:00Z",
      yearsExperience: "3-5",
      certifications: "PSW Certificate, First Aid, CPR",
      hasOwnTransport: "yes-car",
      availableShifts: "flexible",
    },
    {
      id: "PSW002",
      firstName: "Amanda",
      lastName: "Liu",
      email: "amanda.l@pswstaff.com",
      phone: "(416) 555-1002",
      hscpoaNumber: "HSCPOA-2024-91456",
      homePostalCode: "M2N 5Y7",
      homeCity: "North York",
      gender: "female",
      languages: ["en", "zh", "zh-yue"],
      vettingStatus: "approved",
      appliedAt: "2024-07-20T09:00:00Z",
      approvedAt: "2024-08-01T11:00:00Z",
      yearsExperience: "1-3",
      certifications: "PSW Certificate, Dementia Care Training",
      hasOwnTransport: "yes-transit",
      availableShifts: "weekdays",
    },
    {
      id: "PSW003",
      firstName: "Patricia",
      lastName: "Kim",
      email: "patricia.k@pswstaff.com",
      phone: "(416) 555-1003",
      hscpoaNumber: "HSCPOA-2024-65789",
      homePostalCode: "M1P 4N5",
      homeCity: "Scarborough",
      gender: "female",
      languages: ["en", "ko"],
      vettingStatus: "approved",
      appliedAt: "2024-09-01T08:00:00Z",
      approvedAt: "2024-09-20T16:00:00Z",
      yearsExperience: "1-3",
      certifications: "PSW Certificate",
      hasOwnTransport: "no",
      availableShifts: "weekends",
    },
    {
      id: "PSW004",
      firstName: "Maria",
      lastName: "Santos",
      email: "maria.s@pswstaff.com",
      phone: "(416) 555-1004",
      hscpoaNumber: "HSCPOA-2024-32145",
      homePostalCode: "L4C 3G5",
      homeCity: "Richmond Hill",
      gender: "female",
      languages: ["en", "pt", "es"],
      vettingStatus: "rejected",
      vettingNotes: "Failed background check",
      appliedAt: "2024-09-25T07:00:00Z",
      yearsExperience: "0-1",
      hasOwnTransport: "no",
    },
    {
      id: "PSW005",
      firstName: "David",
      lastName: "Thompson",
      email: "david.t@pswstaff.com",
      phone: "(416) 555-1005",
      hscpoaNumber: "HSCPOA-2024-11234",
      homePostalCode: "K8N 4Z5",
      homeCity: "Belleville",
      gender: "male",
      languages: ["en"],
      vettingStatus: "approved",
      appliedAt: "2024-02-10T10:00:00Z",
      approvedAt: "2024-03-10T09:00:00Z",
      yearsExperience: "5+",
      certifications: "PSW Certificate, First Aid, CPR, Palliative Care",
      hasOwnTransport: "yes-car",
      availableShifts: "flexible",
    },
    {
      id: "PSW-PENDING-001",
      firstName: "James",
      lastName: "Wilson",
      email: "james.w@email.com",
      phone: "(416) 555-1006",
      homePostalCode: "M6H 2N9",
      homeCity: "Toronto",
      gender: "male",
      languages: ["en", "pa"],
      vettingStatus: "pending",
      appliedAt: new Date().toISOString(),
      yearsExperience: "1-3",
      certifications: "PSW Certificate",
      hasOwnTransport: "yes-car",
    },
  ];
  
  saveProfiles(defaults);
  return defaults;
};

// Initialize profiles if empty
export const initializePSWProfiles = (): void => {
  const stored = localStorage.getItem("pswdirect_psw_profiles");
  if (!stored) {
    getDefaultPSWProfiles();
  }
};
