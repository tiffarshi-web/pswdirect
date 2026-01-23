import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundRequest {
  bookingCode: string;
  amount?: number; // Optional for partial refunds (in dollars)
  reason: string;
  processedBy: string;
  isDryRun: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bookingCode, amount, reason, processedBy, isDryRun }: RefundRequest = await req.json();

    if (!bookingCode) {
      return new Response(
        JSON.stringify({ error: "Missing bookingCode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing refund request:", { bookingCode, amount, reason, processedBy, isDryRun });

    // Fetch the booking from database
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_code", bookingCode)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already refunded
    if (booking.was_refunded) {
      return new Response(
        JSON.stringify({ error: "Booking has already been refunded" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refundAmount = amount || booking.total;
    const refundAmountCents = Math.round(refundAmount * 100);

    // Create refund log entry
    const refundLogData = {
      booking_id: booking.id,
      booking_code: bookingCode,
      client_name: booking.client_name,
      client_email: booking.client_email,
      amount: refundAmount,
      reason: reason || "Manual refund",
      status: isDryRun ? "dry-run" : "pending",
      processed_by: processedBy,
      is_dry_run: isDryRun,
    };

    // Handle dry run mode
    if (isDryRun) {
      console.log("DRY RUN MODE - No actual Stripe refund issued");
      
      // Insert dry run log
      const { data: refundLog, error: logError } = await supabase
        .from("refund_logs")
        .insert({
          ...refundLogData,
          status: "dry-run",
          stripe_refund_id: `dry-run-${Date.now()}`,
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (logError) {
        console.error("Failed to log dry run refund:", logError);
      }

      // Update booking status for dry run
      await supabase
        .from("bookings")
        .update({
          was_refunded: true,
          payment_status: "refunded",
          refund_amount: refundAmount,
          refunded_at: new Date().toISOString(),
          refund_reason: reason,
        })
        .eq("booking_code", bookingCode);

      return new Response(
        JSON.stringify({
          success: true,
          isDryRun: true,
          message: "Dry run refund simulated successfully",
          refundAmount,
          stripeRefundId: null,
          refundLogId: refundLog?.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we have a Stripe payment intent to refund
    if (!booking.stripe_payment_intent_id) {
      console.log("No Stripe payment intent found, processing as manual refund");
      
      // Insert refund log without Stripe
      const { data: refundLog, error: logError } = await supabase
        .from("refund_logs")
        .insert({
          ...refundLogData,
          status: "processed",
          stripe_refund_id: `manual-${Date.now()}`,
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (logError) {
        console.error("Failed to log manual refund:", logError);
      }

      // Update booking
      await supabase
        .from("bookings")
        .update({
          was_refunded: true,
          payment_status: "refunded",
          refund_amount: refundAmount,
          refunded_at: new Date().toISOString(),
          refund_reason: reason,
        })
        .eq("booking_code", bookingCode);

      return new Response(
        JSON.stringify({
          success: true,
          isDryRun: false,
          message: "Manual refund recorded (no Stripe payment to refund)",
          refundAmount,
          stripeRefundId: null,
          refundLogId: refundLog?.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process actual Stripe refund
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    console.log("Creating Stripe refund for payment intent:", booking.stripe_payment_intent_id);

    const refund = await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: "requested_by_customer",
      metadata: {
        booking_code: bookingCode,
        processed_by: processedBy,
        original_amount: booking.total.toString(),
      },
    });

    console.log("Stripe refund created:", refund.id);

    // Insert successful refund log
    const { data: refundLog, error: logError } = await supabase
      .from("refund_logs")
      .insert({
        ...refundLogData,
        status: "processed",
        stripe_refund_id: refund.id,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to log refund:", logError);
    }

    // Update booking with refund details
    await supabase
      .from("bookings")
      .update({
        was_refunded: true,
        payment_status: "refunded",
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
      })
      .eq("booking_code", bookingCode);

    return new Response(
      JSON.stringify({
        success: true,
        isDryRun: false,
        message: "Refund processed successfully",
        refundAmount,
        stripeRefundId: refund.id,
        refundLogId: refundLog?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Refund processing error:", error);
    
    // Log failed refund attempt
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const body = await req.clone().json().catch(() => ({}));
      
      await supabase.from("refund_logs").insert({
        booking_id: body.bookingCode || "unknown",
        booking_code: body.bookingCode,
        client_name: "Unknown",
        client_email: "unknown@error.com",
        amount: 0,
        reason: body.reason || "Error during refund",
        status: "failed",
        processed_by: body.processedBy || "system",
        is_dry_run: body.isDryRun || false,
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ error: error.message || "Failed to process refund" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
