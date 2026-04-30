import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Moon, Shield, Clock, Heart, ArrowRight } from "lucide-react";
import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const ExtraContent = () => (
  <article className="prose prose-lg max-w-none text-foreground">
    <h2 className="text-2xl md:text-3xl font-bold mb-4">Overnight Home Care Services in Ontario</h2>
    <p className="text-muted-foreground leading-relaxed mb-6">
      Nighttime is when families worry most. A loved one trying to get to the bathroom alone, a parent
      with dementia who wanders after midnight, a recent surgery patient who can't reposition without
      help — these are the moments that quietly drain caregivers and put seniors at risk. PSW Direct's
      <strong> overnight home care</strong> places a vetted, awake personal support worker inside the
      home from evening until morning, so the household can finally rest while a trained professional
      keeps watch.
    </p>

    <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-3">What Overnight Home Care Actually Looks Like</h3>
    <p className="text-muted-foreground leading-relaxed mb-4">
      An overnight shift typically runs 8 to 12 hours — often 9 PM to 7 AM, though families can choose
      any window. Unlike a daytime visit focused on tasks, overnight care is about presence, vigilance,
      and quiet response. The PSW remains awake and alert through the entire shift, performs scheduled
      check-ins, responds instantly to call bells or movement, and documents everything that happens so
      the morning handoff is seamless.
    </p>
    <p className="text-muted-foreground leading-relaxed mb-6">
      This is fundamentally different from a "live-in" arrangement. With an awake <em>overnight caregiver</em>,
      your loved one is supervised every minute. They are never left alone during the highest-risk
      hours of the day — the hours when most senior falls, dementia exits, and medication mishaps occur.
    </p>

    <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-3">Who Needs Overnight Care</h3>
    <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
      <li><strong>Elderly parents living alone</strong> who are unsteady at night or recovering from a recent fall.</li>
      <li><strong>Seniors with dementia or Alzheimer's</strong> who experience sundowning, wandering, or sleep reversal.</li>
      <li><strong>Post-surgery and post-hospital patients</strong> who need help repositioning, toileting, or managing pain through the night.</li>
      <li><strong>Adults with mobility limitations</strong> — Parkinson's, stroke recovery, or advanced arthritis — who can't safely transfer alone.</li>
      <li><strong>Palliative and end-of-life care</strong> situations where the family needs uninterrupted presence and dignity.</li>
      <li><strong>Exhausted family caregivers</strong> who are burning out and simply need to sleep through the night, even just twice a week.</li>
    </ul>

    <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-3">What Our PSWs Do Through the Night</h3>
    <p className="text-muted-foreground leading-relaxed mb-4">
      Every overnight PSW on PSW Direct is credential-verified and police-checked. Their core
      responsibilities during a shift include:
    </p>
    <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
      <li><strong>Active safety monitoring</strong> — staying awake, listening, and watching for distress, restlessness, or attempts to get out of bed unassisted.</li>
      <li><strong>Bathroom and toileting assistance</strong> — safe transfers to the bathroom or commode, incontinence care, and skin checks.</li>
      <li><strong>Repositioning and pressure-injury prevention</strong> for clients who can't turn themselves.</li>
      <li><strong>Medication reminders</strong> and timely administration of prescribed nighttime doses.</li>
      <li><strong>Dementia redirection</strong> — calmly guiding wandering or anxious clients back to bed without confrontation.</li>
      <li><strong>Light meals, hydration, and snacks</strong> for clients who wake hungry or need to take medication with food.</li>
      <li><strong>Companionship and reassurance</strong> when a client wakes anxious, disoriented, or in pain.</li>
      <li><strong>Detailed shift notes</strong> documenting sleep quality, bathroom visits, food intake, and any incidents — ready for the family in the morning.</li>
    </ul>

    <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-3">Why Families Choose PSW Direct for Overnight Care</h3>
    <p className="text-muted-foreground leading-relaxed mb-4">
      Most overnight care in Ontario is locked behind agency contracts, minimum-week commitments, and
      hourly rates that climb past $45–$55. PSW Direct is built differently:
    </p>
    <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
      <li><strong>From $30/hour</strong>, including overnight shifts — no nighttime surcharge.</li>
      <li><strong>No contracts.</strong> Book one night, every weekend, or seven nights a week.</li>
      <li><strong>On-demand booking.</strong> Most overnight requests in the GTA are matched the same day.</li>
      <li><strong>Transparent matching.</strong> Review caregiver profiles and request a specific PSW for continuity.</li>
      <li><strong>Real-time visibility.</strong> Track shift start, check-ins, and care notes from your phone.</li>
      <li><strong>Vetted & insured.</strong> Every PSW is background-checked and credential-verified before activation.</li>
    </ul>

    <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-3">Areas We Serve for Overnight Care</h3>
    <p className="text-muted-foreground leading-relaxed mb-6">
      PSW Direct provides overnight home care across the entire Greater Toronto Area and most of
      southern Ontario. High-coverage cities include <strong>Toronto, Mississauga, Brampton, Vaughan,
      Markham, Richmond Hill, Oakville, Burlington, Hamilton, Barrie, Oshawa, Whitby, Ajax, Pickering,
      Newmarket, and Aurora</strong>. Coverage extends north to Orillia and Midland and east through
      Durham Region. Same-day overnight availability is strongest in the GTA core; outlying communities
      typically secure overnight coverage with 24–48 hours of notice.
    </p>

    <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-3">How to Choose Between Overnight and Round-the-Clock Care</h3>
    <p className="text-muted-foreground leading-relaxed mb-6">
      Many families start with one or two overnight shifts a week to relieve the primary caregiver.
      Others move directly to nightly overnight coverage when discharged from hospital. If your loved
      one needs supervision both day and night, explore our{" "}
      <Link to="/24-hour-home-care" className="text-primary underline font-medium">24-hour home care service</Link>,
      which uses rotating awake PSWs across a full day. For broader daytime support, see our{" "}
      <Link to="/home-care-services" className="text-primary underline font-medium">complete home care services</Link>{" "}
      overview, our{" "}
      <Link to="/elderly-care-at-home" className="text-primary underline font-medium">elderly care at home</Link>{" "}
      page, or find a{" "}
      <Link to="/personal-support-worker-near-me" className="text-primary underline font-medium">personal support worker near you</Link>.
    </p>

    <div className="grid sm:grid-cols-2 gap-4 my-10">
      <div className="bg-card border border-border rounded-xl p-5">
        <Moon className="w-6 h-6 text-primary mb-2" />
        <h4 className="font-semibold mb-1">Awake Overnight</h4>
        <p className="text-sm text-muted-foreground">Best for dementia, fall risk, frequent toileting, and post-hospital recovery.</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <Shield className="w-6 h-6 text-primary mb-2" />
        <h4 className="font-semibold mb-1">Vetted & Insured</h4>
        <p className="text-sm text-muted-foreground">Every PSW is police-checked, credential-verified, and reviewed before they ever step into your home.</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <Clock className="w-6 h-6 text-primary mb-2" />
        <h4 className="font-semibold mb-1">Same-Day Available</h4>
        <p className="text-sm text-muted-foreground">Most GTA overnight requests are matched within hours of booking.</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <Heart className="w-6 h-6 text-primary mb-2" />
        <h4 className="font-semibold mb-1">No Contracts</h4>
        <p className="text-sm text-muted-foreground">Book one night or every night. Adjust or cancel anytime — no penalties.</p>
      </div>
    </div>

    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center my-8">
      <h3 className="text-xl md:text-2xl font-bold mb-2">Ready for a peaceful night?</h3>
      <p className="text-muted-foreground mb-5">Book a vetted overnight PSW in under 2 minutes. Care can start tonight.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/">
          <Button size="lg" className="px-8">Book Care Now <ArrowRight className="w-4 h-4 ml-2" /></Button>
        </Link>
        <Link to="/psw-cost">
          <Button size="lg" variant="outline" className="px-8">Get Instant Price Estimate</Button>
        </Link>
      </div>
    </div>
  </article>
);

const config: HighConvertPageConfig = {
  slug: "overnight-home-care",
  title: "Overnight Home Care Services in Ontario | Awake Overnight PSW from $30/hr",
  description: "Overnight home care across Ontario from $30/hr. Awake overnight PSWs for seniors, dementia, fall prevention & post-hospital recovery. Same-day booking, no contracts.",
  headline: "Overnight Home Care Services in Ontario",
  subheadline: "Awake, vetted personal support workers through the night — for fall prevention, dementia supervision, toileting, and family peace of mind. Book a verified overnight PSW in under 2 minutes.",
  breadcrumbTrail: [
    { name: "Home Care Services", url: "/home-care-services" },
    { name: "Overnight Home Care", url: "/overnight-home-care" },
  ],
  extraContent: <ExtraContent />,
  faqs: [
    { question: "What is overnight home care and how is it different from 24-hour care?", answer: "Overnight home care places one awake PSW in the home for an 8–12 hour night shift (typically 9 PM – 7 AM). 24-hour care uses rotating awake PSWs across the full day. Overnight is ideal when daytime is manageable but nights are unsafe." },
    { question: "How much does overnight home care cost in Ontario?", answer: "Overnight home care through PSW Direct starts at $30/hr — the same as our daytime rate, with no nighttime surcharge. A 10-hour overnight shift runs about $300, significantly less than agency overnight rates of $450–$550." },
    { question: "Will the PSW stay awake all night?", answer: "Yes. Our overnight caregivers are awake-overnight by default. They monitor safety, respond to call bells, assist with bathroom visits, redirect dementia wandering, and document the entire shift." },
    { question: "Can I book overnight home care for tonight?", answer: "Same-day overnight booking is usually available across the GTA, including Toronto, Mississauga, Brampton, Vaughan, and Markham. Outlying Ontario cities typically need 24–48 hours of lead time." },
    { question: "Do you offer overnight care for dementia and Alzheimer's?", answer: "Yes. Many of our PSWs are experienced with overnight dementia care including sundowning, wandering supervision, calm redirection, and fall prevention through the night." },
    { question: "Can I book the same overnight caregiver every night?", answer: "Yes. You can request a specific PSW for recurring overnight shifts to maintain continuity, which is especially valuable for dementia and palliative clients." },
  ],
};

const OvernightHomeCarePage = () => <HighConvertLandingPage config={config} />;
export default OvernightHomeCarePage;
