/* Jakub Gančar — obrazy ze tmy
   Bez knihoven: nativní scroll, IntersectionObserver, žádné trvalé rAF smyčky. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── rozdělení nadpisu na slova ── */
  let wi = 0;
  $$('[data-split] .l').forEach(line => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const s = document.createElement('span');
            s.className = 'w'; s.style.setProperty('--i', wi++); s.textContent = part;
            frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(line);
  });
  // citace: slova se rozsvítí postupně (nezlomitelné mezery drží slova pohromadě)
  $$('[data-split-words]').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\n\r]+)/).forEach(part => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.append(' '); return; }
            const s = document.createElement('span');
            s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = part;
            frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  });

  /* ── hero: světlo do tmy ── */
  const hero = $('#hero');
  if (hero) {
    const lit = $('.hero__lit', hero);
    const start = () => requestAnimationFrame(() => hero.classList.add('is-lit'));
    lit.complete ? start() : lit.addEventListener('load', start, { once: true });
    if (fine && !reduce) {
      let raf = 0, x = 0, y = 0;
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        x = e.clientX - r.left; y = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(() => {
          hero.style.setProperty('--mx', x + 'px');
          hero.style.setProperty('--my', y + 'px');
          raf = 0;
        });
      }, { passive: true });
    }
  }

  // mimo obrazovku se putující světlo (dotyková zařízení) zastaví
  if (hero) new IntersectionObserver(([en]) => hero.classList.toggle('is-off', !en.isIntersecting)).observe(hero);

  /* ── nav: stav při scrollu + světlé sekce ── */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) nav.classList.toggle('is-light', en.target.dataset.nav === 'light');
    });
  }, { rootMargin: '-30px 0px -95% 0px' });
  $$('[data-nav]').forEach(s => navIO.observe(s));

  /* ── mobilní menu ── */
  const burger = $('.nav__burger'), menu = $('#menu');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
    menu.hidden = !open; menu.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    nav.classList.toggle('is-menu', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ── reveal ── */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  $$('.rv, .clip, [data-split-words]').forEach((el, i) => {
    // jemné zpoždění pro sousední prvky
    const sib = el.parentElement ? [...el.parentElement.children].filter(c => c.classList.contains('rv')) : [];
    const k = sib.indexOf(el);
    if (k > 0) el.style.setProperty('--d', Math.min(k, 5) * 0.08 + 's');
    io.observe(el);
  });

  /* ── čísla ── */
  const cio = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, to = +el.dataset.count, t0 = performance.now(), dur = 1400;
      cio.unobserve(el);
      if (reduce) return;
      const tick = t => {
        const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(to * e);
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0'; requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ── postup: sticky obrázek se mění podle kroku ── */
  const frames = $$('.process__frame img'), cap = $('[data-cap]');
  const steps = $$('.step');
  const sio = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const n = en.target.dataset.step;
      steps.forEach(s => s.classList.toggle('is-on', s === en.target));
      frames.forEach(f => f.classList.toggle('is-on', f.dataset.step === n));
      if (cap) cap.textContent = `0${n} / 04`;
    });
  }, { rootMargin: '-38% 0px -52% 0px' });
  steps.forEach(s => sio.observe(s));
  if (steps[0]) steps[0].classList.add('is-on');

  /* ── magnetická tlačítka ── */
  if (fine && !reduce) {
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ── pásy (detaily, další plátna): tažení myší ── */
  if (fine) $$('.details__rail').forEach(rail => {
    let down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', e => { down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
    addEventListener('pointerup', () => { if (down) { down = false; rail.classList.remove('is-drag'); } });
    rail.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; rail.classList.add('is-drag'); }
      rail.scrollLeft = sl - dx;
    });
    rail.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  });

  /* ── lightbox ── */
  const works = [
    {"src": "assets/img/d/exodus-2.webp", "t": "Exodus z ticha 2.0", "m": "Exodus from Silence 2.0 · cyklus Exodus z ticha · technika, rozměr a rok doplníme"},
    {"src": "assets/img/exodus-z-ticha.webp", "t": "Exodus z ticha", "m": "první obraz cyklu · foto: Deník / Zuzana Vykoukalová (náhled)"},
    {"src": "assets/img/d/hledani-svetla.webp", "t": "Hledání světla", "m": "Finding Light · akryl na plátně · 2025 · rozměr a dostupnost doplníme"},
    {"src": "assets/img/d/prvni-krok-do-neznama.webp", "t": "První krok do neznáma", "m": "The First Step into the Unknown · akryl na plátně · rok, rozměr a dostupnost doplníme"},
    {"src": "assets/img/d/hlas-uvnitr-temnoty.webp", "t": "Hlas uvnitř temnoty", "m": "A Voice Within the Darkness · technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/broken-silence.webp", "t": "Broken Silence", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/guardian-of-shadows.webp", "t": "Guardian of Shadows", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/escape-from-the-void.webp", "t": "Escape from the Void", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/crossing-of-shadows.webp", "t": "Crossing of Shadows", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/deep-subconscious.webp", "t": "Deep Subconscious", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/pieta-in-blood.webp", "t": "Pieta in Blood", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/enclosed-in-crimson.webp", "t": "Enclosed in Crimson", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/procession-of-the-damned.webp", "t": "Procession of the Damned", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/rise-and-fall.webp", "t": "Rise and Fall", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/crucifixion-of-a-thought.webp", "t": "Crucifixion of a Thought", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/anatomy-of-chaos.webp", "t": "Anatomy of Chaos", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/the-endless-line.webp", "t": "The Endless Line", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/the-screamed-canvas.webp", "t": "The Screamed Canvas", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/light-from-above.webp", "t": "Light from Above", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/the-last-embrace.webp", "t": "The Last Embrace", "m": "technika, rozměr, rok a dostupnost doplníme"},
    {"src": "assets/img/d/atelier-0153.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
    {"src": "assets/img/d/atelier-0155.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
    {"src": "assets/img/d/atelier-0156.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
    {"src": "assets/img/d/atelier-0158.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
    {"src": "assets/img/d/atelier-0159.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
    {"src": "assets/img/d/atelier-0161.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
    {"src": "assets/img/d/atelier-0162.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
    {"src": "assets/img/d/atelier-0163.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
    {"src": "assets/img/d/atelier-0165.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
    {"src": "assets/img/d/atelier-0167.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
    {"src": "assets/img/d/atelier-0169.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
    {"src": "assets/img/d/atelier-0181.webp", "t": "Bez názvu", "m": "fotografie z ateliéru, 6. 9. 2026 · název a rozměr doplníme"},
  ];
  const lb = $('#lb'), lbImg = $('.lb__img', lb);
  let cur = 0;
  const show = i => {
    cur = (i + works.length) % works.length;
    const w = works[cur];
    lbImg.classList.add('is-loading');
    const pre = new Image();
    pre.onload = () => { lbImg.src = w.src; lbImg.alt = w.t; lbImg.classList.remove('is-loading'); };
    pre.src = w.src;
    $('.lb__n', lb).textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(works.length).padStart(2, '0');
    $('.lb__t', lb).textContent = w.t;
    $('.lb__m', lb).textContent = w.m;
  };
  $$('[data-lb]').forEach(b => b.addEventListener('click', () => {
    show(+b.dataset.lb);
    lb.showModal(); document.body.style.overflow = 'hidden';
  }));
  const close = () => { lb.close(); };
  lb.addEventListener('close', () => { document.body.style.overflow = ''; });
  $('.lb__close', lb).addEventListener('click', close);
  $('.lb__prev', lb).addEventListener('click', () => show(cur - 1));
  $('.lb__next', lb).addEventListener('click', () => show(cur + 1));
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') show(cur + 1);
    if (e.key === 'ArrowLeft') show(cur - 1);
  });
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb__fig')) close(); });
  let tx = null;
  lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    tx = null;
  });
  $('.lb__ask', lb).addEventListener('click', () => {
    close();
    const r = $('input[name="topic"][value="Zájem o obraz"]'); if (r) r.checked = true;
    const msg = $('textarea[name="msg"]');
    if (msg && !msg.value) msg.value = `Dobrý den, zaujal mě obraz č. ${String(cur + 1).padStart(2, '0')} (${works[cur].t}). `;
  });

  /* ── poptávka z malířství předvybere téma ── */
  $$('[data-topic]').forEach(a => a.addEventListener('click', () => {
    const r = $(`input[name="topic"][value="${a.dataset.topic}"]`); if (r) r.checked = true;
  }));

  /* ── formulář → e-mail ── */
  const form = $('#form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(form);
    const body = `${d.get('msg') || ''}\n\n${d.get('name') || ''}\n${d.get('contact') || ''}`;
    location.href = `mailto:gancarism@gmail.com?subject=${encodeURIComponent(d.get('topic') + ' — z webu')}&body=${encodeURIComponent(body)}`;
  });
})();
