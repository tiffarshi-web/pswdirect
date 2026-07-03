
CREATE OR REPLACE FUNCTION public.enforce_booking_column_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_violations text[] := ARRAY[]::text[];
BEGIN
  -- Admins bypass all column checks.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Service role / unauthenticated definer contexts bypass.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Financial / pricing
  IF NEW.psw_pay_rate            IS DISTINCT FROM OLD.psw_pay_rate            THEN v_violations := array_append(v_violations, 'psw_pay_rate'); END IF;
  IF NEW.hourly_rate             IS DISTINCT FROM OLD.hourly_rate             THEN v_violations := array_append(v_violations, 'hourly_rate'); END IF;
  IF NEW.subtotal                IS DISTINCT FROM OLD.subtotal                THEN v_violations := array_append(v_violations, 'subtotal'); END IF;
  IF NEW.surge_amount            IS DISTINCT FROM OLD.surge_amount            THEN v_violations := array_append(v_violations, 'surge_amount'); END IF;
  IF NEW.total                   IS DISTINCT FROM OLD.total                   THEN v_violations := array_append(v_violations, 'total'); END IF;
  IF NEW.hst_amount              IS DISTINCT FROM OLD.hst_amount              THEN v_violations := array_append(v_violations, 'hst_amount'); END IF;
  IF NEW.is_taxable              IS DISTINCT FROM OLD.is_taxable              THEN v_violations := array_append(v_violations, 'is_taxable'); END IF;
  IF NEW.payment_status          IS DISTINCT FROM OLD.payment_status          THEN v_violations := array_append(v_violations, 'payment_status'); END IF;

  -- Verification / admin state
  IF NEW.verification_status     IS DISTINCT FROM OLD.verification_status     THEN v_violations := array_append(v_violations, 'verification_status'); END IF;

  -- Billing / adjustment
  IF NEW.billing_note                   IS DISTINCT FROM OLD.billing_note                   THEN v_violations := array_append(v_violations, 'billing_note'); END IF;
  IF NEW.billing_adjustment_required    IS DISTINCT FROM OLD.billing_adjustment_required    THEN v_violations := array_append(v_violations, 'billing_adjustment_required'); END IF;
  IF NEW.billing_adjustment_handled_at  IS DISTINCT FROM OLD.billing_adjustment_handled_at  THEN v_violations := array_append(v_violations, 'billing_adjustment_handled_at'); END IF;
  IF NEW.billing_adjustment_handled_by  IS DISTINCT FROM OLD.billing_adjustment_handled_by  THEN v_violations := array_append(v_violations, 'billing_adjustment_handled_by'); END IF;
  IF NEW.adjustment_amount              IS DISTINCT FROM OLD.adjustment_amount              THEN v_violations := array_append(v_violations, 'adjustment_amount'); END IF;
  IF NEW.adjustment_status              IS DISTINCT FROM OLD.adjustment_status              THEN v_violations := array_append(v_violations, 'adjustment_status'); END IF;
  IF NEW.adjustment_charged_at          IS DISTINCT FROM OLD.adjustment_charged_at          THEN v_violations := array_append(v_violations, 'adjustment_charged_at'); END IF;
  IF NEW.adjustment_charged_by          IS DISTINCT FROM OLD.adjustment_charged_by          THEN v_violations := array_append(v_violations, 'adjustment_charged_by'); END IF;
  IF NEW.adjustment_failure_reason      IS DISTINCT FROM OLD.adjustment_failure_reason      THEN v_violations := array_append(v_violations, 'adjustment_failure_reason'); END IF;
  IF NEW.adjustment_invoice_id          IS DISTINCT FROM OLD.adjustment_invoice_id          THEN v_violations := array_append(v_violations, 'adjustment_invoice_id'); END IF;
  IF NEW.final_billable_hours           IS DISTINCT FROM OLD.final_billable_hours           THEN v_violations := array_append(v_violations, 'final_billable_hours'); END IF;
  IF NEW.suggested_billable_hours       IS DISTINCT FROM OLD.suggested_billable_hours       THEN v_violations := array_append(v_violations, 'suggested_billable_hours'); END IF;

  -- Refund
  IF NEW.refund_amount           IS DISTINCT FROM OLD.refund_amount           THEN v_violations := array_append(v_violations, 'refund_amount'); END IF;
  IF NEW.refund_reason           IS DISTINCT FROM OLD.refund_reason           THEN v_violations := array_append(v_violations, 'refund_reason'); END IF;
  IF NEW.refunded_at             IS DISTINCT FROM OLD.refunded_at             THEN v_violations := array_append(v_violations, 'refunded_at'); END IF;
  IF NEW.was_refunded            IS DISTINCT FROM OLD.was_refunded            THEN v_violations := array_append(v_violations, 'was_refunded'); END IF;
  IF NEW.cancellation_refund_decision       IS DISTINCT FROM OLD.cancellation_refund_decision       THEN v_violations := array_append(v_violations, 'cancellation_refund_decision'); END IF;
  IF NEW.cancellation_refund_decision_note  IS DISTINCT FROM OLD.cancellation_refund_decision_note  THEN v_violations := array_append(v_violations, 'cancellation_refund_decision_note'); END IF;
  IF NEW.cancellation_refund_decision_by    IS DISTINCT FROM OLD.cancellation_refund_decision_by    THEN v_violations := array_append(v_violations, 'cancellation_refund_decision_by'); END IF;
  IF NEW.cancellation_refund_decision_at    IS DISTINCT FROM OLD.cancellation_refund_decision_at    THEN v_violations := array_append(v_violations, 'cancellation_refund_decision_at'); END IF;

  -- Stripe / payment identifiers
  IF NEW.stripe_payment_intent_id            IS DISTINCT FROM OLD.stripe_payment_intent_id            THEN v_violations := array_append(v_violations, 'stripe_payment_intent_id'); END IF;
  IF NEW.stripe_customer_id                  IS DISTINCT FROM OLD.stripe_customer_id                  THEN v_violations := array_append(v_violations, 'stripe_customer_id'); END IF;
  IF NEW.stripe_payment_method_id            IS DISTINCT FROM OLD.stripe_payment_method_id            THEN v_violations := array_append(v_violations, 'stripe_payment_method_id'); END IF;
  IF NEW.stripe_checkout_session_id          IS DISTINCT FROM OLD.stripe_checkout_session_id          THEN v_violations := array_append(v_violations, 'stripe_checkout_session_id'); END IF;
  IF NEW.stripe_checkout_url                 IS DISTINCT FROM OLD.stripe_checkout_url                 THEN v_violations := array_append(v_violations, 'stripe_checkout_url'); END IF;
  IF NEW.stripe_adjustment_payment_intent_id IS DISTINCT FROM OLD.stripe_adjustment_payment_intent_id THEN v_violations := array_append(v_violations, 'stripe_adjustment_payment_intent_id'); END IF;
  IF NEW.stripe_adjustment_status            IS DISTINCT FROM OLD.stripe_adjustment_status            THEN v_violations := array_append(v_violations, 'stripe_adjustment_status'); END IF;
  IF NEW.overtime_payment_intent_id          IS DISTINCT FROM OLD.overtime_payment_intent_id          THEN v_violations := array_append(v_violations, 'overtime_payment_intent_id'); END IF;
  IF NEW.recovered_from_payment_intent       IS DISTINCT FROM OLD.recovered_from_payment_intent       THEN v_violations := array_append(v_violations, 'recovered_from_payment_intent'); END IF;
  IF NEW.recovery_source                     IS DISTINCT FROM OLD.recovery_source                     THEN v_violations := array_append(v_violations, 'recovery_source'); END IF;
  IF NEW.payment_recovery_alerted_at         IS DISTINCT FROM OLD.payment_recovery_alerted_at         THEN v_violations := array_append(v_violations, 'payment_recovery_alerted_at'); END IF;
  IF NEW.payment_link_sent_at                IS DISTINCT FROM OLD.payment_link_sent_at                THEN v_violations := array_append(v_violations, 'payment_link_sent_at'); END IF;
  IF NEW.payment_link_sent_by                IS DISTINCT FROM OLD.payment_link_sent_by                THEN v_violations := array_append(v_violations, 'payment_link_sent_by'); END IF;
  IF NEW.payment_link_send_count             IS DISTINCT FROM OLD.payment_link_send_count             THEN v_violations := array_append(v_violations, 'payment_link_send_count'); END IF;
  IF NEW.payment_terms_days                  IS DISTINCT FROM OLD.payment_terms_days                  THEN v_violations := array_append(v_violations, 'payment_terms_days'); END IF;
  IF NEW.due_date                            IS DISTINCT FROM OLD.due_date                            THEN v_violations := array_append(v_violations, 'due_date'); END IF;

  -- Payer / third-party billing
  IF NEW.payer_type              IS DISTINCT FROM OLD.payer_type              THEN v_violations := array_append(v_violations, 'payer_type'); END IF;
  IF NEW.payer_name              IS DISTINCT FROM OLD.payer_name              THEN v_violations := array_append(v_violations, 'payer_name'); END IF;
  IF NEW.third_party_payer_mode  IS DISTINCT FROM OLD.third_party_payer_mode  THEN v_violations := array_append(v_violations, 'third_party_payer_mode'); END IF;
  IF NEW.cc_email                IS DISTINCT FROM OLD.cc_email                THEN v_violations := array_append(v_violations, 'cc_email'); END IF;

  -- VAC fields
  IF NEW.vac_program_of_choice   IS DISTINCT FROM OLD.vac_program_of_choice   THEN v_violations := array_append(v_violations, 'vac_program_of_choice'); END IF;
  IF NEW.vac_provider_number     IS DISTINCT FROM OLD.vac_provider_number     THEN v_violations := array_append(v_violations, 'vac_provider_number'); END IF;
  IF NEW.vac_benefit_code        IS DISTINCT FROM OLD.vac_benefit_code        THEN v_violations := array_append(v_violations, 'vac_benefit_code'); END IF;
  IF NEW.vac_service_type        IS DISTINCT FROM OLD.vac_service_type        THEN v_violations := array_append(v_violations, 'vac_service_type'); END IF;
  IF NEW.vac_authorization_number IS DISTINCT FROM OLD.vac_authorization_number THEN v_violations := array_append(v_violations, 'vac_authorization_number'); END IF;
  IF NEW.vac_status              IS DISTINCT FROM OLD.vac_status              THEN v_violations := array_append(v_violations, 'vac_status'); END IF;
  IF NEW.veteran_k_number        IS DISTINCT FROM OLD.veteran_k_number        THEN v_violations := array_append(v_violations, 'veteran_k_number'); END IF;

  -- Insurance
  IF NEW.insurance_member_id      IS DISTINCT FROM OLD.insurance_member_id      THEN v_violations := array_append(v_violations, 'insurance_member_id'); END IF;
  IF NEW.insurance_claim_number   IS DISTINCT FROM OLD.insurance_claim_number   THEN v_violations := array_append(v_violations, 'insurance_claim_number'); END IF;
  IF NEW.insurance_contact_name   IS DISTINCT FROM OLD.insurance_contact_name   THEN v_violations := array_append(v_violations, 'insurance_contact_name'); END IF;
  IF NEW.insurance_contact_email  IS DISTINCT FROM OLD.insurance_contact_email  THEN v_violations := array_append(v_violations, 'insurance_contact_email'); END IF;
  IF NEW.insurance_contact_phone  IS DISTINCT FROM OLD.insurance_contact_phone  THEN v_violations := array_append(v_violations, 'insurance_contact_phone'); END IF;
  IF NEW.insurance_claim_notes    IS DISTINCT FROM OLD.insurance_claim_notes    THEN v_violations := array_append(v_violations, 'insurance_claim_notes'); END IF;
  IF NEW.insurance_group_number   IS DISTINCT FROM OLD.insurance_group_number   THEN v_violations := array_append(v_violations, 'insurance_group_number'); END IF;

  -- Manual overrides / accounting archive
  IF NEW.manual_check_in            IS DISTINCT FROM OLD.manual_check_in            THEN v_violations := array_append(v_violations, 'manual_check_in'); END IF;
  IF NEW.manual_check_out           IS DISTINCT FROM OLD.manual_check_out           THEN v_violations := array_append(v_violations, 'manual_check_out'); END IF;
  IF NEW.manual_override_at         IS DISTINCT FROM OLD.manual_override_at         THEN v_violations := array_append(v_violations, 'manual_override_at'); END IF;
  IF NEW.manual_override_by         IS DISTINCT FROM OLD.manual_override_by         THEN v_violations := array_append(v_violations, 'manual_override_by'); END IF;
  IF NEW.manual_override_reason     IS DISTINCT FROM OLD.manual_override_reason     THEN v_violations := array_append(v_violations, 'manual_override_reason'); END IF;
  IF NEW.archived_to_accounting_at  IS DISTINCT FROM OLD.archived_to_accounting_at  THEN v_violations := array_append(v_violations, 'archived_to_accounting_at'); END IF;
  IF NEW.original_checked_in_at     IS DISTINCT FROM OLD.original_checked_in_at     THEN v_violations := array_append(v_violations, 'original_checked_in_at'); END IF;
  IF NEW.original_signed_out_at     IS DISTINCT FROM OLD.original_signed_out_at     THEN v_violations := array_append(v_violations, 'original_signed_out_at'); END IF;

  -- Admin-owned email/audit signatures
  IF NEW.psw_assigned_email_sent_for      IS DISTINCT FROM OLD.psw_assigned_email_sent_for      THEN v_violations := array_append(v_violations, 'psw_assigned_email_sent_for'); END IF;
  IF NEW.order_update_email_sent_signature IS DISTINCT FROM OLD.order_update_email_sent_signature THEN v_violations := array_append(v_violations, 'order_update_email_sent_signature'); END IF;
  IF NEW.cancellation_email_sent_at       IS DISTINCT FROM OLD.cancellation_email_sent_at       THEN v_violations := array_append(v_violations, 'cancellation_email_sent_at'); END IF;
  IF NEW.refund_email_sent_at             IS DISTINCT FROM OLD.refund_email_sent_at             THEN v_violations := array_append(v_violations, 'refund_email_sent_at'); END IF;
  IF NEW.admin_new_order_email_sent_at    IS DISTINCT FROM OLD.admin_new_order_email_sent_at    THEN v_violations := array_append(v_violations, 'admin_new_order_email_sent_at'); END IF;
  IF NEW.booking_confirmation_sent_at     IS DISTINCT FROM OLD.booking_confirmation_sent_at     THEN v_violations := array_append(v_violations, 'booking_confirmation_sent_at'); END IF;
  IF NEW.payment_success_email_sent_at    IS DISTINCT FROM OLD.payment_success_email_sent_at    THEN v_violations := array_append(v_violations, 'payment_success_email_sent_at'); END IF;
  IF NEW.psw_assigned_email_sent_at       IS DISTINCT FROM OLD.psw_assigned_email_sent_at       THEN v_violations := array_append(v_violations, 'psw_assigned_email_sent_at'); END IF;
  IF NEW.psw_reassigned_email_sent_at     IS DISTINCT FROM OLD.psw_reassigned_email_sent_at     THEN v_violations := array_append(v_violations, 'psw_reassigned_email_sent_at'); END IF;
  IF NEW.order_updated_email_sent_at      IS DISTINCT FROM OLD.order_updated_email_sent_at      THEN v_violations := array_append(v_violations, 'order_updated_email_sent_at'); END IF;
  IF NEW.order_cancelled_email_sent_at    IS DISTINCT FROM OLD.order_cancelled_email_sent_at    THEN v_violations := array_append(v_violations, 'order_cancelled_email_sent_at'); END IF;
  IF NEW.completion_email_sent_at         IS DISTINCT FROM OLD.completion_email_sent_at         THEN v_violations := array_append(v_violations, 'completion_email_sent_at'); END IF;
  IF NEW.invoice_sent_at                  IS DISTINCT FROM OLD.invoice_sent_at                  THEN v_violations := array_append(v_violations, 'invoice_sent_at'); END IF;
  IF NEW.care_sheet_sent_at               IS DISTINCT FROM OLD.care_sheet_sent_at               THEN v_violations := array_append(v_violations, 'care_sheet_sent_at'); END IF;
  IF NEW.rebook_nudge_sent_at             IS DISTINCT FROM OLD.rebook_nudge_sent_at             THEN v_violations := array_append(v_violations, 'rebook_nudge_sent_at'); END IF;
  IF NEW.review_request_email_sent_at     IS DISTINCT FROM OLD.review_request_email_sent_at     THEN v_violations := array_append(v_violations, 'review_request_email_sent_at'); END IF;

  IF array_length(v_violations, 1) > 0 THEN
    RAISE EXCEPTION 'Not authorized to modify admin-only booking fields: %', array_to_string(v_violations, ', ')
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_booking_column_permissions_trg ON public.bookings;
CREATE TRIGGER enforce_booking_column_permissions_trg
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_column_permissions();

-- Replace the broken restrictive policy; trigger authoritatively enforces column rules.
DROP POLICY IF EXISTS "Booking sensitive columns admin or psw only" ON public.bookings;
DROP POLICY IF EXISTS "Booking column protection enforced by trigger" ON public.bookings;
CREATE POLICY "Booking column protection enforced by trigger"
ON public.bookings
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Lock down care_sheet_audit_log INSERT
DROP POLICY IF EXISTS "Authenticated users can insert audit log" ON public.care_sheet_audit_log;

CREATE POLICY "Assigned PSW or admin can insert audit log"
ON public.care_sheet_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.psw_profiles p
      ON p.id::text = b.psw_assigned
    WHERE b.id = care_sheet_audit_log.booking_id
      AND p.email = (auth.jwt() ->> 'email')
      AND care_sheet_audit_log.psw_id = p.id::text
  )
);
