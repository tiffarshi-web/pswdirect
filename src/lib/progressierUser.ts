/**
 * Links the signed-in caregiver's device to their email in Progressier so
 * server-side job alerts can target them.
 *
 * The Progressier client script is loaded asynchronously from index.html, so it
 * is usually NOT ready when a dashboard component mounts. The previous
 * fire-once check silently skipped registration in that (common) case, leaving
 * the device subscribed anonymously — pushes addressed to the caregiver's email
 * were accepted by the API but delivered to nobody.
 *
 * This waits for the script, then registers the email + tags.
 */

type ProgressierApi = {
  add?: (data: { email: string; tags?: string }) => void;
};

const getProgressier = (): ProgressierApi | undefined =>
  (window as unknown as { progressier?: ProgressierApi }).progressier;

export async function registerProgressierUser(
  email: string,
  tags = "psw",
  timeoutMs = 20000,
): Promise<boolean> {
  if (typeof window === "undefined" || !email) return false;

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const api = getProgressier();
    if (api?.add) {
      try {
        api.add({ email: email.trim().toLowerCase(), tags });
        return true;
      } catch (e) {
        console.warn("Progressier sync failed:", e);
        return false;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.warn("Progressier script never became available — push targeting skipped");
  return false;
}
