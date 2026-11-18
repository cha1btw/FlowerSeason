// Workshop communication happens personally through the guest's chosen messenger.
export async function GET() {
  return new Response("Email reminders are disabled", { status: 410 });
}
