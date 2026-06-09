## PSW Direct: Client + PSW App Upgrade

Scoped against the audit. Preserves all working systems (Stripe, manual orders, admin pipeline, care sheets, unassign, privacy filters).

---

### 1. Database (one migration)

**Atomic claim RPC** — replaces optimistic `.eq("status","pending")` update.

```sql
CREATE FUNCTION public.claim_booking(p_booking_id uuid, p_psw_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER ...
-- SELECT ... FOR UPDATE
-- Validates: status='pending', psw_assigned IS NULL,
--            payment_status IN ('paid','invoice_approved','manual_approved')
--            OR booking is manual/insurance type
-- Validates PSW: vetting_status='approved', lifecycle='active', VSC not expired
-- On success: sets psw_assigned, psw_first_name, psw_photo_url,
--             psw_vehicle_photo_url, psw_license_plate, claimed_at=now(),
--             status='active'
-- Returns: { ok: true } or { ok:false, reason:'already_claimed'|'ineligible'|... }
```

**Count RPC** for client dashboard (no PII):
```sql
CREATE FUNCTION public.count_nearby_psws(p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 75)
RETURNS integer  -- wraps get_nearby_psws, returns COUNT only, accessible to authenticated clients
```

**RLS audit** — confirm `bookings` PSW-side select policies still hide `client_phone`/`client_email` via `psw_safe_booking_view`. No schema change unless gap found.

---

### 2. Client App Changes

**New component:** `src/components/client/ClientStatusMap.tsx`
- Leaflet map centered on client's service address (geocoded via existing `geocode-address` edge function, cached)
- Single status dot with colors:
  - Red = no booking / no PSW (status `pending`, no `psw_assigned`)
  - Yellow = searching (status `pending`, with dispatch active)
  - Blue **flashing** = PSW accepted (status `active`, `psw_assigned` set, not yet checked in) — CSS `@keyframes pulse`
  - Green = in-progress (status `in-progress` or `checked_in_at` set)
  - Grey = completed/cancelled
- Header card shows "X caregivers available within 75km" using `count_nearby_psws` RPC
- "Searching for a PSW near you" copy pre-accept; PSW first name + photo + approx distance post-accept

**Wire into** `src/pages/ClientPortal.tsx` above `ActiveCareSection`.

**`useClientBookings.ts`** — already returns all slices; verify upcoming/active/past not hidden. Add `assignedBookings` slice if needed.

**Privacy:** No PSW phone/email/full home address exposed. Distance uses `psw_profiles.home_lat/lng` via existing logic, labeled "approx".

---

### 3. PSW App Changes

**`ClaimShiftDialog.tsx`** — mask address pre-accept:
- Pre-accept: show city + first 3 chars of postal + approx distance
- Post-accept: full address revealed in `ActiveShiftTab`/`PSWUpcomingTab` (already does this)
- Add care-conditions checklist + task list (use existing `CareConditionBadges`)

**`PSWAvailableJobsTab.tsx`** — replace claim logic with `supabase.rpc('claim_booking', ...)`. On `reason==='already_claimed'` show toast: "This job has already been accepted by another PSW." Job cards already mask address — confirm.

**`NotificationsBell.tsx` / new `useAvailableJobsCount.ts` hook:**
- Subscribes to Realtime `postgres_changes` on `bookings` (INSERT/UPDATE/DELETE)
- Re-queries available-jobs count filtered by PSW radius/eligibility
- Red badge with count on PSW bottom nav "Jobs" tab; hidden when 0
- Keeps existing 30s polling as fallback

**Post-claim toast copy:** remove misleading "phone number is now visible" line.

---

### 4. Files Changed (estimate)

**New**
- `supabase/migrations/<ts>_atomic_claim_and_count.sql`
- `src/components/client/ClientStatusMap.tsx`
- `src/hooks/useAvailableJobsCount.ts`

**Edited**
- `src/pages/ClientPortal.tsx` — mount status map
- `src/components/psw/ClaimShiftDialog.tsx` — mask address, add conditions/tasks
- `src/components/psw/PSWAvailableJobsTab.tsx` — call `claim_booking` RPC, fix toast
- `src/components/navigation/PSWBottomNav.tsx` — red badge with count
- `src/lib/shiftStore.ts` — route `claimShift` through new RPC
- `src/integrations/supabase/types.ts` — auto-regenerated after migration

**Untouched (preserved)**
- Stripe flow, webhooks, manual orders, invoices, admin pipeline, admin manual assign/sign-in/out, unassign flow, care sheets, privacy filters, Progressier push.

---

### 5. Test Checklist (manual in preview)

Client: dashboard shows all booking slices; nearby count renders; dot transitions red→yellow→blue-pulse→green→grey; PSW name/photo only post-accept; no PSW contact leaked.

PSW: red badge count appears/clears in realtime; job card shows city/partial-postal only; claim succeeds for first PSW, second sees "already accepted"; full address appears only after accepting; unassign returns to pool.

---

### 6. Known Limitations

- Live PSW GPS only during active shift; pre-shift distance is approximate (home_lat/lng fallback) — labeled as such.
- Realtime requires `bookings` in `supabase_realtime` publication; migration will add if missing.
- Blue flashing dot uses CSS animation; respects `prefers-reduced-motion`.
