#!/usr/bin/env node
/**
 * Copies the Firebase Android configuration into the generated Capacitor
 * Android project (mobile/worker/android/app/google-services.json).
 *
 * The generated android/ tree is not source controlled, so the file of record
 * lives at mobile/worker/firebase/google-services.json and is copied in after
 * `cap add`/`cap sync`. The package name is verified before copying so a
 * configuration for another app can never be installed here.
 *
 * google-services.json holds only client-side identifiers (project number,
 * mobile SDK app id, Android API key). It is NOT a sending credential and must
 * never be placed in the website's public assets.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_PACKAGE = "ca.pswdirect.worker";

const source = resolve(root, "mobile/worker/firebase/google-services.json");
const targetDir = resolve(root, "mobile/worker/android/app");
const target = resolve(targetDir, "google-services.json");

if (!existsSync(source)) {
  console.error(`Missing ${source} — native push cannot be configured.`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(source, "utf8"));
const packages = (config.client ?? []).map(
  (client) => client?.client_info?.android_client_info?.package_name,
);

if (!packages.includes(EXPECTED_PACKAGE)) {
  console.error(
    `google-services.json does not contain the ${EXPECTED_PACKAGE} Android app. Refusing to install it.`,
  );
  process.exit(1);
}

if (!existsSync(targetDir)) {
  console.error(
    "mobile/worker/android/app does not exist yet. Run `npm run cap:add:worker:android` first.",
  );
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
console.log(`Firebase Android configuration installed for ${EXPECTED_PACKAGE}.`);
