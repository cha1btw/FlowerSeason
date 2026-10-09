import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { siteContent } from "@/lib/content";

const { brand, gateway, footer, contacts } = siteContent;

// The first screen of the site: two doors, one for companies and one for
// private guests. Plain links, so it works without JavaScript.
export default function GatewayPage() {
  return (
    <div className="flex min-h-[100svh] flex-col px-5 sm:px-8 lg:px-12">
      <header className="mx-auto flex w-full max-w-[1600px] items-center justify-between border-b border-line py-5 sm:py-6">
        <p className="text-[11px] font-medium tracking-[0.16em] sm:text-xs">{brand.name}</p>
        <p className="hidden text-[11px] tracking-[0.2em] sm:block">{gateway.eyebrow}</p>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center py-10 sm:py-12 lg:py-8">
        <div className="fade-up text-center" style={{ animationDelay: "0.05s" }}>
          <p className="text-[11px] tracking-[0.22em] text-neutral-500">{gateway.prompt}</p>
          <h1 className="mt-5 whitespace-pre-line text-[clamp(2rem,4.2vw,3.75rem)] font-light leading-[0.98] tracking-[-0.045em]">
            {gateway.headline}
          </h1>
        </div>

        <div className="mt-10 grid gap-10 sm:mt-12 md:grid-cols-2 md:gap-6 lg:mt-14 lg:gap-10">
          {gateway.options.map((option, index) => (
            <Link
              key={option.id}
              href={option.href}
              className="fade-up group block outline-none"
              style={{ animationDelay: `${0.2 + index * 0.12}s` }}
            >
              <div className="relative h-[34svh] min-h-[220px] overflow-hidden bg-line md:h-[40svh] lg:h-[42svh]">
                <Image
                  src={option.image}
                  alt={option.imageAlt}
                  fill
                  priority
                  sizes="(max-width: 767px) 100vw, 50vw"
                  style={{ objectPosition: option.focus }}
                  className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
                />
                <div
                  className="absolute inset-0 ring-1 ring-inset ring-ink/10 transition-[box-shadow] duration-500 group-focus-visible:ring-2 group-focus-visible:ring-ink"
                  aria-hidden="true"
                />
              </div>

              <div className="mt-5 flex items-start justify-between gap-6">
                <div>
                  <p className="text-[10px] tracking-[0.18em] text-neutral-500">{option.index}</p>
                  <h2 className="mt-2 text-[clamp(1.6rem,2.8vw,2.5rem)] font-light leading-none tracking-[-0.04em]">
                    {option.title}
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-600">
                    {option.description}
                  </p>
                  <p className="mt-4 text-[10px] tracking-[0.16em] text-neutral-500">{option.tags}</p>
                </div>
                <span
                  className="mt-1 grid size-12 shrink-0 place-items-center border border-ink transition-colors duration-500 group-hover:bg-ink group-hover:text-canvas group-focus-visible:bg-ink group-focus-visible:text-canvas"
                  aria-hidden="true"
                >
                  <ArrowUpRight size={18} strokeWidth={1.3} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-[1600px] items-center justify-between border-t border-line py-5 text-[10px] tracking-[0.16em] text-neutral-500">
        <span>{footer.location}</span>
        <a
          href={contacts.telegram.url}
          target="_blank"
          rel="noreferrer"
          className="transition-opacity hover:opacity-55"
        >
          {contacts.telegram.label} · {contacts.telegram.display}
        </a>
      </footer>
    </div>
  );
}
