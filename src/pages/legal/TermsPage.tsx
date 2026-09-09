import { Helmet } from "react-helmet-async";
import { TERMS_OF_SERVICE } from "@/components/client/TermsOfServiceDialog";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Helmet>
        <title>Terms of Service | PSW Direct</title>
        <meta
          name="description"
          content="PSW Direct Inc. terms of service for clients and personal support workers in Ontario, Canada."
        />
        <link rel="canonical" href="https://pswdirect.ca/terms" />
      </Helmet>

      <h1 className="mb-6 text-3xl font-bold">Terms of Service</h1>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
        {TERMS_OF_SERVICE}
      </pre>
    </main>
  );
}
