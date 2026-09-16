CREATE TABLE IF NOT EXISTS public.province_activation_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code text NOT NULL,
  item_key text NOT NULL,
  item_label text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  is_complete boolean NOT NULL DEFAULT false,
  notes text,
  approval_notice text NOT NULL DEFAULT 'Requires Alberta legal and operational approval before activation.',
  completed_by text,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS province_activation_checklist_unique
  ON public.province_activation_checklist (province_code, item_key);

GRANT SELECT, INSERT, UPDATE ON public.province_activation_checklist TO authenticated;
GRANT ALL ON public.province_activation_checklist TO service_role;

ALTER TABLE public.province_activation_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage activation checklist" ON public.province_activation_checklist;
CREATE POLICY "admins manage activation checklist"
  ON public.province_activation_checklist FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS province_activation_checklist_updated_at ON public.province_activation_checklist;
CREATE TRIGGER province_activation_checklist_updated_at
  BEFORE UPDATE ON public.province_activation_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.province_activation_checklist (province_code, item_key, item_label, sort_order)
VALUES
  ('AB','legal_documents_approved','Final legal documents approved',1),
  ('AB','privacy_documents_approved','Final privacy documents approved',2),
  ('AB','hca_verification_approved','HCA verification process approved',3),
  ('AB','required_documents_confirmed','Required documents confirmed',4),
  ('AB','cities_confirmed','Cities confirmed',5),
  ('AB','coverage_confirmed','Coverage areas confirmed',6),
  ('AB','client_prices_confirmed','Client service prices confirmed',7),
  ('AB','provider_rates_confirmed','Alberta provider rates confirmed',8),
  ('AB','tax_treatment_confirmed','Tax treatment confirmed',9),
  ('AB','support_process_confirmed','Support process confirmed',10),
  ('AB','verified_providers_available','Verified Alberta providers available',11),
  ('AB','test_bookings_passed','Test bookings passed',12),
  ('AB','booking_switch_approved','Booking switch approved',13),
  ('AB','payment_switch_approved','Payment switch approved',14)
ON CONFLICT (province_code, item_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.province_activation_ready(p_province_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.province_activation_checklist
    WHERE province_code = upper(p_province_code)
      AND is_required = true
      AND is_complete = false
  );
$$;

REVOKE ALL ON FUNCTION public.province_activation_ready(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.province_activation_ready(text) TO authenticated, service_role;
