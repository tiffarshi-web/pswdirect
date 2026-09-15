CREATE OR REPLACE FUNCTION public.admin_correct_wrong_day_attendance(p_booking_id uuid, p_case text, p_reason text, p_idempotency_key text, p_admin_notes text DEFAULT NULL::text, p_care_delivered boolean DEFAULT false, p_new_date date DEFAULT NULL::date, p_new_start time without time zone DEFAULT NULL::time without time zone, p_new_end time without time zone DEFAULT NULL::time without time zone, p_client_informed boolean DEFAULT false, p_assignment text DEFAULT 'keep'::text, p_new_psw_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b public.bookings%ROWTYPE;
  v_existing public.wrong_day_corrections%ROWTYPE;
  v_actor text;
  v_new_status text;
  v_new_psw text;
  v_snapshot jsonb;
  v_care jsonb;
  v_care_action text;
  v_entries jsonb := '[]'::jsonb;
  v_blocked_amount numeric;
  v_date date;
  v_start time;
  v_end time;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an office administrator may correct attendance';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'A correction reason is required';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'An idempotency key is required';
  END IF;

  IF p_case NOT IN ('no_care_original_date', 'no_care_new_date', 'care_delivered_review') THEN
    RAISE EXCEPTION 'Unknown correction case %', p_case;
  END IF;

  v_actor := COALESCE(auth.jwt() ->> 'email', current_user);

  -- Idempotency: a repeat of the same request returns the first result
  SELECT * INTO v_existing FROM public.wrong_day_corrections
   WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true, 'idempotent', true,
      'correction_id', v_existing.id,
      'booking_id', v_existing.booking_id,
      'new_status', v_existing.new_status,
      'result', COALESCE(v_existing.care_sheet_action, 'applied')
    );
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Manual payment already recorded → never silently reverse a ledger entry
  SELECT COALESCE(SUM(pe.total_owed), 0) INTO v_blocked_amount
    FROM public.payroll_entries pe
   WHERE pe.shift_id = b.id::text
     AND (
       pe.status = 'cleared'
       OR pe.earning_status = 'paid_manually'
       OR EXISTS (
         SELECT 1 FROM public.payout_entry_links l
         JOIN public.payouts po ON po.id = l.payout_id
         WHERE l.payroll_entry_id = pe.id AND po.voided_at IS NULL
       )
     );

  IF v_blocked_amount > 0 AND p_case <> 'care_delivered_review' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'blocked', 'manual_payment_recorded',
      'amount', v_blocked_amount,
      'message', 'A manual payment has already been recorded for this shift. Resolve the payment record through the manual payout correction process first.'
    );
  END IF;

  v_snapshot := jsonb_build_object(
    'checked_in_at', b.checked_in_at,
    'signed_out_at', b.signed_out_at,
    'original_checked_in_at', b.original_checked_in_at,
    'original_signed_out_at', b.original_signed_out_at,
    'check_in_lat', b.check_in_lat,
    'check_in_lng', b.check_in_lng,
    'check_in_accuracy_m', b.check_in_accuracy_m,
    'check_in_distance_m', b.check_in_distance_m,
    'check_in_outside_radius', b.check_in_outside_radius,
    'gps_check_in_failed', b.gps_check_in_failed,
    'gps_check_in_failure_reason', b.gps_check_in_failure_reason,
    'manual_check_in', b.manual_check_in,
    'sign_out_lat', b.sign_out_lat,
    'sign_out_lng', b.sign_out_lng,
    'sign_out_accuracy_m', b.sign_out_accuracy_m,
    'sign_out_distance_m', b.sign_out_distance_m,
    'sign_out_outside_radius', b.sign_out_outside_radius,
    'verification_status', b.verification_status,
    'care_sheet_status', b.care_sheet_status,
    'status', b.status
  );
  v_care := b.care_sheet;

  -- CASE 3: care may actually have been delivered → route to manual review only
  IF p_case = 'care_delivered_review' THEN
    UPDATE public.bookings
       SET wrong_day_review_required = true,
           updated_at = now()
     WHERE id = b.id;

    INSERT INTO public.wrong_day_corrections (
      booking_id, booking_code, idempotency_key, correction_case, care_delivered,
      original_status, new_status, original_scheduled_date, original_start_time, original_end_time,
      original_psw_id, new_psw_id, attendance_snapshot, care_sheet_snapshot, care_sheet_action,
      earnings_affected, notification_status, reason, admin_notes, client_informed,
      performed_by, performed_by_uid
    ) VALUES (
      b.id, b.booking_code, p_idempotency_key, p_case, true,
      b.status, b.status, b.scheduled_date, b.start_time, b.end_time,
      b.psw_assigned, b.psw_assigned, v_snapshot, v_care, 'routed_to_manual_review',
      '[]'::jsonb,
      jsonb_build_object('template', 'wrong_day_manual_review_required', 'sent', false),
      p_reason, p_admin_notes, COALESCE(p_client_informed, false),
      v_actor, auth.uid()
    );

    RETURN jsonb_build_object('ok', true, 'result', 'routed_to_manual_review', 'booking_id', b.id);
  END IF;

  -- CASES 1 & 2: no care delivered → reactivate the same booking
  v_date  := CASE WHEN p_case = 'no_care_new_date' THEN COALESCE(p_new_date, b.scheduled_date) ELSE b.scheduled_date END;
  v_start := CASE WHEN p_case = 'no_care_new_date' THEN COALESCE(p_new_start, b.start_time) ELSE b.start_time END;
  v_end   := CASE WHEN p_case = 'no_care_new_date' THEN COALESCE(p_new_end, b.end_time) ELSE b.end_time END;

  IF p_assignment = 'unassign' THEN
    v_new_psw := NULL;
  ELSIF p_assignment = 'reassign' THEN
    IF p_new_psw_id IS NULL OR btrim(p_new_psw_id) = '' THEN
      RAISE EXCEPTION 'A replacement caregiver must be chosen';
    END IF;
    v_new_psw := p_new_psw_id;
  ELSE
    v_new_psw := b.psw_assigned;
  END IF;

  v_new_status := CASE WHEN v_new_psw IS NULL THEN 'pending' ELSE 'active' END;

  -- Void earnings created by the wrong-day attendance (never delete)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', pe.id, 'amount', pe.total_owed)), '[]'::jsonb)
    INTO v_entries
    FROM public.payroll_entries pe
   WHERE pe.shift_id = b.id::text
     AND pe.earning_status <> 'voided';

  UPDATE public.payroll_entries pe
     SET earning_status = 'voided',
         requires_admin_review = false,
         payroll_review_note = COALESCE(pe.payroll_review_note || ' | ', '')
           || 'Voided: wrong-day attendance correction',
         updated_at = now()
   WHERE pe.shift_id = b.id::text
     AND pe.earning_status <> 'voided';

  v_care_action := CASE WHEN b.care_sheet IS NOT NULL OR b.care_sheet_status = 'submitted'
                        THEN 'voided' ELSE 'none' END;

  UPDATE public.bookings
     SET status = v_new_status,
         psw_assigned = v_new_psw,
         psw_first_name = CASE
           WHEN v_new_psw IS NULL THEN NULL
           WHEN v_new_psw IS DISTINCT FROM b.psw_assigned
             THEN COALESCE((SELECT pp.first_name FROM public.psw_profiles pp WHERE pp.id::text = v_new_psw), psw_first_name)
           ELSE psw_first_name END,
         scheduled_date = v_date,
         start_time = v_start,
         end_time = v_end,
         checked_in_at = NULL,
         signed_out_at = NULL,
         check_in_lat = NULL, check_in_lng = NULL,
         check_in_accuracy_m = NULL, check_in_distance_m = NULL,
         check_in_outside_radius = NULL,
         gps_check_in_failed = NULL, gps_check_in_failure_reason = NULL,
         manual_check_in = NULL,
         sign_out_lat = NULL, sign_out_lng = NULL,
         sign_out_accuracy_m = NULL, sign_out_distance_m = NULL,
         sign_out_outside_radius = NULL,
         verification_status = NULL,
         flagged_for_overtime = false,
         overtime_minutes = 0,
         care_sheet_status = CASE WHEN v_care_action = 'voided' THEN 'voided' ELSE care_sheet_status END,
         care_sheet_sent_at = NULL,
         wrong_day_review_required = false,
         wrong_day_corrected_at = now(),
         claimed_at = CASE WHEN v_new_psw IS NULL THEN NULL ELSE claimed_at END,
         updated_at = now()
   WHERE id = b.id;

  INSERT INTO public.wrong_day_corrections (
    booking_id, booking_code, idempotency_key, correction_case, care_delivered,
    original_status, new_status, original_scheduled_date, original_start_time, original_end_time,
    corrected_scheduled_date, corrected_start_time, corrected_end_time,
    original_psw_id, new_psw_id, attendance_snapshot, care_sheet_snapshot, care_sheet_action,
    earnings_affected, notification_status, reason, admin_notes, client_informed,
    performed_by, performed_by_uid
  ) VALUES (
    b.id, b.booking_code, p_idempotency_key, p_case, false,
    b.status, v_new_status, b.scheduled_date, b.start_time, b.end_time,
    v_date, v_start, v_end,
    b.psw_assigned, v_new_psw, v_snapshot, v_care, v_care_action,
    v_entries,
    jsonb_build_object(
      'client_template', 'wrong_day_client_appointment_corrected',
      'psw_template', CASE
        WHEN v_new_psw IS NULL THEN 'wrong_day_job_returned_to_pool'
        WHEN v_new_psw IS DISTINCT FROM b.psw_assigned THEN 'wrong_day_new_psw_assigned'
        ELSE 'wrong_day_psw_appointment_corrected' END,
      'sent', false
    ),
    p_reason, p_admin_notes, COALESCE(p_client_informed, false),
    v_actor, auth.uid()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'result', 'reactivated',
    'booking_id', b.id,
    'new_status', v_new_status,
    'scheduled_date', v_date,
    'psw_assigned', v_new_psw,
    'earnings_voided', jsonb_array_length(v_entries),
    'care_sheet_action', v_care_action
  );
END;
$function$;