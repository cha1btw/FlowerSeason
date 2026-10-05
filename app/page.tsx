import Image from "next/image";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { Header } from "@/components/header";
import { InquiryLink } from "@/components/inquiry-link";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { siteContent } from "@/lib/content";

const pageGutter = "px-5 sm:px-8 lg:px-12";
const sectionSpace = "py-24 sm:py-28 lg:py-40";
const ctaClass =
  "inline-flex min-h-12 items-center gap-5 border-b border-current py-3 text-xs font-medium tracking-[0.15em] transition-opacity hover:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 active:opacity-45";

export default function HomePage() {
  const { brand, navigation, hero, create, decor, workshops, gifts, flowerBar, projects, contact, contacts, footer } =
    siteContent;

  return (
    <>
      <Header brand={brand} navigation={navigation} />

      <main id="top">
        <section className="relative flex min-h-screen items-end overflow-hidden bg-ink pt-20 text-white">
          <Image
            src={hero.image}
            alt={hero.imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
          <div className={`relative z-10 mx-auto w-full max-w-[1600px] ${pageGutter} pb-8 sm:pb-12 lg:pb-16`}>
            <Reveal>
              <p className="mb-6 text-[11px] tracking-[0.2em] sm:mb-10">
                {hero.eyebrow}
              </p>
              <h1 className="max-w-[15ch] whitespace-pre-line text-[clamp(3.3rem,10vw,10rem)] font-light leading-[0.84] tracking-[-0.055em]">
                {hero.title}
              </h1>
            </Reveal>

            <Reveal delay={0.15} className="mt-10 grid grid-cols-12 gap-y-8 sm:mt-14">
              <p className="col-span-12 max-w-xl text-base leading-relaxed sm:col-span-7 sm:text-lg lg:col-span-5 lg:col-start-7">
                {hero.subtitle}
              </p>
              <div className="col-span-12 flex items-end justify-between sm:col-span-5 sm:justify-end lg:col-span-2">
                <a href={hero.ctaHref} className={`${ctaClass} border-white/70`}>
                  {hero.cta}
                  <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
                </a>
              </div>
            </Reveal>

            <a
              href="#create"
              className="mt-12 inline-flex items-center gap-3 text-[10px] tracking-[0.18em] transition-opacity hover:opacity-55 active:opacity-40"
            >
              {hero.scrollLabel}
              <ChevronDown size={15} strokeWidth={1.3} aria-hidden="true" />
            </a>
          </div>
        </section>

        <section id={create.id} className={`${sectionSpace} ${pageGutter}`}>
          <div className="mx-auto max-w-[1600px]">
            <Reveal>
              <SectionHeading
                index={create.index}
                title={create.title}
                subtitle={create.subtitle}
              />
            </Reveal>

            <div className="mt-16 grid gap-y-16 border-b border-line pb-16 sm:grid-cols-3 sm:gap-x-5 lg:mt-24 lg:gap-x-8">
              {create.items.map((item, index) => (
                <Reveal key={item.title} delay={index * 0.08}>
                  <article className="group">
                    <a href={item.href} className="block active:opacity-80">
                      <div className="relative aspect-[3/4] overflow-hidden bg-line">
                        <Image
                          src={item.image}
                          alt={item.imageAlt}
                          fill
                          sizes="(max-width: 639px) 100vw, 33vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                      </div>
                      <div className="mt-6 flex items-start gap-5">
                        <span className="pt-1 text-[10px] tracking-[0.15em]">
                          {item.number}
                        </span>
                        <div>
                          <h3 className="text-xl font-light tracking-[-0.02em] lg:text-2xl">
                            {item.title}
                          </h3>
                          <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-600">
                            {item.description}
                          </p>
                          <span className="mt-5 inline-block border-b border-ink pb-1 text-[10px] tracking-[0.15em]">
                            {create.actionLabel}
                          </span>
                        </div>
                      </div>
                    </a>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id={decor.id} className={`pb-24 sm:pb-28 lg:pb-40 ${pageGutter}`}>
          <div className="mx-auto max-w-[1600px]">
            <Reveal>
              <SectionHeading
                index={decor.index}
                title={decor.title}
                subtitle={decor.subtitle}
              />
            </Reveal>

            <div className="mt-16 grid grid-cols-12 gap-y-12 lg:mt-24">
              <Reveal className="col-span-12 lg:col-span-5 lg:col-start-7">
                <p className="text-lg leading-relaxed sm:text-xl">{decor.description}</p>
                <p className="mt-8 border-t border-line pt-5 text-xs leading-loose tracking-[0.11em] text-neutral-600">
                  {decor.tags}
                </p>
              </Reveal>

              <div className="col-span-12 mt-4 grid grid-cols-12 gap-3 sm:gap-5 lg:mt-12">
                <Reveal className="group relative col-span-12 aspect-[16/10] overflow-hidden bg-line sm:col-span-8">
                  <Image
                    src={decor.images[0].src}
                    alt={decor.images[0].alt}
                    fill
                    sizes="(max-width: 639px) 100vw, 67vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </Reveal>
                <Reveal delay={0.08} className="group relative col-span-7 aspect-[3/4] overflow-hidden bg-line sm:col-span-4 sm:row-span-2 sm:aspect-auto">
                  <Image
                    src={decor.images[1].src}
                    alt={decor.images[1].alt}
                    fill
                    sizes="(max-width: 639px) 58vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </Reveal>
                <Reveal delay={0.12} className="group relative col-span-5 aspect-[3/4] overflow-hidden bg-line sm:col-span-4 sm:col-start-3">
                  <Image
                    src={decor.images[2].src}
                    alt={decor.images[2].alt}
                    fill
                    sizes="(max-width: 639px) 42vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </Reveal>
              </div>

              <div className="col-span-12 mt-8 grid grid-cols-12 gap-y-12 border-t border-line pt-8 lg:mt-16">
                <ul className="col-span-12 grid gap-2 sm:col-span-7">
                  {decor.services.map((service, index) => (
                    <li
                      key={service}
                      className="flex items-baseline gap-5 border-b border-line py-3 text-2xl font-light tracking-[-0.02em] sm:text-4xl"
                    >
                      <span className="text-[10px] tracking-[0.14em]">0{index + 1}</span>
                      {service}
                    </li>
                  ))}
                </ul>
                <div className="col-span-12 flex flex-col items-start justify-between gap-10 sm:col-span-4 sm:col-start-9">
                  <p className="text-xs leading-loose tracking-[0.14em]">{decor.process}</p>
                  <InquiryLink interest={decor.interest} className={ctaClass}>
                    {decor.cta}
                    <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
                  </InquiryLink>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id={workshops.id} className={`bg-white ${sectionSpace} ${pageGutter}`}>
          <div className="mx-auto max-w-[1600px]">
            <Reveal>
              <SectionHeading
                index={workshops.index}
                title={workshops.title}
                subtitle={workshops.subtitle}
              />
            </Reveal>

            <div className="mt-16 grid grid-cols-12 gap-3 sm:gap-5 lg:mt-24">
              <Reveal className="group relative col-span-12 aspect-[4/5] overflow-hidden bg-line sm:col-span-7 sm:aspect-[4/5]">
                <Image
                  src={workshops.media.image}
                  alt={workshops.media.imageAlt}
                  fill
                  sizes="(max-width: 639px) 100vw, 58vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </Reveal>
              <div className="col-span-12 grid grid-cols-2 gap-3 sm:col-span-5 sm:grid-cols-1 sm:gap-5">
                <Reveal delay={0.08} className="group relative aspect-[3/4] overflow-hidden bg-line sm:aspect-auto">
                  <Image
                    src={workshops.media.detail}
                    alt={workshops.media.detailAlt}
                    fill
                    sizes="(max-width: 639px) 50vw, 42vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </Reveal>
                <Reveal delay={0.12} className="relative aspect-[3/4] overflow-hidden bg-line sm:aspect-auto">
                  <Image
                    src={workshops.media.videoPoster}
                    alt={workshops.media.videoLabel}
                    fill
                    sizes="(max-width: 639px) 50vw, 42vw"
                    className="object-cover"
                  />
                  <video
                    className="motion-video absolute inset-0 size-full object-cover"
                    src={workshops.media.video}
                    poster={workshops.media.videoPoster}
                    aria-label={workshops.media.videoLabel}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                </Reveal>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-12 gap-y-12 border-t border-line pt-8 lg:mt-24">
              <Reveal className="col-span-12 lg:col-span-5">
                <p className="text-lg leading-relaxed sm:text-xl">{workshops.description}</p>
              </Reveal>
              <Reveal delay={0.08} className="col-span-12 lg:col-span-5 lg:col-start-7">
                <ul className="divide-y divide-line border-y border-line">
                  {workshops.details.map((detail, index) => (
                    <li key={detail} className="flex gap-5 py-4 text-sm leading-relaxed">
                      <span className="text-[10px] tracking-[0.14em]">0{index + 1}</span>
                      {detail}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-neutral-500">{workshops.note}</p>
                <InquiryLink interest={workshops.interest} className={`${ctaClass} mt-8`}>
                  {workshops.cta}
                  <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
                </InquiryLink>
              </Reveal>
            </div>
          </div>
        </section>

        <section id={gifts.id} className={`${sectionSpace} ${pageGutter}`}>
          <div className="mx-auto max-w-[1600px]">
            <Reveal>
              <SectionHeading index={gifts.index} title={gifts.title} subtitle={gifts.subtitle} />
            </Reveal>

            <div className="mt-16 grid grid-cols-12 gap-y-12 lg:mt-24">
              <Reveal className="col-span-12 sm:col-span-5">
                <p className="text-lg leading-relaxed sm:text-xl">{gifts.description}</p>
                <ul className="mt-10 divide-y divide-line border-y border-line">
                  {gifts.details.map((detail, index) => (
                    <li key={detail} className="flex gap-5 py-4 text-sm leading-relaxed">
                      <span className="text-[10px] tracking-[0.14em]">0{index + 1}</span>
                      {detail}
                    </li>
                  ))}
                </ul>
                <InquiryLink interest={gifts.interest} className={`${ctaClass} mt-10`}>
                  {gifts.cta}
                  <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
                </InquiryLink>
              </Reveal>

              <div className="col-span-12 grid grid-cols-12 gap-3 sm:col-span-6 sm:col-start-7 sm:gap-5">
                <Reveal delay={0.05} className="group relative col-span-8 aspect-[4/5] overflow-hidden bg-line">
                  <Image
                    src={gifts.images[0].src}
                    alt={gifts.images[0].alt}
                    fill
                    sizes="(max-width: 639px) 67vw, 40vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </Reveal>
                <Reveal delay={0.1} className="group relative col-span-4 mt-20 aspect-[3/5] overflow-hidden bg-line">
                  <Image
                    src={gifts.images[1].src}
                    alt={gifts.images[1].alt}
                    fill
                    sizes="(max-width: 639px) 33vw, 20vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </Reveal>
                <Reveal delay={0.14} className="group relative col-span-6 col-start-5 aspect-square overflow-hidden bg-line">
                  <Image
                    src={gifts.images[2].src}
                    alt={gifts.images[2].alt}
                    fill
                    sizes="(max-width: 639px) 50vw, 30vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        <section id={flowerBar.id} className={`bg-ink text-white ${sectionSpace} ${pageGutter}`}>
          <div className="mx-auto max-w-[1600px]">
            <Reveal>
              <SectionHeading
                inverse
                index={flowerBar.index}
                title={flowerBar.title}
                subtitle={flowerBar.subtitle}
              />
            </Reveal>

            <div className="mt-16 grid grid-cols-12 gap-3 sm:gap-5 lg:mt-24">
              <Reveal className="group relative col-span-12 aspect-[4/5] overflow-hidden bg-neutral-800 sm:col-span-6 sm:aspect-[4/5]">
                <Image
                  src={flowerBar.media.main}
                  alt={flowerBar.media.mainAlt}
                  fill
                  sizes="(max-width: 639px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </Reveal>
              <div className="col-span-12 grid grid-cols-12 gap-3 sm:col-span-6 sm:gap-5">
                <Reveal delay={0.08} className="relative col-span-7 aspect-[3/4] overflow-hidden bg-neutral-800 sm:col-span-8">
                  <Image
                    src={flowerBar.media.videoPoster}
                    alt={flowerBar.media.videoLabel}
                    fill
                    sizes="(max-width: 639px) 58vw, 34vw"
                    className="object-cover"
                  />
                  <video
                    className="motion-video absolute inset-0 size-full object-cover"
                    src={flowerBar.media.video}
                    poster={flowerBar.media.videoPoster}
                    aria-label={flowerBar.media.videoLabel}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                </Reveal>
                <Reveal delay={0.12} className="group relative col-span-5 mt-20 aspect-[3/4] overflow-hidden bg-neutral-800 sm:col-span-4">
                  <Image
                    src={flowerBar.media.detail}
                    alt={flowerBar.media.detailAlt}
                    fill
                    sizes="(max-width: 639px) 42vw, 17vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </Reveal>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-12 gap-y-12 border-t border-white/25 pt-8 lg:mt-24">
              <Reveal className="col-span-12 lg:col-span-5">
                <p className="text-lg leading-relaxed sm:text-xl">{flowerBar.description}</p>
              </Reveal>
              <Reveal delay={0.08} className="col-span-12 lg:col-span-5 lg:col-start-7">
                <ul className="divide-y divide-white/20 border-y border-white/20">
                  {flowerBar.details.map((detail, index) => (
                    <li key={detail} className="flex gap-5 py-4 text-sm leading-relaxed">
                      <span className="text-[10px] tracking-[0.14em]">0{index + 1}</span>
                      {detail}
                    </li>
                  ))}
                </ul>
                <InquiryLink interest={flowerBar.interest} className={`${ctaClass} mt-10`}>
                  {flowerBar.cta}
                  <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
                </InquiryLink>
              </Reveal>
            </div>
          </div>
        </section>

        <section id={projects.id} className={`${sectionSpace} ${pageGutter}`}>
          <div className="mx-auto max-w-[1600px]">
            <Reveal>
              <SectionHeading
                index={projects.index}
                title={projects.title}
                subtitle={projects.subtitle}
              />
            </Reveal>
            <div className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-5 lg:mt-24">
              {projects.items.map((project, index) => (
                <Reveal key={project.title} delay={index * 0.08}>
                  <article className="group">
                    <div className={`relative overflow-hidden bg-line ${index === 1 ? "aspect-[4/5] sm:mt-20" : "aspect-[3/4]"}`}>
                      <Image
                        src={project.image}
                        alt={project.alt}
                        fill
                        sizes="(max-width: 639px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </div>
                    <h3 className="mt-5 text-lg font-light tracking-[-0.015em]">{project.title}</h3>
                    <p className="mt-2 text-[10px] tracking-[0.14em] text-neutral-500">{project.meta}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id={contact.id} className={`bg-white ${sectionSpace} ${pageGutter}`}>
          <div className="mx-auto max-w-[1600px]">
            <Reveal>
              <SectionHeading
                index={contact.index}
                title={contact.title}
                subtitle={contact.subtitle}
              />
            </Reveal>

            <div className="mt-16 grid grid-cols-12 gap-y-14 lg:mt-24">
              <Reveal className="col-span-12 lg:col-span-5">
                <ContactForm />
              </Reveal>
              <Reveal delay={0.08} className="col-span-12 lg:col-span-5 lg:col-start-8">
                <div className="group relative aspect-[4/5] overflow-hidden bg-line">
                  <Image
                    src={contact.image}
                    alt={contact.imageAlt}
                    fill
                    sizes="(max-width: 1023px) 100vw, 42vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <div className="mt-8 border-t border-line pt-6">
                  <p className="text-sm leading-relaxed">{contact.directPrefix}</p>
                  <a
                    href={contacts.telegram.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-xl font-light underline decoration-1 underline-offset-4 transition-opacity hover:opacity-55 active:opacity-40"
                  >
                    {contact.directLabel}
                    <ArrowUpRight size={18} strokeWidth={1.4} aria-hidden="true" />
                  </a>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <footer className={`bg-ink py-10 text-white ${pageGutter}`}>
        <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-y-10 border-t border-white/20 pt-8">
          <p className="col-span-12 text-xs tracking-[0.16em] sm:col-span-4">{footer.copyright}</p>
          <div className="col-span-12 flex flex-col gap-3 sm:col-span-5 sm:flex-row sm:gap-6">
            {[contacts.instagram, contacts.telegram, contacts.phone].map((item) => (
              <a
                key={item.url}
                href={item.url}
                target={item.url.startsWith("http") ? "_blank" : undefined}
                rel={item.url.startsWith("http") ? "noreferrer" : undefined}
                className="text-xs tracking-[0.12em] transition-opacity hover:opacity-55 active:opacity-40"
              >
                {item.label} · {item.display}
              </a>
            ))}
          </div>
          <div className="col-span-12 flex items-end justify-between sm:col-span-3 sm:block sm:text-right">
            <p className="text-[10px] tracking-[0.14em] text-white/60">{footer.location}</p>
            <a href="#top" className="mt-4 inline-block text-xs tracking-[0.14em] transition-opacity hover:opacity-55 active:opacity-40">
              {footer.backToTop}
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
