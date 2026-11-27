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

// ---------- giving: inline form + popup share one checkout path ----------
(() => {
  const PK = 'pk_live_033a16786afcc415e7bb0bdf3e3cb37171b2921d'; // public key only

  const CUR = {
    NGN: { sym: '\u20a6', min: 100, amounts: [5000, 10000, 20000, 50000, 100000],
           fmt: (v) => '\u20a6' + Number(v).toLocaleString('en-US') },
  };

  const digits = (s) => String(s || '').replace(/[^0-9]/g, '');
  const fmt = (v) => (v ? Number(v).toLocaleString('en-US') : '');

  // load Paystack on demand — the <script> tag can be blocked or fail on mobile networks
  const loadPaystack = () => new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    const existing = document.querySelector('script[data-paystack]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('blocked')));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.async = true;
    s.dataset.paystack = '1';
    const timer = setTimeout(() => reject(new Error('timeout')), 12000);
    s.onload = () => { clearTimeout(timer); resolve(); };
    s.onerror = () => { clearTimeout(timer); reject(new Error('blocked')); };
    document.head.appendChild(s);
  });

  function initGiving(root) {
    if (!root) return null;
    const q = (sel) => root.querySelector(sel);
    const chipsEl = q('[data-chips]');
    const amountEl = q('[data-amount]');
    const emailEl = q('[data-email]');
    const nameEl = q('[data-name]');
    const note = q('[data-note]');
    const btn = q('[data-pay]');
    const curSym = q('[data-sym]');
    const formView = q('[data-form]');
    const doneView = q('[data-done]');
    const doneName = q('[data-done-name]');
    if (!chipsEl || !amountEl || !btn) return null;

    const c = CUR.NGN;

    const say = (msg, bad) => {
      if (!note) return;
      note.textContent = msg || '';
      note.hidden = !msg;
      note.style.color = bad ? '#C8102E' : '';
    };

    chipsEl.innerHTML = c.amounts
      .map((a) => `<button type="button" class="amt" data-value="${a}">${c.fmt(a)}</button>`)
      .join('');

    chipsEl.querySelectorAll('.amt').forEach((chip) => {
      chip.addEventListener('click', () => {
        chipsEl.querySelectorAll('.amt').forEach((x) => x.classList.remove('active'));
        chip.classList.add('active');
        amountEl.value = fmt(chip.dataset.value);
        say('');
      });
    });

    if (curSym) curSym.textContent = c.sym;
    amountEl.placeholder = 'Enter any amount';

    amountEl.addEventListener('input', () => {
      amountEl.value = fmt(digits(amountEl.value));
      chipsEl.querySelectorAll('.amt').forEach((x) => x.classList.remove('active'));
    });

    btn.addEventListener('click', () => {
      const amount = parseInt(digits(amountEl.value), 10);
      const email = (emailEl && emailEl.value || '').trim();
      const name = (nameEl && nameEl.value || '').trim();

      if (!amount || amount < c.min) return say(`Enter at least ${c.sym}${c.min}.`, true);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return say('Enter a valid email so we can send your receipt.', true);
      }

      say('Opening secure checkout\u2026');

      loadPaystack().then(() => {
        try {
          PaystackPop.setup({
            key: PK,
            email,
            amount: amount * 100,
            currency: 'NGN',
            metadata: {
              custom_fields: [
                { display_name: 'Donor', variable_name: 'donor_name', value: name },
                { display_name: 'Purpose', variable_name: 'purpose', value: 'Giving \u2014 G4C' },
              ],
            },
            callback() {
              if (formView) formView.hidden = true;
              if (doneView) doneView.hidden = false;
              if (doneName) doneName.textContent = name ? ', ' + name.split(' ')[0] : '';
              say(`Thank you! Your gift of ${c.fmt(amount)} was received.`);
            },
            onClose() {
              say('Checkout closed. You can try again whenever you are ready.');
            },
          }).openIframe();
        } catch (e) {
          say('Could not open checkout. Please try again.', true);
        }
      }).catch(() => {
        say('Payment could not load. Check your connection or turn off any ad-blocker, then try again.', true);
      });
    });

    return {
      reset() {
        if (formView) formView.hidden = false;
        if (doneView) doneView.hidden = true;
        if (note) { note.hidden = true; note.textContent = ''; }
        chipsEl.querySelectorAll('.amt').forEach((x) => x.classList.remove('active'));
        amountEl.value = '';
      },
      focus() { setTimeout(() => amountEl && amountEl.focus(), 250); },
    };
  }

  const modal = document.getElementById('giveModal');
  if (modal) {
    const api = initGiving(modal);
    const open = () => {
      if (api) api.reset();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (api) api.focus();
    };
    const close = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    document.querySelectorAll('[data-give]').forEach((el) => {
      el.addEventListener('click', (e) => { e.preventDefault(); open(); });
    });
    modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });
  }

  initGiving(document.getElementById('giveCard'));
})();

// ---------- support prompts: three rotating appeals ----------
(() => {
  const pop = document.getElementById('supportPop');
  const msg = document.getElementById('supportMsg');
  if (!pop) return;

  const MESSAGES = [
    "We spend a lot of money reaching secondary schools — transport, Bibles, materials. Your gift keeps us going back.",
    "Every outreach costs fuel, transport and provisions. Help us keep taking the Gospel to villages, markets and streets.",
    "Young people need more than preaching — mentorship, skills and training cost money. Will you help us raise them?",
  ];

  const KEY = 'g4c-support-dismissed';
  const dismissedAt = Number(localStorage.getItem(KEY) || 0);
  const week = 7 * 24 * 60 * 60 * 1000;
  if (dismissedAt && Date.now() - dismissedAt < week) return;

  let shown = false;
  const show = () => {
    if (shown) return;
    if (pop.classList.contains('show')) return;
    if (document.getElementById('giveModal')?.classList.contains('open')) return;
    // never float over the giving form itself
    const card = document.getElementById('giveCard');
    if (card) {
      const r = card.getBoundingClientRect();
      const visible = r.top < window.innerHeight && r.bottom > 0;
      if (visible) { setTimeout(show, 12000); return; }
    }
    shown = true;
    const idx = Math.floor(Math.random() * MESSAGES.length);
    msg.textContent = MESSAGES[idx];
    pop.classList.add('show');
  };

  const onScroll = () => {
    const pct = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
    if (pct > 0.35) show();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  setTimeout(show, 30000);

  pop.querySelectorAll('[data-support-close]').forEach((b) =>
    b.addEventListener('click', () => {
      pop.classList.remove('show');
      localStorage.setItem(KEY, String(Date.now()));
    })
  );
})();


// warm the Paystack script after load so the first tap is instant
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!window.PaystackPop) {
      const s = document.createElement('script');
      s.src = 'https://js.paystack.co/v1/inline.js';
      s.async = true;
      s.dataset.paystack = '1';
      document.head.appendChild(s);
    }
  }, 2500);
});
