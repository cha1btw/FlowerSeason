import assert from "node:assert/strict";
import test from "node:test";
import { adminRequestMessage, escapeHtml } from "../lib/booking/messages.ts";
import { kyivLocalToUtc } from "../lib/time.ts";

const details = {
  name: 'Олена <script>alert("x")</script>',
  email: "olena@example.com",
  phone: "+380501234567",
  seats: 2,
  amountKop: 400_000,
  startsAt: kyivLocalToUtc(2026, 12, 20, 18, 0)!,
};
const esc = (v: string) => v.replaceAll("<", "&lt;");

test("escapeHtml neutralises markup", () => {
  assert.equal(escapeHtml('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
});

test("the owner's request message says who, when, how much and what to do next", () => {
  const message = adminRequestMessage(details, { seatsLeft: 3, emailSent: true }, esc);
  assert.match(message, /Нова заявка/);
  assert.match(message, /\+380501234567/);
  assert.match(message, /до сплати/);
  assert.match(message, /<b>3<\/b>/);
  assert.match(message, /Оплачено/);
  assert.doesNotMatch(message, /не надіслано/);
  assert.doesNotMatch(message, /<script>/);
});

test("the owner is warned when the customer email failed", () => {
  const message = adminRequestMessage(details, { seatsLeft: 3, emailSent: false }, esc);
  assert.match(message, /Лист клієнту не надіслано/);
});
