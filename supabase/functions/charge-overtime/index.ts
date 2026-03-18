import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Admin auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: adminRole } = await supabase
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // --- End auth check ---

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { overtimeChargeId, action } = await req.json();

    if (!overtimeChargeId) {
      return new Response(JSON.stringify({ error: "overtimeChargeId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the overtime charge record
    const { data: otCharge, error: fetchError } = await supabase
      .from("overtime_charges")
      .select("*")
      .eq("id", overtimeChargeId)
      .single();

    if (fetchError || !otCharge) {
      return new Response(JSON.stringify({ error: "Overtime charge not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // REJECT action
    if (action === "reject") {
      await supabase
        .from("overtime_charges")
        .update({ status: "rejected", admin_approved_by: callerId, approved_at: new Date().toISOString() })
        .eq("id", overtimeChargeId);

      // Clear overtime flag on booking
      await supabase
        .from("bookings")
        .update({ flagged_for_overtime: false })
        .eq("id", otCharge.booking_id);

      return new Response(
        JSON.stringify({ success: true, status: "rejected", message: "Overtime charge rejected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // APPROVE action - charge off-session
    if (otCharge.status !== "pending_admin") {
      return new Response(
        JSON.stringify({ error: `Cannot process charge with status: ${otCharge.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = otCharge.stripe_customer_id;
    const paymentMethodId = otCharge.stripe_payment_method_id;
    const chargeAmountCents = Math.round(otCharge.overtime_amount * 100);

    if (!customerId || !paymentMethodId) {
      // No saved payment method - mark as failed, needs manual payment link
      await supabase
        .from("overtime_charges")
        .update({
          status: "failed",
          failure_reason: "No saved payment method on file",
          admin_approved_by: callerId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", overtimeChargeId);

      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          message: "No saved payment method. Client will need to pay manually.",
          requiresManualPayment: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      // Create and confirm the payment intent off-session
      const paymentIntent = await stripe.paymentIntents.create({
        amount: chargeAmountCents,
        currency: "cad",
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          booking_id: otCharge.booking_id,
          booking_code: otCharge.booking_code,
          type: "overtime_charge",
          overtime_minutes: String(otCharge.overtime_minutes),
          billable_minutes: String(otCharge.billable_minutes),
          client_name: otCharge.client_name,
          psw_name: otCharge.psw_name,
          overtime_charge_id: overtimeChargeId,
        },
        description: `PSW Direct - Overtime Charge (${otCharge.billable_minutes} min) - ${otCharge.booking_code}`,
      });

      console.log("💳 Overtime charge successful:", paymentIntent.id, "Amount:", otCharge.overtime_amount);

      // Update overtime charge record
      await supabase
        .from("overtime_charges")
        .update({
          status: "charged",
          stripe_payment_intent_id: paymentIntent.id,
          admin_approved_by: callerId,
          approved_at: new Date().toISOString(),
          charged_at: new Date().toISOString(),
        })
        .eq("id", overtimeChargeId);

      // Update booking with overtime info
      const { data: booking } = await supabase
        .from("bookings")
        .select("total")
        .eq("id", otCharge.booking_id)
        .single();

      if (booking) {
        const newTotal = Number(booking.total) + otCharge.overtime_amount;
        await supabase
          .from("bookings")
          .update({
            total: newTotal,
            payment_status: "overtime_adjusted",
            overtime_payment_intent_id: paymentIntent.id,
          })
          .eq("id", otCharge.booking_id);
      }

      // Update payroll entry with overtime pay
      const pswHourlyRate = otCharge.hourly_rate >= 35 ? 28 : otCharge.hourly_rate >= 30 ? 25 : 22;
      const pswOvertimePay = (otCharge.billable_minutes / 60) * pswHourlyRate;

      const { data: currentPayroll } = await supabase
        .from("payroll_entries")
        .select("hours_worked, total_owed")
        .eq("shift_id", otCharge.booking_id)
        .single();

      if (currentPayroll) {
        const newHoursWorked = Number(currentPayroll.hours_worked) + (otCharge.billable_minutes / 60);
        const newTotalOwed = Number(currentPayroll.total_owed) + pswOvertimePay;

        await supabase
          .from("payroll_entries")
          .update({
            hours_worked: newHoursWorked,
            total_owed: newTotalOwed,
            surcharge_applied: pswOvertimePay,
            status: "overtime_adjusted",
          })
          .eq("shift_id", otCharge.booking_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "charged",
          paymentIntentId: paymentIntent.id,
          message: `Charged $${otCharge.overtime_amount.toFixed(2)} for ${otCharge.billable_minutes} min overtime`,
          overtimeAmount: otCharge.overtime_amount,
          pswOvertimePay,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (stripeError: any) {
      console.error("Stripe off-session charge failed:", stripeError);

      const failureReason = stripeError.code === "authentication_required"
        ? "Card requires authentication - client must complete payment manually"
        : stripeError.message || "Payment failed";

      await supabase
        .from("overtime_charges")
        .update({
          status: "failed",
          failure_reason: failureReason,
          admin_approved_by: callerId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", overtimeChargeId);

      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          message: failureReason,
          requiresManualPayment: stripeError.code === "authentication_required",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Overtime charge error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
