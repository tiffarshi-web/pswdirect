
-- Add third-party payer metadata columns to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS third_party_payer_mode text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_program_of_choice text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_provider_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_benefit_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_service_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS veteran_k_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_authorization_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insurance_member_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insurance_claim_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insurance_contact_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insurance_contact_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insurance_contact_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insurance_claim_notes text DEFAULT NULL;

-- Add same metadata columns to invoices table for snapshot
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS third_party_payer_mode text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_program_of_choice text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_provider_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_benefit_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_service_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS veteran_k_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_authorization_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vac_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insurance_member_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insurance_claim_number text DEFAULT NULL;
