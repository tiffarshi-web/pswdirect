import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "./useSupabaseAuth";

export interface Booking {
  id: string;
  booking_code: string;
  client_email: string;
  client_name: string;
  client_phone: string | null;
  client_address: string;
  patient_name: string;
  patient_address: string;
  service_type: string[];
  scheduled_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  hourly_rate: number;
  total: number;
  status: string;
  payment_status: string;
  is_asap: boolean;
  psw_assigned: string | null;
  psw_first_name: string | null;
  psw_photo_url: string | null;
  psw_vehicle_photo_url: string | null;
  psw_license_plate: string | null;
  is_transport_booking: boolean;
  pickup_address: string | null;
  dropoff_address: string | null;
  created_at: string;
}

export const useClientBookings = () => {
  const { user, clientProfile } = useSupabaseAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = async () => {
    if (!user?.email) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("client_email", user.email)
        .order("scheduled_date", { ascending: false });

      if (error) {
        console.error("Error fetching bookings:", error);
      } else {
        setBookings(data || []);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetchBookings();
    } else {
      setIsLoading(false);
    }
  }, [user?.email]);

  // Get in-progress bookings (currently happening)
  const inProgressBookings = bookings.filter(
    (b) => b.status === "in-progress"
  );

  // Get confirmed bookings (PSW assigned, upcoming)
  const confirmedBookings = bookings.filter((b) => {
    const bookingDate = new Date(b.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return b.status === "active" && b.psw_assigned && bookingDate >= today;
  });

  // Get pending bookings (waiting for PSW assignment)
  const pendingBookings = bookings.filter((b) => {
    const bookingDate = new Date(b.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return b.status === "pending" && bookingDate >= today;
  });

  // Combined active bookings (for backward compatibility)
  const activeBookings = [...inProgressBookings, ...confirmedBookings];

  // Get upcoming bookings (pending or active, future dates)
  const upcomingBookings = bookings.filter((b) => {
    const bookingDate = new Date(b.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      (b.status === "pending" || b.status === "active") &&
      bookingDate >= today
    );
  });

  // Get past bookings (completed)
  const pastBookings = bookings.filter((b) => b.status === "completed");

  // Get client's saved info for re-booking
  const getSavedClientInfo = () => {
    if (clientProfile) {
      return {
        name: clientProfile.full_name || clientProfile.first_name || "",
        email: clientProfile.email,
        phone: clientProfile.phone || "",
        address: clientProfile.default_address || "",
        postalCode: clientProfile.default_postal_code || "",
      };
    }
    
    // Fallback to most recent booking
    if (bookings.length > 0) {
      const latest = bookings[0];
      return {
        name: latest.client_name,
        email: latest.client_email,
        phone: latest.client_phone || "",
        address: latest.client_address,
        postalCode: "",
      };
    }

    return null;
  };

  return {
    bookings,
    activeBookings,
    upcomingBookings,
    pastBookings,
    pendingBookings,
    confirmedBookings,
    inProgressBookings,
    isLoading,
    refetch: fetchBookings,
    getSavedClientInfo,
  };
};