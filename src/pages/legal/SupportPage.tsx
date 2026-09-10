import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Helmet>
        <title>Support | PSW Direct</title>
        <meta
          name="description"
          content="Contact PSW Direct support for help with the PSW Direct Worker app, shifts, payments or your account."
        />
        <link rel="canonical" href="https://pswdirect.ca/support" />
      </Helmet>

      <h1 className="mb-4 text-3xl font-bold">Support</h1>
      <p className="mb-4 text-muted-foreground">
        We help care professionals and families across Ontario. Support is available 24 hours a day, seven days a week.
      </p>
      <p className="mb-8 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
        PSW Direct does not provide emergency or medical care. In an emergency, call 911.
      </p>


      <dl className="mb-10 space-y-4 text-sm">
        <div>
          <dt className="font-semibold">Phone</dt>
          <dd>
            <a className="text-primary underline" href="tel:+12492884787">
              (249) 288-4787
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Email</dt>
          <dd>
            <a className="text-primary underline" href="mailto:admin@psadirect.ca">
              admin@psadirect.ca
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Office</dt>
          <dd>239 Grove St E, Barrie, Ontario L4M 2R1</dd>
        </div>
      </dl>

      <h2 className="mb-3 text-xl font-semibold">Common questions</h2>
      <ul className="mb-10 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Cannot sign in? Use the password reset link on the sign-in screen, or call the office.</li>
        <li>Cannot see available shifts? Your account must be approved and your police check current.</li>
        <li>Cannot check in? Allow location for PSW Direct in your phone settings, then try again from the visit address.</li>
        <li>Something wrong with your pay? Call the office with the order number shown on the shift.</li>
      </ul>

      <p className="text-sm text-muted-foreground">
        See also our <Link className="text-primary underline" to="/privacy">privacy policy</Link>,{" "}
        <Link className="text-primary underline" to="/terms">terms of service</Link>, and{" "}
        <Link className="text-primary underline" to="/account-deletion">account deletion</Link> information.
      </p>
    </main>
  );
}
