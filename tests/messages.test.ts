import assert from "node:assert/strict";
import test from "node:test";
import {
  adminAttentionMessage,
  adminPaymentMessage,
  confirmationEmail,
  escapeHtml,
  reminderEmail,
} from "../lib/booking/messages.ts";
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

test("the confirmation email states date, time, seats and price, and escapes the name", () => {
  const email = confirmationEmail(details, "https://site.test/workshops/booking/abc");
  assert.equal(email.to, "olena@example.com");
  assert.match(email.subject, /20 грудня о 18:00/);
  assert.match(email.html, /20 грудня \(неділя\) о 18:00/);
  assert.match(email.html, /2 місця/);
  assert.match(email.html, /4 000 ₴/);
  assert.match(email.html, /https:\/\/site\.test\/workshops\/booking\/abc/);
  assert.doesNotMatch(email.html, /<script>/);
});

test("the reminder email names the date and time", () => {
  const email = reminderEmail(details, "https://site.test/x");
  assert.match(email.subject, /20 грудня о 18:00/);
});

test("the owner's payment message includes who paid and how many seats remain", () => {
  const message = adminPaymentMessage(details, { seatsLeft: 3, emailSent: true }, esc);
  assert.match(message, /Нова оплата/);
  assert.match(message, /\+380501234567/);
  assert.match(message, /<b>3<\/b>/);
  assert.doesNotMatch(message, /не надіслано/);
  assert.doesNotMatch(message, /<script>/);
});

test("the owner is warned when the customer email failed", () => {
  const message = adminPaymentMessage(details, { seatsLeft: 3, emailSent: false }, esc);
  assert.match(message, /Лист клієнту не надіслано/);
});

test("the attention message carries the reason", () => {
  const message = adminAttentionMessage(details, "Місць немає", esc);
  assert.match(message, /Потрібна ваша увага/);
  assert.match(message, /Місць немає/);
});
