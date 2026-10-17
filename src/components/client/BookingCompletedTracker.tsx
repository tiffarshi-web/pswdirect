import { useEffect } from "react";
import { trackBookingCompleted } from "@/lib/analytics";

/** Rendered only inside a booking flow's success screen. Sends no personal data. */
const BookingCompletedTracker = ({ bookingId, flow }: { bookingId?: string; flow: string }) => {
  useEffect(() => {
    trackBookingCompleted(bookingId, flow);
  }, [bookingId, flow]);
  return null;
};

export default BookingCompletedTracker;
