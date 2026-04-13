import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "./useSupabaseAuth";

export interface SavedPaymentMethod {
  brand: string;
  last4: string;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
}

export const useSavedPaymentMethod = () => {
  const { user } = useSupabaseAuth();
  const [savedMethod, setSavedMethod] = useState<SavedPaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setSavedMethod(null);
      setIsLoading(false);
      return;
    }

    const fetchSavedMethod = async () => {
      setIsLoading(true);
      try {
        // Find most recent paid booking with a saved payment method
        const { data, error } = await supabase
          .from("bookings")
          .select("stripe_customer_id, stripe_payment_method_id, stripe_payment_intent_id")
          .eq("client_email", user.email)
          .not("stripe_payment_method_id", "is", null)
          .not("stripe_customer_id", "is", null)
          .eq("payment_status", "paid")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data?.stripe_payment_method_id || !data?.stripe_customer_id) {
          setSavedMethod(null);
        } else {
          // We can't get card brand/last4 from client side without Stripe API call
          // We'll infer from the payment method ID prefix or use a generic display
          setSavedMethod({
            brand: "card",
            last4: "••••",
            stripeCustomerId: data.stripe_customer_id,
            stripePaymentMethodId: data.stripe_payment_method_id,
          });
        }
      } catch (err) {
        console.error("Error fetching saved payment method:", err);
        setSavedMethod(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedMethod();
  }, [user?.email]);

  return { savedMethod, isLoading };
};
