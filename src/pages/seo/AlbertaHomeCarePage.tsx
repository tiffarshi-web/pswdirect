import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";

const canonicalUrl = `${SITE_URL}/alberta-home-care`;
const title = "Alberta Home Care Updates | PSW Direct";
const description =
  "PSW Direct is preparing its Alberta home-care expansion. Alberta bookings and provider applications are not open yet. Contact our 24/7 support team for updates.";

const faqs = [
  {
    question: "Can I book home care in Alberta through PSW Direct now?",
    answer:
      "No. Alberta bookings are not open. PSW Direct currently accepts home-care bookings in Ontario only.",
  },
  {
    question: "Is PSW Direct accepting Alberta provider applications?",
    answer:
      "No. Alberta recruitment is not open while the province launch remains in preparation.",
  },
  {
    question: "When will Alberta services open?",
    answer:
      "An Alberta opening date has not been confirmed. PSW Direct will update this page when there is a confirmed change.",
  },
];

const AlbertaHomeCarePage = () => (
  <>
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <script type="application/ld+json">
        {JSON.stringify(
          buildBreadcrumbList([
            { name: "Home", url: SITE_URL },
            { name: "Alberta Home Care Updates", url: canonicalUrl },
          ]),
        )}
      </script>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        })}
      </script>
    </Helmet>

    <main className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link to="/" className="font-semibold text-foreground">PSW Direct</Link>
          <a
            href="tel:+12492884787"
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            24/7 Support: (249) 288-4787
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">Alberta home care updates</span>
        </nav>

        <section className="rounded-2xl border border-border bg-card p-6 md:p-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
            Alberta expansion in preparation
          </p>
          <h1 className="mb-5 text-3xl font-bold text-foreground md:text-4xl">
            Home Care in Alberta: Launch Updates
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            PSW Direct is preparing a province-specific expansion for Alberta. Alberta
            bookings and provider applications are not open yet, and an opening date
            has not been confirmed.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            We will use Alberta-specific service, provider, and policy information
            before opening in the province. In Alberta, the platform is being prepared
            for the Health Care Aide (HCA) terminology used in our provincial setup.
            Ontario remains the only province accepting bookings through PSW Direct.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/home-care-ontario"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 font-medium text-primary-foreground hover:opacity-90"
            >
              View Home Care in Ontario
            </Link>
            <a
              href="tel:+12492884787"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-input px-5 py-2 font-medium text-foreground hover:bg-muted"
            >
              Call 24/7 support for updates
            </a>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="alberta-faq-heading">
          <h2 id="alberta-faq-heading" className="mb-5 text-2xl font-semibold text-foreground">
            Alberta home-care questions
          </h2>
          <div className="space-y-5">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground">{faq.question}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  </>
);

export default AlbertaHomeCarePage;
