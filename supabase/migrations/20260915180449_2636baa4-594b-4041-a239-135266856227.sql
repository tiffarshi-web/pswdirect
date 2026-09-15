ALTER TABLE public.provincial_pricing
  DROP CONSTRAINT IF EXISTS provincial_pricing_province_city_or_zone_service_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS provincial_pricing_province_zone_service_tier_key
  ON public.provincial_pricing (province, city_or_zone, service_id, pricing_tier);