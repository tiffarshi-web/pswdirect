import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const pages: Record<string, HighConvertPageConfig> = {
  "trusted-home-care-services": {
    slug: "trusted-home-care-services",
    title: "Trusted Home Care Services Ontario | Vetted Caregivers | PSW Direct",
    description: "Trusted home care services across Ontario. Every PSW Direct caregiver is credential-verified, police-checked, and reviewed. Book trusted care from $30/hr.",
    headline: "Trusted Home Care Services in Ontario",
    subheadline: "Trust is everything when inviting a caregiver into your home. PSW Direct maintains Ontario's highest vetting standards — every caregiver is credential-verified, police background-checked, and reviewed before they ever see a client.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Trusted Home Care", url: "/trusted-home-care-services" }],
    faqs: [
      { question: "How does PSW Direct vet caregivers?", answer: "Every caregiver undergoes a 4-step vetting process: PSW certificate verification, government-issued ID check, police background check (Vulnerable Sector Check), and admin review before activation." },
      { question: "What is a Vulnerable Sector Check?", answer: "A Vulnerable Sector Check (VSC) is an enhanced police background check required for anyone working with vulnerable populations. PSW Direct requires a recent VSC from every caregiver." },
      { question: "Can I see a caregiver's credentials?", answer: "PSW Direct verifies all credentials internally. You can view your assigned PSW's first name, photo, and experience on the platform. Full credential verification is handled by our admin team." },
      { question: "What happens if I have a concern about a caregiver?", answer: "Contact PSW Direct immediately. We take every concern seriously and have a flagging system to investigate and address issues promptly." },
    ],
  },
  "vetted-psw-caregivers": {
    slug: "vetted-psw-caregivers",
    title: "Vetted PSW Caregivers | Background-Checked PSWs | PSW Direct",
    description: "All PSW Direct caregivers are fully vetted — PSW certificate verified, government ID checked, and police background screened. Book a vetted caregiver from $30/hr.",
    headline: "Fully Vetted PSW Caregivers You Can Trust",
    subheadline: "Every PSW on our platform passes a rigorous vetting process before they can accept a single job. PSW certificate verification, government ID check, and police background screening — no exceptions.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Vetted Caregivers", url: "/vetted-psw-caregivers" }],
    faqs: [
      { question: "What does 'vetted' mean at PSW Direct?", answer: "Vetted means every caregiver has passed: 1) PSW certificate verification, 2) government-issued photo ID check, 3) police Vulnerable Sector Check, and 4) admin review and approval." },
      { question: "How often are background checks updated?", answer: "PSW Direct requires caregivers to maintain a current Vulnerable Sector Check. Our system automatically tracks expiry dates and suspends caregivers whose checks expire until renewed." },
      { question: "What credentials do your PSWs have?", answer: "All PSWs hold a recognized Personal Support Worker certificate from an accredited Ontario college program, plus a valid government-issued photo ID and police background check." },
    ],
  },
  "licensed-insured-caregivers": {
    slug: "licensed-insured-caregivers",
    title: "Licensed & Insured Caregivers Ontario | PSW Direct",
    description: "Licensed and credentialed caregivers across Ontario. PSW Direct verifies every caregiver's PSW certificate, ID, and background check. Book from $30/hr, no contracts.",
    headline: "Credentialed & Verified Caregivers in Ontario",
    subheadline: "PSW Direct only works with credentialed personal support workers. Every caregiver on our platform holds a recognized PSW certificate, verified government ID, and current police background check.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Credentialed Caregivers", url: "/licensed-insured-caregivers" }],
    faqs: [
      { question: "Are PSW Direct caregivers licensed?", answer: "PSWs in Ontario are not 'licensed' in the regulatory sense, but all PSW Direct caregivers hold recognized PSW certificates from accredited programs and are credential-verified before activation." },
      { question: "Is PSW Direct an insured service?", answer: "PSW Direct is a registered Ontario business that connects families with credentialed personal support workers. Each booking is managed through our secure platform with full audit trails." },
      { question: "How do I know my caregiver is qualified?", answer: "PSW Direct verifies every caregiver's PSW certificate, government ID, and police background check before they can accept jobs. Our admin team reviews every application personally." },
    ],
  },
  "background-checked-caregivers": {
    slug: "background-checked-caregivers",
    title: "Background-Checked Caregivers | Police-Screened PSWs | PSW Direct",
    description: "Every PSW Direct caregiver is police background-checked with a Vulnerable Sector Check. Book a background-checked caregiver in Ontario from $30/hr.",
    headline: "Background-Checked Caregivers — Your Safety First",
    subheadline: "Your family's safety is non-negotiable. Every caregiver on PSW Direct has passed a Vulnerable Sector Check — the highest level of police background screening in Canada, designed specifically for people working with vulnerable populations.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Background-Checked", url: "/background-checked-caregivers" }],
    faqs: [
      { question: "What background check do caregivers pass?", answer: "Every PSW Direct caregiver passes a Vulnerable Sector Check (VSC) — an enhanced police background screening that checks for criminal records, pardoned sexual offences, and other relevant history." },
      { question: "How recent must the background check be?", answer: "PSW Direct requires a current VSC. Our automated system tracks expiry dates and immediately suspends caregivers whose checks expire until they provide an updated screening." },
      { question: "Is a background check enough to ensure safety?", answer: "Background checks are one layer of safety. PSW Direct also verifies PSW certificates, government IDs, and conducts admin reviews. After activation, our flagging system monitors caregiver performance." },
    ],
  },
};

export const trustPageSlugs = Object.keys(pages);

const TrustSEOPage = ({ slug }: { slug: string }) => {
  const config = pages[slug];
  if (!config) return null;
  return <HighConvertLandingPage config={config} />;
};

export default TrustSEOPage;
