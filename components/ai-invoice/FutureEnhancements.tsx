import { enhancements } from "./data";
import { Section, SectionIntro } from "./shared";

export function FutureEnhancements() {
  return (
    <Section id="roadmap" titleId="roadmap-title">
      <SectionIntro id="roadmap-title" eyebrow="Planned capabilities" title="Future enhancements">
        Later ideas only. They are outside this proposal and are not available.
      </SectionIntro>
      <ul className="mt-5 divide-y divide-shohoz-line border-y border-shohoz-line">
        {enhancements.map((item) => (
          <li key={item.title} className="grid gap-0.5 py-2.5 sm:grid-cols-[16rem_minmax(0,1fr)] sm:items-baseline sm:gap-6">
            <h3 className="text-base font-semibold text-shohoz-ink">{item.title}</h3>
            <p className="text-sm leading-relaxed text-shohoz-body">{item.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
