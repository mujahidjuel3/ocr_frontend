import { Container, primaryLinkClass, secondaryLinkClass } from "./shared";

export function HeroSection() {
  return (
    <section id="top" aria-labelledby="hero-title" className="scroll-mt-20 pb-8 pt-8 sm:pb-10 sm:pt-10">
      <Container>
        <p className="text-sm font-medium text-shohoz">Shohoz Software</p>
        <h1 id="hero-title" className="mt-2 max-w-xl font-serif text-[1.75rem] font-semibold leading-tight tracking-tight text-shohoz-ink sm:text-3xl">
          AI invoice processing for purchase entry.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-shohoz-body sm:text-base">
          Upload a supplier invoice, review the extracted draft, and approve it for your tenant.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a href="#workspace" className={primaryLinkClass}>Process an invoice</a>
          <a href="#demo" className={secondaryLinkClass}>Request a Demo</a>
        </div>
        <p className="mt-3 text-sm text-shohoz-muted">PDF, JPG, or PNG. The file is sent to the invoice API.</p>
      </Container>
    </section>
  );
}
