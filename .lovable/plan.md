## Geocode Recovery & Address Validation Hardening (revised)

### Guiding principle (per user clarification)
**Never hard-block a legitimate booking.** Rural Ontario, farms, new builds, retirement communities, and hospital entrances must always be able to complete checkout. If precise geocode fails but a postal-code area match exists, the order proceeds and is flagged "Approximate Location" for admin review.

### Audit findings

- Geocoding uses **Nominatim only** (memory rule — no Google Places).
- `StepLocation.tsx` uses plain text inputs; no autocomplete, no pre-submit geocode.
- `bookings` has `service_latitude`, `service_longitude`, `geocode_source`, `geocode_updated_at` — but no status / error / attempt diagnostics.
- `create-booking` edge function geocodes once; on failure the order still saves but with no diagnostic trail and no postal-centroid fallback recorded.
- No admin "Retry Geocode / Edit Address / Manual Override / Recover Order" UI in Unserved.

### Root cause of "GEOCODE FAILED" Unserved orders

1. Free-text address typos Nominatim can't resolve.
2. Single attempt; transient 5xx/429 = permanent fail.
3. Postal-centroid FSA fallback exists for PSWs (`autoGeocodeUtils.ts`) but isn't used at booking time.
4. No admin recovery surface.

### Phase 1 — Client address hardening (soft validation)

**No hard blocks.** Validation is *guidance*, not gating, except for obviously empty/malformed postal codes.

1. New component `src/components/booking/AddressAutocomplete.tsx`:
   - Debounced (500ms) Nominatim `/search?countrycodes=ca&addressdetails=1` lookups.
   - Suggestions dropdown; selecting one populates structured fields (street #, street name, city, province, postal) **and** stashes `lat`/`lng` + `confidence` (Nominatim `importance`) on the form.
   - User can still type freely and submit without selecting a suggestion (rural / new builds).
2. Wire into `StepLocation.tsx` for home, pickup, and dropoff addresses.
3. Pre-submit checks (inline messages, NOT blockers unless noted):
   - **Block only:** missing street, missing city, postal-code regex fail.
   - **Warn (non-blocking):** address didn't resolve via autocomplete → "We couldn't fully verify this address. Your booking will continue and our team may call to confirm." User clicks "Continue anyway".
4. Saved addresses for returning clients: silently re-geocode on checkout open; if fail, no prompt — just flag for admin review.

### Phase 2 — Backend geocode pipeline (resilient, never loses orders)

**Migration** — add to `bookings`:
- `geocode_status` text — `success` | `approximate` | `postal_fallback` | `failed` | `manual_override`
- `geocode_error_code` text — `INVALID_ADDRESS` | `API_TIMEOUT` | `ZERO_RESULTS` | `POSTAL_CODE_ONLY_MATCH` | `RATE_LIMITED`
- `geocode_error_message` text
- `geocode_attempts` int default 0
- `geocode_last_attempt_at` timestamptz
- `geocode_confidence` numeric (0–1, from Nominatim importance)
- `geocode_raw_address` text (snapshot of submitted address at order time)

`create-booking` edge function pipeline:
1. If client passed coords from autocomplete → use them; status = `success` or `approximate` based on confidence.
2. Else attempt Nominatim full address.
3. On fail/timeout → retry once after 800ms.
4. On second fail → postal-code FSA centroid fallback → status = `postal_fallback`.
5. If even postal lookup fails → status = `failed`, but **order still saves**. Order goes to Unserved with full diagnostic trail.
6. Notify admin via `notification_queue` for any non-`success` status (admin email "Approximate Location flagged").

New edge function `retry-geocode` — input `booking_id`, re-runs the full pipeline. Used by admin button + can be called by a future cron.

### Phase 3 — Admin Unserved recovery UI

In `src/components/admin/` Unserved orders panel, per row:
- Display: `geocode_raw_address`, `geocode_status`, `geocode_error_code/message`, attempts, last attempt, current `service_latitude`/`service_longitude`.
- Action buttons:
  - **Retry Geocode** → calls `retry-geocode` edge function.
  - **Edit Address** → inline editor; on save updates address fields and auto-retries geocode.
  - **Manual Coordinate Override** → lat/lng inputs with Leaflet preview map; sets `geocode_status='manual_override'`.
  - **Recover Order** → retry-geocode → re-invoke `dispatch-booking` → mark dispatch_log resolved → re-broadcast to PSWs.

### Phase 4 — QA matrix

Manually verify, no booking type regresses:
- Standard home care
- Doctor escort (pickup + dropoff fields)
- Hospital discharge (hospital pickup → home dropoff)
- Returning client saved address (silent re-geocode)
- Admin manual order (no autocomplete required)
- **Rural Ontario** (no Nominatim hit) → postal centroid fallback, order completes, flagged `postal_fallback`
- New-build street, retirement community, hospital entrance → `approximate`, order completes
- Apartment/unit numbers preserved
- Invalid postal regex → blocked at client (only hard block)
- Nominatim down → order still completes via postal fallback or `failed` status

**Invariants:**
- No booking ever rejected because of geocode quality alone.
- No duplicate orders, no payment loss, no dispatch loops (existing idempotency guards preserved).
- Admin manual flow + existing live orders untouched.

### Edge cases acknowledged

- Nominatim 1 req/sec rate limit → debounce on client (500ms) + server retry budget keeps us safe; if hit, recorded as `RATE_LIMITED` and admin can retry.
- FSA centroid is approximate (~3-15km) → marked `postal_fallback` so dispatch widens search and admin knows to confirm.
- Rural addresses with no postal-area Nominatim hit at all → `failed` status, lands in Unserved with raw text, admin uses Manual Override.

### Deliverables

- 1 migration (geocode diagnostic columns on `bookings`)
- 1 new component `AddressAutocomplete.tsx` (Nominatim, free, debounced)
- Edits to `StepLocation.tsx` + booking flow wrappers (soft validation)
- Edits to `create-booking` edge function (retry + postal fallback + diagnostics + admin notify on non-success)
- New edge function `retry-geocode`
- Admin Unserved panel: Retry / Edit Address / Manual Override / Recover Order actions
- Memory note: "Geocode pipeline never blocks bookings; approximate/postal_fallback orders flagged for admin"

Approve to proceed.
