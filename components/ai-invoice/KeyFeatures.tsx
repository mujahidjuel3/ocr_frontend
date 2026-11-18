import { features } from "./data";
import { Section, SectionIntro } from "./shared";

export function KeyFeatures() {
  return (
    <Section id="features" titleId="features-title">
      <SectionIntro id="features-title" eyebrow="Proposed first release" title="Key features">
        The work this proposal covers, from the file through a checked purchase in Shohoz POS.
      </SectionIntro>
      <ul className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <li key={feature.title} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-shohoz" strokeWidth={1.75} aria-hidden />
              <div>
                <h3 className="text-base font-semibold text-shohoz-ink">{feature.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-shohoz-body">{feature.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
