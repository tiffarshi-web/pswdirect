import GuideLayout from "./GuideLayout";

const HospitalDischargeChecklist = () => (
  <GuideLayout
    title="Hospital Discharge Checklist"
    metaTitle="Hospital Discharge Checklist for Families | PSW Direct"
    metaDescription="Prepare for a safe hospital discharge with this checklist. Learn what to arrange before bringing a loved one home, including PSW support."
    slug="hospital-discharge-checklist"
  >
    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Introduction</h2>
      <p>
        Bringing a loved one home from the hospital can be overwhelming. A well-prepared discharge plan reduces the risk of readmission, ensures medications are managed properly, and helps your family member recover safely in familiar surroundings. Use this checklist to stay organized.
      </p>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Before Discharge Day</h2>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li>Speak with the discharge planner or social worker about the care plan</li>
        <li>Confirm all follow-up appointments and specialist referrals</li>
        <li>Get a written list of all medications, dosages, and schedules</li>
        <li>Ask about dietary restrictions or activity limitations</li>
        <li>Arrange transportation home — consider a PSW escort for safety</li>
        <li>Ensure the home is prepared: grab bars, clear walkways, bed on main floor if needed</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">On Discharge Day</h2>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li>Collect all personal belongings and medical equipment</li>
        <li>Confirm prescriptions have been filled or can be picked up</li>
        <li>Review wound care instructions with the nursing staff</li>
        <li>Get emergency contact numbers for after-hours concerns</li>
        <li>Have a PSW or family member present to assist with the transition home</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">First 48 Hours at Home</h2>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li>Monitor for signs of complications: fever, increased pain, confusion, or swelling</li>
        <li>Ensure medications are taken as prescribed</li>
        <li>Help with mobility — avoid falls by assisting with walking and transfers</li>
        <li>Prepare nutritious meals that align with any dietary guidelines</li>
        <li>Keep the home quiet and comfortable for rest and recovery</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">When to Call for Help</h2>
      <p>Contact the hospital or a healthcare professional if you notice:</p>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li>Fever above 38.5°C (101.3°F)</li>
        <li>Uncontrolled pain not responding to prescribed medication</li>
        <li>Signs of infection at surgical or wound sites</li>
        <li>Sudden confusion, dizziness, or difficulty breathing</li>
        <li>Inability to eat, drink, or take medications</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">How a PSW Can Help After Discharge</h2>
      <p>
        A personal support worker can provide critical assistance during the recovery period — from helping with bathing and dressing to preparing meals and accompanying your loved one to follow-up appointments. PSW Direct offers hospital discharge support starting at $40 per hour, with vetted caregivers available across Toronto and Ontario.
      </p>
    </section>
  </GuideLayout>
);

export default HospitalDischargeChecklist;
