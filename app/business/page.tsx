import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { MediaGallery } from "@/components/media-gallery";
import { ContactForm } from "@/components/contact-form";
import { Header } from "@/components/header";
import { InquiryLink } from "@/components/inquiry-link";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { SiteFooter } from "@/components/site-footer";
import { siteContent } from "@/lib/content";

export const metadata: Metadata = {
  title: siteContent.seo.title,
  description: siteContent.seo.description,
  alternates: { canonical: "/business" },
  openGraph: {
    title: siteContent.seo.title,
    description: siteContent.seo.description,
    url: "/business",
  },
  twitter: {
    title: siteContent.seo.title,
    description: siteContent.seo.description,
  },
};

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
              <h1 className="w-fit max-w-full text-[clamp(2.8rem,9vw,10rem)] font-light leading-[0.9] tracking-[-0.055em]">
                <span className="block">CHRISTMAS</span>
                <span className="block text-[0.51em] tracking-[-0.035em]">BY FLOWER SEASON</span>
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

            <div className="mt-16 grid gap-y-16 border-b border-line pb-16 grid-cols-3 gap-x-2 sm:gap-x-5 lg:mt-24 lg:gap-x-8">
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
                      <div className="mt-3 flex items-start gap-2 sm:mt-6 sm:gap-5">
                        <span className="pt-1 text-[10px] tracking-[0.15em]">
                          {item.number}
                        </span>
                        <div>
                          <h3 className="text-[clamp(0.65rem,1.5vw,1.5rem)] font-light tracking-[-0.02em]">
                            {item.title}
                          </h3>
                          <p className="mt-3 hidden max-w-sm text-base leading-relaxed text-neutral-600 sm:block">
                            {item.description}
                          </p>
                          <span className="mt-5 hidden border-b sm:inline-block border-ink pb-1 text-[10px] tracking-[0.15em]">
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
                <p className="text-base leading-relaxed">{decor.description}</p>
                <p className="mt-8 border-t border-line pt-5 text-xs leading-loose tracking-[0.11em] text-neutral-600">
                  {decor.tags}
                </p>
              </Reveal>

              <div className="col-span-12 mt-4 max-w-3xl lg:mt-12">
                <MediaGallery items={decor.images} label="Christmas decor" />
              </div>

              <div className="col-span-12 mt-8 grid grid-cols-12 gap-y-12 border-t border-line pt-8 lg:mt-16">
                <ul className="col-span-12 grid gap-2 sm:col-span-7">
                  {decor.services.map((service, index) => (
                    <li key={service.title} className="border-b border-line py-4">
                      <h3 className="text-xl font-light"><span className="mr-4 text-xs">0{index + 1}</span>{service.title}</h3>
                      <p className="mt-2 pl-9 text-base leading-relaxed text-neutral-600">{service.description}</p>
                    </li>
                  ))}
                </ul>
                <div className="col-span-12 flex flex-col items-start justify-end sm:col-span-4 sm:col-start-9">
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

            <div className="mt-16 max-w-3xl lg:mt-24">
              <div className="relative aspect-[3/4] overflow-hidden bg-line">
                <video src={workshops.media.video} poster={workshops.media.videoPoster} aria-label={workshops.media.videoLabel} className="size-full object-cover" autoPlay muted loop playsInline controls preload="metadata" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[{src: workshops.media.image, alt: workshops.media.imageAlt}, {src: workshops.media.detail, alt: workshops.media.detailAlt}].map((item) => (
                  <div key={item.src} className="relative aspect-[3/4] overflow-hidden bg-line"><Image src={item.src} alt={item.alt} fill sizes="50vw" className="object-cover" /></div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {["/media/new/video-5.mp4", "/media/new/video-6.mp4"].map((src) => (
                  <video key={src} src={src} className="aspect-[3/4] w-full object-cover" muted loop playsInline controls preload="metadata" />
                ))}
              </div>
            </div>

            <div className="mt-16 grid grid-cols-12 gap-y-12 border-t border-line pt-8 lg:mt-24">
              <Reveal className="col-span-12 lg:col-span-5">
                <p className="text-base leading-relaxed">{workshops.description}</p>
              </Reveal>
              <Reveal delay={0.08} className="col-span-12 lg:col-span-5 lg:col-start-7">
                <ul className="divide-y divide-line border-y border-line">
                  {workshops.details.map((detail, index) => (
                    <li key={detail} className="flex gap-5 py-4 text-base leading-relaxed">
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
                <Link href={workshops.publicHref} className={`${ctaClass} mt-4 sm:ml-10`}>
                  {workshops.publicCta}
                  <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
                </Link>
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
                <p className="text-base leading-relaxed">{gifts.description}</p>
                <ul className="mt-10 divide-y divide-line border-y border-line">
                  {gifts.details.map((detail, index) => (
                    <li key={detail} className="flex gap-5 py-4 text-base leading-relaxed">
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

              <div className="col-span-12 sm:col-span-6 sm:col-start-7">
                <div className="relative aspect-[3/4] overflow-hidden bg-line"><Image src={gifts.images[0].src} alt={gifts.images[0].alt} fill sizes="50vw" className="object-cover" /></div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {["/media/new/video-7.mp4", "/media/new/video-8.mp4"].map((src) => <video key={src} src={src} className="aspect-[3/4] w-full object-cover" muted loop playsInline controls preload="metadata" />)}
                </div>
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

            <div className="mt-16 max-w-3xl lg:mt-24">
              <video src={flowerBar.media.video} poster={flowerBar.media.videoPoster} aria-label={flowerBar.media.videoLabel} className="aspect-[3/4] w-full object-cover" autoPlay muted loop playsInline controls preload="metadata" />
            </div>

            <div className="mt-16 grid grid-cols-12 gap-y-12 border-t border-white/25 pt-8 lg:mt-24">
              <Reveal className="col-span-12 lg:col-span-5">
                <p className="text-base leading-relaxed">{flowerBar.description}</p>
              </Reveal>
              <Reveal delay={0.08} className="col-span-12 lg:col-span-5 lg:col-start-7">
                <ul className="divide-y divide-white/20 border-y border-white/20">
                  {flowerBar.details.map((detail, index) => (
                    <li key={detail} className="flex gap-5 py-4 text-base leading-relaxed">
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
            <div className="mt-16 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-3 sm:overflow-visible lg:mt-24">
              {projects.items.map((project, index) => (
                <article key={`${project.title}-${index}`} className="w-[78vw] max-w-sm shrink-0 snap-center sm:w-auto sm:max-w-none">
                  <div className="relative aspect-[3/4] overflow-hidden bg-line">
                    {"video" in project ? <video src={project.video} aria-label={project.alt} className="size-full object-cover" muted loop playsInline controls preload="metadata" /> : <Image src={project.image} alt={project.alt} fill sizes="(max-width: 639px) 80vw, 33vw" className="object-cover" />}
                  </div>
                  <h3 className="mt-3 text-lg font-light">{project.title}</h3>
                  <p className="mt-1 text-sm text-neutral-500">{project.meta}</p>
                </article>
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
                <div className="group relative aspect-[3/4] overflow-hidden bg-line">
                  <Image
                    src={contact.image}
                    alt={contact.imageAlt}
                    fill
                    sizes="(max-width: 1023px) 100vw, 42vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <div className="mt-8 border-t border-line pt-6">
                  <p className="text-base leading-relaxed">{contact.directPrefix}</p>
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

      <SiteFooter footer={footer} contacts={contacts} />
    </>
  );
}
