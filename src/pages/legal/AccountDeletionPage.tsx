import { Helmet } from "react-helmet-async";

export default function AccountDeletionPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Helmet>
        <title>Delete your PSW Direct account | PSW Direct</title>
        <meta
          name="description"
          content="How to request deletion of a PSW Direct Worker account and what happens to your information."
        />
        <link rel="canonical" href="https://pswdirect.ca/account-deletion" />
      </Helmet>

      <h1 className="mb-4 text-3xl font-bold">Delete your account</h1>
      <p className="mb-6 text-muted-foreground">
        This page explains how a care professional can delete their PSW Direct Worker account, and what happens to the
        information we hold.
      </p>

      <h2 className="mb-3 text-xl font-semibold">In the app</h2>
      <ol className="mb-8 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Open the PSW Direct Worker app and sign in.</li>
        <li>Go to <strong>Account</strong>.</li>
        <li>Choose <strong>Delete my account</strong> and confirm.</li>
        <li>You will be signed out immediately and your request is sent to our office.</li>
      </ol>

      <h2 className="mb-3 text-xl font-semibold">By email</h2>
      <p className="mb-8 text-sm text-muted-foreground">
        Email <a className="text-primary underline" href="mailto:admin@psadirect.ca">admin@psadirect.ca</a> from the
        address on your account with the subject &ldquo;Delete my account&rdquo;, or call{" "}
        <a className="text-primary underline" href="tel:+12492884787">(249) 288-4787</a>.
      </p>

      <h2 className="mb-3 text-xl font-semibold">What is deleted</h2>
      <ul className="mb-8 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Your sign-in account and profile, so you can no longer be offered or accept work.</li>
        <li>Your uploaded credential documents.</li>
        <li>Your notification device registrations.</li>
        <li>Everything the app stored on your phone, including any unsent care report drafts.</li>
      </ul>

      <h2 className="mb-3 text-xl font-semibold">What we must keep</h2>
      <p className="mb-8 text-sm text-muted-foreground">
        Completed care reports, invoices and payment records are kept for the period required by Ontario tax, insurance
        and health-record obligations, and are then destroyed. These records are no longer linked to an active account.
      </p>

      <h2 className="mb-3 text-xl font-semibold">How long it takes</h2>
      <p className="text-sm text-muted-foreground">
        We confirm the request within two business days and complete the deletion within thirty days. If you have an
        accepted upcoming visit, we will contact you first so the client is not left without care.
      </p>
    </main>
  );
}
