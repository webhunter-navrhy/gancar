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

  /* ── detaily: tažení myší ── */
  const rail = $('.details__rail');
  if (rail && fine) {
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
  }

  /* ── lightbox ── */
  const works = [
    { src: 'assets/img/exodus-z-ticha.webp', t: 'Exodus z ticha', m: 'První obraz z nového cyklu · technika a rozměr doplníme' },
    { src: 'assets/img/obraz-dvojice.webp', t: 'Bez názvu', m: 'název a rozměr doplníme s autorem' },
    { src: 'assets/img/obraz-vzhuru.webp', t: 'Bez názvu', m: 'název a rozměr doplníme s autorem' },
    { src: 'assets/img/obraz-ruce.webp', t: 'Bez názvu', m: 'název a rozměr doplníme s autorem' },
    { src: 'assets/img/obraz-bila.webp', t: 'Bez názvu', m: 'název a rozměr doplníme s autorem' },
    { src: 'assets/img/obraz-jeskyne.webp', t: 'Bez názvu', m: '„V něčem to připomíná jeskynní malby…“' },
    { src: 'assets/img/obraz-zluta.webp', t: 'Bez názvu', m: 'název a rozměr doplníme s autorem' },
    { src: 'assets/img/obraz-okr.webp', t: 'Bez názvu', m: 'název a rozměr doplníme s autorem' },
    { src: 'assets/img/obraz-cervena.webp', t: 'Bez názvu', m: 'název a rozměr doplníme s autorem' },
    { src: 'assets/img/obraz-okna.webp', t: 'Bez názvu', m: 'název a rozměr doplníme s autorem' },
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
    location.href = `mailto:malirstvi.gancar@email.cz?subject=${encodeURIComponent(d.get('topic') + ' — z webu')}&body=${encodeURIComponent(body)}`;
  });
})();
