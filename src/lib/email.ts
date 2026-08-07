import { SITE } from "@/lib/site";

/**
 * Transactional email over Brevo's HTTP API.
 *
 * The API rather than SMTP so there is no mail library to install and no socket
 * to keep alive in a serverless function — a POST fits the request lifecycle
 * far better than a connection does.
 *
 * Separate from the Supabase SMTP configuration on purpose. That one sends auth
 * mail (OTP, password reset) and Supabase owns those templates; this sends our
 * own. Both end up leaving through the same Brevo account, so the sender
 * reputation and the deliverability work are shared even though the paths are
 * not.
 */

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/* Brevo rejects a batch over 99 recipients, and one address failing must not
   take the rest of the batch with it — so recipients are chunked. */
const BATCH_SIZE = 99;

export type Recipient = { email: string; name?: string | null };

function sender() {
  const email = process.env.BREVO_SENDER_EMAIL;
  if (!email) return null;
  return { name: process.env.BREVO_SENDER_NAME ?? SITE.name, email };
}

/**
 * Sends one message to many people, each as a separate delivery.
 *
 * `messageVersions` rather than a shared `to` array: a single `to` with 99
 * addresses puts every recipient's address in every other recipient's headers,
 * which for a user list is a straightforward data leak.
 *
 * Returns how many were sent and how many failed rather than throwing. The
 * callers are admin actions where the primary write has already happened —
 * maintenance is already on by the time this runs — and failing the whole action
 * because an email bounced would misreport what actually took effect.
 *
 * `reason` carries Brevo's own words back to the admin. The two failures worth
 * naming are a bad key and an unrecognised source IP (Brevo allowlists per key
 * by default), and both are configuration mistakes that look identical from a
 * bare "0 sent" — leaving them only in the server log means nobody finds out
 * until users report never getting the mail.
 */
export async function sendBulkEmail({
  recipients,
  subject,
  html,
}: {
  recipients: Recipient[];
  subject: string;
  html: string;
}): Promise<{
  sent: number;
  failed: number;
  skipped: boolean;
  reason?: string;
}> {
  const key = process.env.BREVO_API_KEY;
  const from = sender();

  /* Unconfigured is a normal state in development. Skipping loudly in the log
     beats throwing and making every admin action look broken locally. */
  if (!key || !from) {
    console.warn(
      `[email] BREVO_API_KEY or BREVO_SENDER_EMAIL not set — skipped "${subject}" to ${recipients.length} recipient(s).`,
    );
    return {
      sent: 0,
      failed: 0,
      skipped: true,
      reason: "Email isn't configured — BREVO_API_KEY or BREVO_SENDER_EMAIL is unset.",
    };
  }

  let sent = 0;
  let failed = 0;
  let reason: string | undefined;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "api-key": key,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: from,
          subject,
          htmlContent: html,
          messageVersions: batch.map((r) => ({
            to: [{ email: r.email, name: r.name ?? undefined }],
          })),
        }),
      });

      if (response.ok) {
        sent += batch.length;
      } else {
        failed += batch.length;
        const detail = await response.text();
        console.error(
          `[email] Brevo returned ${response.status} for "${subject}": ${detail}`,
        );
        reason ??= explain(response.status, detail);
      }
    } catch (error) {
      failed += batch.length;
      console.error(`[email] Send failed for "${subject}":`, error);
      reason ??= "Couldn't reach Brevo. Check the server log.";
    }
  }

  return { sent, failed, skipped: false, reason };
}

/** Turns a Brevo error body into something an admin can act on. */
function explain(status: number, body: string): string {
  if (status === 401) {
    /* Brevo puts the offending address in the message, which is the single most
       useful thing to show — it is what has to be pasted into the allowlist. */
    const ip = body.match(/IP address ([\d.]+)/)?.[1];
    if (ip) {
      return `Brevo rejected this server's IP (${ip}). Add it at Brevo → Security → Authorised IPs, or turn the restriction off.`;
    }
    return "Brevo rejected the API key. It must be an API v3 key (xkeysib-…), not the SMTP key.";
  }

  if (status === 400 && body.includes("sender")) {
    return "Brevo rejected the sender address. It must be a verified sender.";
  }

  return `Brevo returned ${status}. Check the server log.`;
}

/* Hosted rather than attached. A CID attachment would push every send over
   Brevo's inline-image handling and make the mail heavier for no gain; these are
   already on a CDN for the OG tags. */
const BANNER =
  "https://res.cloudinary.com/duozomapm/image/upload/v1786026986/opengraph-image-2_ftbrti.png";
const MARK =
  "https://res.cloudinary.com/duozomapm/image/upload/v1786027041/earnly-mark_ot3416.png";

/**
 * Wraps body copy in the shared shell so every mail we send looks the same.
 *
 * Table-based XHTML with inline styles, which is not how anyone would write a
 * web page and is exactly how email has to be written: Outlook renders through
 * Word's HTML engine, which ignores flexbox, grid, and most of a `<style>`
 * block. The `@media` rules in the head are progressive enhancement — clients
 * that drop them still get the desktop layout, which is legible on a phone.
 *
 * `preheader` is the grey line a client shows next to the subject in the inbox
 * list. Left unset it scrapes the first words of the body, which reads as an
 * accident, so it is passed explicitly and then hidden with the zero-height div
 * plus the run of zero-width characters that stops Gmail appending body copy to
 * it.
 *
 * Paragraph strings are interpolated raw so callers can pass `<strong>`. Every
 * caller is our own copy — never user input.
 */
export function emailLayout(
  heading: string,
  paragraphs: string[],
  options: { preheader?: string; footnote?: string } = {},
): string {
  const preheader = options.preheader ?? paragraphs[0] ?? "";

  const body = paragraphs
    .map(
      (p, i) =>
        `<p class="mut" style="margin:${i === 0 ? "12px" : "16px"} 0 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#636363;">${p}</p>`,
    )
    .join("");

  const footnote = options.footnote
    ? `<tr>
      <td class="px" style="padding:26px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td class="rule" style="border-top:1px solid #eadfd4;font-size:0;line-height:0;">&nbsp;</td>
        </tr></table>
      </td>
    </tr>
    <tr>
      <td class="px" style="padding:22px 40px 0 40px;">
        <p class="mut" style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#636363;">${options.footnote}</p>
      </td>
    </tr>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${heading}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style type="text/css">
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
  img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
  body{margin:0!important;padding:0!important;width:100%!important}
  @media only screen and (max-width:620px){
    .px{padding-left:24px!important;padding-right:24px!important}
    .h1{font-size:26px!important}
  }
  @media (prefers-color-scheme:dark){
    .bg{background-color:#14120e!important}
    .card{background-color:#1c1a16!important}
    .ink{color:#f9f3ee!important}
    .mut{color:#a9a49d!important}
    .rule{border-color:#332f28!important}
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background-color:#f9f3ee;">

<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
  ${preheader} &#8203;&#847;&zwnj;&nbsp;&#8203;&#847;&zwnj;&nbsp;&#8203;&#847;&zwnj;&nbsp;
</div>

<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9f3ee;">
<tr><td align="center" style="padding:32px 12px;">

  <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">

    <tr>
      <td style="font-size:0;line-height:0;">
        <img src="${BANNER}" width="600" height="315" alt="${SITE.name} — finish small tasks, get paid" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
      </td>
    </tr>

    <tr>
      <td class="px" style="padding:32px 40px 0 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:9px;font-size:0;line-height:0;">
            <img src="${MARK}" width="26" height="26" alt="" style="display:block;border:0;" />
          </td>
          <td class="ink" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:23px;font-weight:700;letter-spacing:-0.4px;color:#14120e;line-height:26px;mso-line-height-rule:exactly;">${SITE.name}</td>
          <td style="padding-left:5px;vertical-align:bottom;">
            <div style="width:7px;height:7px;background-color:#e8442c;border-radius:7px;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr></table>
      </td>
    </tr>

    <tr>
      <td class="px" style="padding:26px 40px 0 40px;">
        <h1 class="h1 ink" style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:30px;line-height:36px;mso-line-height-rule:exactly;font-weight:700;letter-spacing:-0.7px;color:#14120e;">${heading}</h1>
        ${body}
      </td>
    </tr>
${footnote}
    <tr><td style="height:36px;font-size:0;line-height:0;">&nbsp;</td></tr>

  </table>

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
    <tr><td class="px" align="center" style="padding:22px 40px 8px 40px;">
      <p class="mut" style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#8a857e;">${SITE.name} &middot; This is an automated message, please don&rsquo;t reply.</p>
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
}
