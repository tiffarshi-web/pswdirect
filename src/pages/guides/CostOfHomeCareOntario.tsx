import GuideLayout from "./GuideLayout";

const CostOfHomeCareOntario = () => (
  <GuideLayout
    title="Cost of Home Care in Ontario"
    metaTitle="Cost of Home Care in Ontario (2026) | PSW Direct"
    metaDescription="How much does home care cost in Ontario? Compare agency rates vs. PSW Direct pricing. Home care starts at $30/hour with no contracts."
    slug="cost-of-home-care-ontario"
  >
    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Introduction</h2>
      <p>
        Understanding the cost of home care in Ontario helps families plan ahead and make informed decisions. Whether you need a few hours of weekly companionship or daily personal support, knowing what to expect financially can reduce stress during an already challenging time.
      </p>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Average Home Care Costs in Ontario</h2>
      <p>
        Home care costs vary depending on the type of service, location, and provider. Here's a general breakdown:
      </p>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li><strong>Traditional home care agencies:</strong> $45–$65 per hour</li>
        <li><strong>Private PSW hire (independent):</strong> $20–$35 per hour (unvetted, no backup coverage)</li>
        <li><strong>PSW Direct platform:</strong> Starting at $30 per hour with vetted caregivers</li>
        <li><strong>Doctor escort services:</strong> Starting at $35 per hour</li>
        <li><strong>Hospital discharge support:</strong> Starting at $40 per hour</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">What Affects Pricing?</h2>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li><strong>Type of care:</strong> Personal care and mobility support cost more than companionship-only visits</li>
        <li><strong>Location:</strong> Urban areas like Toronto may have slightly different availability than rural regions</li>
        <li><strong>Duration:</strong> Longer shifts and recurring bookings may offer better value</li>
        <li><strong>Time of day:</strong> Overnight or weekend care may carry a premium with some agencies</li>
        <li><strong>Agency overhead:</strong> Traditional agencies include administrative costs, supervision fees, and markup</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Government-Funded Home Care</h2>
      <p>
        Ontario's Home and Community Care program (through Ontario Health) provides some publicly funded home care services. However, wait times can be long and hours are often limited. Many families supplement government support with private PSW services for more flexible, immediate coverage.
      </p>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Tips to Manage Home Care Costs</h2>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li>Start with the minimum hours needed and adjust as required</li>
        <li>Use a platform like PSW Direct to avoid agency markups</li>
        <li>Check if private insurance or veterans' benefits cover home care</li>
        <li>Ask about the Medical Expense Tax Credit (METC) for eligible care costs</li>
        <li>Combine family caregiver support with professional PSW visits</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Why PSW Direct Is More Affordable</h2>
      <p>
        PSW Direct eliminates traditional agency overhead. Families pay transparent hourly rates starting at $30 per hour — significantly less than the $55+ charged by most Toronto home care agencies. All PSWs are credential-verified, and booking takes minutes online.
      </p>
    </section>
  </GuideLayout>
);

export default CostOfHomeCareOntario;
