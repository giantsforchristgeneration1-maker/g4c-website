// mobile nav
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger?.addEventListener('click', () => nav.classList.toggle('open'));
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// shrink header on scroll
const header = document.getElementById('header');
let last = 0;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  header.style.boxShadow = y > 8 ? '0 6px 20px rgba(10,42,74,.08)' : 'none';
  last = y;
}, { passive: true });

// gentle reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = 1;
      e.target.style.transform = 'none';
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.qcard, .pillar, .mcard, .lead-card, .stat, .prog-card').forEach(el => {
  el.style.opacity = 0;
  el.style.transform = 'translateY(18px)';
  el.style.transition = 'opacity .6s ease, transform .6s ease';
  io.observe(el);
});

// see more / show less for galleries
document.querySelectorAll('.seemore').forEach(btn => {
  btn.addEventListener('click', () => {
    const grid = document.getElementById(btn.dataset.grid);
    if (!grid) return;
    const open = grid.classList.toggle('expanded');
    btn.classList.toggle('open', open);
    btn.firstChild.nodeValue = open ? btn.dataset.less + ' ' : btn.dataset.more + ' ';
    if (!open) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// visit form: record in Netlify Forms AND notify by email via the Resend function.
// Native submit is never blocked, so a submission is always stored even if email fails.
const visitForm = document.querySelector('form[name="visit"]');
visitForm?.addEventListener('submit', () => {
  try {
    const payload = Object.fromEntries(new FormData(visitForm).entries());
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/.netlify/functions/notify', blob);
    } else {
      fetch('/.netlify/functions/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    }
  } catch (_) {
    /* never block the native submit */
  }
});

// hero stats: count up when they come into view
(() => {
  const nodes = [...document.querySelectorAll('.stats .stat strong')];
  if (!nodes.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parsed = nodes.map((el) => {
    const raw = (el.textContent || '').trim();
    const m = raw.match(/^([\d,]+)(.*)$/);
    if (!m) return null;
    return { el, target: parseInt(m[1].replace(/,/g, ''), 10), suffix: m[2] || '', raw };
  });
  if (parsed.some((p) => !p) || reduce) return;

  const fmt = (n) => n.toLocaleString('en-US');
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const DURATION = 1600;
  let started = false;

  const run = () => {
    if (started) return;
    started = true;
    const t0 = performance.now();
    parsed.forEach((p) => { p.el.textContent = '0' + p.suffix; });

    const frame = (now) => {
      const t = Math.min((now - t0) / DURATION, 1);
      const eased = ease(t);
      parsed.forEach((p) => {
        p.el.textContent = fmt(Math.round(p.target * eased)) + p.suffix;
      });
      if (t < 1) requestAnimationFrame(frame);
      else parsed.forEach((p) => { p.el.textContent = p.raw; });
    };
    requestAnimationFrame(frame);
  };

  if (!('IntersectionObserver' in window)) { run(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect(); }
  }, { threshold: 0.35 });
  io.observe(document.querySelector('.stats'));
})();

// ---------- Paystack giving ----------
(() => {
  const PK = 'pk_live_033a16786afcc415e7bb0bdf3e3cb37171b2921d'; // public key only
  const amountInput = document.getElementById('pay-amount');
  const emailInput = document.getElementById('pay-email');
  const nameInput = document.getElementById('pay-name');
  const payBtn = document.getElementById('pay-btn');
  const note = document.getElementById('pay-note');
  if (!payBtn) return;

  const chips = [...document.querySelectorAll('.amt')];
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      amountInput.value = chip.dataset.amount;
    });
  });
  amountInput?.addEventListener('input', () => chips.forEach((c) => c.classList.remove('active')));

  const say = (msg, bad) => {
    if (!note) return;
    note.textContent = msg;
    note.style.color = bad ? '#C8102E' : '';
  };

  payBtn.addEventListener('click', () => {
    const amount = parseInt((amountInput?.value || '').replace(/[^0-9]/g, ''), 10);
    const email = (emailInput?.value || '').trim();
    const name = (nameInput?.value || '').trim();

    if (!amount || amount < 100) return say('Enter an amount of at least ₦100.', true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say('Enter a valid email for your receipt.', true);
    if (typeof PaystackPop === 'undefined') return say('Payment is still loading. Check your connection and try again.', true);

    const handler = PaystackPop.setup({
      key: PK,
      email,
      amount: amount * 100,           // kobo
      currency: 'NGN',
      metadata: {
        custom_fields: [
          { display_name: 'Donor', variable_name: 'donor_name', value: name || 'Anonymous' },
          { display_name: 'Purpose', variable_name: 'purpose', value: 'Giving — G4C' },
        ],
      },
      callback(response) {
        say('Thank you. Payment received — reference ' + response.reference + '.');
        payBtn.disabled = true;
        payBtn.textContent = 'Thank you for giving';
      },
      onClose() {
        say('Payment window closed. You can try again whenever you are ready.');
      },
    });
    handler.openIframe();
  });
})();
