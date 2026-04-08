
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS review_request_sent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS review_request_sent_at timestamptz DEFAULT NULL;
