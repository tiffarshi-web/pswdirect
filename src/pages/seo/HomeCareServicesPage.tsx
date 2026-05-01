import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator } from "lucide-react";
import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const ExtraContent = () => (
  <article className="prose prose-slate max-w-none text-foreground">
    <h2 className="text-2xl md:text-3xl font-bold mb-4">What Are Home Care Services?</h2>
    <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6">
      Home care services are professional, non-medical support delivered in a person's own home by a
      trained Personal Support Worker (PSW). Instead of moving a loved one into a retirement residence
      or long-term care facility, families across Ontario use <strong>home care services near me</strong> to
      keep aging parents, recovering patients, and adults with disabilities comfortable, safe, and
      independent in familiar surroundings. PSW Direct connects families with vetted, police-checked
      personal support workers on demand — with transparent hourly pricing starting at $35/hr,
      no agency overhead, and no long-term contracts.
    </p>

    <h2 className="text-2xl md:text-3xl font-bold mb-4">Who Needs Home Care?</h2>
    <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4">
      Home care is for anyone who needs a helping hand to live well at home. The most common situations
      we support across Toronto, Barrie, and the Greater Toronto Area include:
    </p>
    <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
      <li><strong>Seniors aging in place</strong> who need help with bathing, dressing, meals, and companionship.</li>
      <li><strong>Adults recovering from surgery</strong> or a hospital stay who need short-term post-discharge support.</li>
      <li><strong>People living with dementia or Alzheimer's</strong> who benefit from supervision, routine, and safety monitoring.</li>
      <li><strong>Family caregivers needing respite</strong> — even a few hours a week of professional relief prevents burnout.</li>
      <li><strong>Patients with mobility challenges</strong> who need a PSW to escort them to medical appointments.</li>
      <li><strong>Anyone living alone</strong> who simply wants a friendly, capable person nearby for daily check-ins.</li>
    </ul>

    <h2 className="text-2xl md:text-3xl font-bold mb-4">Types of Home Care Services Offered</h2>
    <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4">
      Every family's situation is different. PSW Direct offers flexible, à la carte home care services
      that can be combined into a care plan that fits your loved one's needs and your budget.
    </p>
    <div className="grid sm:grid-cols-2 gap-4 mb-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-2">Personal Care</h3>
        <p className="text-sm text-muted-foreground">
          Bathing, grooming, dressing, toileting, transfers, and incontinence support — delivered with
          dignity by a trained PSW. Ideal as ongoing <Link to="/elderly-care-at-home" className="text-primary underline">elderly care at home</Link>.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-2">Companionship & Light Housekeeping</h3>
        <p className="text-sm text-muted-foreground">
          Conversation, meal preparation, medication reminders, light tidying, and outings. A great fit
          when you need a <Link to="/personal-support-worker-near-me" className="text-primary underline">personal support worker near me</Link> for
          a few hours a week.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-2">Hospital Discharge Support</h3>
        <p className="text-sm text-muted-foreground">
          A PSW meets your loved one at the hospital, manages transport home, sets up the home
          environment, and stays for the first critical hours. Learn more about{" "}
          <Link to="/hospital-discharge-care" className="text-primary underline">hospital discharge care</Link>.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-2">Doctor Escort & Medical Transport</h3>
        <p className="text-sm text-muted-foreground">
          Door-to-door accompaniment to specialist visits, dialysis, infusions, or surgery. Our{" "}
          <Link to="/doctor-escort-service" className="text-primary underline">doctor escort service</Link> includes
          transport, waiting time, and a written summary back to family.
        </p>
      </div>
    </div>

    <h2 className="text-2xl md:text-3xl font-bold mb-4">Why Choose PSW Direct for Private Home Care in Ontario</h2>
    <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4">
      Traditional home care agencies in Ontario charge $50–$60 per hour, lock families into multi-month
      contracts, and pass only a fraction of that fee to the actual caregiver. PSW Direct rebuilt the
      model from scratch so families pay less, PSWs earn more, and care can start the same day.
    </p>
    <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
      <li><strong>On-demand booking</strong> — request a vetted PSW online in under two minutes, 24/7.</li>
      <li><strong>Affordable, transparent pricing</strong> — personal care from $35/hour, doctor escort from $45/hour. No agency markup. No setup fees.</li>
      <li><strong>No contracts, ever</strong> — book one visit or a recurring weekly schedule. Cancel anytime.</li>
      <li><strong>Fully vetted PSWs</strong> — every worker is credential-verified, ID-checked, and police-background-checked before activation.</li>
      <li><strong>Real-time tracking</strong> — see when your PSW is on the way, when they arrive, and when the shift ends.</li>
      <li><strong>Insurance friendly</strong> — supports Veterans Affairs Canada (VAC), Blue Cross, and most private insurance reimbursements.</li>
    </ul>
    <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6">
      Whether you're searching for <strong>private home care Ontario</strong> for a parent in Toronto or
      same-day support after a hospital discharge in Barrie, our platform gives you the speed of an
      app with the trust of a regulated, Ontario-based service.
    </p>

    <h2 className="text-2xl md:text-3xl font-bold mb-4">Areas We Serve in Ontario</h2>
    <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4">
      PSW Direct provides home care services across Toronto, Barrie, and the entire Greater Toronto
      Area, including Mississauga, Brampton, Vaughan, Markham, Richmond Hill, Oakville, Burlington,
      Hamilton, Oshawa, Whitby, Ajax, and Pickering. We also serve communities throughout Simcoe
      County, Durham Region, Halton Region, Peel Region, and York Region. If you're not sure whether
      we cover your postal code, our coverage map will confirm in seconds — and most rural Ontario
      addresses can be matched on request.
    </p>

    <h2 className="text-2xl md:text-3xl font-bold mb-4">How to Book Home Care Services</h2>
    <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6">
      Booking takes about two minutes. Tell us who the care is for, choose your service type, pick a
      start time, and add any special instructions. A vetted PSW in your area will accept the job —
      typically within minutes — and you'll receive their name, photo, and arrival ETA. Care begins at
      the scheduled time, and you only pay for the hours actually worked. It's the simplest way to
      arrange dignified, professional in-home care anywhere in Ontario.
    </p>

    <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 mb-2">
      <Link to="/">
        <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto">
          Book Care Now <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </Link>
      <Link to="/psw-cost">
        <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto">
          <Calculator className="w-5 h-5 mr-2" /> Get Instant Price Estimate
        </Button>
      </Link>
    </div>
  </article>
);

const config: HighConvertPageConfig = {
  slug: "home-care-services",
  title: "Home Care Services in Ontario | Private PSW Care from $35/hr | PSW Direct",
  description:
    "Affordable home care services across Ontario. Vetted personal support workers for seniors, post-hospital care, companionship, and elderly care at home. From $35/hr — no contracts.",
  headline: "Home Care Services in Ontario",
  subheadline:
    "Personal support workers near you for elderly care at home, overnight care, hospital discharge, and doctor escorts. Book a vetted PSW in under 2 minutes.",
  breadcrumbTrail: [{ name: "Home Care Services", url: "/home-care-services" }],
  extraContent: <ExtraContent />,
  faqs: [
    {
      question: "What home care services does PSW Direct offer?",
      answer:
        "We provide personal care, companionship, meal prep, medication reminders, mobility support, overnight care, 24-hour care, doctor escorts, hospital discharge support, and post-surgery recovery care across Ontario.",
    },
    {
      question: "How much do home care services cost in Ontario?",
      answer:
        "Home care services through PSW Direct start at $35/hr for personal care and companionship, and $45/hr for medical escort. There are no contracts, agency markups, or hidden fees.",
    },
    {
      question: "Do you offer same-day home care services?",
      answer:
        "Yes. Most same-day home care service requests are matched within hours across the GTA and Ontario. Just select 'ASAP' when booking.",
    },
    {
      question: "Are your personal support workers vetted?",
      answer:
        "Every PSW on PSW Direct is credential-verified, ID-checked, and police-background-checked before being approved to deliver home care services.",
    },
    {
      question: "Can I book private home care in Ontario without a contract?",
      answer:
        "Yes — PSW Direct is fully contract-free. Book by the hour, cancel anytime, and only pay for the care you actually use.",
    },
  ],
};

const HomeCareServicesPage = () => <HighConvertLandingPage config={config} />;
export default HomeCareServicesPage;
