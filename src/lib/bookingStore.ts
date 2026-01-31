// Booking Store - Centralized booking management with Supabase persistence

import { supabase } from "@/integrations/supabase/client";
import { sendBookingConfirmationEmail } from "@/lib/notificationService";
import { trackJobLanguage } from "@/lib/languageConfig";
import { addShift, type GenderPreference } from "@/lib/shiftStore";

export interface BookingData {
  id: string;
  createdAt: string;
  paymentStatus: "invoice-pending" | "paid" | "refunded";
  stripePaymentIntentId?: string;
  serviceType: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "active" | "in-progress" | "completed" | "cancelled" | "archived";
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
    preferredLanguages?: string[];
    preferredGender?: GenderPreference;
  };
  pickupAddress?: string;
  pickupPostalCode?: string;
  dropoffAddress?: string;
  dropoffPostalCode?: string;
  isTransportBooking?: boolean;
  pswAssigned: string | null;
  pswFirstName?: string;
  pswLanguages?: string[];
  pswLicensePlate?: string;
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

// Generate a unique booking code
export const generateBookingId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PSW-${timestamp}-${random}`;
};

// Get all bookings from Supabase (async)
export const getBookingsAsync = async (): Promise<BookingData[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("scheduled_date", { ascending: false });
  
  if (error) {
    console.error("Error fetching bookings:", error);
    return getBookings(); // Fallback to localStorage
  }
  
  return data.map(mapDbToBooking);
};

// Get bookings synchronously from localStorage (for components that need sync data)
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

// Save bookings to localStorage (backup)
const saveLocalBookings = (bookings: BookingData[]): void => {
  localStorage.setItem("pswdirect_bookings", JSON.stringify(bookings));
};

// Map database row to BookingData
const mapDbToBooking = (row: any): BookingData => ({
  id: row.booking_code || row.id,
  createdAt: row.created_at,
  paymentStatus: row.payment_status as BookingData["paymentStatus"],
  stripePaymentIntentId: row.stripe_payment_intent_id || undefined,
  serviceType: row.service_type || [],
  date: row.scheduled_date,
  startTime: row.start_time,
  endTime: row.end_time,
  status: row.status as BookingData["status"],
  hours: Number(row.hours),
  hourlyRate: Number(row.hourly_rate),
  subtotal: Number(row.subtotal),
  surgeAmount: Number(row.surge_amount) || 0,
  total: Number(row.total),
  isAsap: row.is_asap || false,
  wasRefunded: row.was_refunded || false,
  orderingClient: {
    name: row.client_name,
    address: row.client_address,
    postalCode: row.client_postal_code || "",
    phone: row.client_phone || "",
    email: row.client_email,
    isNewAccount: false,
  },
  patient: {
    name: row.patient_name,
    address: row.patient_address,
    postalCode: row.patient_postal_code || "",
    relationship: row.patient_relationship || "Self",
    preferredLanguages: row.preferred_languages || undefined,
    preferredGender: row.preferred_gender as GenderPreference || undefined,
  },
  pickupAddress: row.pickup_address || undefined,
  pickupPostalCode: undefined,
  dropoffAddress: row.dropoff_address || undefined,
  dropoffPostalCode: undefined,
  isTransportBooking: row.is_transport_booking || false,
  pswAssigned: row.psw_assigned || null,
  pswFirstName: row.psw_first_name || undefined,
  specialNotes: row.special_notes || "",
  doctorOfficeName: undefined,
  doctorSuiteNumber: undefined,
  entryPhoto: undefined,
  buzzerCode: undefined,
  entryPoint: undefined,
  emailNotifications: {
    confirmationSent: true,
    confirmationSentAt: row.created_at,
    reminderSent: false,
  },
  adminNotifications: {
    notified: true,
    notifiedAt: row.created_at,
  },
});

// Add a new booking - writes to Supabase
export const addBooking = async (booking: Omit<BookingData, "id" | "createdAt">): Promise<BookingData> => {
  const bookingCode = generateBookingId();
  const now = new Date().toISOString();
  
  // Get current authenticated user for RLS policy compliance
  const { data: { user } } = await supabase.auth.getUser();
  
  // Insert into Supabase
  const { data: insertedRow, error } = await supabase
    .from("bookings")
    .insert({
      booking_code: bookingCode,
      user_id: user?.id || null,
      client_name: booking.orderingClient.name,
      client_email: booking.orderingClient.email,
      client_phone: booking.orderingClient.phone || null,
      client_address: booking.orderingClient.address,
      client_postal_code: booking.orderingClient.postalCode || null,
      patient_name: booking.patient.name,
      patient_address: booking.patient.address,
      patient_postal_code: booking.patient.postalCode || null,
      patient_relationship: booking.patient.relationship || null,
      preferred_gender: booking.patient.preferredGender || null,
      preferred_languages: booking.patient.preferredLanguages || null,
      scheduled_date: booking.date,
      start_time: booking.startTime,
      end_time: booking.endTime,
      hours: booking.hours,
      hourly_rate: booking.hourlyRate,
      subtotal: booking.subtotal,
      surge_amount: booking.surgeAmount || 0,
      total: booking.total,
      service_type: booking.serviceType,
      status: "pending",
      payment_status: booking.paymentStatus || "invoice-pending",
      stripe_payment_intent_id: booking.stripePaymentIntentId || null,
      is_asap: booking.isAsap || false,
      is_transport_booking: booking.isTransportBooking || false,
      pickup_address: booking.pickupAddress || null,
      pickup_postal_code: booking.pickupPostalCode || null,
      special_notes: booking.specialNotes || null,
      psw_assigned: null,
      psw_first_name: null,
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error inserting booking to Supabase:", error);
    // Fallback to localStorage
    const localBookings = getBookings();
    const newBooking: BookingData = {
      ...booking,
      id: bookingCode,
      createdAt: now,
    };
    localBookings.push(newBooking);
    saveLocalBookings(localBookings);
    return newBooking;
  }
  
  const newBooking = mapDbToBooking(insertedRow);
  
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
  if (booking.patient.preferredLanguages && booking.patient.preferredLanguages.length > 0) {
    trackJobLanguage(newBooking.id, booking.patient.preferredLanguages);
  }
  
  // Send confirmation email
  await sendBookingConfirmationEmail(
    booking.orderingClient.email,
    booking.orderingClient.name.split(" ")[0],
    newBooking.id,
    booking.date,
    `${booking.startTime} - ${booking.endTime}`,
    booking.serviceType
  );
  
  // Create a shift record so PSWs can see and claim this job
  addShift({
    bookingId: newBooking.id,
    pswId: "",
    pswName: "",
    clientName: booking.orderingClient.name,
    clientFirstName: booking.orderingClient.name.split(" ")[0],
    clientPhone: booking.orderingClient.phone,
    clientEmail: booking.orderingClient.email, // Store client email for Job Claimed notification
    patientAddress: booking.patient.address,
    postalCode: booking.patient.postalCode,
    scheduledStart: booking.startTime,
    scheduledEnd: booking.endTime,
    scheduledDate: booking.date,
    services: booking.serviceType,
    preferredLanguages: booking.patient.preferredLanguages,
    preferredGender: booking.patient.preferredGender,
    pickupAddress: booking.pickupAddress,
    pickupPostalCode: booking.pickupPostalCode,
    dropoffAddress: booking.dropoffAddress,
    dropoffPostalCode: booking.dropoffPostalCode,
    isTransportShift: booking.isTransportBooking,
    agreementAccepted: false,
    overtimeMinutes: 0,
    flaggedForOvertime: false,
    postedAt: now,
    status: "available",
  });
  
  return newBooking;
};

// Update a booking in Supabase
export const updateBooking = async (id: string, updates: Partial<BookingData>): Promise<BookingData | null> => {
  const dbUpdates: any = {};
  
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.paymentStatus) dbUpdates.payment_status = updates.paymentStatus;
  if (updates.pswAssigned !== undefined) dbUpdates.psw_assigned = updates.pswAssigned;
  if (updates.pswFirstName !== undefined) dbUpdates.psw_first_name = updates.pswFirstName;
  if (updates.wasRefunded !== undefined) dbUpdates.was_refunded = updates.wasRefunded;
  
  const { data, error } = await supabase
    .from("bookings")
    .update(dbUpdates)
    .eq("booking_code", id)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating booking:", error);
    return null;
  }
  
  return mapDbToBooking(data);
};

// Get a single booking by ID
export const getBookingById = async (id: string): Promise<BookingData | null> => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("booking_code", id)
    .single();
  
  if (error) {
    console.error("Error fetching booking:", error);
    return null;
  }
  
  return mapDbToBooking(data);
};

// Get active bookings (for admin view)
export const getActiveBookings = async (): Promise<BookingData[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .in("status", ["active", "pending"])
    .order("scheduled_date", { ascending: true });
  
  if (error) {
    console.error("Error fetching active bookings:", error);
    return [];
  }
  
  return data.map(mapDbToBooking);
};

// Cancel a booking
export const cancelBooking = async (id: string, refund: boolean = false): Promise<BookingData | null> => {
  return updateBooking(id, { 
    status: "cancelled",
    wasRefunded: refund,
    paymentStatus: refund ? "refunded" : "invoice-pending"
  });
};

// Assign PSW to booking
export const assignPSW = async (bookingId: string, pswId: string, pswFirstName: string): Promise<BookingData | null> => {
  return updateBooking(bookingId, { 
    pswAssigned: pswId,
    pswFirstName: pswFirstName,
    status: "active"
  });
};

// Archive a booking (removes from active views but preserves record)
export const archiveBooking = async (id: string): Promise<BookingData | null> => {
  return updateBooking(id, { status: "archived" });
};

// Restore an archived booking back to pending
export const restoreBooking = async (id: string): Promise<BookingData | null> => {
  return updateBooking(id, { status: "pending" });
};

// Bulk archive past-due bookings that are not completed or in-progress
export const archivePastDueBookings = async (): Promise<{ archived: number; error?: string }> => {
  const today = new Date().toISOString().split("T")[0];
  
  // Get all bookings that are past due and not completed/in-progress/archived
  const { data, error } = await supabase
    .from("bookings")
    .select("id, booking_code")
    .lt("scheduled_date", today)
    .not("status", "in", '("completed","in-progress","archived")');
  
  if (error) {
    console.error("Error fetching past-due bookings:", error);
    return { archived: 0, error: error.message };
  }
  
  if (!data || data.length === 0) {
    return { archived: 0 };
  }
  
  // Update all matching bookings to archived
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "archived" })
    .lt("scheduled_date", today)
    .not("status", "in", '("completed","in-progress","archived")');
  
  if (updateError) {
    console.error("Error archiving bookings:", updateError);
    return { archived: 0, error: updateError.message };
  }
  
  return { archived: data.length };
};

// Get archived bookings
export const getArchivedBookings = async (): Promise<BookingData[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "archived")
    .order("scheduled_date", { ascending: false });
  
  if (error) {
    console.error("Error fetching archived bookings:", error);
    return [];
  }
  
  return data.map(mapDbToBooking);
};
