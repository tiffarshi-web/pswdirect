// PSW Profile Store - Manages PSW profiles with compliance fields
// This handles profile photos, HSCPOA numbers, police checks, and vetting status

export type VettingStatus = "pending" | "approved" | "rejected";

export interface PSWProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Compliance fields
  profilePhotoUrl?: string;
  profilePhotoName?: string;
  hscpoaNumber?: string;
  policeCheckUrl?: string;
  policeCheckName?: string;
  
  // Languages
  languages: string[];
  
  // Vetting
  vettingStatus: VettingStatus;
  vettingUpdatedAt?: string;
  vettingNotes?: string;
  
  // Metadata
  appliedAt: string;
  approvedAt?: string;
  
  // Experience
  yearsExperience?: string;
  certifications?: string;
  hasOwnTransport?: string;
  availableShifts?: string;
}

// Get all PSW profiles
export const getPSWProfiles = (): PSWProfile[] => {
  const stored = localStorage.getItem("pswdirect_psw_profiles");
  if (stored) {
    try {
      return JSON.parse(stored);
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

// Convert file to base64 data URL
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Default mock profiles for demo
const getDefaultPSWProfiles = (): PSWProfile[] => {
  const defaults: PSWProfile[] = [
    {
      id: "psw-1",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@pswdirect.ca",
      phone: "(613) 555-0201",
      hscpoaNumber: "HSCPOA-2024-55123",
      languages: ["en"],
      vettingStatus: "approved",
      appliedAt: "2024-01-15T10:00:00Z",
      approvedAt: "2024-02-01T09:00:00Z",
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