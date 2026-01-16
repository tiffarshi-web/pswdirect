// Booking Store - Centralized booking management
// This simulates a backend database for storing bookings

import { sendBookingConfirmationEmail, sendNewJobAlertSMS } from "@/lib/notificationService";
import { trackJobLanguage } from "@/lib/languageConfig";
import { addShift, type GenderPreference } from "@/lib/shiftStore";

export interface BookingData {
  id: string;
  createdAt: string;
  paymentStatus: "invoice-pending" | "paid" | "refunded";
  serviceType: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "active" | "in-progress" | "completed" | "cancelled";
  hours: number;
  hourlyRate: number;
  subtotal: number;
  surgeAmount: number;
  total: number;
  isAsap: boolean;
  wasRefunded: boolean;
  orderingClient: {
    name: string;
    address: string;
    postalCode: string;
    phone: string;
    email: string;
    isNewAccount: boolean;
  };
  patient: {
    name: string;
    address: string;
    postalCode: string;
    relationship: string;
    preferredLanguages?: string[]; // Client's preferred languages
    preferredGender?: GenderPreference; // Client's preferred caregiver gender
  };
  // Transport fields (for Hospital/Doctor visits)
  pickupAddress?: string;
  pickupPostalCode?: string;
  dropoffAddress?: string;
  dropoffPostalCode?: string;
  isTransportBooking?: boolean;
  pswAssigned: string | null;
  pswLanguages?: string[]; // Assigned PSW's languages for admin view
  specialNotes: string;
  doctorOfficeName?: string;
  doctorSuiteNumber?: string;
  entryPhoto?: string;
  buzzerCode?: string;
  entryPoint?: string;
  emailNotifications: {
    confirmationSent: boolean;
    confirmationSentAt?: string;
    reminderSent: boolean;
    reminderSentAt?: string;
  };
  adminNotifications: {
    notified: boolean;
    notifiedAt?: string;
  };
}

// Generate a unique booking ID
export const generateBookingId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PSW-${timestamp}-${random}`;
};

// Get all bookings from localStorage
export const getBookings = (): BookingData[] => {
  const stored = localStorage.getItem("pswdirect_bookings");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

// Save bookings to localStorage
const saveBookings = (bookings: BookingData[]): void => {
  localStorage.setItem("pswdirect_bookings", JSON.stringify(bookings));
};

// Add a new booking
export const addBooking = async (booking: Omit<BookingData, "id" | "createdAt">): Promise<BookingData> => {
  const bookings = getBookings();
  const newBooking: BookingData = {
    ...booking,
    id: generateBookingId(),
    createdAt: new Date().toISOString(),
  };
  bookings.push(newBooking);
  saveBookings(bookings);
  
  // Log admin notification
  console.log("🔔 ADMIN NOTIFICATION: New booking received!", {
    bookingId: newBooking.id,
    client: newBooking.orderingClient.name,
    email: newBooking.orderingClient.email,
    date: newBooking.date,
    time: newBooking.startTime,
    services: newBooking.serviceType,
    total: newBooking.total,
    paymentStatus: newBooking.paymentStatus,
  });
  
  // Track language preferences for smart matching
  if (newBooking.patient.preferredLanguages && newBooking.patient.preferredLanguages.length > 0) {
    trackJobLanguage(newBooking.id, newBooking.patient.preferredLanguages);
  }
  await sendBookingConfirmationEmail(
    newBooking.orderingClient.email,
    newBooking.orderingClient.name.split(" ")[0],
    newBooking.id,
    newBooking.date,
    `${newBooking.startTime} - ${newBooking.endTime}`,
    newBooking.serviceType
  );
  
  // Send SMS alerts to available PSWs (demo phone number)
  await sendNewJobAlertSMS(
    "+16135550101", // Demo PSW phone
    "Available PSW",
    newBooking.patient.postalCode,
    newBooking.date,
    newBooking.startTime
  );
  
  // Update booking to mark notifications as sent
  newBooking.emailNotifications.confirmationSent = true;
  newBooking.emailNotifications.confirmationSentAt = new Date().toISOString();
  newBooking.adminNotifications.notified = true;
  newBooking.adminNotifications.notifiedAt = new Date().toISOString();
  saveBookings(bookings);
  
  // Create a shift record so PSWs can see and claim this job
  addShift({
    bookingId: newBooking.id,
    pswId: "",
    pswName: "",
    clientName: newBooking.orderingClient.name,
    clientFirstName: newBooking.orderingClient.name.split(" ")[0],
    clientPhone: newBooking.orderingClient.phone,
    patientAddress: newBooking.patient.address,
    postalCode: newBooking.patient.postalCode,
    scheduledStart: newBooking.startTime,
    scheduledEnd: newBooking.endTime,
    scheduledDate: newBooking.date,
    services: newBooking.serviceType,
    preferredLanguages: newBooking.patient.preferredLanguages,
    preferredGender: newBooking.patient.preferredGender,
    // Transport fields
    pickupAddress: newBooking.pickupAddress,
    pickupPostalCode: newBooking.pickupPostalCode,
    dropoffAddress: newBooking.dropoffAddress,
    dropoffPostalCode: newBooking.dropoffPostalCode,
    isTransportShift: newBooking.isTransportBooking,
    agreementAccepted: false,
    overtimeMinutes: 0,
    flaggedForOvertime: false,
    postedAt: new Date().toISOString(),
    status: "available",
  });
  
  return newBooking;
};

// Update a booking
export const updateBooking = (id: string, updates: Partial<BookingData>): BookingData | null => {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return null;
  
  bookings[index] = { ...bookings[index], ...updates };
  saveBookings(bookings);
  return bookings[index];
};

// Get a single booking by ID
export const getBookingById = (id: string): BookingData | null => {
  const bookings = getBookings();
  return bookings.find(b => b.id === id) || null;
};

// Get active bookings (for admin view)
export const getActiveBookings = (): BookingData[] => {
  const bookings = getBookings();
  return bookings.filter(b => b.status === "active" || b.status === "pending");
};

// Cancel a booking
export const cancelBooking = (id: string, refund: boolean = false): BookingData | null => {
  return updateBooking(id, { 
    status: "cancelled",
    wasRefunded: refund,
    paymentStatus: refund ? "refunded" : "invoice-pending"
  });
};

// Assign PSW to booking
export const assignPSW = (bookingId: string, pswName: string): BookingData | null => {
  return updateBooking(bookingId, { 
    pswAssigned: pswName,
    status: "active"
  });
};
