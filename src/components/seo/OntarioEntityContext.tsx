import { Link } from "react-router-dom";

interface Props {
  /** Human service label, e.g. "Dementia Care". Used to steer emphasis naturally. */
  serviceLabel?: string;
}

/**
 * Semantic entity coverage block.
 *
 * Renders short, natural paragraphs that reference the major Ontario healthcare
 * entities (Ontario Health, OHIP, Home Care, Aging in Place, Hospital Discharge
 * Planning, Fall Prevention, Respite Care, etc.) exactly once each, in
 * plain-English prose. No keyword stuffing — each entity appears in context.
 *
 * Purely additive presentational content used on Ontario hub pages.
 */
const OntarioEntityContext = ({ serviceLabel = "Home Care" }: Props) => {
  const lower = serviceLabel.toLowerCase();
  return (
    <section
      className="bg-background px-4 py-10 border-y border-border"
      aria-label={`How ${lower} fits into Ontario's broader care system`}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
          How {serviceLabel} Fits Into Ontario's Care System
        </h2>
        <div className="prose prose-sm md:prose-base max-w-none text-muted-foreground space-y-4">
          <p>
            Across the province, <strong>Ontario Health</strong> coordinates publicly funded
            services — hospital care, long-term care placement, and the Ontario Health atHome
            program that arranges publicly funded Home Care. <strong>OHIP</strong> covers
            physician and hospital visits but does not, on its own, cover the day-to-day
            hands-on support most families need at home. That is the gap PSW Direct fills
            with private, on-demand <Link to="/personal-support-workers-ontario" className="text-primary hover:underline">Personal Support Workers</Link>
            {" "}available same-day.
          </p>
          <p>
            Most of our clients are seniors who want to remain independent —
            <strong> Aging in Place</strong> is the goal, and consistent
            <strong> Senior Care</strong> at home is what makes it possible. A PSW helps with
            bathing, dressing, meal preparation, mobility, and <strong>Medication Reminders</strong>,
            and follows a written care plan so <strong>Family Caregivers</strong> can step back
            from around-the-clock duty without losing oversight. When cognition changes,
            we support families through <Link to="/dementia-care-ontario" className="text-primary hover:underline">Dementia Care</Link>
            {" "}and <strong>Alzheimer's Care</strong> with routines, redirection, and
            wandering-aware supervision.
          </p>
          <p>
            After a hospital stay, the first two weeks matter most. Our PSWs work alongside
            the <strong>Hospital Discharge Planning</strong> team — the nurse, discharge
            coordinator, or Ontario Health atHome case manager — to bridge into home:
            <Link to="/post-surgery-care-ontario" className="text-primary hover:underline"> Post-Surgery Recovery</Link>,
            wound-care reminders, safe transfers, and follow-up appointments. When formal
            <strong> Rehabilitation</strong> is prescribed, PSWs reinforce the physio's exercise
            plan between sessions and provide <strong>Mobility Assistance</strong> and
            <strong> Fall Prevention</strong> support — clearing pathways, using transfer belts
            correctly, and cueing the safe use of walkers, canes, and grab bars.
          </p>
          <p>
            Family caregivers burn out — quietly and predictably. Scheduled
            <Link to="/respite-care-ontario" className="text-primary hover:underline"> Respite Care</Link>{" "}
            and warm <strong>Companion Care</strong> visits give a spouse or adult child room to
            sleep, work, or simply be someone other than the caregiver for a few hours. Whether
            the need is a one-time visit or a recurring weekly block, PSW Direct schedules
            {" "}{lower} that fits your household — not the other way around.
          </p>
        </div>
      </div>
    </section>
  );
};

export default OntarioEntityContext;
