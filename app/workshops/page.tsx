import type { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Header } from "@/components/header";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { SiteFooter } from "@/components/site-footer";
import {
  BookingPanel,
  type PublicSession,
} from "@/components/workshops/booking-panel";
import { demoSessions } from "@/lib/booking/demo-sessions";
import { listUpcomingSessions, type SessionWithAvailability } from "@/lib/booking/service";
import { siteContent } from "@/lib/content";
import { getDb } from "@/lib/db";
import { formatUah } from "@/lib/format";
import {
  formatSessionDate,
  formatSessionTime,
  formatSessionWeekday,
} from "@/lib/time";

const { brand, contacts, footer, workshopsPage: page } = siteContent;

export const metadata: Metadata = {
  title: page.seo.title,
  description: page.seo.description,
  alternates: { canonical: "/workshops" },
  openGraph: {
    title: page.seo.title,
    description: page.seo.description,
    url: "/workshops",
  },
};

const pageGutter = "px-5 sm:px-8 lg:px-12";
const sectionSpace = "py-24 sm:py-28 lg:py-40";
const ctaClass =
  "inline-flex min-h-12 items-center gap-5 border-b border-current py-3 text-xs font-medium tracking-[0.15em] transition-opacity hover:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 active:opacity-45";

function toPublic(session: SessionWithAvailability): PublicSession {
  const [day, ...month] = formatSessionDate(session.startsAt).split(" ");
  return {
    id: session.id,
    day,
    month: month.join(" "),
    weekday: formatSessionWeekday(session.startsAt),
    time: formatSessionTime(session.startsAt),
    durationMin: session.durationMin,
    priceKop: session.priceKop,
    seatsLeft: session.seatsLeft,
    capacity: session.capacity,
  };
}

// Without a database (nothing connected yet) the page shows a sample schedule so
// the design can be reviewed; with one, real dates come from it. A broken
// database is reported as an error instead of being hidden behind samples.
async function loadSessions(): Promise<{ sessions: PublicSession[] | null; demo: boolean }> {
  if (!process.env.DATABASE_URL) {
    return { sessions: demoSessions().map(toPublic), demo: true };
  }
  try {
    const sessions = await listUpcomingSessions(getDb());
    return { sessions: sessions.map(toPublic), demo: false };
  } catch (error) {
    console.error("Could not load workshop sessions.", error);
    return { sessions: null, demo: false };
  }
}

export default async function WorkshopsPage() {
  // Free seats change every minute, so this page must never be prerendered.
  await connection();
  const { sessions, demo } = await loadSessions();
  const next = sessions?.find((session) => session.seatsLeft > 0);

  return (
    <>
      <Header brand={brand} navigation={page.navigation} homeHref="/" />

      <main id="top">
        <section className="relative flex min-h-screen items-end overflow-hidden bg-ink pt-20 text-white">
          <Image
            src={page.hero.image}
            alt={page.hero.imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
          <div className={`relative z-10 mx-auto w-full max-w-[1600px] ${pageGutter} pb-8 sm:pb-12 lg:pb-16`}>
            <Reveal>
              <p className="mb-6 text-[11px] tracking-[0.2em] sm:mb-10">
                {page.hero.eyebrow}
              </p>
              <h1 className="max-w-[15ch] whitespace-pre-line text-[clamp(3.3rem,10vw,10rem)] font-light leading-[0.84] tracking-[-0.055em]">
                {page.hero.title}
              </h1>
            </Reveal>

            <Reveal delay={0.15} className="mt-10 grid grid-cols-12 gap-y-8 sm:mt-14">
              <p className="col-span-12 max-w-xl text-base leading-relaxed sm:col-span-7 sm:text-lg lg:col-span-5 lg:col-start-1">
                {page.hero.subtitle}
              </p>
              <div className="col-span-12 flex flex-col items-start gap-8 sm:col-span-5 sm:items-end lg:col-span-4 lg:col-start-9">
                {next ? (
                  <a
                    href="#schedule"
                    className="block w-full max-w-xs border border-white/40 p-5 text-left backdrop-blur-sm transition-colors hover:bg-white/10 sm:text-left"
                  >
                    <span className="text-[10px] tracking-[0.18em] text-white/70">
                      {page.hero.nextDate}
                    </span>
                    <span className="mt-3 block text-4xl font-light leading-none tracking-[-0.05em]">
                      {next.day} {next.month}
                    </span>
                    <span className="mt-3 flex items-baseline justify-between text-xs tracking-[0.12em]">
                      <span>
                        {next.weekday.toUpperCase()} · {next.time}
                      </span>
                      <span>{formatUah(next.priceKop)}</span>
                    </span>
                  </a>
                ) : null}
                <a href={page.hero.ctaHref} className={`${ctaClass} border-white/70`}>
                  {page.hero.cta}
                  <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <section id={page.about.id} className={`${sectionSpace} ${pageGutter}`}>
          <div className="mx-auto max-w-[1600px]">
            <Reveal>
              <SectionHeading
                index={page.about.index}
                title={page.about.title}
                subtitle={page.about.subtitle}
              />
            </Reveal>
            <div className="mt-16 grid gap-y-12 lg:mt-24 lg:grid-cols-12 lg:gap-x-12">
              <Reveal className="lg:col-span-5 lg:col-start-3">
                <p className="text-lg leading-relaxed sm:text-xl">
                  {page.about.description}
                </p>
                <ul className="mt-10 divide-y divide-line border-y border-line">
                  {page.about.details.map((detail, index) => (
                    <li key={detail} className="flex gap-5 py-4 text-sm leading-relaxed">
                      <span className="text-[10px] tracking-[0.14em]">0{index + 1}</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.08} className="lg:col-span-4 lg:col-start-9">
                <div className="group relative aspect-[4/5] overflow-hidden bg-line">
                  <Image
                    src={page.about.image}
                    alt={page.about.imageAlt}
                    fill
                    sizes="(max-width: 1023px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
              </Reveal>
            </div>

            <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:mt-24">
              {page.about.gallery.map((item, index) => (
                <Reveal key={item.src} delay={index * 0.06}>
                  <div className="group relative aspect-[3/4] overflow-hidden bg-line">
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 639px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </div>
                </Reveal>
              ))}
              <Reveal delay={0.12} className="col-span-2 sm:col-span-1">
                <div className="relative aspect-[3/4] overflow-hidden bg-line max-sm:aspect-[4/3]">
                  <Image
                    src={page.about.videoPoster}
                    alt={page.about.videoLabel}
                    fill
                    sizes="(max-width: 639px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <video
                    className="motion-video absolute inset-0 size-full object-cover"
                    src={page.about.video}
                    poster={page.about.videoPoster}
                    aria-label={page.about.videoLabel}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section id={page.how.id} className={`bg-white ${sectionSpace} ${pageGutter}`}>
          <div className="mx-auto max-w-[1600px]">
            <Reveal>
              <SectionHeading
                index={page.how.index}
                title={page.how.title}
                subtitle={page.how.subtitle}
              />
            </Reveal>
            <ol className="mt-16 grid gap-y-12 border-t border-line pt-10 sm:grid-cols-3 sm:gap-x-8 lg:mt-24">
              {page.how.steps.map((step, index) => (
                <li key={step.number} className="list-none">
                  <Reveal delay={index * 0.08}>
                    <span className="text-[clamp(3.5rem,8vw,7rem)] font-light leading-none tracking-[-0.06em] text-neutral-300">
                      {step.number}
                    </span>
                    <h3 className="mt-6 text-xl font-light tracking-[-0.02em] lg:text-2xl">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-600">
                      {step.description}
                    </p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id={page.schedule.id} className={`${sectionSpace} ${pageGutter}`}>
          <div className="mx-auto max-w-[1600px]">
            <Reveal>
              <SectionHeading
                index={page.schedule.index}
                title={page.schedule.title}
                subtitle={page.schedule.subtitle}
              />
            </Reveal>

            <div className="mt-16 lg:mt-24">
              {sessions === null ? (
                <p role="alert" className="max-w-xl text-base leading-relaxed text-neutral-600">
                  {page.schedule.loadError}
                </p>
              ) : sessions.length === 0 ? (
                <div className="max-w-xl border-y border-line py-12">
                  <h3 className="text-[clamp(2rem,4vw,3rem)] font-light leading-[0.95] tracking-[-0.04em]">
                    {page.schedule.empty.title}
                  </h3>
                  <p className="mt-6 text-base leading-relaxed text-neutral-600">
                    {page.schedule.empty.description}
                  </p>
                  <a
                    href={contacts.telegram.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`${ctaClass} mt-8`}
                  >
                    {page.schedule.empty.cta}
                    <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
                  </a>
                </div>
              ) : (
                <BookingPanel sessions={sessions} demo={demo} />
              )}
            </div>
          </div>
        </section>

        <section className={`bg-ink py-20 text-white sm:py-24 ${pageGutter}`}>
          <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-y-10">
            <Reveal className="col-span-12 lg:col-span-6">
              <p className="text-[11px] tracking-[0.2em]">{page.help.eyebrow}</p>
              <h2 className="mt-6 text-[clamp(2.4rem,6vw,6rem)] font-light leading-[0.9] tracking-[-0.045em]">
                {page.help.title}
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/80">
                {page.help.description}
              </p>
            </Reveal>
            <Reveal
              delay={0.08}
              className="col-span-12 flex flex-col items-start justify-end gap-6 lg:col-span-4 lg:col-start-9"
            >
              <a
                href={contacts.telegram.url}
                target="_blank"
                rel="noreferrer"
                className={`${ctaClass} border-white/70`}
              >
                {page.help.telegram}
                <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
              </a>
              <Link href={page.help.businessHref} className={`${ctaClass} border-white/70`}>
                {page.help.business}
                <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter footer={footer} contacts={contacts} />
    </>
  );
}
