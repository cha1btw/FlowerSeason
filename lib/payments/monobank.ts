import { createPublicKey, verify } from "node:crypto";
import { HOLD_MINUTES } from "../booking/availability.ts";
import type { Booking, Session } from "../db/schema.ts";

const API = "https://api.monobank.ua/api/merchant";
const UAH = 980;

export type MonobankInvoice = { invoiceId: string; paymentUrl: string };

export type MonobankInvoiceStatus = {
  invoiceId: string;
  status: string;
  amount?: number;
  reference?: string;
  modifiedDate?: string;
  failureReason?: string;
};

export const isMonobankConfigured = () => Boolean(process.env.MONOBANK_TOKEN);

function token(): string {
  const value = process.env.MONOBANK_TOKEN;
  if (!value) throw new Error("MONOBANK_TOKEN is not configured.");
  return value;
}

export async function createMonobankInvoice(args: {
  booking: Booking;
  session: Session;
  siteUrl: string;
  destination: string;
}): Promise<MonobankInvoice> {
  const { booking, siteUrl, destination } = args;

  const response = await fetch(`${API}/invoice/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Token": token() },
    body: JSON.stringify({
      amount: booking.amountKop, // kopecks
      ccy: UAH,
      merchantPaymInfo: {
        // The webhook echoes this back, so the booking is found by its own id
        // even if the invoice id has not been saved yet.
        reference: booking.id,
        destination,
      },
      redirectUrl: `${siteUrl}/workshops/booking/${booking.id}`,
      webHookUrl: `${siteUrl}/api/payments/monobank`,
      // The invoice dies together with the seat hold.
      validity: HOLD_MINUTES * 60,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `monobank invoice/create failed: ${response.status} ${await response.text()}`,
    );
  }
  const data = (await response.json()) as { invoiceId?: string; pageUrl?: string };
  if (!data.invoiceId || !data.pageUrl) {
    throw new Error("monobank invoice/create returned an unexpected response.");
  }
  return { invoiceId: data.invoiceId, paymentUrl: data.pageUrl };
}

export async function getMonobankInvoiceStatus(
  invoiceId: string,
): Promise<MonobankInvoiceStatus> {
  const response = await fetch(
    `${API}/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`,
    { headers: { "X-Token": token() }, cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(
      `monobank invoice/status failed: ${response.status} ${await response.text()}`,
    );
  }
  return (await response.json()) as MonobankInvoiceStatus;
}

// monobank signs the raw webhook body with ECDSA (SHA-256) and sends the DER
// signature, base64-encoded, in the X-Sign header. The public key arrives as
// base64 of a PEM document. Returns false (never throws) on any malformed input.
export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureBase64: string,
  publicKeyBase64: string,
): boolean {
  try {
    const pem = Buffer.from(publicKeyBase64, "base64").toString("utf8");
    return verify(
      "sha256",
      rawBody,
      createPublicKey(pem),
      Buffer.from(signatureBase64, "base64"),
    );
  } catch {
    return false;
  }
}

let cachedPublicKey: string | undefined;

export async function getMonobankPublicKey(forceRefresh = false): Promise<string> {
  if (cachedPublicKey && !forceRefresh) return cachedPublicKey;

  const response = await fetch(`${API}/pubkey`, {
    headers: { "X-Token": token() },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`monobank pubkey failed: ${response.status}`);
  }
  const data = (await response.json()) as { key?: string };
  if (!data.key) throw new Error("monobank pubkey returned an unexpected response.");
  cachedPublicKey = data.key;
  return data.key;
}

// Checks a webhook against the cached key and, if that fails, once more
// against a freshly downloaded key (in case monobank rotated it).
export async function isAuthenticWebhook(
  rawBody: Buffer,
  signatureBase64: string | null,
): Promise<boolean> {
  if (!signatureBase64) return false;
  if (verifyWebhookSignature(rawBody, signatureBase64, await getMonobankPublicKey())) {
    return true;
  }
  return verifyWebhookSignature(
    rawBody,
    signatureBase64,
    await getMonobankPublicKey(true),
  );
}
