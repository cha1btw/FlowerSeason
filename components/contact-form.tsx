"use client";

import { ArrowUpRight } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendTelegramMessage } from "@/app/actions";
import { siteContent, type InterestValue } from "@/lib/content";
import { initialContactFormState } from "@/lib/contact-form-state";

const validInterests = new Set<InterestValue>(
  siteContent.contact.options.map((option) => option.value),
);

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-14 w-full items-center justify-between border border-ink bg-ink px-5 text-xs tracking-[0.16em] text-white transition-colors hover:bg-transparent hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink active:bg-neutral-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-64"
    >
      <span>{pending ? siteContent.contact.submitting : siteContent.contact.submit}</span>
      <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
    </button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(
    sendTelegramMessage,
    initialContactFormState,
  );
  const [interest, setInterest] = useState<InterestValue | "">("");

  useEffect(() => {
    function readInterest() {
      const value = new URLSearchParams(window.location.search).get("interest");
      if (value && validInterests.has(value as InterestValue)) {
        setInterest(value as InterestValue);
      }
    }

    function handleInterest(event: Event) {
      const value = (event as CustomEvent<InterestValue>).detail;
      if (validInterests.has(value)) setInterest(value);
    }

    readInterest();
    window.addEventListener("popstate", readInterest);
    window.addEventListener("flowerseason:interest", handleInterest);
    return () => {
      window.removeEventListener("popstate", readInterest);
      window.removeEventListener("flowerseason:interest", handleInterest);
    };
  }, []);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex min-h-[28rem] items-end border-t border-ink pb-8"
      >
        <p className="max-w-xl text-3xl font-light leading-tight tracking-[-0.025em] sm:text-5xl">
          {state.message}
        </p>
      </div>
    );
  }

  const inputClass =
    "min-h-14 w-full border-b border-neutral-400 bg-transparent py-3 text-base outline-none transition-colors placeholder:text-neutral-400 focus:border-ink";

  return (
    <form action={formAction} className="space-y-8">
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <label className="block text-xs tracking-[0.13em]">
          {siteContent.contact.fields.name.label}
          <input
            className={inputClass}
            name="name"
            placeholder={siteContent.contact.fields.name.placeholder}
            autoComplete="name"
            required
          />
        </label>
        <label className="block text-xs tracking-[0.13em]">
          {siteContent.contact.fields.company.label}
          <input
            className={inputClass}
            name="company"
            placeholder={siteContent.contact.fields.company.placeholder}
            autoComplete="organization"
          />
        </label>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <label className="block text-xs tracking-[0.13em]">
          {siteContent.contact.fields.contact.label}
          <input
            className={inputClass}
            name="contact"
            placeholder={siteContent.contact.fields.contact.placeholder}
            autoComplete="tel"
            required
          />
        </label>
        <label className="block text-xs tracking-[0.13em]">
          {siteContent.contact.fields.interest.label}
          <select
            className={`${inputClass} rounded-none`}
            name="interest"
            value={interest}
            onChange={(event) =>
              setInterest(event.target.value as InterestValue | "")
            }
            required
          >
            <option value="" disabled>
              {siteContent.contact.fields.interest.placeholder}
            </option>
            {siteContent.contact.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-xs tracking-[0.13em]">
        {siteContent.contact.fields.message.label}
        <textarea
          className={`${inputClass} min-h-32 resize-y`}
          name="message"
          placeholder={siteContent.contact.fields.message.placeholder}
          rows={4}
        />
      </label>

      {state.status === "error" ? (
        <p role="alert" className="text-sm leading-relaxed text-red-800">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SubmitButton />
        <p className="max-w-xs text-xs leading-relaxed text-neutral-500">
          {siteContent.contact.privacy}
        </p>
      </div>
    </form>
  );
}
