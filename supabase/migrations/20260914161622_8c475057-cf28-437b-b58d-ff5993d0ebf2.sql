-- ═══════════════════════════════════════════════════════════════
-- PHASE 4 — Pricing tiers, provincial rate cards, immutable snapshot
-- Reversible: adds objects/columns only. No historical amount is touched.
-- ═══════════════════════════════════════════════════════════════

-- 1. Effective date of the 2026 price list. Customers who already existed
--    before this instant stay on their approved (legacy) rates.
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('pricing_v2_effective_at', '2026-09-14T16:00:00Z')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Server-side, administrator-controlled customer pricing tier.
CREATE TABLE IF NOT EXISTS public.client_pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_normalized text NOT NULL UNIQUE,
  tier text NOT NULL CHECK (tier IN ('legacy_2026', 'standard_2026')),
  source text NOT NULL DEFAULT 'auto',
  note text,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.client_pricing_tiers TO authenticated;
GRANT ALL ON public.client_pricing_tiers TO service_role;
ALTER TABLE public.client_pricing_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view pricing tiers" ON public.client_pricing_tiers;
CREATE POLICY "Admins can view pricing tiers"
  ON public.client_pricing_tiers FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage pricing tiers" ON public.client_pricing_tiers;
CREATE POLICY "Admins can manage pricing tiers"
  ON public.client_pricing_tiers FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.touch_client_pricing_tier()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_client_pricing_tier ON public.client_pricing_tiers;
CREATE TRIGGER trg_touch_client_pricing_tier
  BEFORE UPDATE ON public.client_pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.touch_client_pricing_tier();

-- 3. Authoritative tier resolution. Never called from the browser.
CREATE OR REPLACE FUNCTION public.resolve_client_pricing_tier(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_tier text;
  v_cutoff timestamptz;
  v_existing boolean;
BEGIN
  IF v_email = '' THEN
    RETURN 'standard_2026';
  END IF;

  SELECT tier INTO v_tier FROM public.client_pricing_tiers WHERE email_normalized = v_email;
  IF v_tier IS NOT NULL THEN
    RETURN v_tier;
  END IF;

  SELECT coalesce(nullif(setting_value, '')::timestamptz, now())
    INTO v_cutoff
    FROM public.app_settings WHERE setting_key = 'pricing_v2_effective_at';
  v_cutoff := coalesce(v_cutoff, now());

  SELECT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE lower(btrim(coalesce(client_email, ''))) = v_email
      AND created_at < v_cutoff
      AND coalesce(is_test_data, false) = false
  ) INTO v_existing;

  v_tier := CASE WHEN v_existing THEN 'legacy_2026' ELSE 'standard_2026' END;

  INSERT INTO public.client_pricing_tiers (email_normalized, tier, source, note)
  VALUES (v_email, v_tier, 'auto',
          CASE WHEN v_existing THEN 'Existing customer before 2026 price list' ELSE 'New customer on 2026 price list' END)
  ON CONFLICT (email_normalized) DO UPDATE SET tier = public.client_pricing_tiers.tier
  RETURNING tier INTO v_tier;

  RETURN v_tier;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_client_pricing_tier(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_client_pricing_tier(text) TO service_role;

-- 4. Backfill: everyone who has ordered before today keeps their rates.
INSERT INTO public.client_pricing_tiers (email_normalized, tier, source, note)
SELECT DISTINCT lower(btrim(client_email)), 'legacy_2026', 'backfill',
       'Existing customer at 2026 price-list launch'
FROM public.bookings
WHERE client_email IS NOT NULL AND btrim(client_email) <> ''
  AND coalesce(is_test_data, false) = false
ON CONFLICT (email_normalized) DO NOTHING;

-- 5. Tier-aware provincial rate cards.
ALTER TABLE public.provincial_pricing
  ADD COLUMN IF NOT EXISTS pricing_tier text NOT NULL DEFAULT 'standard_2026';

CREATE UNIQUE INDEX IF NOT EXISTS provincial_pricing_unique_card
  ON public.provincial_pricing (province, service_id, pricing_tier, coalesce(city_or_zone, ''));

-- Ontario legacy (grandfathered) rates — exactly today's live prices.
INSERT INTO public.provincial_pricing
  (province, service_id, pricing_tier, client_hourly_price, provider_hourly_payout, minimum_booking_hours, active)
VALUES
  ('ON', 'standard',            'legacy_2026',   35, 21, 2, true),
  ('ON', 'doctor-appointment',  'legacy_2026',   45, 27, 1, true),
  ('ON', 'hospital-discharge',  'legacy_2026',   45, 27, 1, true),
  ('ON', 'standard',            'standard_2026', 40, 21, 2, true),
  ('ON', 'doctor-appointment',  'standard_2026', 50, 27, 1, true),
  ('ON', 'hospital-discharge',  'standard_2026', 50, 27, 1, true),
  -- Alberta: prepared only. provinces.bookings_enabled governs checkout.
  ('AB', 'standard',            'standard_2026', 40, 21, 2, true),
  ('AB', 'doctor-appointment',  'standard_2026', 50, 27, 1, true),
  ('AB', 'hospital-discharge',  'standard_2026', 50, 27, 1, true),
  ('AB', 'standard',            'legacy_2026',   40, 21, 2, true),
  ('AB', 'doctor-appointment',  'legacy_2026',   50, 27, 1, true),
  ('AB', 'hospital-discharge',  'legacy_2026',   50, 27, 1, true)
ON CONFLICT DO NOTHING;

-- 6. Immutable pricing snapshot on every booking.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pricing_tier text;

CREATE OR REPLACE FUNCTION public.protect_pricing_snapshot()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.pricing_snapshot IS NOT NULL
     AND NEW.pricing_snapshot IS DISTINCT FROM OLD.pricing_snapshot THEN
    RAISE EXCEPTION 'pricing_snapshot is immutable once recorded';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_pricing_snapshot ON public.bookings;
CREATE TRIGGER trg_protect_pricing_snapshot
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_pricing_snapshot();