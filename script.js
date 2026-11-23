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

const formatNumber = (n, decimals = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Animates a number inside an element from its last value (stored in data-value)
 * to a new target. Respects reduced motion.
 */
function animateNumber(el, to, { duration = 1500, decimals = 0, prefix = '' } = {}) {
  const from = parseFloat(el.dataset.value) || 0;
  if (prefersReduced) {
    el.dataset.value = to;
    el.textContent = prefix + formatNumber(to, decimals);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);            // ease-out cubic
    const value = from + (to - from) * eased;
    el.textContent = prefix + formatNumber(value, decimals);
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      el.dataset.value = to;
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
  if (!dot || !ring || !canHover) return;
  document.body.classList.add('has-cursor');

  let x = 0, y = 0, rx = 0, ry = 0;
  window.addEventListener('mousemove', (event) => {
    x = event.clientX;
    y = event.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
  }, { passive: true });

  const follow = () => {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(follow);
  };
  follow();

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
      const inner = document.createElement('span');
      inner.style.setProperty('--i', i);
      inner.textContent = word;
      wrap.appendChild(inner);
      title.appendChild(wrap);
    });
  });

  const show = (el) => el.classList.add('is-in');
  if (prefersReduced) {
    items.forEach(show);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        show(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  items.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) show(el);
    else io.observe(el);
    // Failsafe so nothing stays invisible if it was already on screen
    setTimeout(() => {
      if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < window.innerHeight) {
        show(el);
      }
    }, 1800);
  });
}

function initCounters() {
  const stats = $$('[data-count]');
  if (!stats.length) return;
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      animateNumber(el, Number(el.dataset.count), { duration: 1600, decimals: 0 });
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  stats.forEach((el) => io.observe(el));
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
      image.src = hole.img;
      image.alt = `${hole.name}, hole ${index + 1}`;
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
  const apply = (annual) => {
    toggle.setAttribute('aria-checked', annual ? 'true' : 'false');
    $$('.tier__price span[data-price-month]').forEach((el) => {
      el.textContent = annual ? el.dataset.priceYear : el.dataset.priceMonth;
    });
    $$('.tier__price small').forEach((el) => {
      el.textContent = annual ? ' / yr' : ' / mo';
    });
  };
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
  };
  const close = () => {
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
