import { applySuccessfulPayment } from "@/lib/booking/payment-events";
import { isUuid } from "@/lib/checkout-validation";
import { getDb } from "@/lib/db";
import { isAuthenticWebhook, isMonobankConfigured } from "@/lib/payments/monobank";

type WebhookPayload = {
  invoiceId?: string;
  status?: string;
  amount?: number;
  reference?: string;
  modifiedDate?: string;
  failureReason?: string;
};

// monobank calls this on every invoice status change. It must answer 200 for
// anything genuine (otherwise monobank retries), and 401 for anything it did
// not sign.
export async function POST(request: Request) {
  if (!isMonobankConfigured()) {
    return new Response("Not configured", { status: 503 });
  }

  // The signature covers the exact bytes received, so read them raw.
  const rawBody = Buffer.from(await request.arrayBuffer());

  let authentic = false;
  try {
    authentic = await isAuthenticWebhook(rawBody, request.headers.get("x-sign"));
  } catch (error) {
    console.error("Could not verify the monobank webhook.", error);
    return new Response("Verification unavailable", { status: 503 });
  }
  if (!authentic) return new Response("Invalid signature", { status: 401 });

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Only "success" changes anything. A "failure" must NOT cancel the booking:
  // the customer can retry on the same invoice and pay successfully a minute
  // later. An unpaid booking simply expires with its 15-minute hold.
  if (payload.status === "success") {
    if (!payload.reference || !isUuid(payload.reference)) {
      console.error("monobank webhook without a valid reference.", payload.invoiceId);
      return new Response("OK");
    }
    try {
      await applySuccessfulPayment(getDb(), payload.reference, payload.amount);
    } catch (error) {
      console.error("Could not apply the payment.", error);
      // 500 makes monobank retry, which is what we want for a transient DB error.
      return new Response("Error", { status: 500 });
    }
  }

  return new Response("OK");
}
