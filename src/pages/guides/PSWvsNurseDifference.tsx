import GuideLayout from "./GuideLayout";

const PSWvsNurseDifference = () => (
  <GuideLayout
    title="PSW vs Nurse: What's the Difference?"
    metaTitle="PSW vs Nurse: What's the Difference? | PSW Direct"
    metaDescription="Understand the difference between a PSW and a nurse in Ontario. Learn about training, scope of practice, and when to hire each."
    slug="psw-vs-nurse-difference"
  >
    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Introduction</h2>
      <p>
        When families look into home care, they often wonder whether they need a personal support worker (PSW) or a nurse. Both play important roles in the healthcare system, but their training, responsibilities, and costs differ significantly. Understanding these differences helps you choose the right level of care for your situation.
      </p>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">What Is a Personal Support Worker (PSW)?</h2>
      <p>
        A PSW is a trained caregiver who assists with activities of daily living. In Ontario, PSWs complete a recognized training program (typically 600+ hours) that covers:
      </p>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li>Personal care — bathing, grooming, dressing, toileting</li>
        <li>Mobility and transfer assistance</li>
        <li>Meal preparation and feeding support</li>
        <li>Companionship and social engagement</li>
        <li>Light housekeeping and laundry</li>
        <li>Medication reminders (cannot administer or adjust medications)</li>
        <li>Observing and reporting changes in a client's condition</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">What Is a Registered Nurse (RN) or Registered Practical Nurse (RPN)?</h2>
      <p>
        Nurses are regulated healthcare professionals with clinical training. Their scope of practice includes:
      </p>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li>Administering medications (including injections and IV therapy)</li>
        <li>Wound care and surgical site management</li>
        <li>Catheter care and ostomy management</li>
        <li>Health assessments and vital sign monitoring</li>
        <li>Developing and coordinating care plans</li>
        <li>Communicating with physicians about treatment changes</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Key Differences at a Glance</h2>
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-left border border-border rounded-lg overflow-hidden">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 font-semibold text-foreground border-b border-border">Factor</th>
              <th className="px-4 py-3 font-semibold text-foreground border-b border-border">PSW</th>
              <th className="px-4 py-3 font-semibold text-foreground border-b border-border">Nurse (RN/RPN)</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr><td className="px-4 py-3 border-b border-border">Training</td><td className="px-4 py-3 border-b border-border">Certificate (600+ hours)</td><td className="px-4 py-3 border-b border-border">Diploma or degree (2–4 years)</td></tr>
            <tr><td className="px-4 py-3 border-b border-border">Regulation</td><td className="px-4 py-3 border-b border-border">Not regulated (voluntary registry)</td><td className="px-4 py-3 border-b border-border">Regulated by CNO</td></tr>
            <tr><td className="px-4 py-3 border-b border-border">Medications</td><td className="px-4 py-3 border-b border-border">Reminders only</td><td className="px-4 py-3 border-b border-border">Can administer</td></tr>
            <tr><td className="px-4 py-3 border-b border-border">Clinical tasks</td><td className="px-4 py-3 border-b border-border">No</td><td className="px-4 py-3 border-b border-border">Yes</td></tr>
            <tr><td className="px-4 py-3 border-b border-border">Cost (typical)</td><td className="px-4 py-3 border-b border-border">$30–$40/hr</td><td className="px-4 py-3 border-b border-border">$50–$80/hr</td></tr>
            <tr><td className="px-4 py-3">Best for</td><td className="px-4 py-3">Daily living support</td><td className="px-4 py-3">Medical/clinical care</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">When to Hire a PSW vs a Nurse</h2>
      <p><strong>Hire a PSW when:</strong></p>
      <ul className="list-disc list-inside space-y-2 mt-2 mb-4">
        <li>Your loved one needs help with bathing, dressing, or meals</li>
        <li>They need companionship and supervision</li>
        <li>Mobility assistance is the primary concern</li>
        <li>Post-hospital recovery doesn't involve complex medical procedures</li>
        <li>You're looking for affordable, flexible hourly care</li>
      </ul>
      <p><strong>Hire a nurse when:</strong></p>
      <ul className="list-disc list-inside space-y-2 mt-2">
        <li>Medication administration or IV therapy is needed</li>
        <li>Wound care or catheter management is required</li>
        <li>Your loved one has complex medical conditions needing clinical monitoring</li>
        <li>A healthcare professional must coordinate with physicians regularly</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Most Families Need a PSW</h2>
      <p>
        The majority of home care needs in Ontario are non-clinical. Families looking for daily living support, companionship, and personal care are best served by a qualified PSW. PSW Direct makes it easy to book vetted personal support workers starting at $30 per hour — no contracts, no agency delays.
      </p>
    </section>
  </GuideLayout>
);

export default PSWvsNurseDifference;
