// Real-time bookings hook using Supabase Realtime
// Provides live updates for booking status changes

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

interface UseRealtimeBookingsOptions {
  initialFetch?: boolean;
  filterByEmail?: string;
  filterByStatus?: string[];
}

export const useRealtimeBookings = (options: UseRealtimeBookingsOptions = {}) => {
  const { initialFetch = true, filterByEmail, filterByStatus } = options;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    
    let query = supabase
      .from("bookings")
      .select("*")
      .order("scheduled_date", { ascending: false });

    if (filterByEmail) {
      query = query.eq("client_email", filterByEmail);
    }

    if (filterByStatus && filterByStatus.length > 0) {
      query = query.in("status", filterByStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching bookings:", error);
    } else {
      setBookings(data || []);
    }
    
    setIsLoading(false);
  }, [filterByEmail, filterByStatus]);

  useEffect(() => {
    if (initialFetch) {
      fetchBookings();
    }
  }, [initialFetch, fetchBookings]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          console.log("Realtime booking update:", payload);
          
          if (payload.eventType === "INSERT") {
            const newBooking = payload.new as Booking;
            // Only add if it matches filters
            if (filterByEmail && newBooking.client_email !== filterByEmail) return;
            if (filterByStatus && !filterByStatus.includes(newBooking.status)) return;
            
            setBookings((prev) => [newBooking, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updatedBooking = payload.new as Booking;
            setBookings((prev) =>
              prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setBookings((prev) => prev.filter((b) => b.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterByEmail, filterByStatus]);

  // Derived states
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const confirmedBookings = bookings.filter(
    (b) => (b.status === "active" || b.status === "confirmed") && b.psw_assigned
  );
  const inProgressBookings = bookings.filter((b) => b.status === "in-progress");
  const completedBookings = bookings.filter((b) => b.status === "completed");

  return {
    bookings,
    pendingBookings,
    confirmedBookings,
    inProgressBookings,
    completedBookings,
    isLoading,
    refetch: fetchBookings,
  };
};

export default useRealtimeBookings;
