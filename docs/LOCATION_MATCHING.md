# Location-based shift matching (PSW Direct Canada)

Ontario only. Nothing here changes prices, taxes, payments, existing orders or
customer pages.

## Settings (administrator-controlled, `app_settings`)

| Key | Default | Meaning |
| --- | --- | --- |
| `active_service_radius` | `75` | Matching radius in kilometres. Read server-side by `public.active_service_radius_km()`. |
| `location_max_age_hours` | `24` | How long a saved caregiver position stays trusted for shift discovery. Read by `public.dispatch_location_max_age_hours()`. |
| `checkin_radius_m` | `200` | Home-care arrival geofence for check-in. |
| `transport_checkin_radius_m` | `500` | Hospital/transport pick-up geofence for check-in. |
| `signout_radius_m` | `2000` | Soft checkout radius. Checkout is never blocked; a reading outside this is flagged for administrator review. |
| `attendance_accuracy_max_m` | `150` | Strictest accepted GPS accuracy for check-in/checkout. Separate from the looser shift-discovery accuracy. |
| `attendance_max_reading_age_seconds` | `90` | Maximum age of the attendance reading itself. |

Attendance settings are separate from the 75 km shift-discovery radius and are
changed only through `app_settings`, which keeps administrator audit history.

Neither value is hard-coded in application logic; the client constants exist
only as a fallback when the settings table cannot be read.

## Effective dispatch location

`public.psw_dispatch_location(psw_id)` returns the position used for matching:

1. the caregiver's most recent device-verified position, when it is inside the
   configured trust window (`source = 'device'`);
2. otherwise the coordinates of their verified home address
   (`source = 'home_address'`);
3. otherwise nothing — the caregiver receives no offers
   (`exclusion_reason = 'no_usable_location'`).

Positions are written only through `public.record_psw_location(...)`, a
`SECURITY DEFINER` routine that resolves the caregiver from the signed-in
session. The app cannot choose whose location it is writing, and distance,
radius and eligibility are never computed from client input.

## Eligibility (`public.psw_eligible_booking_ids`)

A caregiver is offered a shift only when all of the following hold: approved and
active; no pending account-deletion request; police check current; a usable
dispatch location; straight-line distance within the configured radius; no
overlapping accepted shift on the same date; vehicle when the shift is a
transport; gender/language preferences satisfied (or the two-hour fallback has
elapsed); the order is unassigned, paid, in the future, inside Ontario, and
confidently geocoded.

Orders whose address is missing, failed or flagged for review are never
auto-dispatched — they appear in `public.admin_geocode_review_queue()`.

Acceptance stays atomic: `public.claim_booking` locks the booking row and
re-checks the same eligibility predicate, so the first eligible caregiver wins
and everyone else is told the shift is no longer available.

## Location permission and background behaviour

- The app explains, before the system prompt, that location is used for nearby
  shift matching, check-in/out verification and safety.
- The position is refreshed when the app is opened or brought to the front
  (`useVerifiedLocation`). There is no background location collection; the only
  continuous tracking is the existing, separately disclosed active-shift
  tracking.
- Push notifications use the last trusted position. When it has expired, the
  caregiver sees a prompt to open the app and refresh.
- Shift check-in and sign-out always take a fresh fix; a saved position is never
  reused for attendance.

## Privacy

Before acceptance a caregiver sees date and time, estimated pay, distance, the
service area, care tasks, non-identifying care considerations and required
qualifications. Client name, phone, entry instructions and clinical notes are
revealed only to the caregiver who accepted.

Caregiver positions are readable only by that caregiver (their own row) and by
administrators. `public.admin_dispatch_candidates(booking_id)` — the data behind
the admin dispatch map — raises `not_authorized` for anyone who is not an
administrator.
