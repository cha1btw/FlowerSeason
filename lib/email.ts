export type Email = { to: string; subject: string; html: string; text: string };

// Sends through Resend's HTTP API (no SDK needed for one endpoint). Returns
// false on failure so callers can react (e.g. warn the owner) without crashing
// the payment flow. Without RESEND_API_KEY the email is only logged, which is
// what you want in local development.
export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.log(`[email not configured] to=${email.to} subject="${email.subject}"`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Resend returned an error.", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email request failed.", error);
    return false;
  }
}
