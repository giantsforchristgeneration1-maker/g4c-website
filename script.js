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
