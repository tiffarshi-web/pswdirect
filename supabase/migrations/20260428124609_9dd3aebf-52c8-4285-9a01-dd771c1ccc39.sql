
-- ============================================================
-- IN-APP MESSAGING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.in_app_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  sender_user_id UUID,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client','psw','admin','system')),
  sender_display_name TEXT,
  message_body TEXT NOT NULL,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_in_app_messages_booking ON public.in_app_messages(booking_id, created_at);
CREATE INDEX IF NOT EXISTS idx_in_app_messages_sender ON public.in_app_messages(sender_user_id);

ALTER TABLE public.in_app_messages ENABLE ROW LEVEL SECURITY;

-- Admins: full
CREATE POLICY "Admins can manage in_app_messages"
  ON public.in_app_messages
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Clients can SELECT messages for their own bookings
CREATE POLICY "Clients can view own booking messages"
  ON public.in_app_messages
  FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE client_email = (auth.jwt() ->> 'email')
         OR user_id = auth.uid()
    )
  );

-- PSWs can SELECT messages for bookings assigned to them
CREATE POLICY "PSWs can view own assigned booking messages"
  ON public.in_app_messages
  FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE psw_assigned IN (
        SELECT id::text FROM public.psw_profiles
        WHERE email = (auth.jwt() ->> 'email')
      )
    )
  );

-- NO direct insert/update/delete policies for non-admins.
-- All sends route through the send-message edge function (service role).

-- ============================================================
-- MESSAGE FLAGS (admin-only audit log of blocked attempts)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.message_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  message_id UUID,
  sender_user_id UUID,
  sender_role TEXT,
  sender_email TEXT,
  detected_patterns TEXT[] NOT NULL DEFAULT '{}',
  original_snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_flags_booking ON public.message_flags(booking_id, created_at);

ALTER TABLE public.message_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage message flags"
  ON public.message_flags
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- READ RECEIPTS (for unread badge)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, user_email)
);

ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own read receipts"
  ON public.message_read_receipts
  FOR ALL
  TO authenticated
  USING (user_email = (auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins read all receipts"
  ON public.message_read_receipts
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_messages;
