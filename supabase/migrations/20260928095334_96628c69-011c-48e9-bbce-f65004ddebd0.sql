-- 1) "On my way" status
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS psw_en_route_at timestamptz;

CREATE OR REPLACE FUNCTION public.guard_psw_en_route()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.psw_en_route_at IS DISTINCT FROM OLD.psw_en_route_at
     AND COALESCE(current_setting('app.trusted_rpc', true),'') <> 'on'
     AND auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'psw_en_route_at can only be set through psw_mark_on_my_way';
  END IF;
  -- Reassignment or rescheduling clears a stale "on my way".
  IF NEW.psw_assigned IS DISTINCT FROM OLD.psw_assigned
     OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
     OR (NEW.checked_in_at IS NULL AND OLD.checked_in_at IS NOT NULL) THEN
    NEW.psw_en_route_at := NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_psw_en_route() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_psw_en_route ON public.bookings;
CREATE TRIGGER trg_guard_psw_en_route BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_psw_en_route();

CREATE OR REPLACE FUNCTION public.psw_mark_on_my_way(p_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_psw text := public.current_psw_profile_id(); b public.bookings%ROWTYPE; v_today date;
BEGIN
  IF v_psw IS NULL THEN RETURN jsonb_build_object('success',false,'error','not_authenticated'); END IF;
  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','not_found'); END IF;
  IF b.psw_assigned IS DISTINCT FROM v_psw THEN RETURN jsonb_build_object('success',false,'error','not_assigned'); END IF;
  IF b.status <> 'active' OR b.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('success',false,'error','invalid_status','status',b.status);
  END IF;
  v_today := public.province_local_today(b.service_province);
  IF b.scheduled_date IS DISTINCT FROM v_today THEN
    RETURN jsonb_build_object('success',false,'error','wrong_service_date','scheduled_date',b.scheduled_date);
  END IF;
  IF b.psw_en_route_at IS NOT NULL THEN
    RETURN jsonb_build_object('success',true,'did_update',false,'psw_en_route_at',b.psw_en_route_at);
  END IF;
  PERFORM set_config('app.trusted_rpc','on',true);
  UPDATE public.bookings SET psw_en_route_at = now() WHERE id = p_booking_id RETURNING * INTO b;
  PERFORM set_config('app.trusted_rpc','off',true);
  RETURN jsonb_build_object('success',true,'did_update',true,'psw_en_route_at',b.psw_en_route_at);
END $$;
REVOKE ALL ON FUNCTION public.psw_mark_on_my_way(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psw_mark_on_my_way(uuid) TO authenticated;

-- 2) Client app device registrations
CREATE TABLE public.client_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('android','ios')),
  app_version text,
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  revoked_reason text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.client_push_tokens TO authenticated;
GRANT ALL ON public.client_push_tokens TO service_role;
ALTER TABLE public.client_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients see own devices" ON public.client_push_tokens FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins see client devices" ON public.client_push_tokens FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.register_client_push_token(_token text, _platform text, _app_version text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','not_authenticated'); END IF;
  IF _token IS NULL OR length(_token) < 20 OR length(_token) > 4096 OR _platform NOT IN ('android','ios') THEN
    RETURN jsonb_build_object('success',false,'error','invalid');
  END IF;
  INSERT INTO public.client_push_tokens(user_id, token, platform, app_version)
  VALUES (v_uid, _token, _platform, left(_app_version, 40))
  ON CONFLICT (token) DO UPDATE SET user_id = v_uid, platform = EXCLUDED.platform,
    app_version = EXCLUDED.app_version, is_active = true, revoked_at = NULL, revoked_reason = NULL,
    last_seen_at = now(), updated_at = now();
  RETURN jsonb_build_object('success',true);
END $$;
REVOKE ALL ON FUNCTION public.register_client_push_token(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_client_push_token(text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.deactivate_client_push_token(_token text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.client_push_tokens SET is_active=false, revoked_at=now(), revoked_reason='signed_out', updated_at=now()
   WHERE token=_token AND user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.deactivate_client_push_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_client_push_token(text) TO authenticated;

-- 3) Server-confirmed stage events for client alerts
CREATE TABLE public.client_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  stage text NOT NULL CHECK (stage IN ('assigned','on_my_way','checked_in','completed','report_ready')),
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, stage)
);
GRANT ALL ON public.client_stage_events TO service_role;
GRANT SELECT ON public.client_stage_events TO authenticated;
ALTER TABLE public.client_stage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view stage events" ON public.client_stage_events FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.enqueue_client_stage_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_stage text;
BEGIN
  IF COALESCE(NEW.is_test_data,false) THEN RETURN NEW; END IF;
  FOREACH v_stage IN ARRAY ARRAY[
    CASE WHEN NEW.psw_assigned IS NOT NULL AND OLD.psw_assigned IS NULL THEN 'assigned' END,
    CASE WHEN NEW.psw_en_route_at IS NOT NULL AND OLD.psw_en_route_at IS NULL THEN 'on_my_way' END,
    CASE WHEN NEW.checked_in_at IS NOT NULL AND OLD.checked_in_at IS NULL THEN 'checked_in' END,
    CASE WHEN NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN 'completed' END,
    CASE WHEN NEW.care_sheet_submitted_at IS NOT NULL AND OLD.care_sheet_submitted_at IS NULL THEN 'report_ready' END
  ] LOOP
    IF v_stage IS NOT NULL THEN
      INSERT INTO public.client_stage_events(booking_id, stage) VALUES (NEW.id, v_stage)
      ON CONFLICT (booking_id, stage) DO NOTHING;
      IF FOUND AND EXISTS (SELECT 1 FROM public.client_push_tokens t
            JOIN auth.users u ON u.id = t.user_id
            WHERE t.is_active AND (t.user_id = NEW.user_id OR lower(u.email) = lower(NEW.client_email))) THEN
        BEGIN
          PERFORM public._invoke_edge_function('send-client-push', jsonb_build_object('booking_id', NEW.id));
        EXCEPTION WHEN OTHERS THEN NULL; END;
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_client_stage_events() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enqueue_client_stage_events ON public.bookings;
CREATE TRIGGER trg_enqueue_client_stage_events AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enqueue_client_stage_events();

-- Service-only lookup of a booking's client devices
CREATE OR REPLACE FUNCTION public.client_push_tokens_for_booking(_booking_id uuid)
RETURNS TABLE(email text, token text, platform text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT lower(u.email), t.token, t.platform
  FROM public.bookings b
  JOIN public.client_push_tokens t ON t.is_active
  JOIN auth.users u ON u.id = t.user_id
  WHERE b.id = _booking_id AND (t.user_id = b.user_id OR lower(u.email) = lower(b.client_email));
$$;
REVOKE ALL ON FUNCTION public.client_push_tokens_for_booking(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_push_tokens_for_booking(uuid) TO service_role;