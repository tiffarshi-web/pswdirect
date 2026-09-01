# PSW Direct Worker native projects

The Worker web bundle and Capacitor configuration are source-controlled, but the
generated `android/` and `ios/` projects are not. This keeps generated images,
the Gradle wrapper JAR, and other native build-machine output out of website
changes and pull-request diffs.

## Generate and sync locally

From the repository root, install the locked dependencies and generate the
Worker bundle before adding a platform:

```sh
npm ci
npm run cap:add:worker:android
npm run cap:add:worker:ios
```

The Android command can run on an Android Studio build machine. Run the iOS
command on a Mac with Xcode and CocoaPods installed. After the projects exist,
refresh either one with:

```sh
npm run cap:sync:worker:android
npm run cap:sync:worker:ios
```

All commands use `mobile/worker/capacitor.config.ts`. The generated apps have
the name **PSW Direct Worker**, application ID **ca.pswdirect.worker**, and copy
web assets from the repository-level `dist-worker/` directory.

## Files generated on native build machines

Capacitor will recreate the ignored `mobile/worker/android/` tree, including
the Gradle project and wrapper, Android manifest, Java activity, XML resources,
launcher and splash PNGs, tests, and copied Worker web assets/configuration.

On a Mac, Capacitor will recreate the ignored `mobile/worker/ios/` tree,
including the Xcode project/workspace, Swift app delegate, property lists,
storyboards, CocoaPods configuration, app-icon and splash PNG asset catalogs,
tests/support files, and copied Worker web assets/configuration.

These directories are disposable generated output. Delete them and rerun the
corresponding `cap:add:worker:*` command when a clean native project is needed.

## Android CI verification

The `Worker Android verification` GitHub Actions workflow regenerates the
Android project from the locked source, runs type checking and tests, builds the
isolated Worker bundle, verifies the permanent app identity, and compiles a
debug APK with JDK 21. The resulting `psw-direct-worker-debug` artifact is kept
for 14 days for emulator or physical-device smoke testing.

Run the workflow manually from GitHub Actions when a test APK is needed. It also
runs for relevant pull requests and relevant changes pushed to `main`. The APK
is unsigned for store release and must not be submitted to Google Play.
