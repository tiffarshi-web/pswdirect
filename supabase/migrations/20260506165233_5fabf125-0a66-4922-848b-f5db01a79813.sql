
-- ============================================================
-- 1. NORMALIZATION HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(regexp_replace(
    regexp_replace(coalesce(p,''), '[^0-9]', '', 'g'),
    '^1(\d{10})$', '\1'
  ), '');
$$;

CREATE OR REPLACE FUNCTION public.normalize_email(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(lower(btrim(coalesce(p,''))), '');
$$;

CREATE OR REPLACE FUNCTION public.normalize_name(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(lower(btrim(regexp_replace(coalesce(p,''), '\s+', ' ', 'g'))), '');
$$;

-- ============================================================
-- 2. AUDIT TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_merge_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,                    -- 'merged' | 'phone_updated' | 'email_updated' | 'identity_normalized'
  canonical_email text,
  alias_email text,
  canonical_phone text,
  alias_phone text,
  affected_bookings int DEFAULT 0,
  affected_invoices int DEFAULT 0,
  affected_other int DEFAULT 0,
  performed_by text,
  note text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_merge_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read merge audit" ON public.client_merge_audit;
CREATE POLICY "Admins read merge audit" ON public.client_merge_audit
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert merge audit" ON public.client_merge_audit;
CREATE POLICY "Admins insert merge audit" ON public.client_merge_audit
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_client_merge_audit_canonical ON public.client_merge_audit(canonical_email);
CREATE INDEX IF NOT EXISTS idx_client_merge_audit_alias ON public.client_merge_audit(alias_email);

-- ============================================================
-- 3. CANONICAL CLIENT LOOKUP (phone wins over email)
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_canonical_client(p_phone text, p_email text)
RETURNS TABLE(client_email text, client_name text, client_phone text, match_source text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_norm_phone text := public.normalize_phone(p_phone);
  v_norm_email text := public.normalize_email(p_email);
BEGIN
  -- Phone match (highest priority)
  IF v_norm_phone IS NOT NULL AND length(v_norm_phone) >= 10 THEN
    RETURN QUERY
      SELECT b.client_email, b.client_name, b.client_phone, 'phone'::text
      FROM public.bookings b
      WHERE public.normalize_phone(b.client_phone) = v_norm_phone
        AND b.client_email IS NOT NULL
      ORDER BY b.created_at DESC
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Email match
  IF v_norm_email IS NOT NULL THEN
    RETURN QUERY
      SELECT b.client_email, b.client_name, b.client_phone, 'email'::text
      FROM public.bookings b
      WHERE public.normalize_email(b.client_email) = v_norm_email
      ORDER BY b.created_at DESC
      LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_canonical_client(text, text) TO anon, authenticated, service_role;

-- ============================================================
-- 4. ADMIN MERGE FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_merge_clients(
  p_canonical_email text,
  p_alias_email text,
  p_canonical_name text DEFAULT NULL,
  p_canonical_phone text DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin text;
  v_canon text := public.normalize_email(p_canonical_email);
  v_alias text := public.normalize_email(p_alias_email);
  v_b int := 0; v_i int := 0; v_o int := 0;
  v_n int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF v_canon IS NULL OR v_alias IS NULL OR v_canon = v_alias THEN
    RAISE EXCEPTION 'Canonical and alias emails must differ and be non-empty';
  END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  -- Bookings
  WITH upd AS (
    UPDATE public.bookings
    SET client_email = p_canonical_email,
        client_name = COALESCE(p_canonical_name, client_name),
        client_phone = COALESCE(p_canonical_phone, client_phone),
        updated_at = now()
    WHERE public.normalize_email(client_email) = v_alias
    RETURNING 1
  ) SELECT count(*) INTO v_b FROM upd;

  -- Invoices
  WITH upd AS (
    UPDATE public.invoices SET client_email = p_canonical_email
    WHERE public.normalize_email(client_email) = v_alias
    RETURNING 1
  ) SELECT count(*) INTO v_i FROM upd;

  -- Other tables
  UPDATE public.communication_sessions SET client_email = p_canonical_email
    WHERE public.normalize_email(client_email) = v_alias;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_o := v_o + v_n;

  UPDATE public.overtime_charges SET client_email = p_canonical_email
    WHERE public.normalize_email(client_email) = v_alias;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_o := v_o + v_n;

  UPDATE public.refund_logs SET client_email = p_canonical_email
    WHERE public.normalize_email(client_email) = v_alias;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_o := v_o + v_n;

  UPDATE public.unreconciled_payments SET customer_email = p_canonical_email
    WHERE public.normalize_email(customer_email) = v_alias;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_o := v_o + v_n;

  UPDATE public.unserved_orders SET client_email = p_canonical_email
    WHERE public.normalize_email(client_email) = v_alias;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_o := v_o + v_n;

  -- client_profiles: keep canonical, delete alias
  DELETE FROM public.client_profiles
    WHERE public.normalize_email(email) = v_alias
      AND public.normalize_email(email) <> v_canon;

  INSERT INTO public.client_merge_audit
    (action, canonical_email, alias_email, canonical_phone,
     affected_bookings, affected_invoices, affected_other, performed_by, note)
  VALUES ('merged', p_canonical_email, p_alias_email, p_canonical_phone,
          v_b, v_i, v_o, v_admin, p_note);

  RETURN jsonb_build_object('ok', true, 'bookings', v_b, 'invoices', v_i, 'other', v_o);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_merge_clients(text, text, text, text, text) TO authenticated;

-- ============================================================
-- 5. ONE-TIME BACKFILL: auto-merge by phone
-- ============================================================
DO $$
DECLARE
  v_grp record;
  v_canon_email text;
  v_canon_name text;
  v_canon_phone text;
  v_alias text;
  v_b int; v_i int; v_n int; v_o int;
BEGIN
  FOR v_grp IN
    SELECT public.normalize_phone(client_phone) AS np
    FROM public.bookings
    WHERE client_phone IS NOT NULL AND client_phone <> ''
    GROUP BY 1
    HAVING count(DISTINCT public.normalize_email(client_email)) > 1
  LOOP
    -- pick most-recent email as canonical
    SELECT client_email, client_name, client_phone
      INTO v_canon_email, v_canon_name, v_canon_phone
    FROM public.bookings
    WHERE public.normalize_phone(client_phone) = v_grp.np
      AND client_email IS NOT NULL
    ORDER BY created_at DESC LIMIT 1;

    -- prefer a non-numeric, properly-spaced name if the most-recent looks bad
    SELECT client_name INTO v_canon_name
    FROM public.bookings
    WHERE public.normalize_phone(client_phone) = v_grp.np
      AND client_name ~ '[A-Za-z]'
      AND client_name !~ '@'
    ORDER BY length(client_name) DESC, created_at DESC LIMIT 1;

    FOR v_alias IN
      SELECT DISTINCT client_email FROM public.bookings
      WHERE public.normalize_phone(client_phone) = v_grp.np
        AND public.normalize_email(client_email) <> public.normalize_email(v_canon_email)
        AND client_email IS NOT NULL
    LOOP
      v_b := 0; v_i := 0; v_o := 0;

      WITH upd AS (
        UPDATE public.bookings
        SET client_email = v_canon_email,
            client_name = COALESCE(v_canon_name, client_name),
            client_phone = COALESCE(v_canon_phone, client_phone),
            updated_at = now()
        WHERE public.normalize_email(client_email) = public.normalize_email(v_alias)
        RETURNING 1
      ) SELECT count(*) INTO v_b FROM upd;

      WITH upd AS (
        UPDATE public.invoices SET client_email = v_canon_email
        WHERE public.normalize_email(client_email) = public.normalize_email(v_alias)
        RETURNING 1
      ) SELECT count(*) INTO v_i FROM upd;

      UPDATE public.communication_sessions SET client_email = v_canon_email
        WHERE public.normalize_email(client_email) = public.normalize_email(v_alias);
      GET DIAGNOSTICS v_n = ROW_COUNT; v_o := v_o + v_n;
      UPDATE public.overtime_charges SET client_email = v_canon_email
        WHERE public.normalize_email(client_email) = public.normalize_email(v_alias);
      GET DIAGNOSTICS v_n = ROW_COUNT; v_o := v_o + v_n;
      UPDATE public.refund_logs SET client_email = v_canon_email
        WHERE public.normalize_email(client_email) = public.normalize_email(v_alias);
      GET DIAGNOSTICS v_n = ROW_COUNT; v_o := v_o + v_n;
      UPDATE public.unreconciled_payments SET customer_email = v_canon_email
        WHERE public.normalize_email(customer_email) = public.normalize_email(v_alias);
      GET DIAGNOSTICS v_n = ROW_COUNT; v_o := v_o + v_n;
      UPDATE public.unserved_orders SET client_email = v_canon_email
        WHERE public.normalize_email(client_email) = public.normalize_email(v_alias);
      GET DIAGNOSTICS v_n = ROW_COUNT; v_o := v_o + v_n;

      DELETE FROM public.client_profiles
        WHERE public.normalize_email(email) = public.normalize_email(v_alias)
          AND public.normalize_email(email) <> public.normalize_email(v_canon_email);

      INSERT INTO public.client_merge_audit
        (action, canonical_email, alias_email, canonical_phone,
         affected_bookings, affected_invoices, affected_other, performed_by, note)
      VALUES ('merged', v_canon_email, v_alias, v_canon_phone,
              v_b, v_i, v_o, 'system-backfill',
              'Auto-merged by phone match (' || v_grp.np || ')');
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 6. INDEXES for fast lookup
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_normalized_phone ON public.bookings ((public.normalize_phone(client_phone)));
CREATE INDEX IF NOT EXISTS idx_bookings_normalized_email ON public.bookings ((public.normalize_email(client_email)));
