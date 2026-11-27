// Netlify Function: notify the ministry when someone registers interest,
// and send the visitor a confirmation. Uses the Resend REST API directly.
// Dormant until RESEND_API_KEY is set in the Netlify environment.

const TO = process.env.NOTIFY_TO || 'info@mail.g4cgeneration.site';
const FROM = process.env.MAIL_FROM || 'G4C <hello@mail.g4cgeneration.site>';

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#F4F6FA;font-family:Inter,Arial,sans-serif;color:#0E2439">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#0A2A4A;padding:22px 28px">
          <div style="color:#fff;font-size:15px;font-weight:700;letter-spacing:.02em">Giants for Christ Generation</div>
          <div style="color:#63C99B;font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin-top:4px">Purity · Power · Prosperity · Progress</div>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="font-size:20px;margin:0 0 14px;color:#0A2A4A">${esc(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#F4F6FA;color:#5A6B7E;font-size:12px">
          Giants for Christ Generation · Ede, Osun State, Nigeria
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

async function sendEmail({ to, subject, html, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`resend ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data.id;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  let data;
  try {
    data = event.headers['content-type']?.includes('application/json')
      ? JSON.parse(event.body || '{}')
      : Object.fromEntries(new URLSearchParams(event.body || ''));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'bad_body' }) };
  }

  if (data['bot-field']) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  const name = (data.name || '').trim().slice(0, 120);
  const phone = (data.phone || '').trim().slice(0, 40);
  const email = (data.email || '').trim().slice(0, 160);
  const message = (data.message || '').trim().slice(0, 2000);

  if (!name || (!phone && !email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'missing_contact' }) };
  }

  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set — submission logged only:', { name, phone, email });
    return { statusCode: 200, body: JSON.stringify({ ok: true, queued: false }) };
  }

  const rows = [
    ['Name', name],
    ['Phone', phone || '—'],
    ['Email', email || '—'],
    ['Message', message || '—'],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#5A6B7E;font-size:13px;width:110px">${k}</td>
             <td style="padding:8px 0;font-size:14px;color:#0E2439">${esc(v)}</td></tr>`
    )
    .join('');

  try {
    const adminId = await sendEmail({
      to: TO,
      subject: `New registration of interest — ${name}`,
      html: layout('Someone wants to join us', `<table role="presentation" width="100%">${rows}</table>
        <p style="margin:18px 0 0;font-size:13px;color:#5A6B7E">Reply to this email to write back to them directly.</p>`),
      replyTo: email || undefined,
    });

    let userId = null;
    if (email) {
      userId = await sendEmail({
        to: email,
        subject: 'We have your details — Giants for Christ Generation',
        html: layout(
          `Thank you, ${name.split(' ')[0]}`,
          `<p style="font-size:14.5px;line-height:1.7;color:#33465B;margin:0 0 12px">
             Someone from the fellowship will reach out before Thursday with the venue, the time and anything else you need.</p>
           <p style="font-size:14.5px;line-height:1.7;color:#33465B;margin:0 0 18px">
             “We believe in raising people, not merely gathering them.”</p>
           <a href="https://g4c.online/register" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;
             padding:13px 24px;border-radius:999px;font-size:13px;font-weight:600">Complete your registration</a>`
        ),
      });
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, adminId, userId }) };
  } catch (err) {
    console.error('notify failed:', err.message);
    return { statusCode: 200, body: JSON.stringify({ ok: true, queued: false }) };
  }
};
