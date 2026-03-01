import GuideLayout from "./GuideLayout";

const SignsParentNeedsHomeCare = () => (
  <GuideLayout
    title="Signs Your Parent Needs Home Care"
    metaTitle="Signs Your Parent Needs Home Care | PSW Direct"
    metaDescription="How to recognize when a parent needs in-home support. Common signs of declining independence and when to consider hiring a PSW."
    slug="signs-your-parent-needs-home-care"
  >
    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Introduction</h2>
      <p>
        Recognizing that a parent or aging loved one needs help can be difficult. Many seniors want to maintain their independence, and signs of decline can develop gradually. Understanding what to look for helps families act early — before a crisis occurs — and ensures their loved one receives the support they deserve.
      </p>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Physical Warning Signs</h2>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li>Unexplained weight loss or poor appetite</li>
        <li>Difficulty walking, frequent stumbling, or recent falls</li>
        <li>Neglecting personal hygiene — unwashed hair, body odor, wearing the same clothes repeatedly</li>
        <li>Bruises or injuries they can't explain</li>
        <li>Struggling with mobility — trouble getting in and out of chairs, beds, or the bathtub</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Cognitive and Emotional Signs</h2>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li>Forgetting to take medications or taking them incorrectly</li>
        <li>Confusion about dates, appointments, or familiar routines</li>
        <li>Increased anxiety, withdrawal from social activities, or mood changes</li>
        <li>Unpaid bills, missed appointments, or disorganized finances</li>
        <li>Repeating questions or stories within the same conversation</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">Household Red Flags</h2>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li>Spoiled food in the fridge or an empty pantry</li>
        <li>Cluttered or unclean living spaces that were previously well-maintained</li>
        <li>Burnt pots or signs of cooking mishaps</li>
        <li>Piles of unopened mail or neglected home maintenance</li>
        <li>Pets that appear neglected or underfed</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">How to Start the Conversation</h2>
      <p>Talking to a parent about home care requires sensitivity. Here are some tips:</p>
      <ul className="list-disc list-inside space-y-2 mt-3">
        <li>Approach the topic with compassion, not criticism</li>
        <li>Focus on their safety and quality of life</li>
        <li>Involve them in the decision-making process</li>
        <li>Start small — suggest a few hours of help per week rather than full-time care</li>
        <li>Frame it as additional support, not a loss of independence</li>
      </ul>
    </section>

    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">How a PSW Can Help</h2>
      <p>
        A personal support worker provides the day-to-day assistance that allows aging parents to stay safely in their own homes. From meal preparation and companionship to mobility support and personal care, PSWs bridge the gap between full independence and residential care. PSW Direct offers vetted caregivers starting at $30 per hour — no contracts, no agency overhead.
      </p>
    </section>
  </GuideLayout>
);

export default SignsParentNeedsHomeCare;
