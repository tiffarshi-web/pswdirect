# Post-Publish Verification — pswdirect.ca (read-only)

Deployment ID checked: 776a6983-1791-4a9b-b1c7-56d9f557efa8. No edits, no republish, no real records touched.

## Verdict: deployment is complete on pswdirect.ca — the new build is live

## Evidence

1. **pswdirect.ca serves the new build**
   - `https://pswdirect.ca/` returns 200, title "Home Care Services in Ontario | Book In-Home Care Online | PSW Direct".
   - It loads bundle `/assets/index-BAKEEGVE.js` (7.6 MB).
   - That bundle contains the new features' exact strings:
     - "Care report ready" — client visit timeline ✓
     - "is on the way" — timeline wording ✓
     - "Booking cancelled" — timeline cancelled state ✓
     - "Viewing records for" — admin province banner ✓
     - "Preparation" (7×) and "Province" (14×) — province selector ✓
   - Hashed asset filename means this is a fresh build artifact, not a cached old one; the HTML is served with `no-cache`, so visitors always get the newest bundle reference. No propagation delay expected for the main site.

2. **Deep links work**: `https://pswdirect.ca/orders` returns 200 (SPA fallback intact).

3. **Preview comparison**: the preview URL is behind the login wall from this sandbox, so a byte-for-byte bundle comparison was not possible. The string evidence above confirms the live bundle contains both new features.

## One problem found (not caused by this publish)

- **www.pswdirect.ca is broken**: the secure (HTTPS) connection fails at the TLS handshake ("ssl/tls alert handshake failure"), and the plain-HTTP address returns 409. It is not redirecting visitors to pswdirect.ca.
- This is a domain/certificate setup issue on the www address, separate from the deployment. The main address pswdirect.ca works correctly.
- Recommended follow-up (separate step, needs your approval): re-check the www.pswdirect.ca domain connection and certificate in Project Settings → Domains, and confirm psadirect.ca / www.psadirect.ca still redirect.

## Not checked (by design)

- No signed-in pages, no real bookings, no client/worker flows exercised — read-only external fetches only.
- Alberta remains in Preparation; nothing was enabled.
