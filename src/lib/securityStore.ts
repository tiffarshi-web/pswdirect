// Security Store - Handles encryption, masking, and audit logging
// PHIPA-compliant security for sensitive health and banking data

import { toast } from "sonner";

// Types
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: "admin" | "psw" | "client";
  action: "view" | "access" | "update" | "export" | "decrypt";
  dataType: "banking" | "health" | "address" | "police_check" | "payroll";
  targetId?: string;
  targetDescription?: string;
  ipAddress?: string;
}

export interface EncryptedData {
  encrypted: true;
  data: string;
  iv: string;
  timestamp: string;
}

export interface BankingInfo {
  transitNumber: string; // 5 digits
  institutionNumber: string; // 3 digits
  accountNumber: string; // 7-12 digits
  legalName: string;
}

// Storage keys
const AUDIT_LOG_KEY = "pswdirect_audit_log";
const ENCRYPTION_KEY_KEY = "pswdirect_encryption_key";
const PSW_BANKING_KEY = "pswdirect_psw_banking";
const LAST_ACTIVITY_KEY = "pswdirect_last_activity";

// Auto-timeout duration (30 days for persistent mobile login)
export const AUTO_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

// ====================
// ENCRYPTION UTILITIES
// ====================

// Generate a random encryption key (in production, this would be securely stored)
const getEncryptionKey = async (): Promise<CryptoKey> => {
  // Check if we have a stored key
  const storedKey = localStorage.getItem(ENCRYPTION_KEY_KEY);
  
  if (storedKey) {
    const keyData = JSON.parse(storedKey);
    return await crypto.subtle.importKey(
      "jwk",
      keyData,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }
  
  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  // Export and store (in production, this would be in a secure vault)
  const exportedKey = await crypto.subtle.exportKey("jwk", key);
  localStorage.setItem(ENCRYPTION_KEY_KEY, JSON.stringify(exportedKey));
  
  return key;
};

// Encrypt sensitive data using AES-256-GCM
export const encryptData = async (data: string): Promise<EncryptedData> => {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(data)
    );
    
    // Convert to base64 for storage
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
    const ivBase64 = btoa(String.fromCharCode(...iv));
    
    return {
      encrypted: true,
      data: encryptedBase64,
      iv: ivBase64,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt data");
  }
};

// Decrypt encrypted data
export const decryptData = async (encryptedData: EncryptedData): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    
    // Convert from base64
    const encryptedArray = new Uint8Array(
      atob(encryptedData.data).split("").map(c => c.charCodeAt(0))
    );
    const iv = new Uint8Array(
      atob(encryptedData.iv).split("").map(c => c.charCodeAt(0))
    );
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedArray
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt data");
  }
};

// ====================
// MASKING UTILITIES
// ====================

// Mask bank account number (show last 4 digits)
export const maskAccountNumber = (accountNumber?: string): string => {
  if (!accountNumber) return "****";
  if (accountNumber.length <= 4) return "****";
  return "•".repeat(accountNumber.length - 4) + accountNumber.slice(-4);
};

// Mask transit number (show last 2 digits)
export const maskTransitNumber = (transit?: string): string => {
  if (!transit) return "***";
  if (transit.length <= 2) return "***";
  return "•".repeat(transit.length - 2) + transit.slice(-2);
};

// Mask email (show first 2 chars and domain)
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!domain) return "****@***";
  const maskedLocal = local.slice(0, 2) + "•".repeat(Math.max(0, local.length - 2));
  return `${maskedLocal}@${domain}`;
};

// Mask address (show only city/postal code)
export const maskAddress = (address: string, postalCode: string): string => {
  return `*** ${postalCode}`;
};

// ====================
// AUDIT LOGGING
// ====================

// Get all audit logs
export const getAuditLogs = (): AuditLogEntry[] => {
  const stored = localStorage.getItem(AUDIT_LOG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

// Save audit logs
const saveAuditLogs = (logs: AuditLogEntry[]): void => {
  // Keep only last 1000 entries
  const trimmed = logs.slice(-1000);
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
};

// Log an access event
export const logSecurityEvent = (
  userId: string,
  userName: string,
  userRole: "admin" | "psw" | "client",
  action: AuditLogEntry["action"],
  dataType: AuditLogEntry["dataType"],
  targetId?: string,
  targetDescription?: string
): void => {
  const logs = getAuditLogs();
  
  const newEntry: AuditLogEntry = {
    id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    userRole,
    action,
    dataType,
    targetId,
    targetDescription,
  };
  
  logs.push(newEntry);
  saveAuditLogs(logs);
  
  console.log("🔒 SECURITY AUDIT:", newEntry);
};

// Get recent audit logs (for admin view)
export const getRecentAuditLogs = (limit: number = 50): AuditLogEntry[] => {
  const logs = getAuditLogs();
  return logs.slice(-limit).reverse();
};

// Get logs filtered by user
export const getAuditLogsByUser = (userId: string): AuditLogEntry[] => {
  const logs = getAuditLogs();
  return logs.filter(log => log.userId === userId);
};

// Get logs filtered by data type
export const getAuditLogsByDataType = (dataType: AuditLogEntry["dataType"]): AuditLogEntry[] => {
  const logs = getAuditLogs();
  return logs.filter(log => log.dataType === dataType);
};

// ====================
// PSW BANKING DATA
// ====================

export interface PSWBankingRecord {
  pswId: string;
  banking: BankingInfo | null;
  encryptedBanking?: EncryptedData;
  updatedAt: string;
}

// Get all PSW banking records
export const getPSWBankingRecords = (): PSWBankingRecord[] => {
  const stored = localStorage.getItem(PSW_BANKING_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

// Save banking records
const savePSWBankingRecords = (records: PSWBankingRecord[]): void => {
  localStorage.setItem(PSW_BANKING_KEY, JSON.stringify(records));
};

// Get banking info for a specific PSW
export const getPSWBanking = (pswId: string): PSWBankingRecord | null => {
  const records = getPSWBankingRecords();
  return records.find(r => r.pswId === pswId) || null;
};

// Save encrypted banking info
export const savePSWBanking = async (
  pswId: string,
  banking: BankingInfo
): Promise<void> => {
  const records = getPSWBankingRecords();
  
  // Encrypt sensitive fields (only include fields that have values)
  const sensitiveData = JSON.stringify({
    transitNumber: banking.transitNumber || "",
    institutionNumber: banking.institutionNumber || "",
    accountNumber: banking.accountNumber || "",
  });
  
  const encryptedBanking = await encryptData(sensitiveData);
  
  const existingIndex = records.findIndex(r => r.pswId === pswId);
  const record: PSWBankingRecord = {
    pswId,
    banking: {
      ...banking,
      // Store non-sensitive data in plain text (with null-safe masking)
      transitNumber: maskTransitNumber(banking.transitNumber),
      institutionNumber: banking.institutionNumber ? "***" : "",
      accountNumber: maskAccountNumber(banking.accountNumber),
    },
    encryptedBanking,
    updatedAt: new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  
  savePSWBankingRecords(records);
};

// Decrypt and reveal banking info (admin only with audit logging)
export const revealPSWBanking = async (
  pswId: string,
  adminId: string,
  adminName: string
): Promise<BankingInfo | null> => {
  const record = getPSWBanking(pswId);
  if (!record || !record.encryptedBanking || !record.banking) return null;
  
  try {
    // Log the access
    logSecurityEvent(
      adminId,
      adminName,
      "admin",
      "decrypt",
      "banking",
      pswId,
      `Revealed banking info for PSW ${pswId}`
    );
    
    // Decrypt sensitive data
    const decryptedData = await decryptData(record.encryptedBanking);
    const sensitive = JSON.parse(decryptedData);
    
    return {
      ...record.banking,
      transitNumber: sensitive.transitNumber,
      institutionNumber: sensitive.institutionNumber,
      accountNumber: sensitive.accountNumber,
    };
  } catch (error) {
    console.error("Failed to reveal banking info:", error);
    toast.error("Failed to decrypt banking information");
    return null;
  }
};

// ====================
// AUTO-TIMEOUT / SESSION
// ====================

// Update last activity timestamp
export const updateLastActivity = (): void => {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
};

// Get last activity timestamp
export const getLastActivity = (): number => {
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  return stored ? parseInt(stored, 10) : Date.now();
};

// Check if session has timed out
export const hasSessionTimedOut = (): boolean => {
  const lastActivity = getLastActivity();
  const elapsed = Date.now() - lastActivity;
  return elapsed > AUTO_TIMEOUT_MS;
};

// Clear all session data on timeout
export const clearSessionOnTimeout = (): void => {
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  // In production, this would clear auth tokens, etc.
};

// ====================
// ROLE ISOLATION CHECKS
// ====================

// Check if user can access banking data
export const canAccessBankingData = (userRole: string, targetPswId: string, currentUserId: string): boolean => {
  // Only admins can access banking data
  if (userRole === "admin") return true;
  // PSWs can only see their own banking data
  if (userRole === "psw" && targetPswId === currentUserId) return true;
  // Clients cannot access any banking data
  return false;
};

// Check if user can access health records
export const canAccessHealthRecords = (
  userRole: string, 
  targetClientId: string, 
  currentUserId: string,
  assignedClientIds: string[]
): boolean => {
  // Admins can access all health records
  if (userRole === "admin") return true;
  // Clients can only see their own records
  if (userRole === "client" && targetClientId === currentUserId) return true;
  // PSWs can only see records of clients they're assigned to
  if (userRole === "psw" && assignedClientIds.includes(targetClientId)) return true;
  return false;
};

// ====================
// CPA-005 BANK FILE EXPORT
// ====================

export interface CPAPaymentRecord {
  pswId: string;
  legalName: string;
  transitNumber: string;
  institutionNumber: string;
  accountNumber: string;
  amount: number;
  referenceNumber: string;
}

// Generate CPA-005 formatted payment file
export const generateCPA005File = (
  payments: CPAPaymentRecord[],
  originatorId: string,
  originatorName: string,
  fileCreationNumber: string
): string => {
  const now = new Date();
  const julianDate = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  
  // CPA-005 Header Record (Type A)
  const header = [
    "A", // Record type
    "000000001", // Record count (padded)
    originatorId.padEnd(10), // Originator ID
    fileCreationNumber.padStart(4, "0"), // File creation number
    dateStr, // Creation date (YYYYMMDD)
    originatorName.padEnd(30), // Originator name
  ].join("");
  
  // CPA-005 Detail Records (Type D) - one per payment
  const details = payments.map((payment, index) => {
    return [
      "D", // Record type
      String(index + 1).padStart(9, "0"), // Sequence number
      "450", // Transaction code (450 = credit to account)
      payment.transitNumber.padStart(5, "0"), // Transit number
      payment.institutionNumber.padStart(3, "0"), // Institution number
      payment.accountNumber.padEnd(12), // Account number
      Math.round(payment.amount * 100).toString().padStart(10, "0"), // Amount in cents
      payment.legalName.padEnd(30), // Payee name
      payment.referenceNumber.padEnd(19), // Reference number
      originatorName.padEnd(30), // Originator name
    ].join("");
  });
  
  // CPA-005 Trailer Record (Type Z)
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const trailer = [
    "Z", // Record type
    String(payments.length).padStart(8, "0"), // Total detail records
    Math.round(totalAmount * 100).toString().padStart(14, "0"), // Total amount in cents
    "0".repeat(14), // Total debits (not used)
    " ".repeat(44), // Filler
  ].join("");
  
  return [header, ...details, trailer].join("\n");
};

// Download bank payment file
export const downloadBankFile = (
  content: string, 
  filename: string, 
  type: "cpa005"
): void => {
  const mimeType = "text/plain";
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
