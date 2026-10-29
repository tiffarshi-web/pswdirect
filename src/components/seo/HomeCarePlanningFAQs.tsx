import type { PlanningFAQ } from "@/lib/homeCarePlanning";

/** Visible answers only: no review claims or FAQ rich-result promises. */
export default function HomeCarePlanningFAQs({ faqs }: { faqs: PlanningFAQ[] }) {
  return <section className="max-w-4xl mx-auto px-4 py-10">
    <h2 className="text-2xl font-semibold mb-5">Questions families ask</h2>
    <div className="space-y-3">{faqs.map(f => <details key={f.q} className="rounded-md border border-border p-4">
      <summary className="cursor-pointer font-semibold">{f.q}</summary>
      <p className="text-muted-foreground mt-3">{f.a}</p>
    </details>)}</div>
  </section>;
}