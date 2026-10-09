import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/lib/booking/reminders";
import { getDb } from "@/lib/db";

function isAuthorized(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Vercel Cron calls this once a day and sends "Authorization: Bearer <CRON_SECRET>".
// Without the secret anyone could trigger the emails, so unconfigured means closed.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });
  if (!isAuthorized(request, secret)) return new Response("Unauthorized", { status: 401 });

  try {
    return Response.json(await sendDueReminders(getDb()));
  } catch (error) {
    console.error("Reminder job failed.", error);
    return new Response("Error", { status: 500 });
  }
}
