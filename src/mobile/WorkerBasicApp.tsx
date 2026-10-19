import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
const WorkerApp = lazy(() => import("./WorkerApp"));
import { restoreWorkerSignIn, signInWorker, signOutWorker, type BasicWorkerSignIn } from "./native/workerBasicAuth";
import { SESSION_RESTORE_TIMEOUT_MS, timedOut, withTimeout } from "./native/startup";
import { hideSplashScreen } from "./native/bootstrap";

/**
 * First replacement beta: a small sign-in surface independent of the legacy
 * router, AuthProvider, dashboard, push listeners and job initialization.
 * The existing backend and Keychain/Keystore storage are reused unchanged.
 */
export default function WorkerBasicApp() {
  const [worker, setWorker] = useState<BasicWorkerSignIn | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [canRetryRestore, setCanRetryRestore] = useState(false);
  const attemptRef = useRef(0);

  const run = useCallback(async (
    operation: () => Promise<BasicWorkerSignIn | null>,
    progress: string,
    isRestore = false,
  ) => {
    const attempt = ++attemptRef.current;
    setBusy(true);
    setMessage("");
    setStatus(progress);
    setCanRetryRestore(false);
    try {
      // Even storage/plugin failures and pending auth locks have a deadline.
      const result = await withTimeout(Promise.resolve().then(operation), SESSION_RESTORE_TIMEOUT_MS);
      if (attempt !== attemptRef.current) return;
      if (timedOut(result)) {
        setMessage("That took too long. Check your connection and try again.");
        setCanRetryRestore(isRestore);
      } else {
        if (result) window.history.replaceState(null, "", "/psw");
        setWorker(result);
        setPassword("");
      }
    } catch (error) {
      if (attempt !== attemptRef.current) return;
      setMessage(error instanceof Error ? error.message : "Could not finish. Please try again.");
      setCanRetryRestore(isRestore);
    } finally {
      if (attempt === attemptRef.current) {
        setBusy(false);
        setStatus("");
      }
    }
  }, []);

  useEffect(() => {
    // Sign-in is already rendered; nothing native or remote gates first paint.
    window.dispatchEvent(new Event("psw-worker-shell-mounted"));
    void hideSplashScreen();
    if (navigator.onLine) {
      void run(restoreWorkerSignIn, "Checking saved sign-in…", true);
    } else {
      setMessage("You’re offline. Connect to Wi-Fi or mobile data to sign in.");
      setCanRetryRestore(true);
    }
    return () => { attemptRef.current += 1; };
  }, [run]);

  function signIn(event: FormEvent) {
    event.preventDefault();
    if (!navigator.onLine) {
      setMessage("You’re offline. Connect to Wi-Fi or mobile data to sign in.");
      return;
    }
    void run(() => signInWorker(email.trim().toLowerCase(), password), "Signing in…");
  }

  const profileStatus = worker?.status === "approved"
    ? "Your caregiver account is approved."
    : worker?.status === "pending"
      ? "Your application is under review."
      : "Please contact the office about your caregiver account.";

  if (worker) {
    return (
      <Suspense fallback={<main role="status" className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-100">Opening your caregiver dashboard…</main>}>
        <WorkerApp />
      </Suspense>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-950 px-6 py-12 text-slate-100 flex items-center justify-center">
      <section className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <header className="space-y-2">
          <p className="text-sm font-medium text-teal-300">PSW Direct Caregiver</p>
          <h1 className="text-2xl font-semibold">{worker ? `Welcome, ${worker.firstName}` : "Sign in"}</h1>
          <p className="text-sm text-slate-300">{worker ? profileStatus : "Use your existing caregiver account."}</p>
        </header>

        {worker ? (
          <div className="space-y-4">
            <p className="text-sm">You’re signed in as {worker.email}.</p>
            <p className="text-sm text-slate-300">This first test version checks startup and sign-in. Shift tools will follow after launch is verified.</p>
            <button type="button" disabled={busy} className="w-full rounded-lg border border-slate-500 px-4 py-3 font-medium disabled:opacity-50" onClick={() => void run(async () => { await signOutWorker(); return null; }, "Signing out…")}>
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="worker-email">Email</label>
              <input id="worker-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 disabled:opacity-50" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="worker-password">Password</label>
              <input id="worker-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 disabled:opacity-50" />
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-teal-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">
              Sign in
            </button>
          </form>
        )}

        {status && <p role="status" className="text-sm text-slate-300">{status}</p>}
        {message && <p role="alert" className="text-sm text-amber-200">{message}</p>}
        {canRetryRestore && <button type="button" disabled={busy} className="w-full rounded-lg border border-slate-500 px-4 py-3 text-sm disabled:opacity-50" onClick={() => void run(restoreWorkerSignIn, "Checking saved sign-in…", true)}>Retry saved sign-in</button>}
      </section>
    </main>
  );
}
