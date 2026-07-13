import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Minimal typed shim for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; redirect_uris?: string[] } | null;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
  scopes?: string[];
};
type OAuthResult = { redirect_url?: string; redirect_to?: string };
interface OAuthApi {
  getAuthorizationDetails(id: string): Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization(id: string): Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization(id: string): Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
}
const authOauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loadDetails = async () => {
    if (!authorizationId) {
      setError("Missing authorization_id");
      return;
    }
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setNeedsSignIn(true);
      return;
    }
    setNeedsSignIn(false);
    const { data, error } = await authOauth().getAuthorizationDetails(authorizationId);
    if (error) return setError(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      return;
    }
    setDetails(data);
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorizationId]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    setPassword("");
    await loadDetails();
  }

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await authOauth().approveAuthorization(authorizationId)
      : await authOauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";
  const scopeList = details?.scopes ?? (details?.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {needsSignIn ? "Sign in to continue" : `Connect ${clientName} to PSW Direct`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {needsSignIn
              ? "You're being asked to grant access to your PSW Direct account. Sign in to review the request."
              : `${clientName} will be able to use PSW Direct's tools while acting as you. Your row-level permissions still apply.`}
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3">
            {error}
          </div>
        )}

        {needsSignIn && (
          <form onSubmit={signIn} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoComplete="email"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoComplete="current-password"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        {!needsSignIn && !details && !error && (
          <p className="text-sm text-muted-foreground">Loading authorization request…</p>
        )}

        {!needsSignIn && details && (
          <>
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <p className="text-foreground font-medium">This lets {clientName} use PSW Direct as you.</p>
              {scopeList.length > 0 && (
                <ul className="list-disc pl-5 text-muted-foreground">
                  {scopeList.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                This does not bypass PSW Direct's permissions or backend policies.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 rounded-md border border-input bg-background text-foreground text-sm font-medium py-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 disabled:opacity-50"
              >
                {busy ? "Working…" : "Approve"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
