import { isUuid } from "@/lib/checkout-validation";
import { getDb } from "@/lib/db";
import { syncBookingPayment } from "@/lib/payments/sync";

// Called by the status page while a payment is pending: if the provider's
// webhook is late, this asks the provider directly.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });

  try {
    const result = await syncBookingPayment(getDb(), id);
    return Response.json({ result });
  } catch (error) {
    console.error("Payment sync failed.", error);
    return Response.json({ result: "error" }, { status: 502 });
  }
}
