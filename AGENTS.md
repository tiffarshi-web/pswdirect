- Client native app lives in mobile/client (appId ca.pswdirect.client, bundle via vite.client.config.ts → dist-client); it bundles only client routes — why: keep worker/admin/SEO code out of the family app and keep identities separate.
- "On my way" is set only through psw_mark_on_my_way (assigned worker, active, same local day, before check-in); client stage alerts flow bookings trigger → client_stage_events → send-client-push — why: server-confirmed stages only, no ETA or location sharing.

- Client native session and push token live only in Keychain/Keystore (src/mobile/client/clientSession.ts); sign-out revokes the device server-side first — why: same token protection as the Worker app.
- Native projects for the Client app are checked in at mobile/client/android and mobile/client/ios; CI debug APK via .github/workflows/client-android.yml — why: reproducible beta builds without local Android Studio.
