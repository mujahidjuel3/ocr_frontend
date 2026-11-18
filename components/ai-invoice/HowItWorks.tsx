import { steps } from "./data";
import { Section, SectionIntro } from "./shared";

export function HowItWorks() {
  return (
    <Section id="workflow" titleId="workflow-title">
      <SectionIntro id="workflow-title" eyebrow="Intended flow" title="How it works">
        From a file on hand to a purchase in Shohoz POS, with a person checking the draft in between.
      </SectionIntro>
      <ol className="mt-6 grid gap-5 md:grid-cols-4 md:gap-6">
        {steps.map((step) => (
          <li key={step.number} className="md:border-t md:border-[#c9ddd0] md:pt-3">
            <p className="font-serif text-base text-shohoz">{step.number}</p>
            <h3 className="mt-1 text-sm font-semibold text-shohoz-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-shohoz-body">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
