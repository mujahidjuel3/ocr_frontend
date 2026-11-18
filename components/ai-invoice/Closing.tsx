import { demoMailto, footerLinks } from "./data";
import { Container, Logo } from "./shared";

export function Closing() {
  return (
    <>
      <section id="demo" aria-labelledby="demo-title" className="scroll-mt-24 bg-shohoz text-white">
        <Container className="py-10 sm:py-12">
          <div className="max-w-2xl">
            <h2 id="demo-title" className="font-serif text-2xl font-semibold leading-tight tracking-tight">
              Walk through the proposal with Shohoz Software.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#e4f2e8]">
              A short look at the upload, the review draft, and how a checked purchase would be saved to Shohoz POS.
            </p>
            <a
              href={demoMailto}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-shohoz transition-colors hover:bg-[#e7f3ea]"
            >
              Request a Demo
            </a>
            <p className="mt-4 text-sm leading-relaxed text-[#e4f2e8]">
              Opens an email draft in your mail app. Add your Shohoz Software contact before sending. This page does not store or submit the request.
            </p>
          </div>
        </Container>
      </section>
      <footer className="border-t border-shohoz-line bg-shohoz-mist pb-[env(safe-area-inset-bottom)]">
        <Container className="flex flex-col gap-6 py-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo tagline={false} />
            <p className="mt-3 text-sm text-shohoz-body">Smart Business | Smarter Software</p>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="inline-flex min-h-11 items-center text-shohoz-body hover:text-shohoz">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
        <div className="border-t border-shohoz-line">
          <Container className="py-4">
            <p className="text-xs leading-relaxed text-shohoz-body">© 2026 Shohoz Software. Smart Business | Smarter Software.</p>
          </Container>
        </div>
      </footer>
    </>
  );
}
