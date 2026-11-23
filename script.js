/* =========================================================
   FAIRWAY ROYALE — script.js
   Vanilla JavaScript only. Each feature is a small function
   called from one place at the bottom of the file.
   ========================================================= */
'use strict';

/* ---------- 1. SHARED HELPERS & DATA ---------- */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Replace these with your own photography when you have it.
const IMG = {
  hero: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1800&q=80',
  course: 'https://images.unsplash.com/photo-1592919505780-303950717480?auto=format&fit=crop&w=1400&q=80',
  green: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1400&q=80',
};

const formatNumber = (n, decimals = 0, grouping = true) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouping,
  });
const fineDesktop = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth >= 900;

/**
 * Animates a number inside an element from its last value (stored in data-value)
 * to a new target. Respects reduced motion.
 */
function animateNumber(el, to, { duration = 1500, decimals = 0, prefix = '', grouping } = {}) {
  const useGroup = grouping ?? (prefix === '$');
  const from = parseFloat(String(el.dataset.value || '').replace(/[^0-9.-]/g, '')) || 0;
  if (prefersReduced) {
    el.dataset.value = to;
    el.textContent = prefix + formatNumber(to, decimals, useGroup);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);            // ease-out cubic
    const value = from + (to - from) * eased;
    el.textContent = prefix + formatNumber(value, decimals, useGroup);
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      el.dataset.value = to;
      el.textContent = prefix + formatNumber(to, decimals, useGroup);
    }
  };
  requestAnimationFrame(step);
}

/** Shows a short gold toast message at the bottom of the screen. */
function showToast(message) {
  const wrap = $('#toasts');
  if (!wrap) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  wrap.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-show'));
  setTimeout(() => {
    toast.classList.remove('is-show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* ---------- 2. THEME (night / light) ---------- */

function initTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem('fr-theme');
  if (saved) root.dataset.theme = saved;

  const toggle = $('#themeToggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'night' : 'light';
    root.classList.add('theme-transition');        // smooth colour fade
    root.dataset.theme = next;
    localStorage.setItem('fr-theme', next);
    setTimeout(() => root.classList.remove('theme-transition'), 800);
  });
}

/* ---------- 3. PRELOADER & CURTAIN OPENING ---------- */

function runPreloader() {
  const counter = $('#preCount');
  const preloader = $('#preloader');
  const duration = prefersReduced ? 100 : 2000;
  const start = performance.now();

  const tick = (now) => {
    const t = clamp((now - start) / duration, 0, 1);
    if (counter) counter.textContent = Math.round(t * 100);
    if (t < 1) {
      requestAnimationFrame(tick);
      return;
    }
    if (preloader) preloader.classList.add('is-done');
    $$('.curtain').forEach((curtain) => curtain.classList.add('open'));
    setTimeout(() => {
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');       // starts hero word reveal
    }, prefersReduced ? 0 : 900);
  };
  requestAnimationFrame(tick);
}

/* ---------- 4. NAVBAR (hide on scroll down, show on scroll up) ---------- */

function initNavbar() {
  const nav = $('#navbar');
  const hamburger = $('#hamburger');
  const overlay = $('#menuOverlay');
  const menuBg = $('#menuBg');
  if (!nav) return;

  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    if (!nav.classList.contains('menu-open')) {
      if (y > lastY && y > 120) nav.classList.add('is-hidden');
      else nav.classList.remove('is-hidden');
    }
    lastY = y;

    const fromTop = y + 120;
    let current = '';
    $$('main section[id]').forEach((section) => {
      if (section.offsetTop <= fromTop) current = section.id;
    });
    $$('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    if (!hamburger || !overlay) return;
    overlay.classList.toggle('is-open', open);
    hamburger.classList.toggle('is-active', open);
    nav.classList.toggle('menu-open', open);
    overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };

  hamburger?.addEventListener('click', () => {
    setMenu(!overlay.classList.contains('is-open'));
  });

  $$('.menu-links a').forEach((link) => {
    link.addEventListener('mouseenter', () => {
      const key = link.dataset.bg;
      if (menuBg && IMG[key]) menuBg.style.backgroundImage = `url(${IMG[key]})`;
    });
    link.addEventListener('click', () => setMenu(false));
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });
}

/* ---------- 5. CUSTOM CURSOR ---------- */

function initCursor() {
  const dot = $('#cursorDot');
  const ring = $('#cursorRing');
  const label = $('#cursorLabel');
  if (!dot || !ring || !fineDesktop()) return;
  document.body.classList.add('has-cursor');

  let x = 0, y = 0, rx = 0, ry = 0, running = true;
  window.addEventListener('mousemove', (event) => {
    x = event.clientX;
    y = event.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
  }, { passive: true });

  const follow = () => {
    if (!running) return;
    if (!fineDesktop()) {
      running = false;
      document.body.classList.remove('has-cursor');
      return;
    }
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(follow);
  };
  follow();
  window.addEventListener('resize', () => {
    if (fineDesktop() && !running) {
      running = true;
      document.body.classList.add('has-cursor');
      follow();
    }
  }, { passive: true });

  $$('a, button').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      const text = el.getAttribute('data-cursor') || '';
      if (label) label.textContent = text;
      ring.classList.toggle('is-label', Boolean(text));
    });
    el.addEventListener('mouseleave', () => {
      if (label) label.textContent = '';
      ring.classList.remove('is-label');
    });
  });
}

/* ---------- 6. SCROLL PROGRESS (gold ball on the line) ---------- */

function initScrollProgress() {
  const ball = $('#scrollBall');
  if (!ball) return;
  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    ball.style.top = `${p * 100}%`;
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ---------- 7. RIPPLE + MAGNETIC PRESS ---------- */

function initRipple() {
  const targets = $$('.btn, .add-btn, .join-btn, .icon-btn, .chip, .hole-btn, .date-btn, .stepper__btn, .back-to-top, .footer__social a');
  targets.forEach((button) => {
    button.addEventListener('click', (event) => {
      if (prefersReduced) return;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });
  });
}

function initMagnetic() {
  if (!canHover || prefersReduced) return;
  $$('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (event) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${dx * 0.12}px, ${dy * 0.12}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

/* ---------- 8. REVEALS, SPLIT TITLES, COUNTERS, PARTICLES ---------- */

function initReveals() {
  const items = $$('[data-reveal], .section-title[data-split]');
  $$('.section-title[data-split]').forEach((title) => {
    const words = title.textContent.trim().split(/\s+/);
    title.textContent = '';
    words.forEach((word, i) => {
      const wrap = document.createElement('span');
      wrap.className = 'split-word';
      Array.from(word).forEach((ch) => {
        const inner = document.createElement('span');
        inner.className = 'char';
        inner.style.setProperty('--i', i);
        inner.textContent = ch;
        wrap.appendChild(inner);
      });
      title.appendChild(wrap);
    });
  });

  const more = $$('.gold-rule, .clip-reveal, .stat');
  const show = (el) => el.classList.add('is-in');
  if (prefersReduced) {
    items.forEach(show);
    more.forEach(show);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        show(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px 12% 0px' });

  const all = [...items, ...more];
  all.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.96) show(el);
    else io.observe(el);
  });
  const failsafe = () => {
    all.forEach((el) => {
      if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < window.innerHeight + 40) {
        show(el);
      }
    });
  };
  setTimeout(failsafe, 800);
  setTimeout(failsafe, 2200);
  window.addEventListener('scroll', failsafe, { passive: true });
}

function initCounters() {
  const stats = $$('[data-count]');
  if (!stats.length) return;
  stats.forEach((el) => {
    const wrap = el.closest('.stat') || el.parentElement;
    if (wrap && !wrap.querySelector('.stat-ring')) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'stat-ring');
      svg.setAttribute('viewBox', '0 0 74 74');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = '<circle class="sr-track" cx="37" cy="37" r="32"></circle><circle class="sr-fill" cx="37" cy="37" r="32"></circle>';
      wrap.insertBefore(svg, wrap.firstChild);
      const target = Number(el.dataset.count);
      const progress = target >= 1000 ? 0.8 : target >= 70 ? 0.72 : 0.55;
      wrap.style.setProperty('--ring-off', String(Math.round(201 * (1 - progress))));
    }
  });
  const run = (el) => {
    if (el.dataset.counted === '1') return;
    el.dataset.counted = '1';
    animateNumber(el, Number(el.dataset.count), { duration: 1600, decimals: 0, grouping: false });
    el.closest('.stat')?.classList.add('is-in');
  };
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      run(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px 10% 0px' });
  stats.forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.95) run(el);
    else io.observe(el);
    setTimeout(() => {
      if (el.dataset.counted !== '1' && el.getBoundingClientRect().top < window.innerHeight) run(el);
    }, 2000);
  });
}

function initParticles() {
  const wrap = $('#particles');
  if (!wrap || prefersReduced) return;
  for (let i = 0; i < 16; i += 1) {
    const span = document.createElement('span');
    span.style.setProperty('--x', `${Math.random() * 100}%`);
    span.style.setProperty('--y', `${Math.random() * 100}%`);
    span.style.setProperty('--s', `${4 + Math.random() * 6}px`);
    span.style.setProperty('--dur', `${6 + Math.random() * 8}s`);
    span.style.setProperty('--delay', `${Math.random() * 4}s`);
    wrap.appendChild(span);
  }
}

function initYear() {
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
}

/* ---------- 18. GOLF BALL ROLLS ACROSS ONCE WHEN A SECTION APPEARS ---------- */

function initBallVisit() {
  const ball = $('#visitBall');
  const section = $('#heritage');
  if (!ball || !section || prefersReduced) return;

  const io = new IntersectionObserver((entries, observer) => {
    if (entries[0].isIntersecting) {
      ball.classList.add('is-rolling');
      observer.disconnect();                   // only once
    }
  }, { threshold: 0.35 });
  io.observe(section);
}

/* ---------- 19. HORIZONTAL PINNED SCROLL (Signature Experiences) ---------- */

function initHorizontal() {
  const wrap = $('#experiencesWrap');
  const track = $('#expTrack');
  if (!wrap || !track) return;

  const update = () => {
    if (window.innerWidth < 900) {          // on phones the track scrolls by touch instead
      track.style.transform = '';
      return;
    }
    const rect = wrap.getBoundingClientRect();
    const scrollable = wrap.offsetHeight - window.innerHeight;
    const progress = clamp(-rect.top / scrollable, 0, 1);
    const maxX = track.scrollWidth - window.innerWidth;
    track.style.transform = `translate3d(${-progress * Math.max(maxX, 0)}px, 0, 0)`;
  };

  window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ---------- 20. COURSE EXPLORER (18 holes) ---------- */

const HOLES = [
  { name: 'The Gateway', par: 4, yards: 412, hcp: 9, desc: 'A wide opening fairway guarded by two ancient oaks. Favour the left side to open the approach.', img: IMG.course },
  { name: 'Sea Breeze', par: 5, yards: 528, hcp: 3, desc: 'A gentle dogleg that follows the coastline. The breeze often shifts here, so club up on the final shot.', img: IMG.green },
  { name: 'Old Oak', par: 3, yards: 186, hcp: 15, desc: 'A elevated tee over a silver pond. The green is deep, so a confident swing is rewarded.', img: IMG.hero },
  { name: 'The Narrows', par: 4, yards: 401, hcp: 5, desc: 'Tight corridors between mature pines demand accuracy off the tee and patience on approach.', img: IMG.course },
  { name: 'Sunset Ridge', par: 4, yards: 437, hcp: 1, desc: 'The hardest hole on the course. A rising fairway hides the green until you reach the crest.', img: IMG.green },
  { name: 'Lantern', par: 5, yards: 561, hcp: 7, desc: 'A long par five lit by the clubhouse at dusk. Two strong shots can reach the green in regulation.', img: IMG.hero },
  { name: 'Mistral', par: 4, yards: 398, hcp: 11, desc: 'Open to the wind from every direction. Keep the ball low and let the contours guide your putt.', img: IMG.course },
  { name: 'The Crown', par: 3, yards: 164, hcp: 17, desc: 'A short hole with a crowned green. Par is a fine score here, and a birdie is a memory for life.', img: IMG.green },
  { name: 'Clubhouse Turn', par: 4, yards: 419, hcp: 13, desc: 'The turn before the back nine, with a view of the terrace where members gather for lunch.', img: IMG.hero },
  { name: 'Royal Valley', par: 4, yards: 441, hcp: 6, desc: 'A valley fairway framed by wild grass. Long hitters should aim for the far bunker line.', img: IMG.course },
  { name: 'Cathedral', par: 4, yards: 405, hcp: 8, desc: 'Tall hedges form a green corridor. The approach is quiet, careful and deeply satisfying.', img: IMG.green },
  { name: 'The Lagoon', par: 3, yards: 178, hcp: 16, desc: 'A water carry over still lagoon water. Club selection matters more than the swing itself.', img: IMG.hero },
  { name: 'Silver Fern', par: 5, yards: 552, hcp: 2, desc: 'A sweeping par five with fern-lined bunkers. Strategic play beats raw power on this hole.', img: IMG.course },
  { name: 'Pavilion', par: 4, yards: 388, hcp: 12, desc: 'A short par four beside the garden pavilion. A well-judged wedge sets up an easy birdie.', img: IMG.green },
  { name: 'Monarch', par: 4, yards: 423, hcp: 4, desc: 'A regal fairway with sloping greens. Read the break carefully and never short-sided yourself.', img: IMG.hero },
  { name: 'Dunes', par: 3, yards: 169, hcp: 18, desc: 'A seaside par three over the dunes. Wind direction is your first decision before every shot.', img: IMG.course },
  { name: 'The Kingdom', par: 4, yards: 396, hcp: 14, desc: 'Wide and generous fairway that rewards a calm, centre-line tee shot and a measured approach.', img: IMG.green },
  { name: 'The Homecoming', par: 5, yards: 575, hcp: 10, desc: 'The closing hole sweeps back toward the clubhouse terrace, inviting a brave finish in the evening light.', img: IMG.hero },
];

function initCourse() {
  const nav = $('#holeNav');
  if (!nav) return;
  const name = $('#holeName');
  const num = $('#holeNum');
  const par = $('#holePar');
  const yards = $('#holeYards');
  const hcp = $('#holeHcp');
  const desc = $('#holeDesc');
  const image = $('#holeImage');

  const show = (index) => {
    const hole = HOLES[index];
    if (!hole) return;
    $$('.hole-btn', nav).forEach((btn, i) => {
      btn.classList.toggle('is-active', i === index);
      btn.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });
    if (num) num.textContent = `Hole ${index + 1}`;
    if (name) name.textContent = hole.name;
    if (par) par.textContent = `Par ${hole.par}`;
    if (yards) yards.textContent = `${hole.yards} yards`;
    if (hcp) hcp.textContent = `Stroke index ${hole.hcp}`;
    if (desc) desc.textContent = hole.desc;
    if (image) {
      image.classList.remove('is-loaded');
      image.src = hole.img;
      image.alt = `${hole.name}, hole ${index + 1}`;
      if (image.complete && image.naturalWidth) image.classList.add('is-loaded');
      else image.addEventListener('load', () => image.classList.add('is-loaded'), { once: true });
    }
  };

  HOLES.forEach((hole, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hole-btn';
    btn.textContent = String(index + 1);
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-label', `Hole ${index + 1}, ${hole.name}`);
    btn.addEventListener('click', () => show(index));
    nav.appendChild(btn);
  });
  show(0);
}

/* ---------- 21. BOOKING (date strip, chips, stepper, pricing) ---------- */

function initBooking() {
  const strip = $('#dateStrip');
  const chips = $$('#timeChips .chip');
  const minus = $('#playerMinus');
  const plus = $('#playerPlus');
  const countEl = $('#playerCount');
  const priceEl = $('#priceValue');
  const summary = $('#summaryText');
  const reserve = $('#reserveBtn');
  const overlay = $('#successOverlay');
  const burst = $('#burst');
  if (!strip || !countEl) return;

  const state = { date: null, time: null, players: 2 };

  const weekdayFee = 280;
  const weekendFee = 360;

  const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

  const total = () => {
    if (!state.date) return 0;
    let fee = isWeekend(state.date) ? weekendFee : weekdayFee;
    if ($('#optCart')?.checked) fee += 65;
    if ($('#optRental')?.checked) fee += 85;
    if ($('#optCaddie')?.checked) fee += 120;
    return fee * state.players;
  };

  const refresh = () => {
    const value = total();
    if (priceEl) animateNumber(priceEl, value, { duration: 500, prefix: '$' });
    if (!summary) return;
    if (!state.date || !state.time) {
      summary.textContent = 'Select a date and tee time.';
      return;
    }
    const label = state.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    summary.textContent = `${state.players} player${state.players > 1 ? 's' : ''} · ${label} at ${state.time}.`;
  };

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'date-btn';
    btn.setAttribute('role', 'option');
    const day = date.toLocaleDateString('en-GB', { weekday: 'short' });
    const num = date.getDate();
    btn.innerHTML = `${num}<small>${day}</small>`;
    btn.addEventListener('click', () => {
      state.date = date;
      $$('.date-btn', strip).forEach((el) => el.classList.remove('is-active'));
      btn.classList.add('is-active');
      refresh();
    });
    strip.appendChild(btn);
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((el) => el.classList.remove('is-active'));
      chip.classList.add('is-active');
      state.time = chip.dataset.time;
      refresh();
    });
  });

  const setPlayers = (value) => {
    state.players = clamp(value, 1, 4);
    countEl.textContent = String(state.players);
    refresh();
  };
  minus?.addEventListener('click', () => setPlayers(state.players - 1));
  plus?.addEventListener('click', () => setPlayers(state.players + 1));
  ['optCart', 'optCaddie', 'optRental'].forEach((id) => {
    $(`#${id}`)?.addEventListener('change', refresh);
  });

  reserve?.addEventListener('click', () => {
    if (!state.date || !state.time) {
      showToast('Please choose a date and tee time.');
      return;
    }
    overlay?.classList.add('is-show');
    if (burst && !prefersReduced) {
      burst.innerHTML = '';
      for (let i = 0; i < 16; i += 1) {
        const spark = document.createElement('span');
        const angle = (Math.PI * 2 * i) / 16;
        spark.style.setProperty('--tx', `${Math.cos(angle) * 140}px`);
        spark.style.setProperty('--ty', `${Math.sin(angle) * 140}px`);
        burst.appendChild(spark);
      }
    }
    setTimeout(() => overlay?.classList.remove('is-show'), 2600);
    showToast('Your tee time is reserved.');
  });

  refresh();
}

/* ---------- 22. HANDICAP GAUGE ---------- */

function initHandicap() {
  const form = $('#handicapForm');
  const fill = $('#gaugeFill');
  const valueEl = $('#gaugeValue');
  const badge = $('#levelBadge');
  if (!form) return;

  const circumference = 2 * Math.PI * 80;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const scores = $$('input[name="score"]', form)
      .map((input) => Number(input.value))
      .filter((n) => Number.isFinite(n) && n >= 50 && n <= 150);
    if (scores.length < 3) {
      showToast('Please enter at least three scores.');
      return;
    }
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const handicap = clamp(average - 72, 0, 54);
    const rounded = Math.round(handicap * 10) / 10;
    if (valueEl) animateNumber(valueEl, rounded, { duration: 1000, decimals: 1 });
    if (fill) {
      const progress = rounded / 36;
      fill.style.strokeDashoffset = String(circumference * (1 - clamp(progress, 0, 1)));
    }
    let level = 'Scratch potential';
    if (rounded >= 28) level = 'Beginner';
    else if (rounded >= 18) level = 'Improving amateur';
    else if (rounded >= 10) level = 'Club player';
    else if (rounded >= 4) level = 'Low handicap';
    if (badge) badge.textContent = level;
  });
}

/* ---------- 23. MEMBERSHIP BILLING TOGGLE ---------- */

function initMembership() {
  const toggle = $('#billingToggle');
  if (!toggle) return;
  const billing = toggle.closest('.billing');
  const apply = (annual) => {
    toggle.setAttribute('aria-checked', annual ? 'true' : 'false');
    billing?.classList.toggle('is-annual', annual);
    $$('.tier__price span[data-price-month]').forEach((el) => {
      el.textContent = annual ? el.dataset.priceYear : el.dataset.priceMonth;
    });
    $$('.tier__price small').forEach((el) => {
      el.textContent = annual ? ' / yr' : ' / mo';
    });
  };
  apply(false);
  toggle.addEventListener('click', () => {
    apply(toggle.getAttribute('aria-checked') !== 'true');
  });
  $$('.join-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      showToast(`An invitation request for ${btn.dataset.tier} membership has been noted.`);
    });
  });
}

/* ---------- 24. PRO SHOP / CART ---------- */

function initShop() {
  const note = $('#cartNote');
  const cart = [];
  $$('.add-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      cart.push({ name: btn.dataset.name, price: Number(btn.dataset.price) });
      const sum = cart.reduce((a, item) => a + item.price, 0);
      if (note) note.textContent = `${cart.length} item${cart.length > 1 ? 's' : ''} in your bag · $${formatNumber(sum)}`;
      showToast(`${btn.dataset.name} added to your bag.`);
    });
  });
}

/* ---------- 25. GALLERY LIGHTBOX ---------- */

function initGallery() {
  const items = $$('.g-item');
  const lightbox = $('#lightbox');
  const img = $('#lbImg');
  const caption = $('#lbCaption');
  if (!items.length || !lightbox || !img) return;
  let index = 0;

  const open = (i) => {
    index = (i + items.length) % items.length;
    const item = items[index];
    img.src = item.dataset.full;
    img.alt = item.querySelector('img')?.alt || '';
    if (caption) caption.textContent = item.dataset.caption || img.alt;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    const figure = lightbox.querySelector('figure');
    if (figure) {
      figure.classList.remove('is-in');
      requestAnimationFrame(() => figure.classList.add('is-in'));
    }
  };
  const close = () => {
    lightbox.querySelector('figure')?.classList.remove('is-in');
    lightbox.hidden = true;
    document.body.style.overflow = '';
  };

  items.forEach((item, i) => item.addEventListener('click', () => open(i)));
  $('#lbClose')?.addEventListener('click', close);
  $('#lbPrev')?.addEventListener('click', () => open(index - 1));
  $('#lbNext')?.addEventListener('click', () => open(index + 1));
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) close();
  });
  window.addEventListener('keydown', (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') open(index - 1);
    if (event.key === 'ArrowRight') open(index + 1);
  });
}

/* ---------- 26. REVIEWS SLIDER ---------- */

function initReviews() {
  const track = $('#reviewTrack');
  const viewport = $('#reviewViewport');
  const dotsWrap = $('#reviewDots');
  const reviews = $$('.review', track);
  if (!track || !viewport || !reviews.length) return;
  let index = 0;

  reviews.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show review ${i + 1}`);
    dot.addEventListener('click', () => go(i));
    dotsWrap?.appendChild(dot);
  });

  const go = (i) => {
    index = (i + reviews.length) % reviews.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    $$('button', dotsWrap).forEach((dot, d) => dot.classList.toggle('is-active', d === index));
  };

  $('#reviewPrev')?.addEventListener('click', () => go(index - 1));
  $('#reviewNext')?.addEventListener('click', () => go(index + 1));
  go(0);
}

/* ---------- 27. CONTACT FORM ---------- */

function initContact() {
  const form = $('#contactForm');
  const error = $('#contactError');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('#cName')?.value.trim();
    const email = $('#cEmail')?.value.trim();
    const message = $('#cMessage')?.value.trim();
    const valid = name && message && EMAIL_RE.test(email || '');
    if (error) error.hidden = Boolean(valid);
    if (!valid) {
      showToast('Please check the form and try again.');
      return;
    }
    form.reset();
    showToast('Thank you. The concierge will write back shortly.');
  });
}

/* ---------- 28. BACK TO TOP WITH RING ---------- */

function initBackToTop() {
  const button = $('#backToTop');
  const ring = $('#ringFill');
  if (!button) return;
  const length = 2 * Math.PI * 22;
  if (ring) {
    ring.style.strokeDasharray = String(length);
    ring.style.strokeDashoffset = String(length);
  }
  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    button.classList.toggle('is-show', window.scrollY > 400);
    if (ring) ring.style.strokeDashoffset = String(length * (1 - p));
  };
  window.addEventListener('scroll', update, { passive: true });
  button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' }));
  update();
}


/* ---------- 29. HERO VIDEO, LUXURY MOTION, LOUNGE EXTRAS ---------- */

function initHeroVideo() {
  const video = $('#heroVideo') || $('.hero__video');
  if (!video) return;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  if (prefersReduced) {
    video.pause();
    video.removeAttribute('autoplay');
    return;
  }
  const tryPlay = () => {
    const play = video.play();
    if (play && typeof play.then === 'function') {
      play.then(() => video.classList.add('is-playing')).catch(() => {});
    } else {
      video.classList.add('is-playing');
    }
  };
  tryPlay();
  video.addEventListener('canplay', tryPlay);
  video.addEventListener('playing', () => video.classList.add('is-playing'));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tryPlay();
  });
  const unlock = () => {
    tryPlay();
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
  window.addEventListener('pointerdown', unlock, { once: true });
}

function initBlurUp() {
  $$('img.img-lux').forEach((img) => {
    const done = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
}

function initCtaSparks() {
  if (prefersReduced || window.innerWidth < 768) return;
  $$('.cta-sparkle').forEach((section) => {
    for (let i = 0; i < 6; i += 1) {
      const spark = document.createElement('span');
      spark.className = 'spark';
      spark.style.setProperty('--x', `${8 + Math.random() * 84}%`);
      spark.style.setProperty('--y', `${10 + Math.random() * 80}%`);
      spark.style.setProperty('--dur', `${6 + Math.random() * 7}s`);
      spark.style.setProperty('--delay', `${Math.random() * 4}s`);
      section.appendChild(spark);
    }
  });
}

function initCursorTrail() {
  const wrap = $('#cursorTrail');
  if (!wrap || !fineDesktop() || prefersReduced) return;
  const dots = Array.from({ length: 8 }, () => {
    const el = document.createElement('i');
    wrap.appendChild(el);
    return { el, x: 0, y: 0 };
  });
  let x = 0;
  let y = 0;
  let running = true;
  window.addEventListener('mousemove', (event) => {
    x = event.clientX;
    y = event.clientY;
  }, { passive: true });
  const tick = () => {
    if (!running) return;
    if (!fineDesktop()) {
      running = false;
      dots.forEach((dot) => { dot.el.style.opacity = '0'; });
      return;
    }
    let px = x;
    let py = y;
    dots.forEach((dot, i) => {
      dot.x += (px - dot.x) * (0.28 - i * 0.02);
      dot.y += (py - dot.y) * (0.28 - i * 0.02);
      dot.el.style.transform = `translate(${dot.x}px, ${dot.y}px)`;
      dot.el.style.opacity = String(0.45 - i * 0.05);
      px = dot.x;
      py = dot.y;
    });
    requestAnimationFrame(tick);
  };
  tick();
}

function initSectionDots() {
  const nav = $('#sectionDots');
  if (!nav) return;
  const sections = $$('main section[id]');
  if (!sections.length) return;
  sections.forEach((section) => {
    const a = document.createElement('a');
    a.href = `#${section.id}`;
    a.setAttribute('aria-label', section.id.replace(/-/g, ' '));
    nav.appendChild(a);
  });
  const links = $$('a', nav);
  const update = () => {
    const y = window.scrollY + window.innerHeight * 0.4;
    let current = 0;
    sections.forEach((section, i) => {
      if (section.offsetTop <= y) current = i;
    });
    links.forEach((link, i) => link.classList.toggle('is-active', i === current));
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initCardSpotlight() {
  if (!fineDesktop() || prefersReduced) return;
  const items = $$('.tier, .product, .exp-card, .event, .conditions, .lounge-copy, .hole-panel, .booking__form, .booking__summary, .gauge-box, .hcp-form, .contact-form, .review').map((card) => {
    const strong = /tier|product|exp-card/.test(card.className);
    const state = { card, strong, tx: 0, ty: 0, tz: 0, cx: 0, cy: 0, cz: 0 };
    return state;
  });
  if (!items.length) return;

  let running = false;
  const tick = () => {
    if (!fineDesktop()) {
      running = false;
      items.forEach((s) => {
        s.card.style.transform = '';
        s.card.classList.remove('is-tilting');
      });
      return;
    }
    let busy = false;
    items.forEach((s) => {
      s.cx += (s.tx - s.cx) * 0.16;
      s.cy += (s.ty - s.cy) * 0.16;
      s.cz += (s.tz - s.cz) * 0.16;
      const live = Math.abs(s.cx) + Math.abs(s.cy) + Math.abs(s.cz) > 0.04;
      if (live) {
        busy = true;
        s.card.classList.add('is-tilting');
        s.card.style.transform = `rotateX(${s.cx.toFixed(3)}deg) rotateY(${s.cy.toFixed(3)}deg) translateZ(${s.cz.toFixed(2)}px)`;
      } else if (s.card.style.transform) {
        s.card.style.transform = '';
        s.card.classList.remove('is-tilting');
      }
    });
    if (busy) requestAnimationFrame(tick);
    else running = false;
  };
  const kick = () => {
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  };

  items.forEach((state) => {
    const max = state.strong ? 9 : 6;
    state.card.addEventListener('mousemove', (event) => {
      const rect = state.card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      state.tx = (py - 0.5) * -max;
      state.ty = (px - 0.5) * max;
      state.tz = 16;
      state.card.style.setProperty('--spot-x', `${px * 100}%`);
      state.card.style.setProperty('--spot-y', `${py * 100}%`);
      kick();
    });
    state.card.addEventListener('mouseleave', () => {
      state.tx = 0;
      state.ty = 0;
      state.tz = 0;
      kick();
    });
  });
}

function initParallax() {
  const layers = $$('[data-parallax]');
  if (!layers.length || prefersReduced) return;
  let current = window.scrollY;
  let running = false;
  const tick = () => {
    if (window.innerWidth < 768) {
      running = false;
      layers.forEach((el) => { el.style.transform = ''; });
      return;
    }
    running = true;
    current += (window.scrollY - current) * 0.12;   // smoothed inertia for effects
    layers.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const amount = Number(el.dataset.parallax) || 8;
      const offset = (rect.top - window.innerHeight / 2) * (amount / 120);
      const mid = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      const tilt = mid * -5 * (amount / 8);
      el.style.transform = `translate3d(0, ${offset}px, 0) rotateX(${tilt}deg)`;
    });
    requestAnimationFrame(tick);
  };
  const ensure = () => {
    if (window.innerWidth >= 768 && !running) tick();
  };
  window.addEventListener('resize', ensure, { passive: true });
  ensure();
}


function makeDimpledBall(THREE, radius, wSeg, hSeg, dimpleCount) {
  const geo = new THREE.SphereGeometry(radius, wSeg, hSeg);
  const pos = geo.attributes.position;
  const dimples = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < dimpleCount; i += 1) {
    const y = 1 - (i / Math.max(dimpleCount - 1, 1)) * 2;
    const radiusAt = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    dimples.push(new THREE.Vector3(Math.cos(theta) * radiusAt, y, Math.sin(theta) * radiusAt).multiplyScalar(radius));
  }
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const depth = radius * 0.048;
  const width = radius * 0.13;
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    for (let d = 0; d < dimples.length; d += 1) {
      const dist = v.distanceTo(dimples[d]);
      if (dist < width) {
        const t = 1 - dist / width;
        n.copy(v).normalize();
        v.addScaledVector(n, -depth * t * t);
      }
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function buildHeroBall(host, THREE) {
  const size = () => ({ w: Math.max(1, host.clientWidth), h: Math.max(1, host.clientHeight) });
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  const first = size();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(first.w, first.h);
  renderer.setClearColor(0x000000, 0);
  if ('outputEncoding' in renderer && THREE.sRGBEncoding !== undefined) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  host.appendChild(renderer.domElement);
  host.classList.add('is-3d');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, first.w / first.h, 0.1, 20);
  camera.position.set(0, 0.12, 4.15);

  const ball = new THREE.Mesh(
    makeDimpledBall(THREE, 1, 80, 64, 140),
    new THREE.MeshPhysicalMaterial({
      color: 0xf4f1ea,
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.55,
      clearcoatRoughness: 0.28,
    })
  );
  scene.add(ball);
  scene.add(new THREE.HemisphereLight(0xffe7c2, 0x163528, 0.95));
  const key = new THREE.DirectionalLight(0xfff3d6, 1.25);
  key.position.set(3.2, 2.4, 2.8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd4af37, 0.35);
  rim.position.set(-3, 1.2, -1.4);
  scene.add(rim);
  const fill = new THREE.PointLight(0xf5e1a4, 0.4, 8);
  fill.position.set(-1.4, -0.4, 3);
  scene.add(fill);

  let mx = 0;
  let my = 0;
  if (fineDesktop()) {
    window.addEventListener('mousemove', (event) => {
      const r = host.getBoundingClientRect();
      mx = ((event.clientX - (r.left + r.width / 2)) / Math.max(r.width, 1)) * 0.35;
      my = ((event.clientY - (r.top + r.height / 2)) / Math.max(r.height, 1)) * 0.2;
    }, { passive: true });
  }

  const resize = () => {
    const { w, h } = size();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', resize, { passive: true });

  let running = false;
  let visible = true;
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) ensure();
  }, { threshold: 0.05 });
  io.observe(host.closest('.hero') || host);

  let t = 0;
  let last = performance.now();
  let frames = 0;
  const tick = (now) => {
    if (!running) return;
    if (document.hidden || !visible) {
      running = false;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    ball.rotation.y = t * 0.35;
    ball.rotation.x = Math.sin(t * 0.7) * 0.12 + my * 0.5;
    ball.rotation.z = mx * 0.4;
    ball.position.y = Math.sin(t * 0.9) * 0.08;
    renderer.render(scene, camera);
    frames += 1;
    // Touch / narrow views: draw a short spin, then hold a still frame.
    if (!fineDesktop() && frames > 36) {
      running = false;
      return;
    }
    requestAnimationFrame(tick);
  };
  const ensure = () => {
    if (running || document.hidden || !visible) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ensure();
  });
  renderer.render(scene, camera);
  ensure();
}

function initHeroBall3d() {
  const host = $('#heroBall') || $('.hero__ball');
  if (!host || prefersReduced) return;
  const canvasProbe = document.createElement('canvas');
  if (!canvasProbe.getContext || !canvasProbe.getContext('webgl')) return;

  const start = () => {
    if (!window.THREE) return;
    try {
      buildHeroBall(host, window.THREE);
    } catch (err) {
      host.classList.remove('is-3d');
    }
  };

  if (window.THREE) {
    start();
    return;
  }
  const script = document.createElement('script');
  script.src = 'vendor/three.min.js';
  script.async = true;
  script.onload = start;
  script.onerror = () => {};
  document.head.appendChild(script);
}

/* ---------- START ---------- */

function init() {
  initTheme();
  runPreloader();
  initNavbar();
  initCursor();
  initScrollProgress();
  initRipple();
  initMagnetic();
  initReveals();
  initCounters();
  initParticles();
  initYear();
  initBallVisit();
  initHorizontal();
  initCourse();
  initBooking();
  initHandicap();
  initMembership();
  initShop();
  initGallery();
  initReviews();
  initContact();
  initBackToTop();
  initHeroVideo();
  initHeroBall3d();
  initBlurUp();
  initCtaSparks();
  initCursorTrail();
  initSectionDots();
  initCardSpotlight();
  initParallax();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
