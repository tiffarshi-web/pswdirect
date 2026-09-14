-- Read-only payment reconciliation for administrators.
-- Compares what the order says, what the receipt says, and what Stripe
-- references exist. It never changes a financial record.
CREATE OR REPLACE FUNCTION public.admin_payment_reconciliation(
  p_days integer DEFAULT 90,
  p_only_mismatches boolean DEFAULT false,
  p_limit integer DEFAULT 500
)
RETURNS TABLE(
  booking_id uuid,
  booking_code text,
  client_name text,
  service_type text,
  scheduled_date date,
  booking_total numeric,
  snapshot_total numeric,
  invoice_total numeric,
  tax_amount numeric,
  payment_intent_id text,
  internal_payment_status text,
  booking_status text,
  receipt_status text,
  refund_status text,
  refunded_amount numeric,
  webhook_event_count integer,
  reconciliation_result text,
  mismatch_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      b.id,
      b.booking_code,
      b.client_name,
      array_to_string(b.service_type, ', ') AS svc,
      b.scheduled_date,
      b.total,
      CASE WHEN b.pricing_snapshot ? 'total_cents'
           THEN ((b.pricing_snapshot->>'total_cents')::numeric / 100) END AS snap_total,
      i.total AS inv_total,
      b.hst_amount,
      b.stripe_payment_intent_id,
      b.payment_status,
      b.status,
      coalesce(i.document_status, i.status, 'none') AS receipt_state,
      coalesce(i.refund_status, 'none') AS refund_state,
      coalesce(i.refund_amount, 0) AS refunded,
      (SELECT count(*) FROM public.stripe_webhook_events e
         WHERE b.stripe_payment_intent_id IS NOT NULL
           AND e.payload::text LIKE '%' || b.stripe_payment_intent_id || '%')::integer AS evt_count,
      (SELECT count(*) FROM public.bookings d
         WHERE d.stripe_payment_intent_id = b.stripe_payment_intent_id
           AND b.stripe_payment_intent_id IS NOT NULL)::integer AS pi_share
    FROM public.bookings b
    LEFT JOIN public.invoices i ON i.booking_id = b.id
    WHERE coalesce(b.is_test_data, false) = false
      AND b.created_at >= now() - make_interval(days => greatest(p_days, 1))
  ),
  flagged AS (
    SELECT base.*,
      CASE
        WHEN payment_status = 'paid' AND stripe_payment_intent_id IS NULL
          THEN 'booking_paid_without_stripe_reference'
        WHEN payment_status = 'paid' AND evt_count = 0
          THEN 'missing_webhook_record'
        WHEN snap_total IS NOT NULL AND abs(snap_total - coalesce(total, 0)) > 0.005
          THEN 'booking_total_differs_from_pricing_snapshot'
        WHEN inv_total IS NOT NULL AND abs(inv_total - coalesce(total, 0)) > 0.005
          THEN 'receipt_total_differs_from_booking_total'
        WHEN pi_share > 1 THEN 'payment_intent_shared_by_multiple_orders'
        WHEN payment_status = 'paid' AND receipt_state = 'none'
          THEN 'receipt_missing_for_paid_order'
        WHEN refunded > coalesce(total, 0) + 0.005
          THEN 'refund_exceeds_captured_amount'
        ELSE NULL
      END AS reason
    FROM base
  )
  SELECT
    id, booking_code, client_name, svc, scheduled_date,
    total, snap_total, inv_total, hst_amount,
    stripe_payment_intent_id, payment_status, status,
    receipt_state, refund_state, refunded, evt_count,
    CASE WHEN reason IS NULL THEN 'ok' ELSE 'review_required' END,
    reason
  FROM flagged
  WHERE (NOT p_only_mismatches) OR reason IS NOT NULL
  ORDER BY (reason IS NULL), scheduled_date DESC
  LIMIT greatest(p_limit, 1);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_payment_reconciliation(integer, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_payment_reconciliation(integer, boolean, integer) TO authenticated, service_role;