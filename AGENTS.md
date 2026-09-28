- Client native app lives in mobile/client (appId ca.pswdirect.client, bundle via vite.client.config.ts → dist-client); it bundles only client routes — why: keep worker/admin/SEO code out of the family app and keep identities separate.
- "On my way" is set only through psw_mark_on_my_way (assigned worker, active, same local day, before check-in); client stage alerts flow bookings trigger → client_stage_events → send-client-push — why: server-confirmed stages only, no ETA or location sharing.

- Native bundles alias @/integrations/supabase/client to src/integrations/supabase/nativeClient.ts (Keychain/Keystore auth storage, no localStorage, fail closed); sign-out revokes the client device first — why: the generated client persists tokens in WebView localStorage.
- mobile/client and mobile/worker package.json must list their Capacitor plugins — why: cap sync only links plugins declared there.
- Native projects for the Client app are checked in at mobile/client/android and mobile/client/ios; CI debug APK via .github/workflows/client-android.yml — why: reproducible beta builds without local Android Studio.
