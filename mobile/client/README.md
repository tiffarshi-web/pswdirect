# PSW Direct Client app (ca.pswdirect.client)

Build: `npm run build:client`, then `npm run cap:add:client:android` / `cap:add:client:ios` (first time) or `cap:sync:client:*`.

Still required before a phone beta:
- Register `ca.pswdirect.client` as an Android + iOS app in the PSW Direct Firebase project; place `google-services.json` in `android/app/` and `GoogleService-Info.plist` in the iOS target; enable APNs key.
- Signing keys (Android upload key, Apple team/profile).
- App Links / Universal Links: publish `/.well-known/assetlinks.json` (needs the release SHA-256) and `apple-app-site-association` (needs Team ID) on pswdirect.ca so emailed sign-in links open the app. Until then, clients sign in with the 6-digit email code inside the app.
