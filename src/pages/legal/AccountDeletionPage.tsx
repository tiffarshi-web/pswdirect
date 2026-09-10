import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type Phase = "form" | "sent" | "confirming" | "confirmed" | "invalid";

export default function AccountDeletionPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [phase, setPhase] = useState<Phase>(token ? "confirming" : "form");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Confirming an emailed link turns the request into a real, tracked request.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.functions.invoke("public-account-deletion", {
        body: { action: "confirm", token },
      });
      if (cancelled) return;
      if (error || !data?.ok) {
        setPhase("invalid");
        setMessage("This link is not valid, has expired, or has already been used.");
      } else {
        setPhase("confirmed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-account-deletion", {
        body: { email },
      });
      if (error) throw error;
      setMessage(data?.message ?? "");
      setPhase("sent");
    } catch {
      setMessage("We could not send the confirmation email. Please call (249) 288-4787.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Helmet>
        <title>Delete your PSW Direct account | PSW Direct</title>
        <meta
          name="description"
          content="Request deletion of a PSW Direct Worker account and see what information is deleted and what is kept."
        />
        <link rel="canonical" href="https://pswdirect.ca/account-deletion" />
      </Helmet>

      <h1 className="mb-4 text-3xl font-bold">Delete your account</h1>
      <p className="mb-8 text-muted-foreground">
        This page explains how a care professional can delete their PSW Direct Worker account, and what happens to the
        information we hold. You do not need to be signed in.
      </p>

      <section className="mb-10 rounded-lg border p-5">
        <h2 className="mb-3 text-xl font-semibold">Request deletion from this page</h2>
        {phase === "confirming" && <p className="text-sm text-muted-foreground">Checking your link…</p>}
        {phase === "confirmed" && (
          <p className="text-sm">
            Your deletion request is recorded. Our office will review it, may contact you to confirm your identity, and
            will email you when it is complete. You will not be offered further work while the request is open.
          </p>
        )}
        {phase === "invalid" && <p className="text-sm text-destructive">{message}</p>}
        {phase === "sent" && <p className="text-sm">{message}</p>}
        {(phase === "form" || phase === "invalid") && (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <Label htmlFor="deletion-email">Email address on your account</Label>
            <Input
              id="deletion-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <p className="text-xs text-muted-foreground">
              We email a confirmation link to that address so nobody else can request deletion of your account.
            </p>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send confirmation link"}
            </Button>
          </form>
        )}
      </section>

      <h2 className="mb-3 text-xl font-semibold">In the app</h2>
      <ol className="mb-8 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Open the PSW Direct Worker app and sign in.</li>
        <li>
          Go to <strong>Account</strong>.
        </li>
        <li>
          Choose <strong>Delete my account</strong> and confirm.
        </li>
        <li>You are signed out on every device immediately and your request is sent to our office.</li>
      </ol>

      <h2 className="mb-3 text-xl font-semibold">By phone or email</h2>
      <p className="mb-8 text-sm text-muted-foreground">
        Email <a className="text-primary underline" href="mailto:admin@psadirect.ca">admin@psadirect.ca</a> from the
        address on your account, or call{" "}
        <a className="text-primary underline" href="tel:+12492884787">(249) 288-4787</a>. Support is available 24 hours
        a day, seven days a week.
      </p>

      <h2 className="mb-3 text-xl font-semibold">What happens next</h2>
      <ul className="mb-8 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Your device notification registrations are removed and you are signed out everywhere.</li>
        <li>You can no longer be offered or accept work while the request is open.</li>
        <li>Our office verifies that the request came from you before anything is deleted.</li>
        <li>If you had already accepted an upcoming visit, we contact you so the client is not left without care.</li>
        <li>We email you when the request has been completed, or if we cannot complete it and why.</li>
      </ul>

      <h2 className="mb-3 text-xl font-semibold">What is deleted</h2>
      <ul className="mb-8 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Your sign-in account and caregiver profile.</li>
        <li>Your uploaded credential documents.</li>
        <li>Your notification device registrations.</li>
        <li>Everything the app stored on your phone, including any unsent care report drafts.</li>
      </ul>

      <h2 className="mb-3 text-xl font-semibold">What we must keep</h2>
      <p className="text-sm text-muted-foreground">
        Completed care reports, invoices, payout records and the audit record of your deletion request are kept for the
        period required by Ontario tax, insurance and health-record obligations, and are then destroyed. These records
        are no longer linked to an active account. Deletion is permanent and is not the same as simply pausing your
        availability — if you only want to stop receiving shifts, call the office instead.
      </p>
    </main>
  );
}
