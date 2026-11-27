// Sends the donor a thank-you note after a successful Paystack payment,
// and tells the ministry a gift came in. Dormant if RESEND_API_KEY is unset.

const TO = process.env.NOTIFY_TO || 'info@mail.g4cgeneration.site';
const FROM = process.env.MAIL_FROM || 'G4C <hello@mail.g4cgeneration.site>';

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function money(amount, currency) {
  const n = Number(amount || 0);
  return currency === 'USD'
    ? '$' + n.toLocaleString('en-US')
    : '₦' + n.toLocaleString('en-US');
}

function shell(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#F4F6FA;font-family:Inter,Arial,sans-serif;color:#0E2439">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px">
   <tr><td align="center"><table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
    <tr><td style="background:#0A2A4A;padding:22px 28px">
      <div style="color:#fff;font-size:15px;font-weight:700">Giants for Christ Generation</div>
      <div style="color:#63C99B;font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin-top:4px">Purity · Power · Prosperity · Progress</div>
    </td></tr>
    <tr><td style="padding:28px">
      <h1 style="font-size:20px;margin:0 0 14px;color:#0A2A4A">${esc(title)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:16px 28px;background:#F4F6FA;color:#5A6B7E;font-size:12px">
      Giants for Christ Generation · Ede, Osun State, Nigeria
    </td></tr>
   </table></td></tr>
  </table></body></html>`;
}

async function send(payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`resend ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data.id;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  let d;
  try {
    d = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'bad_body' }) };
  }

  const name = (d.name || '').trim().slice(0, 120);
  const email = (d.email || '').trim().slice(0, 160);
  const amount = Number(d.amount) || 0;
  const currency = d.currency === 'USD' ? 'USD' : 'NGN';
  const reference = (d.reference || '').slice(0, 80);

  if (!email || !amount) return { statusCode: 400, body: JSON.stringify({ error: 'missing_fields' }) };

  if (!process.env.RESEND_API_KEY) {
    console.log('thank-you skipped (no key):', { name, email, amount, currency, reference });
    return { statusCode: 200, body: JSON.stringify({ ok: true, sent: false }) };
  }

  const first = name ? name.split(' ')[0] : 'friend';

  try {
    const donorId = await send({
      to: [email],
      subject: `Thank you${name ? ', ' + first : ''} — your gift to G4C`,
      html: shell(
        `Thank you${name ? ', ' + first : ''}.`,
        `<p style="font-size:14.5px;line-height:1.7;color:#33465B;margin:0 0 12px">
           We have received your gift of <strong>${money(amount, currency)}</strong>${
             reference ? ` (reference <span style="font-family:monospace">${esc(reference)}</span>)` : ''
           }.</p>
         <p style="font-size:14.5px;line-height:1.7;color:#33465B;margin:0 0 12px">
           It goes straight into the work: souls won in schools and villages, students kept in class, and training
           for people building something with their hands.</p>
         <p style="font-size:14.5px;line-height:1.7;color:#33465B;margin:0 0 4px">Thank you for standing with us.</p>
         <p style="font-size:14px;color:#5A6B7E;margin:18px 0 0">“We believe in raising people, not merely gathering them.”</p>`
      ),
    });

    await send({
      to: [TO],
      subject: `Gift received — ${money(amount, currency)} from ${name || 'a donor'}`,
      replyTo: email,
      html: shell(
        'A gift has come in',
        `<p style="font-size:14.5px;color:#33465B;margin:0 0 10px"><strong>${esc(name || 'Anonymous')}</strong>
           gave <strong>${money(amount, currency)}</strong>.</p>
         <p style="font-size:13.5px;color:#5A6B7E;margin:0">${esc(email)}${reference ? ' · ' + esc(reference) : ''}</p>`
      ),
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, sent: true, id: donorId }) };
  } catch (err) {
    console.error('thank-you failed:', err.message);
    return { statusCode: 200, body: JSON.stringify({ ok: true, sent: false }) };
  }
};
