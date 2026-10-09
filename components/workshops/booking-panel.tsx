"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitRequest } from "@/app/workshops/actions";
import { initialCheckoutFormState } from "@/lib/checkout-form-state";
import { siteContent } from "@/lib/content";
import { formatUah, pluralSeats } from "@/lib/format";

export type PublicSession = {
  id: string;
  day: string;
  month: string;
  weekday: string;
  time: string;
  durationMin: number;
  priceKop: number;
  seatsLeft: number;
  capacity: number;
};

const copy = siteContent.workshopsPage;
const MAX_SEATS = 4;
const LAST_SEATS = 3;

const inputClass =
  "min-h-14 w-full border-b border-neutral-400 bg-transparent py-3 text-base outline-none transition-colors placeholder:text-neutral-400 focus:border-ink";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex min-h-14 w-full items-center justify-between border border-ink bg-ink px-5 text-xs tracking-[0.16em] text-white transition-colors hover:bg-transparent hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink active:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-white"
    >
      <span>{pending ? copy.form.submitting : copy.form.submit}</span>
      <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
    </button>
  );
}

function SessionRow({
  session,
  selected,
  onSelect,
}: {
  session: PublicSession;
  selected: boolean;
  onSelect: () => void;
}) {
  const soldOut = session.seatsLeft === 0;
  const lastSeats = !soldOut && session.seatsLeft <= LAST_SEATS;
  const filled = Math.round(
    ((session.capacity - session.seatsLeft) / session.capacity) * 100,
  );

  return (
    <label
      className={`relative block ${soldOut ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      <input
        type="radio"
        name="sessionId"
        form="checkout-form"
        value={session.id}
        checked={selected}
        disabled={soldOut}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span
        className={`flex items-center gap-3 px-4 py-6 transition-colors peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-ink sm:gap-6 sm:px-6 sm:py-8 ${
          soldOut ? "opacity-45" : "hover:bg-line/60 peer-checked:hover:bg-ink"
        }`}
      >
        <span className="w-[1.3em] shrink-0 text-[clamp(2.75rem,5vw,4.5rem)] font-light leading-none tracking-[-0.06em]">
          {session.day}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs tracking-[0.12em] sm:text-sm">
            {session.month.toUpperCase()}
          </span>
          <span className="mt-1 block text-[10px] tracking-[0.14em] opacity-60">
            {session.weekday.toUpperCase()}
          </span>
          <span className="mt-2 block whitespace-nowrap text-xl font-light tracking-[-0.02em]">
            {session.time}
            <span className="ml-3 text-[10px] tracking-[0.14em] opacity-60">
              {session.durationMin} {copy.schedule.minutesSuffix}
            </span>
          </span>
        </span>
        <span className="w-28 shrink-0 text-right sm:w-40">
          <span className="block whitespace-nowrap text-lg font-light">
            {formatUah(session.priceKop)}
          </span>
          <span
            className={`mt-2 block whitespace-nowrap text-[10px] tracking-[0.14em] ${
              lastSeats ? "font-medium" : ""
            }`}
          >
            {soldOut
              ? copy.schedule.soldOut
              : `${copy.hero.seatsLeft} ${session.seatsLeft}`}
          </span>
          <span
            className="mt-2 block h-[2px] w-full bg-current/20"
            aria-hidden="true"
          >
            <span
              className="block h-full bg-current"
              style={{ width: `${soldOut ? 100 : filled}%` }}
            />
          </span>
        </span>
      </span>
    </label>
  );
}

export function BookingPanel({
  sessions,
  demo = false,
}: {
  sessions: PublicSession[];
  // No database is connected yet: show a sample schedule, no form.
  demo?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    submitRequest,
    initialCheckoutFormState,
  );
  const [selectedId, setSelectedId] = useState<string>(() => {
    const open = sessions.filter((session) => session.seatsLeft > 0);
    return open.length === 1 ? open[0].id : "";
  });
  const [seats, setSeats] = useState(1);

  const selected = sessions.find((session) => session.id === selectedId);
  const maxSeats = selected ? Math.min(MAX_SEATS, selected.seatsLeft) : MAX_SEATS;
  const seatCount = Math.min(seats, maxSeats);

  // A failed attempt (e.g. someone else took the seats) means the numbers on
  // screen are stale, so re-read them from the server.
  useEffect(() => {
    if (state.status === "error") router.refresh();
  }, [state, router]);

  function select(id: string) {
    setSelectedId(id);
    // On phones the form sits below the list: bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document
        .getElementById("checkout-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="grid gap-y-14 lg:grid-cols-12 lg:gap-x-12">
      <fieldset className="lg:col-span-7">
        <legend className="mb-6 text-xs tracking-[0.16em]">
          {copy.form.legend}
        </legend>
        <div className="divide-y divide-line border-y border-line">
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              selected={selectedId === session.id}
              onSelect={() => select(session.id)}
            />
          ))}
        </div>
      </fieldset>

      {demo ? (
        <div className="border border-ink bg-white p-6 sm:p-8 lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
          <p className="text-[10px] tracking-[0.18em] text-neutral-500">
            {copy.schedule.demoLabel}
          </p>
          <p className="mt-5 text-sm leading-relaxed text-neutral-600">
            {copy.schedule.demoNote}
          </p>
          <a
            href={siteContent.contacts.telegram.url}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex min-h-12 items-center gap-5 border-b border-current py-3 text-xs font-medium tracking-[0.15em] transition-opacity hover:opacity-55"
          >
            {copy.schedule.demoCta}
            <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
          </a>
        </div>
      ) : (
      <form
        id="checkout-form"
        action={formAction}
        className="scroll-mt-24 border border-ink bg-white p-6 sm:p-8 lg:col-span-5 lg:sticky lg:top-28 lg:self-start"
      >
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="border-b border-dashed border-neutral-400 pb-6">
          <p className="text-[10px] tracking-[0.18em] text-neutral-500">
            {copy.form.ticket}
          </p>
          {selected ? (
            <p className="mt-4 text-3xl font-light leading-none tracking-[-0.04em]">
              {selected.day} {selected.month}
              <span className="mt-2 block text-xs font-normal tracking-[0.14em]">
                {selected.weekday.toUpperCase()} · {selected.time}
              </span>
            </p>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-neutral-600">
              {copy.form.emptySelection}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-8">
          <label className="block text-xs tracking-[0.13em]">
            {copy.form.fields.name.label}
            <input
              className={inputClass}
              name="name"
              defaultValue={state.values.name}
              placeholder={copy.form.fields.name.placeholder}
              autoComplete="name"
              maxLength={80}
              required
            />
          </label>
          <label className="block text-xs tracking-[0.13em]">
            {copy.form.fields.phone.label}
            <input
              className={inputClass}
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={state.values.phone}
              placeholder={copy.form.fields.phone.placeholder}
              autoComplete="tel"
              maxLength={30}
              required
            />
            <span className="mt-1 block text-[11px] tracking-normal text-neutral-500">
              {copy.form.fields.phone.hint}
            </span>
          </label>
          <label className="block text-xs tracking-[0.13em]">
            {copy.form.fields.email.label}
            <input
              className={inputClass}
              name="email"
              type="email"
              defaultValue={state.values.email}
              placeholder={copy.form.fields.email.placeholder}
              autoComplete="email"
              maxLength={120}
              required
            />
            <span className="mt-1 block text-[11px] tracking-normal text-neutral-500">
              {copy.form.fields.email.hint}
            </span>
          </label>

          <fieldset>
            <legend className="text-xs tracking-[0.13em]">
              {copy.form.fields.seats.label}
            </legend>
            <div className="mt-4 flex gap-2">
              {Array.from({ length: MAX_SEATS }, (_, index) => index + 1).map(
                (count) => (
                  <label key={count} className="cursor-pointer">
                    <input
                      type="radio"
                      name="seats"
                      value={count}
                      checked={seatCount === count}
                      disabled={count > maxSeats}
                      onChange={() => setSeats(count)}
                      className="peer sr-only"
                    />
                    <span
                      className="grid size-12 place-items-center border border-line text-base transition-colors hover:border-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink peer-disabled:cursor-not-allowed peer-disabled:opacity-30 peer-disabled:hover:border-line"
                      aria-label={pluralSeats(count)}
                    >
                      {count}
                    </span>
                  </label>
                ),
              )}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 text-xs leading-relaxed text-neutral-600">
            <input
              type="checkbox"
              name="consent"
              value="yes"
              required
              className="mt-0.5 size-4 shrink-0 accent-ink"
            />
            <span>
              {copy.form.consentPrefix}{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                {copy.form.consentPrivacy}
              </Link>
            </span>
          </label>

          {state.status === "error" ? (
            <p role="alert" className="text-sm leading-relaxed text-red-800">
              {state.message}
            </p>
          ) : null}
        </div>

        <div className="mt-8 border-t border-dashed border-neutral-400 pt-6">
          <div className="mb-5 flex items-baseline justify-between">
            <span className="text-xs tracking-[0.16em]">{copy.form.total}</span>
            <span className="text-3xl font-light tracking-[-0.03em]">
              {selected ? formatUah(selected.priceKop * seatCount) : "—"}
            </span>
          </div>
          <SubmitButton disabled={!selected} />
          <p className="mt-4 text-xs leading-relaxed text-neutral-500">
            {copy.form.secure}
          </p>
        </div>
      </form>
      )}
    </div>
  );
}
