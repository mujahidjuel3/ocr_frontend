import { impacts } from "./data";
import { Section, SectionIntro } from "./shared";

export function BusinessImpact() {
  return (
    <Section id="impact" titleId="impact-title" className="bg-white">
      <SectionIntro id="impact-title" eyebrow="Business impact" title="What changes once invoices stay with the purchase">
        The gain is practical: less retyping, a shorter path to a saved purchase, and records people can find.
      </SectionIntro>
      <ul className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2">
        {impacts.map((item) => (
          <li key={item.title}>
            <h3 className="text-base font-semibold leading-snug text-shohoz-ink">{item.title}</h3>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-shohoz-body">{item.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
