import { Link } from "react-router-dom";
import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

/**
 * Islamabad-community care hub (Ontario-delivered).
 *
 * These pages serve Ontario families with roots in Islamabad and the wider
 * Pakistani community who want Urdu- and Punjabi-speaking personal support
 * workers. All care described here is delivered in Ontario, Canada — PSW Direct
 * does not operate in Pakistan, and every page states that explicitly.
 */

const HubExtra = () => (
  <article className="prose prose-lg max-w-none text-foreground">
    <h2 className="text-2xl md:text-3xl font-bold mb-4">Care in Your Own Language for Islamabad Families in Ontario</h2>
    <p className="text-muted-foreground leading-relaxed mb-6">
      Thousands of families who came to Ontario from Islamabad and the Rawalpindi region are now caring
      for aging parents here. The hardest part is rarely the schedule — it is the language. A mother who
      spent her life speaking Urdu does not want to explain a bathroom accident in English, and an
      elderly father recovering from surgery should not have to translate his pain. PSW Direct matches
      Ontario families with vetted, police-checked personal support workers who speak Urdu and Punjabi,
      understand halal meal preparation, respect prayer times and modesty preferences, and treat elders
      with the respect our community expects.
    </p>
    <p className="text-muted-foreground leading-relaxed mb-6">
      <strong>All care is provided in Ontario, Canada.</strong> PSW Direct is an Ontario platform serving
      Toronto, Mississauga, Brampton, Vaughan, Markham, Oakville, Hamilton, Barrie, Ottawa and 70+ other
      Ontario communities. We do not deliver services inside Pakistan.
    </p>

    <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-3">Services for Islamabad-Community Families</h3>
    <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
      <li><Link className="text-primary underline font-medium" to="/islamabad-community-home-care-ontario">Home care and personal support</Link> — bathing, dressing, meals, medication reminders and companionship in Urdu.</li>
      <li><Link className="text-primary underline font-medium" to="/islamabad-community-doctor-escort-ontario">Doctor appointment escorts</Link> — a caregiver who accompanies your parent and helps them understand the visit.</li>
      <li><Link className="text-primary underline font-medium" to="/islamabad-community-hospital-discharge-care-ontario">Hospital discharge care</Link> — safe return home after a hospital stay, with the first days covered.</li>
      <li><Link className="text-primary underline font-medium" to="/islamabad-community-overnight-care-ontario">Overnight care</Link> — an awake caregiver through the night for dementia, fall risk and post-surgery recovery.</li>
    </ul>

    <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-3">What Cultural Matching Really Means</h3>
    <p className="text-muted-foreground leading-relaxed mb-6">
      Language is the beginning, not the end. Our caregivers prepare halal food the way it is eaten at
      home, keep the kitchen separated where families ask for it, step out or stay quiet during namaz,
      honour same-gender personal-care preferences, and know that in our households an elder is served
      first. Families tell us the difference shows up in the small moments — a shared joke in Urdu, a cup
      of chai made properly, a parent who finally relaxes with a stranger in the house.
    </p>

    <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-3">Transparent Ontario Pricing</h3>
    <p className="text-muted-foreground leading-relaxed mb-6">
      Personal care starts at $35/hr and medical escorts at $45/hr, with no contracts and no agency
      minimums. Compare with our{" "}
      <Link to="/psw-cost" className="text-primary underline font-medium">full pricing breakdown</Link>, browse{" "}
      <Link to="/languages" className="text-primary underline font-medium">care by language</Link>, or find caregivers in{" "}
      <Link to="/cities" className="text-primary underline font-medium">your Ontario city</Link>.
    </p>
  </article>
);

const ServiceExtra = ({ heading, body, related }: { heading: string; body: string[]; related: { to: string; label: string }[] }) => (
  <article className="prose prose-lg max-w-none text-foreground">
    <h2 className="text-2xl md:text-3xl font-bold mb-4">{heading}</h2>
    {body.map((paragraph) => (
      <p key={paragraph.slice(0, 40)} className="text-muted-foreground leading-relaxed mb-6">{paragraph}</p>
    ))}
    <h3 className="text-xl md:text-2xl font-semibold mt-8 mb-3">Related Pages</h3>
    <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
      {related.map((link) => (
        <li key={link.to}>
          <Link to={link.to} className="text-primary underline font-medium">{link.label}</Link>
        </li>
      ))}
      <li>
        <Link to="/islamabad-community-care-ontario" className="text-primary underline font-medium">
          Islamabad Community Care Hub
        </Link>
      </li>
    </ul>
  </article>
);

const islamabadCommunityPages: Record<string, HighConvertPageConfig> = {
  "islamabad-community-care-ontario": {
    slug: "islamabad-community-care-ontario",
    title: "Urdu-Speaking Home Care in Ontario for Islamabad Families | PSW Direct",
    description: "Urdu and Punjabi speaking personal support workers in Ontario for families from Islamabad. Halal-aware, culturally matched home care from $35/hr. Delivered in Ontario, Canada.",
    headline: "Home Care in Ontario for Families from Islamabad",
    subheadline: "Vetted Urdu- and Punjabi-speaking personal support workers across Ontario — halal-aware, respectful of prayer times and modesty, and matched to your family's culture. All care is delivered in Ontario, Canada.",
    breadcrumbTrail: [
      { name: "Care by Language", url: "/languages" },
      { name: "Islamabad Community Care", url: "/islamabad-community-care-ontario" },
    ],
    extraContent: <HubExtra />,
    faqs: [
      { question: "Does PSW Direct provide care in Islamabad, Pakistan?", answer: "No. PSW Direct is an Ontario, Canada platform. These pages are for Ontario families with roots in Islamabad who want Urdu- or Punjabi-speaking caregivers here in Ontario." },
      { question: "Can I request an Urdu-speaking caregiver?", answer: "Yes. Language preference is part of booking, and we match Urdu- and Punjabi-speaking personal support workers wherever they are available in your area." },
      { question: "Will the caregiver prepare halal meals?", answer: "Yes. Many of our caregivers routinely prepare halal meals and follow the kitchen rules your family sets, including separate utensils and cookware." },
      { question: "Can I ask for a female caregiver for my mother?", answer: "Yes. Same-gender personal care is a standard request and you can specify it when you book." },
      { question: "How much does culturally matched home care cost?", answer: "Personal care starts at $35/hr and medical escorts at $45/hr. There are no contracts, agency minimums or hidden fees." },
      { question: "Which Ontario cities have Urdu-speaking caregivers?", answer: "Coverage is strongest across the Greater Toronto Area — especially Mississauga, Brampton, Toronto, Vaughan and Markham — and extends to Hamilton, Barrie, Ottawa and 70+ other Ontario communities." },
    ],
  },
  "islamabad-community-home-care-ontario": {
    slug: "islamabad-community-home-care-ontario",
    title: "Urdu-Speaking Personal Support Workers in Ontario | PSW Direct",
    description: "Book an Urdu or Punjabi speaking PSW in Ontario for bathing, dressing, meals and companionship. Halal-aware personal care from $35/hr, no contracts. Ontario, Canada only.",
    headline: "Urdu-Speaking Personal Support at Home in Ontario",
    subheadline: "Daily personal care from a vetted caregiver who speaks your parent's language — bathing, dressing, halal meal preparation, medication reminders and real companionship, across Ontario.",
    breadcrumbTrail: [
      { name: "Islamabad Community Care", url: "/islamabad-community-care-ontario" },
      { name: "Home Care", url: "/islamabad-community-home-care-ontario" },
    ],
    extraContent: (
      <ServiceExtra
        heading="Everyday Home Care in Urdu and Punjabi"
        body={[
          "Personal care is intimate work. When a caregiver and an elder do not share a language, dignity is the first thing lost — instructions get repeated loudly, discomfort goes unsaid, and small warning signs are missed. PSW Direct places vetted, police-checked personal support workers who speak Urdu or Punjabi directly into Ontario homes, so your mother or father can say exactly what they need in the words they have always used.",
          "A typical visit covers bathing and grooming with same-gender care where requested, dressing, safe transfers and mobility support, medication reminders, halal meal preparation, light housekeeping, laundry, and unhurried companionship. Visits start at two hours and can run daily, a few times a week, or as a single respite block when the family caregiver needs a break.",
          "Care is delivered in Ontario, Canada only. Pricing starts at $35/hr with no contract, and every shift is documented in the app so family members — including those living outside Ontario — can see what happened during the visit.",
        ]}
        related={[
          { to: "/home-care-services", label: "All home care services" },
          { to: "/psw-cost", label: "What home care costs in Ontario" },
          { to: "/languages", label: "Care in other languages" },
        ]}
      />
    ),
    faqs: [
      { question: "What does an Urdu-speaking PSW help with?", answer: "Bathing, dressing, grooming, safe transfers and mobility, medication reminders, halal meal preparation, light housekeeping, laundry and companionship." },
      { question: "Is there a minimum booking length?", answer: "Home care visits start at two hours. There is no weekly minimum and no contract." },
      { question: "Can we keep the same caregiver each visit?", answer: "Yes. Families can request the same personal support worker for recurring visits so your parent builds trust with one familiar person." },
      { question: "Is this service available in Pakistan?", answer: "No. PSW Direct serves Ontario, Canada only." },
    ],
  },
  "islamabad-community-doctor-escort-ontario": {
    slug: "islamabad-community-doctor-escort-ontario",
    title: "Urdu-Speaking Doctor Escort in Ontario | Appointment Support | PSW Direct",
    description: "An Urdu-speaking caregiver to accompany your parent to Ontario medical appointments — door-to-door support, note-taking and safe return home. From $45/hr, no contracts.",
    headline: "Urdu-Speaking Doctor Appointment Escorts in Ontario",
    subheadline: "A vetted caregiver picks your parent up, stays through the appointment, writes down what the doctor said, and brings them safely home — in Urdu or Punjabi, anywhere in Ontario.",
    breadcrumbTrail: [
      { name: "Islamabad Community Care", url: "/islamabad-community-care-ontario" },
      { name: "Doctor Escort", url: "/islamabad-community-doctor-escort-ontario" },
    ],
    extraContent: (
      <ServiceExtra
        heading="Never Send a Parent to an Appointment Alone Again"
        body={[
          "Medical appointments are where language gaps do the most damage. A specialist speaks quickly, changes a medication, mentions a follow-up test — and an elder who nods politely walks out unsure what any of it meant. Our escorts accompany your parent from their front door to the clinic and back, keep the conversation clear, and write down instructions, prescriptions and follow-up dates for the family.",
          "Escorts cover family doctor visits, specialist consultations, dialysis, chemotherapy, cataract and day-surgery appointments, imaging, blood work and physiotherapy across Ontario. The caregiver waits during the appointment, helps with mobility and washrooms, and can pick up prescriptions on the way home when the family asks.",
          "Medical escorts are billed at $45/hr with transparent time tracking, and the shift is documented in the app so relatives can read exactly what the doctor said. Service is provided in Ontario, Canada only.",
        ]}
        related={[
          { to: "/doctor-escort-service", label: "Doctor escort service in Ontario" },
          { to: "/senior-transportation-services", label: "Senior transportation support" },
          { to: "/doctor-appointment-assistance", label: "Doctor appointment assistance" },
        ]}
      />
    ),
    faqs: [
      { question: "Does the caregiver stay during the appointment?", answer: "Yes. The escort stays with your parent throughout the visit, helps them communicate, and records the doctor's instructions for the family." },
      { question: "Do escorts provide the transportation?", answer: "Escort shifts are booked door-to-door and the caregiver accompanies your parent for the full trip. Transportation arrangements are confirmed when you book." },
      { question: "What does a medical escort cost?", answer: "Medical escorts are $45/hr in Ontario, billed on actual time with no contract." },
      { question: "Can the escort speak Urdu with the doctor's office?", answer: "Yes. The caregiver speaks Urdu or Punjabi with your parent and English with clinic staff, so nothing is lost between them." },
    ],
  },
  "islamabad-community-hospital-discharge-care-ontario": {
    slug: "islamabad-community-hospital-discharge-care-ontario",
    title: "Urdu-Speaking Hospital Discharge Care in Ontario | PSW Direct",
    description: "Bring your parent home safely after a hospital stay with an Urdu-speaking caregiver in Ontario. Same-day discharge support, recovery care and halal meals from $35/hr.",
    headline: "Hospital Discharge Care in Urdu Across Ontario",
    subheadline: "The first 72 hours after discharge decide whether recovery holds. A vetted Urdu- or Punjabi-speaking caregiver brings your parent home, sets the house up safely, and stays through the hardest days.",
    breadcrumbTrail: [
      { name: "Islamabad Community Care", url: "/islamabad-community-care-ontario" },
      { name: "Hospital Discharge Care", url: "/islamabad-community-hospital-discharge-care-ontario" },
    ],
    extraContent: (
      <ServiceExtra
        heading="Coming Home After Hospital — With Someone Who Speaks Your Language"
        body={[
          "Ontario hospitals discharge quickly, often with a page of instructions in English and a family that is already stretched. Readmission usually happens for ordinary reasons: a missed medication, a fall on the way to the bathroom, a wound left unwatched, or food that nobody had time to cook. An Urdu-speaking caregiver removes all four risks in the first days home.",
          "Discharge support includes collecting your parent from the hospital, reviewing discharge instructions in Urdu with the family, clearing fall hazards, arranging the bedroom and bathroom for safe movement, medication reminders on the new schedule, halal meals, hygiene assistance, and watching for warning signs like confusion, fever or swelling that need a call to the doctor.",
          "Same-day and next-day discharge bookings are usually available across the Greater Toronto Area, with 24 to 48 hours' notice recommended in outlying Ontario communities. Care starts at $35/hr with no contract, in Ontario, Canada only.",
        ]}
        related={[
          { to: "/hospital-discharge-care", label: "Hospital discharge care in Ontario" },
          { to: "/post-hospital-care", label: "Post-hospital recovery care" },
          { to: "/guides/hospital-discharge-checklist", label: "Hospital discharge checklist" },
        ]}
      />
    ),
    faqs: [
      { question: "How quickly can discharge care start?", answer: "Same-day discharge support is usually available across the GTA. Outlying Ontario communities are typically covered with 24 to 48 hours' notice." },
      { question: "Can the caregiver explain the discharge instructions to my parents?", answer: "Yes. The caregiver reviews the hospital's instructions with your parent in Urdu or Punjabi and shares written notes with the family." },
      { question: "Do caregivers provide nursing or wound care?", answer: "No. Personal support workers provide non-clinical support. Clinical procedures must be handled by a regulated health professional." },
      { question: "How long do families usually book discharge care?", answer: "Most families book the first three to seven days home, then reduce hours as recovery progresses. There is no contract, so you can adjust at any time." },
    ],
  },
  "islamabad-community-overnight-care-ontario": {
    slug: "islamabad-community-overnight-care-ontario",
    title: "Urdu-Speaking Overnight Caregiver in Ontario | Awake Night Care | PSW Direct",
    description: "Awake overnight caregivers who speak Urdu or Punjabi, across Ontario. Night supervision for dementia, fall risk and recovery from $35/hr with no night surcharge.",
    headline: "Overnight Care in Urdu Across Ontario",
    subheadline: "An awake, vetted caregiver in the home through the night — for dementia wandering, fall prevention, toileting and post-hospital recovery — so the whole household can finally sleep.",
    breadcrumbTrail: [
      { name: "Islamabad Community Care", url: "/islamabad-community-care-ontario" },
      { name: "Overnight Care", url: "/islamabad-community-overnight-care-ontario" },
    ],
    extraContent: (
      <ServiceExtra
        heading="Nights Are the Hardest Part — You Do Not Have to Cover Them Alone"
        body={[
          "In multi-generational homes, the night shift usually falls on a daughter or daughter-in-law who still works in the morning. Sundowning, bathroom trips, pain and confusion do not wait for daylight, and months of broken sleep quietly break the family caregiver first. An awake overnight caregiver takes that shift, in the language your parent responds to at 3 a.m.",
          "Overnight shifts typically run eight to twelve hours. The caregiver stays awake for the full shift, monitors safety, assists with toileting and repositioning, gives medication reminders on schedule, calmly redirects dementia wandering, prepares a light halal snack when needed, and documents the night so the morning handover takes two minutes.",
          "There is no nighttime surcharge — overnight care starts at $35/hr, the same as daytime, with no contract. Families often begin with two nights a week for respite and add nights as needed. Care is provided in Ontario, Canada only.",
        ]}
        related={[
          { to: "/overnight-home-care", label: "Overnight home care in Ontario" },
          { to: "/24-hour-home-care", label: "24-hour home care" },
          { to: "/elderly-care-at-home", label: "Elderly care at home" },
        ]}
      />
    ),
    faqs: [
      { question: "Does the overnight caregiver stay awake?", answer: "Yes. Overnight shifts are awake-overnight by default, with active monitoring, scheduled check-ins and full documentation of the night." },
      { question: "Is overnight care more expensive?", answer: "No. Overnight care starts at $35/hr, the same rate as daytime, with no nighttime surcharge." },
      { question: "Can we book only two nights a week?", answer: "Yes. Many families start with one or two respite nights a week and adjust as needs change. There is no contract." },
      { question: "Do caregivers have dementia experience?", answer: "Many of our overnight caregivers work regularly with dementia and Alzheimer's clients, including sundowning, wandering supervision and calm redirection." },
    ],
  },
};

export const islamabadCommunitySlugs = Object.keys(islamabadCommunityPages);

const IslamabadCommunityPage = ({ slug }: { slug: string }) => {
  const config = islamabadCommunityPages[slug];
  if (!config) return null;
  return <HighConvertLandingPage config={config} />;
};

export default IslamabadCommunityPage;
export { islamabadCommunityPages };
