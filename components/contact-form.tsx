"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
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
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (state.status === "success") setIsSuccessDialogOpen(true);
  }, [state]);

  useEffect(() => {
    if (!isSuccessDialogOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSuccessDialog();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSuccessDialogOpen]);

  function closeSuccessDialog() {
    setIsSuccessDialogOpen(false);
    formRef.current?.reset();
    setInterest("");
  }

  const inputClass =
    "min-h-14 w-full border-b border-neutral-400 bg-transparent py-3 text-base outline-none transition-colors placeholder:text-neutral-400 focus:border-ink";

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-8">
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

      <AnimatePresence>
        {isSuccessDialogOpen ? (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-end bg-ink/55 p-3 backdrop-blur-[2px] sm:place-items-center sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeSuccessDialog();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="success-dialog-title"
              aria-describedby="success-dialog-message"
              className="relative w-full max-w-xl border border-ink bg-canvas p-6 shadow-2xl sm:p-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.42, ease: "easeOut" }}
            >
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeSuccessDialog}
                aria-label={siteContent.contact.successDialog.closeLabel}
                className="absolute right-4 top-4 grid size-11 place-items-center border border-line transition-colors hover:bg-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink active:bg-neutral-200 sm:right-6 sm:top-6"
              >
                <X size={18} strokeWidth={1.4} aria-hidden="true" />
              </button>

              <p className="pr-14 text-[10px] tracking-[0.18em] text-neutral-500">
                {siteContent.contact.successDialog.eyebrow}
              </p>
              <h3
                id="success-dialog-title"
                className="mt-14 max-w-sm text-4xl font-light leading-[0.94] tracking-[-0.04em] sm:text-6xl"
              >
                {siteContent.contact.successDialog.title}
              </h3>
              <p
                id="success-dialog-message"
                className="mt-8 max-w-md text-base leading-relaxed text-neutral-600 sm:text-lg"
              >
                {state.message}
              </p>
              <button
                type="button"
                onClick={closeSuccessDialog}
                className="mt-12 inline-flex min-h-12 items-center border-b border-ink py-3 text-xs font-medium tracking-[0.15em] transition-opacity hover:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink active:opacity-45"
              >
                {siteContent.contact.successDialog.close}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
