import { problems } from "./data";
import { Section, SectionIntro } from "./shared";

export function ProblemsSolutions() {
  return (
    <Section id="problems" titleId="problems-title" className="bg-white">
      <SectionIntro id="problems-title" eyebrow="Problem and solution" title="Where invoice work slows a purchase down">
        Four everyday gaps, and the change this proposal is meant to make.
      </SectionIntro>
      <div className="mt-5 hidden gap-8 border-b border-shohoz-line pb-2 md:grid md:grid-cols-2">
        <p className="text-sm font-medium text-shohoz-muted">Today</p>
        <p className="text-sm font-medium text-shohoz">Proposed</p>
      </div>
      <div className="divide-y divide-shohoz-line border-y border-shohoz-line md:border-t-0">
        {problems.map((item) => (
          <div key={item.problem} className="grid gap-3 py-3 md:grid-cols-2 md:gap-8 md:py-3.5">
            <div>
              <p className="text-xs font-medium text-shohoz-muted md:hidden">Today</p>
              <h3 className="mt-1 text-base font-semibold text-shohoz-ink md:mt-0">{item.problem}</h3>
              <p className="mt-2 text-sm leading-relaxed text-shohoz-body">{item.today}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-shohoz md:hidden">Proposed</p>
              <h3 className="mt-1 text-base font-semibold text-shohoz-ink md:mt-0">{item.proposal}</h3>
              <p className="mt-2 text-sm leading-relaxed text-shohoz-body">{item.change}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
