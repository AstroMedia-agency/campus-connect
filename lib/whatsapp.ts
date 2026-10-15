// Sends WhatsApp messages via CallMeBot (https://www.callmebot.com/blog/free-api-whatsapp-messages/) —
// the one genuinely free WhatsApp API for personal use that doesn't require a
// WhatsApp Business account, Meta developer approval, or a paid Twilio number.
//
// The catch: every RECIPIENT must individually opt in once (message the bot,
// get their own personal apikey). There's no way around this — it's how
// CallMeBot prevents spam abuse of their free tier. Each student does this
// once on their own phone; see the README for the exact steps.

export async function sendWhatsApp(phone: string, apikey: string, message: string): Promise<void> {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    phone
  )}&apikey=${encodeURIComponent(apikey)}&text=${encodeURIComponent(message)}`;

  const res = await fetch(url);
  const body = await res.text();

  // CallMeBot returns 200 with an error message in the body on failure
  // (invalid apikey, phone not registered with the bot, etc), not a non-200 status.
  if (!res.ok || /error/i.test(body)) {
    throw new Error(`CallMeBot error for ${phone}: ${body.slice(0, 200)}`);
  }
}
