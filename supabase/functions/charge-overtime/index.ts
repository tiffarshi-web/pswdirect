import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Overtime charging rules:
// 0-14 min: No charge (Grace Period)
// 15-30 min: Charge for 30 minutes
// 31-60 min: Charge for 1 full hour

interface OvertimeRequest {
  bookingId: string;
  shiftId: string;
  customerEmail: string;
  overtimeMinutes: number;
  hourlyRate: number; // $30 or $35 depending on service
  pswId: string;
  pswName: string;
  clientName: string;
  isDryRun?: boolean;
}

const calculateOvertimeCharge = (overtimeMinutes: number, hourlyRate: number): {
  chargeAmount: number;
  billableMinutes: number;
  chargeDescription: string;
} => {
  // Grace period: 0-14 minutes = no charge
  if (overtimeMinutes <= 14) {
    return { chargeAmount: 0, billableMinutes: 0, chargeDescription: "Within grace period" };
  }
  
  // 15-30 minutes: Charge for 30 minutes
  if (overtimeMinutes <= 30) {
    const chargeAmount = Math.round((hourlyRate / 2) * 100); // 30 min = half hour rate, in cents
    return { chargeAmount, billableMinutes: 30, chargeDescription: "30-minute overtime block" };
  }
  
  // 31-60 minutes: Charge for 1 full hour
  if (overtimeMinutes <= 60) {
    const chargeAmount = Math.round(hourlyRate * 100); // Full hour rate in cents
    return { chargeAmount, billableMinutes: 60, chargeDescription: "1-hour overtime block" };
  }
  
  // 60+ minutes: Charge in full hour increments
  const hours = Math.ceil(overtimeMinutes / 60);
  const chargeAmount = Math.round(hours * hourlyRate * 100);
  return { chargeAmount, billableMinutes: hours * 60, chargeDescription: `${hours}-hour overtime block` };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const {
      bookingId,
      shiftId,
      customerEmail,
      overtimeMinutes,
      hourlyRate,
      pswId,
      pswName,
      clientName,
      isDryRun,
    }: OvertimeRequest = await req.json();

    console.log("⏱️ Overtime charge request:", { bookingId, shiftId, overtimeMinutes, hourlyRate });

    // Calculate the overtime charge
    const { chargeAmount, billableMinutes, chargeDescription } = calculateOvertimeCharge(overtimeMinutes, hourlyRate);

    // No charge needed (within grace period)
    if (chargeAmount === 0) {
      console.log("✅ Within grace period, no overtime charge needed");
      return new Response(
        JSON.stringify({
          success: true,
          charged: false,
          message: "Within 14-minute grace period - no charge applied",
          overtimeMinutes,
          billableMinutes: 0,
          chargeAmount: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dry run mode for testing
    if (isDryRun) {
      console.log("🧪 DRY RUN: Would charge", chargeAmount / 100, "CAD for overtime");
      return new Response(
        JSON.stringify({
          success: true,
          charged: false,
          isDryRun: true,
          message: `Dry run: Would charge $${(chargeAmount / 100).toFixed(2)} for ${chargeDescription}`,
          overtimeMinutes,
          billableMinutes,
          chargeAmount: chargeAmount / 100,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find Stripe customer by email
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    if (existingCustomers.data.length === 0) {
      throw new Error("No payment method on file for this customer");
    }

    const customerId = existingCustomers.data[0].id;

    // Get the customer's default payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 1,
    });

    if (paymentMethods.data.length === 0) {
      throw new Error("No saved payment method found for customer");
    }

    const paymentMethodId = paymentMethods.data[0].id;

    // Create and confirm the payment intent immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount: chargeAmount,
      currency: "cad",
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        bookingId,
        shiftId,
        type: "overtime_charge",
        overtimeMinutes: String(overtimeMinutes),
        billableMinutes: String(billableMinutes),
        clientName,
        pswName,
      },
      description: `PSW Direct - Overtime Charge (${chargeDescription}) - Booking ${bookingId}`,
    });

    console.log("💳 Overtime charge successful:", paymentIntent.id, "Amount:", chargeAmount / 100, "CAD");

    // Update the booking with new total in Supabase
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("total, subtotal")
      .eq("booking_code", bookingId)
      .single();

    if (!fetchError && booking) {
      const newTotal = Number(booking.total) + (chargeAmount / 100);
      await supabase
        .from("bookings")
        .update({
          total: newTotal,
          payment_status: "overtime_adjusted",
        })
        .eq("booking_code", bookingId);

      console.log("📊 Updated booking total:", booking.total, "->", newTotal);
    }

    // Update payroll entry with overtime pay for PSW
    // PSW gets paid for the overtime at their rate ($22-28/hr based on service)
    const pswHourlyRate = hourlyRate >= 35 ? 28 : hourlyRate >= 30 ? 25 : 22; // PSW rates
    const pswOvertimePay = (billableMinutes / 60) * pswHourlyRate;

    // Fetch current payroll entry to update hours
    const { data: currentPayroll } = await supabase
      .from("payroll_entries")
      .select("hours_worked, total_owed")
      .eq("shift_id", shiftId)
      .single();

    if (currentPayroll) {
      const newHoursWorked = Number(currentPayroll.hours_worked) + (billableMinutes / 60);
      const newTotalOwed = Number(currentPayroll.total_owed) + pswOvertimePay;

      const { error: payrollError } = await supabase
        .from("payroll_entries")
        .update({
          hours_worked: newHoursWorked,
          total_owed: newTotalOwed,
          surcharge_applied: pswOvertimePay,
          status: "overtime_adjusted",
        })
        .eq("shift_id", shiftId);

      if (payrollError) {
        console.error("Payroll update error:", payrollError);
      } else {
        console.log("💰 Updated payroll with overtime pay:", pswOvertimePay);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        charged: true,
        paymentIntentId: paymentIntent.id,
        message: `Charged $${(chargeAmount / 100).toFixed(2)} for ${chargeDescription}`,
        overtimeMinutes,
        billableMinutes,
        chargeAmount: chargeAmount / 100,
        pswOvertimePay,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Overtime charge error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});