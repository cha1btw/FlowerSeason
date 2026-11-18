"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { submitRequest } from "@/app/workshops/actions";
import { initialCheckoutFormState } from "@/lib/checkout-form-state";
import { formatUah } from "@/lib/format";

export type PublicSession = {
  id: string;
  title: string;
  location: string;
  dateKey: string;
  day: string;
  month: string;
  weekday: string;
  time: string;
  endTime: string | null;
  durationMin: number;
  priceKop: number;
  seatsLeft: number;
  capacity: number;
};

const inputClass = "mt-2 min-h-12 w-full border-b border-ink/40 bg-transparent py-2 text-base outline-none focus:border-ink";
const months = ["СІЧЕНЬ", "ЛЮТИЙ", "БЕРЕЗЕНЬ", "КВІТЕНЬ", "ТРАВЕНЬ", "ЧЕРВЕНЬ", "ЛИПЕНЬ", "СЕРПЕНЬ", "ВЕРЕСЕНЬ", "ЖОВТЕНЬ", "ЛИСТОПАД", "ГРУДЕНЬ"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="mt-8 flex w-full justify-between bg-ink px-5 py-4 text-sm text-white disabled:opacity-50">{pending ? "НАДСИЛАЄМО…" : "НАДІСЛАТИ ЗАЯВКУ"}<ArrowUpRight size={18} /></button>;
}

export function BookingPanel({ sessions, demo = false }: { sessions: PublicSession[]; demo?: boolean }) {
  const router = useRouter();
  const [state, action] = useActionState(submitRequest, initialCheckoutFormState);
  const firstMonth = sessions[0]?.dateKey.slice(0, 7) ?? "2026-12";
  const [month, setMonth] = useState(firstMonth);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const selected = sessions.find((session) => session.id === selectedId);
  const [year, monthNumber] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const daySessions = sessions.filter((session) => session.dateKey === selectedDay);

  useEffect(() => { if (state.status === "error") router.refresh(); }, [state.status, router]);

  function shiftMonth(direction: number) {
    const date = new Date(Date.UTC(year, monthNumber - 1 + direction, 1));
    setMonth(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
    setSelectedDay("");
    setSelectedId("");
    setFormOpen(false);
  }

  return <div>
    <div className="flex items-end justify-between border-b border-ink pb-5">
      <h3 className="text-[clamp(2.2rem,6vw,5rem)] font-light leading-none">{months[monthNumber - 1]} {year}</h3>
      <div className="flex gap-2">
        <button type="button" aria-label="Попередній місяць" onClick={() => shiftMonth(-1)} className="grid size-11 place-items-center border border-line"><ArrowLeft size={18} /></button>
        <button type="button" aria-label="Наступний місяць" onClick={() => shiftMonth(1)} className="grid size-11 place-items-center border border-line"><ArrowRight size={18} /></button>
      </div>
    </div>
    <div className="mt-5 grid grid-cols-7 text-center text-xs tracking-[0.12em] text-neutral-500">{["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "НД"].map((day) => <span key={day} className="py-3">{day}</span>)}</div>
    <div className="grid grid-cols-7 border-l border-t border-line">
      {Array.from({ length: offset }, (_, i) => <div key={`blank-${i}`} className="aspect-square border-b border-r border-line" />)}
      {Array.from({ length: days }, (_, i) => {
        const dateKey = `${month}-${String(i + 1).padStart(2, "0")}`;
        const events = sessions.filter((s) => s.dateKey === dateKey);
        const open = events.some((s) => s.seatsLeft > 0);
        return <button key={dateKey} type="button" disabled={!events.length} onClick={() => { setSelectedDay(dateKey); setSelectedId(""); setFormOpen(false); }}
          aria-label={`${i + 1} ${months[monthNumber - 1].toLowerCase()}: ${events.length ? `${events.length} майстер-клас` : "немає подій"}`}
          aria-pressed={selectedDay === dateKey}
          className={`aspect-square border-b border-r border-line p-1 text-left text-sm sm:p-3 sm:text-xl ${events.length ? "hover:bg-neutral-100" : "text-neutral-300"} ${open ? "font-medium" : ""} ${events.length && !open ? "text-neutral-400" : ""} ${selectedDay === dateKey ? "bg-ink text-white hover:bg-ink" : ""}`}>
          <span>{i + 1}</span>{events.length > 0 && <span className="mt-1 block text-[9px] sm:text-xs">{events.length > 1 ? `${events.length} зустрічі` : events[0].time}</span>}
        </button>;
      })}
    </div>
    {selectedDay && <div className="mt-10 grid gap-5 md:grid-cols-2">{daySessions.map((session) => <article key={session.id} className={`border p-6 ${selectedId === session.id ? "border-ink" : "border-line"} ${session.seatsLeft === 0 ? "opacity-50" : ""}`}>
      <h4 className="text-2xl font-light">{session.title}</h4>
      <p className="mt-4 text-base">{session.day} {session.month} · {session.time}{session.endTime ? `–${session.endTime} · ${session.durationMin} хв` : " · тривалість уточнюється"}</p>
      <p className="mt-3 text-xl">{formatUah(session.priceKop)} / особа</p>
      <p className="mt-2 text-sm">Вільних місць: {session.seatsLeft}</p>
      <p className="mt-4 text-sm">{session.location}</p>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">Усі матеріали й інструменти включені. Створену роботу забираєш додому, а найкращі моменти збереже фотограф!</p>
      {session.seatsLeft > 0 && !demo && <button type="button" onClick={() => { setSelectedId(session.id); setFormOpen(true); setTimeout(() => document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }} className="mt-6 border-b border-ink pb-2 text-sm">ЗАПИСАТИСЯ ↗</button>}
      {demo && <p className="mt-6 text-sm">Онлайн-запис відкриється після підключення розкладу.</p>}
    </article>)}</div>}
    {formOpen && selected && <form id="booking-form" action={action} className="mt-12 max-w-xl scroll-mt-24 border border-ink p-6 sm:p-8">
      <h4 className="text-2xl font-light">{selected.title}</h4><p className="mt-2 text-sm">{selected.day} {selected.month} · {selected.time}</p>
      <input type="hidden" name="sessionId" value={selected.id} />
      <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="mt-8 block text-sm">Ім’я *<input name="name" required maxLength={80} defaultValue={state.values.name} className={inputClass} /></label>
      <label className="mt-6 block text-sm">Контактний телефон *<input name="phone" type="tel" required maxLength={30} defaultValue={state.values.phone} className={inputClass} /></label>
      <label className="mt-6 block text-sm">Зручний месенджер *<select name="messenger" required className={inputClass}><option value="">Оберіть</option><option>Telegram</option><option>WhatsApp</option><option>Viber</option></select></label>
      <label className="mt-6 block text-sm">Кількість місць *<select name="seats" required className={inputClass}>{Array.from({length: selected.seatsLeft}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
      <label className="mt-6 block text-sm">Коментар або побажання<textarea name="comment" maxLength={500} className={inputClass} rows={3} /></label>
      <label className="mt-6 flex gap-3 text-sm"><input type="checkbox" name="consent" value="yes" required />Погоджуюся на обробку контактних даних</label>
      {state.status === "error" && <p role="alert" className="mt-6 text-sm text-red-800">{state.message}</p>}
      <SubmitButton />
    </form>}
  </div>;
}
