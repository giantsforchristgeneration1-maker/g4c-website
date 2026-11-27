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

// ---------- Paystack giving modal ----------
(() => {
  const PK = 'pk_live_033a16786afcc415e7bb0bdf3e3cb37171b2921d'; // public key only
  const modal = document.getElementById('giveModal');
  if (!modal) return;

  const CUR = {
    NGN: { sym: '₦', min: 100, step: 100, amounts: [5000, 10000, 20000, 50000, 100000],
           fmt: (v) => '₦' + v.toLocaleString('en-US') },
    USD: { sym: '$', min: 2, step: 1, amounts: [10, 25, 50, 100, 250],
           fmt: (v) => '$' + v.toLocaleString('en-US') },
  };

  let currency = 'NGN';

  const chipsEl = document.getElementById('chips');
  const amountEl = document.getElementById('pay-amount');
  const emailEl = document.getElementById('pay-email');
  const nameEl = document.getElementById('pay-name');
  const note = document.getElementById('pay-note');
  const btn = document.getElementById('pay-btn');
  const formView = document.getElementById('giveForm');
  const doneView = document.getElementById('giveDone');
  const curSym = document.getElementById('curSym');
  const doneName = document.getElementById('doneName');
  const curBtns = [...document.querySelectorAll('.cur')];

  const digits = (s) => String(s || '').replace(/[^0-9]/g, '');
  const fmt = (v) => (v ? Number(v).toLocaleString('en-US') : '');

  const say = (msg, bad) => {
    if (!note) return;
    note.textContent = msg || '';
    note.hidden = !msg;
    note.style.color = bad ? '#C8102E' : '';
  };

  function renderChips() {
    const c = CUR[currency];
    chipsEl.innerHTML = c.amounts
      .map((a) => `<button type="button" class="amt" data-amount="${a}">${c.fmt(a)}</button>`)
      .join('');
    chipsEl.querySelectorAll('.amt').forEach((chip) => {
      chip.addEventListener('click', () => {
        chipsEl.querySelectorAll('.amt').forEach((x) => x.classList.remove('active'));
        chip.classList.add('active');
        amountEl.value = fmt(chip.dataset.amount);
      });
    });
    curSym.textContent = c.sym;
    amountEl.min = c.min;
    amountEl.step = c.step;
    amountEl.value = '';
    amountEl.placeholder = currency === 'NGN' ? 'Enter any amount' : 'Amount in dollars';
  }

  function openModal() {
    formView.hidden = false;
    doneView.hidden = true;
    btn.disabled = false;
    btn.textContent = 'Give now';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderChips();
    setTimeout(() => amountEl?.focus(), 250);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-give]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  });
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

  curBtns.forEach((b) => b.addEventListener('click', () => {
    curBtns.forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    currency = b.dataset.cur;
    renderChips();
  }));

  amountEl?.addEventListener('input', () => {
    const d = digits(amountEl.value);
    amountEl.value = fmt(d);
    chipsEl.querySelectorAll('.amt').forEach((x) => x.classList.remove('active'));
  });

  btn?.addEventListener('click', () => {
    const c = CUR[currency];
    const amount = parseInt(digits(amountEl.value), 10);
    const email = (emailEl.value || '').trim();
    const name = (nameEl.value || '').trim();

    if (!amount || amount < c.min) return say(`Enter at least ${c.sym}${c.min}.`, true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say('Enter a valid email so we can send your receipt.', true);
    if (typeof PaystackPop === 'undefined') return say('Payment is still loading — check your connection and try again.', true);

    say('Opening secure checkout…');
    const handler = PaystackPop.setup({
      key: PK,
      email,
      amount: amount * 100,
      currency,
      metadata: {
        custom_fields: [
          { display_name: 'Donor', variable_name: 'donor_name', value: name },
          { display_name: 'Purpose', variable_name: 'purpose', value: 'Giving — G4C' },
        ],
      },
      callback(response) {
        formView.hidden = true;
        doneView.hidden = false;
        doneName.textContent = name ? ', ' + name.split(' ')[0] : '';
      },
      onClose() { say('Checkout closed. You can try again whenever you are ready.'); },
    });
    handler.openIframe();
  });
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
