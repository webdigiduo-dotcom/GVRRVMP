/* =========================================================
   Green Velvet Resort, Pawna — interactions
   No dependencies. Loaded with `defer` at the end of each page.
   ========================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  root.classList.add('js');

  /* ---------- Split headings into words ---------- */
  $$('[data-split]').forEach((el) => {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.textContent = '';
    text.split(' ').forEach((word, i) => {
      const outer = document.createElement('span');
      const inner = document.createElement('span');
      outer.className = 'w';
      outer.setAttribute('aria-hidden', 'true');
      inner.style.setProperty('--i', i);
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      el.appendChild(document.createTextNode(' '));
    });
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    el.appendChild(sr);
  });

  /* ---------- Stagger children ---------- */
  $$('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      child.style.setProperty('--d', `${(i * 0.1).toFixed(2)}s`);
    });
  });

  /* ---------- Reveal on scroll ---------- */
  const pendingReveals = new Set();
  let revealIO = null;

  const reveal = (el) => {
    if (!pendingReveals.delete(el)) return;
    el.classList.add('is-visible');
    if (revealIO) revealIO.unobserve(el);
    // Once revealed, drop the reveal hooks so the element's own hover transitions take over
    if (el.hasAttribute('data-reveal')) {
      const delay = parseFloat(getComputedStyle(el).transitionDelay) || 0;
      setTimeout(() => {
        el.removeAttribute('data-reveal');
        el.classList.remove('is-visible');
      }, 1400 + delay * 1000);
    }
  };

  // Safety net: anything that has scrolled into (or past) the viewport gets revealed even if
  // the observer missed it, so content can never stay hidden.
  const revealScrolledPast = () => {
    pendingReveals.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.96) reveal(el);
    });
  };

  const startReveals = () => {
    const targets = $$('[data-reveal], [data-split]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    targets.forEach((el) => pendingReveals.add(el));
    revealIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) reveal(entry.target); });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    targets.forEach((el) => revealIO.observe(el));
    revealScrolledPast();
  };

  /* ---------- Preloader ---------- */
  let loaded = false;
  const finishLoading = () => {
    if (loaded) return;
    loaded = true;
    body.classList.add('is-loaded');
    startReveals();
  };
  window.addEventListener('load', finishLoading);
  setTimeout(finishLoading, 1800);

  /* ---------- Header, progress, back-to-top, parallax ---------- */
  const header = $('[data-header]');
  const progressBar = $('.scroll-progress');
  const toTop = $('.to-top');
  const parallaxEls = reduceMotion ? [] : $$('[data-parallax]');
  const scrollHooks = []; // per-frame scroll effects, registered further down
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const max = root.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(y / max, 1) : 0;

    // The header stays fixed at the top; past the hero it switches to the compact glass style
    if (header) header.classList.toggle('is-scrolled', y > 40);
    if (progressBar) progressBar.style.transform = `scaleX(${ratio})`;
    if (toTop) {
      toTop.classList.toggle('is-visible', y > 600);
      toTop.style.setProperty('--progress', ratio.toFixed(4));
    }

    parallaxEls.forEach((el) => {
      const min = parseInt(el.dataset.parallaxMin, 10) || 0;
      if (window.innerWidth < min) {
        el.style.transform = '';
        return;
      }
      const box = el.parentElement.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      const speed = parseFloat(el.dataset.parallax) || 0.25;
      el.style.transform = `translate3d(0, ${(-box.top * speed).toFixed(1)}px, 0)`;
    });

    scrollHooks.forEach((hook) => hook());
    if (pendingReveals.size) revealScrolledPast();
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  window.addEventListener('resize', onScroll);

  if (toTop) {
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  }

  /* ---------- Mobile navigation ---------- */
  const burger = $('.burger');
  const nav = $('#site-nav');
  const setNav = (open) => {
    body.classList.toggle('nav-open', open);
    if (!burger) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  if (burger && nav) {
    burger.addEventListener('click', () => setNav(!body.classList.contains('nav-open')));
    $$('a', nav).forEach((link) => link.addEventListener('click', () => setNav(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && body.classList.contains('nav-open')) {
        setNav(false);
        burger.focus();
      }
    });
    window.matchMedia('(min-width: 1281px)').addEventListener('change', (e) => {
      if (e.matches) setNav(false);
    });
  }

  /* ---------- Hero video + sound toggle ---------- */
  const video = $('#vid');
  const soundBtn = $('#audio-btn');
  if (video) {
    video.muted = true;
    const attempt = video.play();
    if (attempt && attempt.catch) attempt.catch(() => {});
  }
  if (video && soundBtn) {
    const label = $('.sound-toggle__label', soundBtn);
    soundBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      if (!video.muted) {
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      }
      soundBtn.classList.toggle('is-on', !video.muted);
      soundBtn.setAttribute('aria-pressed', String(!video.muted));
      if (label) label.textContent = video.muted ? 'Sound off' : 'Sound on';
    });
  }
  // Pause the hero film while it's scrolled out of view (saves battery, and the reels below use the same file)
  if (video && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        video.pause();
      }
    }, { threshold: 0.15 }).observe(video);
  }

  /* ---------- Sliders ---------- */
  class Slider {
    constructor(el) {
      this.el = el;
      this.slides = $$('.slider__slide', el);
      this.count = this.slides.length;
      this.index = Math.max(0, this.slides.findIndex((s) => s.classList.contains('is-active')));
      this.interval = parseInt(el.dataset.interval, 10) || 4500;
      this.timer = null;
      this.hovered = false;
      this.inView = true;
      this.bar = $('.slider__progress span', el);

      el.style.setProperty('--interval', `${this.interval}ms`);

      if (this.count < 2) {
        el.classList.add('is-single');
        this.show(0);
        return;
      }

      this.buildDots();
      const prev = $('[data-prev]', el);
      const next = $('[data-next]', el);
      if (prev) prev.addEventListener('click', () => this.go(this.index - 1));
      if (next) next.addEventListener('click', () => this.go(this.index + 1));

      el.addEventListener('mouseenter', () => { this.hovered = true; this.stop(); });
      el.addEventListener('mouseleave', () => { this.hovered = false; this.play(); });
      el.addEventListener('focusin', () => { this.hovered = true; this.stop(); });
      el.addEventListener('focusout', () => { this.hovered = false; this.play(); });

      this.bindSwipe();

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
          this.inView = entry.isIntersecting;
          if (this.inView) this.play(); else this.stop();
        }, { threshold: 0.2 }).observe(el);
      }
      document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.play()));

      this.show(this.index);
      this.play();
    }

    // Dots by default; with data-thumbs, a strip of photo thumbnails under the slider instead
    buildDots() {
      const useThumbs = this.el.hasAttribute('data-thumbs');
      let wrap = $('.slider__dots', this.el);
      if (useThumbs) {
        const viewport = $('.slider__viewport', this.el);
        [$('.slider__ui', this.el), $('.slider__progress', this.el)].forEach((part) => {
          if (part) viewport.appendChild(part);
        });
        wrap = document.createElement('div');
        wrap.className = 'slider__thumbs';
        this.el.appendChild(wrap);
        this.thumbStrip = wrap;
      }
      if (!wrap) return;
      this.dots = this.slides.map((slide, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = useThumbs ? 'slider__thumb' : 'slider__dot';
        dot.setAttribute('aria-label', `Show slide ${i + 1} of ${this.count}`);
        if (useThumbs) {
          const thumb = document.createElement('img');
          thumb.src = $('img', slide).getAttribute('src');
          thumb.alt = '';
          thumb.loading = 'lazy';
          dot.appendChild(thumb);
        }
        dot.addEventListener('click', () => this.go(i));
        wrap.appendChild(dot);
        return dot;
      });
    }

    bindSwipe() {
      const viewport = $('.slider__viewport', this.el);
      if (!viewport) return;
      let startX = null;
      viewport.addEventListener('pointerdown', (e) => { startX = e.clientX; });
      viewport.addEventListener('pointerup', (e) => {
        if (startX === null) return;
        const dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 40) this.go(this.index + (dx < 0 ? 1 : -1));
      });
      viewport.addEventListener('pointercancel', () => { startX = null; });
    }

    show(i) {
      this.index = (i + this.count) % this.count;
      this.slides.forEach((slide, k) => {
        const active = k === this.index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      if (this.dots) {
        this.dots.forEach((dot, k) => dot.setAttribute('aria-current', String(k === this.index)));
      }
      if (this.thumbStrip && this.dots) {
        const dot = this.dots[this.index];
        this.thumbStrip.scrollTo({ left: dot.offsetLeft - this.thumbStrip.clientWidth / 2 + dot.offsetWidth / 2, behavior: 'smooth' });
      }
    }

    go(i) {
      this.show(i);
      this.play();
    }

    restartBar() {
      if (!this.bar) return;
      this.el.classList.remove('is-playing');
      void this.bar.offsetWidth;
      this.el.classList.add('is-playing');
    }

    play() {
      this.stop();
      if (reduceMotion || this.hovered || !this.inView || document.hidden || this.count < 2) return;
      this.restartBar();
      this.timer = setTimeout(() => {
        this.show(this.index + 1);
        this.play();
      }, this.interval);
    }

    stop() {
      clearTimeout(this.timer);
      this.el.classList.remove('is-playing');
    }
  }
  $$('[data-slider]').forEach((el) => new Slider(el));

  /* ---------- Category filter (gallery, nearby attractions) ---------- */
  const filterGrid = $('.filterable');
  if (filterGrid) {
    const items = Array.from(filterGrid.children).filter((el) => el.dataset.cat);
    const filters = $$('[data-filter]');
    let active = 'all';
    const matches = (item, filter) => filter === 'all' || item.dataset.cat === filter;

    filters.forEach((btn) => {
      const count = $('.filter__count', btn);
      if (count) count.textContent = items.filter((it) => matches(it, btn.dataset.filter)).length;
    });

    const applyFilter = (filter) => {
      active = filter;
      items.forEach((it) => { if (!matches(it, filter)) it.classList.add('is-hiding'); });
      setTimeout(() => {
        items.forEach((it) => {
          if (matches(it, filter)) {
            it.classList.remove('is-hidden');
            it.classList.add('is-hiding');
          } else {
            it.classList.add('is-hidden');
          }
        });
        void filterGrid.offsetWidth;
        let k = 0;
        items.forEach((it) => {
          if (!matches(it, filter)) return;
          it.style.setProperty('--d', `${Math.min(k++, 12) * 0.04}s`);
          it.classList.remove('is-hiding');
        });
      }, reduceMotion ? 0 : 320);
    };

    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.filter === active) return;
        filters.forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        applyFilter(btn.dataset.filter);
      });
    });
  }

  /* ---------- Gallery lightbox ---------- */
  const grid = $('[data-gallery]');
  if (grid) {
    const items = $$('.gallery-item', grid);

    // Lightbox
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = `
      <button class="lightbox__btn lightbox__close" type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <button class="lightbox__btn lightbox__prev" type="button" aria-label="Previous image"><i class="fa-solid fa-arrow-left"></i></button>
      <figure class="lightbox__figure"><img class="lightbox__img" alt=""></figure>
      <button class="lightbox__btn lightbox__next" type="button" aria-label="Next image"><i class="fa-solid fa-arrow-right"></i></button>
      <div class="lightbox__meta"><span class="lightbox__cat"></span><span class="lightbox__count"></span></div>`;
    body.appendChild(lb);

    const img = $('.lightbox__img', lb);
    const cat = $('.lightbox__cat', lb);
    const counter = $('.lightbox__count', lb);
    let list = [];
    let pos = 0;
    let opener = null;

    const render = () => {
      const item = list[pos];
      img.classList.add('is-loading');
      const src = item.getAttribute('href');
      const pre = new Image();
      pre.onload = pre.onerror = () => {
        img.src = src;
        img.alt = $('img', item).alt;
        img.classList.remove('is-loading');
      };
      pre.src = src;
      cat.textContent = item.dataset.label || '';
      counter.textContent = `${pos + 1} / ${list.length}`;
      [list[pos + 1], list[pos - 1]].forEach((n) => { if (n) new Image().src = n.getAttribute('href'); });
    };

    const open = (item) => {
      list = items.filter((it) => !it.classList.contains('is-hidden'));
      pos = Math.max(0, list.indexOf(item));
      opener = item;
      render();
      lb.classList.add('is-open');
      body.classList.add('lightbox-open');
      $('.lightbox__close', lb).focus();
    };
    const close = () => {
      lb.classList.remove('is-open');
      body.classList.remove('lightbox-open');
      if (opener) opener.focus();
    };
    const step = (dir) => {
      pos = (pos + dir + list.length) % list.length;
      render();
    };

    items.forEach((item) => item.addEventListener('click', (e) => {
      e.preventDefault();
      open(item);
    }));
    $('.lightbox__close', lb).addEventListener('click', close);
    $('.lightbox__prev', lb).addEventListener('click', () => step(-1));
    $('.lightbox__next', lb).addEventListener('click', () => step(1));
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox__figure')) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'Tab') {
        const focusables = $$('button', lb);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    let touchX = null;
    lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    });
  }

  /* ---------- Video reels ----------
     Each .reel card names its clip with data-src / data-start / data-end (seconds).
     One shared <video> moves into whichever card is active, so only one clip decodes at a time. */
  class Reels {
    constructor(root) {
      this.root = root;
      this.track = $('.reels__track', root);
      this.probe = $('.reels__probe', root);
      this.cards = $$('.reel', root);
      this.count = this.cards.length;
      this.index = 0;
      this.muted = true;
      this.autoplay = !reduceMotion;
      this.inView = false;
      this.started = false;
      this.ready = false;
      this.modalOpen = false;
      this.dragged = false;
      this.raf = 0;
      this.frame = 0;
      this.tapTimer = 0;
      this.lastTap = 0;
      this.countEl = $('.reels__count', root);
      this.playBtn = $('[data-reels-play]', root);
      this.muteBtn = $('[data-reels-mute]', root);
      this.storyStrip = $('.reels__stories', root);
      this.glows = $$('.reels__glow span', root);
      this.glowIdx = 0;
      this.ambient = $('.reels__ambient', root);
      this.ambientCtx = this.ambient ? this.ambient.getContext('2d') : null;

      this.video = document.createElement('video');
      this.video.className = 'reel__video';
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('aria-hidden', 'true');
      this.video.preload = 'auto';
      this.video.addEventListener('ended', () => this.next());
      // rAF drives the smooth progress; timeupdate keeps clips advancing even when rAF is throttled
      this.video.addEventListener('timeupdate', () => {
        if (this.video.paused) return;
        this.paintAmbient();
        this.check();
      });

      this.buildHud();
      this.buildStories();
      this.buildModal();
      this.bindControls();
      this.bindDrag();
      this.bindCards();
      if (finePointer && !reduceMotion) this.bindTilt();

      this.track.addEventListener('keydown', (e) => {
        if (e.target !== this.track) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); this.go(this.index + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.go(this.index - 1); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openModal(); }
      });

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
          this.inView = entry.isIntersecting;
          if (this.inView) this.enter();
          this.sync();
        }, { threshold: 0.2 }).observe(root);
      } else {
        this.inView = true;
        this.enter();
      }
      document.addEventListener('visibilitychange', () => this.sync());

      this.updatePlayBtn();
      this.updateSound();
      this.activate(0);
    }

    // Cards start stacked and fan out the first time the section comes into view
    enter() {
      if (this.root.classList.contains('is-in')) return;
      this.root.classList.add('is-in');
      setTimeout(() => this.root.classList.add('is-fanned'), 1500);
    }

    clip(i = this.index) {
      const card = this.cards[i];
      return {
        src: card.dataset.src,
        start: parseFloat(card.dataset.start) || 0,
        end: parseFloat(card.dataset.end) || 0,
        title: $('.reel__title', card).textContent,
        tag: $('.reel__tag', card).textContent,
        label: card.dataset.label || '',
        poster: $('.reel__poster', card).getAttribute('src'),
      };
    }

    offset(i) {
      let d = i - this.index;
      if (d > this.count / 2) d -= this.count;
      if (d < -this.count / 2) d += this.count;
      return d;
    }

    layout() {
      this.cards.forEach((card, i) => {
        const d = this.offset(i);
        const abs = Math.abs(d);
        card.style.setProperty('--offset', d);
        card.style.setProperty('--abs', Math.min(abs, 3));
        card.style.zIndex = String(20 - abs);
        card.classList.toggle('is-active', d === 0);
        card.classList.toggle('is-far', abs > 2);
        card.dataset.cursor = d === 0 ? 'Watch' : 'Play';
      });
      this.dots.forEach((dot, i) => {
        dot.setAttribute('aria-current', String(i === this.index));
        dot.style.setProperty('--p', 0);
      });
      if (this.countEl) {
        const pad = (n) => String(n).padStart(2, '0');
        this.countEl.textContent = `${pad(this.index + 1)} / ${pad(this.count)}`;
      }
      if (this.storyStrip) {
        const dot = this.dots[this.index];
        this.storyStrip.scrollTo({
          left: dot.offsetLeft - this.storyStrip.clientWidth / 2 + dot.offsetWidth / 2,
          behavior: reduceMotion ? 'auto' : 'smooth',
        });
      }
    }

    activate(i) {
      const previous = this.cards[this.index];
      previous.classList.remove('is-playing');
      this.clearTilt(previous);
      this.setProgress(0);
      this.index = (i + this.count) % this.count;
      this.layout();
      this.glow();
      const card = this.cards[this.index];
      this.video.pause();
      card.insertBefore(this.video, $('.reel__shade', card));
      if (this.started) this.load();
      this.sync();
    }

    go(i) { this.activate(i); }
    next() { this.activate(this.index + 1); }

    load() {
      const { src } = this.clip();
      const v = this.video;
      this.ready = false;
      if (v.getAttribute('src') !== src) v.src = src;
      const seek = () => {
        v.addEventListener('seeked', () => { this.ready = true; }, { once: true });
        v.currentTime = this.clip().start; // read at seek time: the active reel may have changed meanwhile
      };
      if (v.readyState >= 1) seek(); else v.addEventListener('loadedmetadata', seek, { once: true });
    }

    shouldPlay() {
      return this.autoplay && this.inView && !this.modalOpen && !document.hidden;
    }

    sync() {
      if (this.inView && !this.started) {
        this.started = true;
        this.load();
      }
      if (!this.started) return;
      if (this.shouldPlay()) {
        const p = this.video.play();
        if (p && p.catch) p.catch(() => {});
        this.tick();
      } else {
        this.video.pause();
        cancelAnimationFrame(this.raf);
      }
    }

    // Updates progress; returns true when the clip has finished and the next one was started.
    check() {
      const v = this.video;
      const { start, end } = this.clip();
      const stop = end || v.duration || 0;
      if (!this.ready || stop <= start) return false;
      this.setProgress((v.currentTime - start) / (stop - start));
      if (!v.paused && v.currentTime > start + 0.05) this.cards[this.index].classList.add('is-playing');
      if (end && v.currentTime >= end) {
        this.next();
        return true;
      }
      return false;
    }

    tick() {
      cancelAnimationFrame(this.raf);
      const step = () => {
        this.frame += 1;
        if (this.frame % 8 === 0) this.paintAmbient();
        if (!this.check()) this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }

    // Samples the playing clip into a tiny canvas; CSS blurs it into a glow behind the stage
    paintAmbient() {
      const v = this.video;
      if (!this.ambientCtx || v.readyState < 2) return;
      try {
        this.ambientCtx.drawImage(v, 0, 0, this.ambient.width, this.ambient.height);
      } catch (err) {
        this.ambientCtx = null;
      }
    }

    setProgress(p) {
      const value = clamp(p, 0, 1).toFixed(4);
      const bar = $('.reel__bar span', this.cards[this.index]);
      if (bar) bar.style.setProperty('--p', value);
      if (this.dots[this.index]) this.dots[this.index].style.setProperty('--p', value);
    }

    glow() {
      if (this.glows.length < 2) return;
      const next = this.glows[(this.glowIdx + 1) % 2];
      next.style.backgroundImage = `url("${this.clip().poster}")`;
      next.classList.add('is-shown');
      this.glows[this.glowIdx].classList.remove('is-shown');
      this.glowIdx = (this.glowIdx + 1) % 2;
    }

    buildHud() {
      this.cards.forEach((card) => {
        const { title } = this.clip(this.cards.indexOf(card));
        const share = encodeURIComponent(`Green Velvet Resort, Pawna: ${title} https://greenvelvetresort.in/#videos`);
        card.insertAdjacentHTML('beforeend', `
          <div class="reel__profile"><img src="img/GreenVelvet/logo_2.png" alt=""><span>greenvelvetresort</span></div>
          <div class="reel__actions">
            <button class="reel__act" type="button" data-act="like" aria-pressed="false" aria-label="Like this video"><i class="fa-regular fa-heart" aria-hidden="true"></i></button>
            <button class="reel__act" type="button" data-act="sound" aria-label="Turn sound on"><i class="fa-solid fa-volume-xmark" aria-hidden="true"></i></button>
            <a class="reel__act" data-act="share" href="https://wa.me/?text=${share}" target="_blank" rel="noopener" aria-label="Share on WhatsApp"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></a>
            <button class="reel__act" type="button" data-act="full" aria-label="Watch full screen"><i class="fa-solid fa-expand" aria-hidden="true"></i></button>
          </div>`);
      });
    }

    buildStories() {
      this.dots = this.cards.map((card, i) => {
        const { title, label, poster } = this.clip(i);
        const story = document.createElement('button');
        story.type = 'button';
        story.className = 'story';
        story.setAttribute('aria-label', `Play video ${i + 1}: ${title}`);
        story.innerHTML = '<span class="story__ring"><img alt="" loading="lazy"></span><span class="story__label"></span>';
        $('img', story).src = poster;
        $('.story__label', story).textContent = label;
        story.addEventListener('click', () => this.go(i));
        if (this.storyStrip) this.storyStrip.appendChild(story);
        return story;
      });
    }

    updatePlayBtn() {
      if (!this.playBtn) return;
      this.playBtn.innerHTML = `<i class="fa-solid ${this.autoplay ? 'fa-pause' : 'fa-play'}" aria-hidden="true"></i>`;
      this.playBtn.setAttribute('aria-label', this.autoplay ? 'Pause videos' : 'Play videos');
    }

    updateSound() {
      const label = this.muted ? 'Turn sound on' : 'Turn sound off';
      const icon = `<i class="fa-solid ${this.muted ? 'fa-volume-xmark' : 'fa-volume-high'}" aria-hidden="true"></i>`;
      [this.muteBtn, ...$$('[data-act="sound"]', this.root)].forEach((btn) => {
        if (!btn) return;
        btn.innerHTML = icon;
        btn.setAttribute('aria-label', label);
      });
      if (this.muteBtn) this.muteBtn.setAttribute('aria-pressed', String(!this.muted));
    }

    toggleSound() {
      this.muted = !this.muted;
      this.video.muted = this.muted;
      this.updateSound();
      if (!this.muted && !this.autoplay) {
        this.autoplay = true;
        this.updatePlayBtn();
      }
      this.sync();
    }

    toggleLike(card, x, y) {
      const on = !card.classList.contains('is-liked');
      this.setLiked(card, on);
      if (on) this.burst(card, x, y);
    }

    setLiked(card, on) {
      card.classList.toggle('is-liked', on);
      const btn = $('[data-act="like"]', card);
      btn.setAttribute('aria-pressed', String(on));
      btn.innerHTML = `<i class="${on ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>`;
    }

    burst(card, x, y) {
      const box = card.getBoundingClientRect();
      const burst = document.createElement('span');
      burst.className = 'reel__burst';
      burst.style.left = `${x === undefined ? box.width / 2 : x - box.left}px`;
      burst.style.top = `${y === undefined ? box.height / 2 : y - box.top}px`;
      for (let i = 0; i < 8; i += 1) {
        const heart = document.createElement('i');
        heart.className = 'fa-solid fa-heart';
        const angle = (i / 7) * Math.PI * 2;
        heart.style.setProperty('--tx', `${(Math.cos(angle) * 90).toFixed(0)}px`);
        heart.style.setProperty('--ty', `${(Math.sin(angle) * 90).toFixed(0)}px`);
        burst.appendChild(heart);
      }
      card.appendChild(burst);
      setTimeout(() => burst.remove(), 1000);
    }

    bindCards() {
      this.cards.forEach((card, i) => card.addEventListener('click', (e) => {
        if (this.dragged) return;
        const action = e.target.closest('[data-act]');
        if (action) {
          const act = action.dataset.act;
          if (act === 'like') this.toggleLike(card);
          if (act === 'sound') this.toggleSound();
          if (act === 'full') this.openModal();
          return;
        }
        if (i !== this.index) {
          this.go(i);
          return;
        }
        // One tap on the playing reel opens it full screen; two quick taps like it
        const now = Date.now();
        if (now - this.lastTap < 300) {
          clearTimeout(this.tapTimer);
          this.lastTap = 0;
          this.setLiked(card, true);
          this.burst(card, e.clientX, e.clientY);
          return;
        }
        this.lastTap = now;
        this.tapTimer = setTimeout(() => this.openModal(), 300);
      }));
    }

    bindTilt() {
      this.cards.forEach((card) => {
        card.addEventListener('pointermove', (e) => {
          if (!card.classList.contains('is-active') || this.track.classList.contains('is-dragging')) return;
          const box = card.getBoundingClientRect();
          const x = (e.clientX - box.left) / box.width;
          const y = (e.clientY - box.top) / box.height;
          card.classList.add('is-tilting');
          card.style.setProperty('--rx', `${((0.5 - y) * 9).toFixed(2)}deg`);
          card.style.setProperty('--ry', `${((x - 0.5) * 12).toFixed(2)}deg`);
          card.style.setProperty('--gx', `${(x * 100).toFixed(0)}%`);
          card.style.setProperty('--gy', `${(y * 100).toFixed(0)}%`);
        });
        card.addEventListener('pointerleave', () => this.clearTilt(card));
      });
    }

    clearTilt(card) {
      card.classList.remove('is-tilting');
      ['--rx', '--ry', '--gx', '--gy'].forEach((prop) => card.style.removeProperty(prop));
    }

    bindControls() {
      const prev = $('[data-reels-prev]', this.root);
      const next = $('[data-reels-next]', this.root);
      if (prev) prev.addEventListener('click', () => this.go(this.index - 1));
      if (next) next.addEventListener('click', () => this.go(this.index + 1));
      if (this.playBtn) {
        this.playBtn.addEventListener('click', () => {
          this.autoplay = !this.autoplay;
          this.updatePlayBtn();
          this.sync();
        });
      }
      if (this.muteBtn) this.muteBtn.addEventListener('click', () => this.toggleSound());
    }

    bindDrag() {
      let down = false;
      let startX = 0;
      let dx = 0;
      this.track.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        down = true;
        startX = e.clientX;
        dx = 0;
        this.dragged = false;
      });
      window.addEventListener('pointermove', (e) => {
        if (!down) return;
        dx = e.clientX - startX;
        if (!this.dragged && Math.abs(dx) > 6) {
          this.dragged = true;
          this.track.classList.add('is-dragging');
          this.clearTilt(this.cards[this.index]);
        }
        if (this.dragged) this.track.style.setProperty('--drag', `${dx}px`);
      });
      const end = () => {
        if (!down) return;
        down = false;
        this.track.classList.remove('is-dragging');
        this.track.style.setProperty('--drag', '0px');
        if (!this.dragged) return;
        const spread = (this.probe && this.probe.offsetWidth) || this.cards[0].offsetWidth * 0.8;
        let steps = Math.round(-dx / spread);
        if (steps === 0 && Math.abs(dx) > 40) steps = dx < 0 ? 1 : -1;
        if (steps) this.go(this.index + steps);
        setTimeout(() => { this.dragged = false; }, 0);
      };
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    }

    buildModal() {
      const m = document.createElement('div');
      m.className = 'reel-modal';
      m.setAttribute('role', 'dialog');
      m.setAttribute('aria-modal', 'true');
      m.setAttribute('aria-label', 'Video player');
      m.innerHTML = `
        <button class="lightbox__btn lightbox__close" type="button" aria-label="Close video"><i class="fa-solid fa-xmark"></i></button>
        <button class="lightbox__btn lightbox__prev" type="button" aria-label="Previous video"><i class="fa-solid fa-arrow-left"></i></button>
        <figure class="reel-modal__frame"><video controls playsinline preload="metadata"></video>
          <figcaption><span class="reel-modal__tag"></span><span class="reel-modal__title"></span></figcaption></figure>
        <button class="lightbox__btn lightbox__next" type="button" aria-label="Next video"><i class="fa-solid fa-arrow-right"></i></button>`;
      body.appendChild(m);
      this.modal = m;
      this.modalVideo = $('video', m);
      $('.lightbox__close', m).addEventListener('click', () => this.closeModal());
      $('.lightbox__prev', m).addEventListener('click', () => this.stepModal(-1));
      $('.lightbox__next', m).addEventListener('click', () => this.stepModal(1));
      m.addEventListener('click', (e) => { if (e.target === m) this.closeModal(); });
      document.addEventListener('keydown', (e) => {
        if (!this.modalOpen) return;
        if (e.key === 'Escape') this.closeModal();
        if (e.key === 'ArrowRight') this.stepModal(1);
        if (e.key === 'ArrowLeft') this.stepModal(-1);
      });
    }

    playInModal() {
      const { src, title, tag, poster } = this.clip();
      const v = this.modalVideo;
      $('.reel-modal__tag', this.modal).textContent = tag;
      $('.reel-modal__title', this.modal).textContent = title;
      v.poster = poster;
      if (v.getAttribute('src') !== src) v.src = src;
      const go = () => {
        v.currentTime = this.clip().start;
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      };
      if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
    }

    openModal() {
      this.modalOpen = true;
      this.sync();
      this.playInModal();
      this.modal.classList.add('is-open');
      body.classList.add('lightbox-open');
      $('.lightbox__close', this.modal).focus();
    }

    stepModal(dir) {
      this.activate(this.index + dir);
      this.playInModal();
    }

    closeModal() {
      this.modalVideo.pause();
      this.modal.classList.remove('is-open');
      body.classList.remove('lightbox-open');
      this.modalOpen = false;
      this.sync();
      this.track.focus({ preventScroll: true });
    }
  }
  $$('[data-reels]').forEach((el) => new Reels(el));

  /* ---------- Fireflies ---------- */
  class Fireflies {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.target = parseInt(canvas.dataset.fireflies, 10) || 24;
      this.visible = false;
      this.raf = 0;
      this.sprite = Fireflies.makeSprite();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.toggle();
      }).observe(canvas);
      document.addEventListener('visibilitychange', () => this.toggle());
    }

    static makeSprite() {
      const sprite = document.createElement('canvas');
      sprite.width = 48;
      sprite.height = 48;
      const ctx = sprite.getContext('2d');
      const glow = ctx.createRadialGradient(24, 24, 1, 24, 24, 24);
      glow.addColorStop(0, 'rgba(240, 255, 170, 1)');
      glow.addColorStop(0.25, 'rgba(190, 230, 90, .55)');
      glow.addColorStop(1, 'rgba(169, 207, 56, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 48, 48);
      return sprite;
    }

    resize() {
      const box = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.w = box.width;
      this.h = box.height;
      this.canvas.width = Math.round(box.width * dpr);
      this.canvas.height = Math.round(box.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(this.target * Math.min(this.w / 1400, 1)) + 6;
      this.flies = Array.from({ length: count }, () => ({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: 6 + Math.random() * 10,
        dir: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.35,
        pulse: 0.6 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    toggle() {
      cancelAnimationFrame(this.raf);
      if (!this.visible || document.hidden) return;
      const draw = (time) => {
        const { ctx, w, h } = this;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        this.flies.forEach((f) => {
          f.dir += (Math.random() - 0.5) * 0.25;
          f.x = (f.x + Math.cos(f.dir) * f.speed + w) % w;
          f.y = (f.y + Math.sin(f.dir) * f.speed + h) % h;
          ctx.globalAlpha = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin((time / 1000) * f.pulse + f.phase));
          ctx.drawImage(this.sprite, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
        });
        this.raf = requestAnimationFrame(draw);
      };
      this.raf = requestAnimationFrame(draw);
    }
  }
  if (!reduceMotion && 'IntersectionObserver' in window) {
    $$('[data-fireflies]').forEach((canvas) => new Fireflies(canvas));
  }

  /* ---------- Hero: the film window opens up as you scroll (large screens) ---------- */
  const hero = $('[data-hero]');
  if (hero) {
    const intro = $('.hero__intro', hero);
    const pinQuery = window.matchMedia('(min-width: 1025px) and (min-height: 640px)');
    const syncHero = () => {
      hero.classList.toggle('hero--pinned', pinQuery.matches && !reduceMotion);
    };
    pinQuery.addEventListener('change', () => { syncHero(); onScroll(); });
    syncHero();
    scrollHooks.push(() => {
      if (!hero.classList.contains('hero--pinned')) return;
      const box = hero.getBoundingClientRect();
      const raw = clamp(-box.top / (box.height - window.innerHeight), 0, 1);
      const p = raw * raw * (3 - 2 * raw);
      const top0 = intro.offsetTop + intro.offsetHeight + 26;
      const side0 = intro.getBoundingClientRect().left + parseFloat(getComputedStyle(intro).paddingLeft);
      hero.style.setProperty('--p', p.toFixed(3));
      hero.style.setProperty('--t0', `${top0}px`);
      hero.style.setProperty('--s0', `${side0.toFixed(0)}px`);
      hero.style.setProperty('--ct', `${(top0 * (1 - p)).toFixed(1)}px`);
      hero.style.setProperty('--cs', `${(side0 * (1 - p)).toFixed(1)}px`);
      hero.style.setProperty('--cb', `${(28 * (1 - p)).toFixed(1)}px`);
      hero.style.setProperty('--cr', `${(28 * (1 - p)).toFixed(1)}px`);
    });
  }

  /* ---------- Words that light up as you read down the page ---------- */
  if (!reduceMotion) {
    $$('[data-scrub]').forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      const spans = words.map((word, i) => {
        const span = document.createElement('span');
        span.className = 'sw';
        span.textContent = word;
        el.appendChild(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        return span;
      });
      scrollHooks.push(() => {
        const box = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (box.top > vh) return;
        const lit = clamp((vh * 0.9 - box.top) / (box.height + vh * 0.35), 0, 1) * spans.length;
        spans.forEach((span, i) => { span.style.opacity = clamp(0.22 + (lit - i) * 0.78, 0.22, 1).toFixed(2); });
      });
    });

    /* ---------- Outlined text that slides sideways with scroll ---------- */
    $$('[data-scroll-x]').forEach((el) => {
      const speed = parseFloat(el.dataset.scrollX) || 0.15;
      scrollHooks.push(() => {
        const box = el.parentElement.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) return;
        el.style.transform = `translate3d(${(box.top * speed).toFixed(1)}px, 0, 0)`;
      });
    });
  }

  /* ---------- Room lens: second photo through a circle that follows the mouse ---------- */
  if (finePointer) {
    $$('[data-lens]').forEach((lens) => {
      const place = (e) => {
        const box = lens.getBoundingClientRect();
        lens.style.setProperty('--x', `${(e.clientX - box.left).toFixed(0)}px`);
        lens.style.setProperty('--y', `${(e.clientY - box.top).toFixed(0)}px`);
      };
      lens.addEventListener('pointerenter', (e) => { place(e); lens.classList.add('is-on'); });
      lens.addEventListener('pointermove', place);
      lens.addEventListener('pointerleave', () => lens.classList.remove('is-on'));
    });
  }

  /* ---------- Rooms page: section tabs bar ---------- */
  const subnav = $('[data-subnav]');
  if (subnav) {
    const strip = $('.subnav__track', subnav);
    const ink = $('.subnav__ink', subnav);
    const links = $$('a', subnav);
    const targets = links.map((link) => document.getElementById(link.getAttribute('href').slice(1)));
    let current = -1;
    const setActive = (i) => {
      if (i === current) return;
      current = i;
      links.forEach((link, k) => link.setAttribute('aria-current', String(k === i)));
      const link = links[i];
      ink.style.setProperty('--ink-x', `${link.offsetLeft}px`);
      ink.style.setProperty('--ink-w', `${link.offsetWidth}px`);
      strip.scrollTo({
        left: link.offsetLeft - strip.clientWidth / 2 + link.offsetWidth / 2,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    };
    scrollHooks.push(() => {
      const line = subnav.getBoundingClientRect().bottom + 80;
      let active = 0;
      targets.forEach((target, i) => {
        if (target && target.getBoundingClientRect().top <= line) active = i;
      });
      setActive(active);
    });
    window.addEventListener('resize', () => { current = -1; });
  }

  /* ---------- Rooms page: panels stack on top of each other ---------- */
  const stack = $('[data-stack]');
  if (stack) {
    const panels = $$('.room-panel', stack);
    const placePanels = () => {
      panels.forEach((panel) => {
        panel.style.setProperty('--stick', `${Math.min(146, window.innerHeight - panel.offsetHeight - 16)}px`);
      });
    };
    placePanels();
    window.addEventListener('resize', placePanels);
    window.addEventListener('load', placePanels);
    scrollHooks.push(() => {
      panels.forEach((panel, i) => {
        const next = panels[i + 1];
        if (!next || reduceMotion) return;
        if (getComputedStyle(panel).position !== 'sticky') {
          panel.style.removeProperty('--shrink');
          return;
        }
        const box = panel.getBoundingClientRect();
        const covered = clamp(1 - (next.getBoundingClientRect().top - box.top) / box.height, 0, 1);
        panel.style.setProperty('--shrink', covered.toFixed(3));
      });
    });
  }

  /* ---------- Rooms page: guided tour with hotspots ---------- */
  $$('[data-tour]').forEach((tour) => {
    const media = $('.tour__media', tour);
    const pins = $$('.pin', tour);
    const legend = $('.tour__legend', tour);
    let timer = 0;
    let active = -1;
    let handsOn = false;
    const chips = pins.map((pin, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tour__chip';
      chip.setAttribute('aria-pressed', 'false');
      chip.innerHTML = $('.pin__card', pin).innerHTML;
      chip.addEventListener('click', () => { handsOn = true; clearInterval(timer); show(i); });
      legend.appendChild(chip);
      return chip;
    });
    const show = (i) => {
      active = i;
      pins.forEach((pin, k) => pin.classList.toggle('is-open', k === i));
      chips.forEach((chip, k) => chip.setAttribute('aria-pressed', String(k === i)));
      media.style.setProperty('--ox', pins[i].style.getPropertyValue('--x'));
      media.style.setProperty('--oy', pins[i].style.getPropertyValue('--y'));
      media.classList.add('is-zoomed');
    };
    pins.forEach((pin, i) => {
      pin.addEventListener('click', () => { handsOn = true; clearInterval(timer); show(i); });
      pin.addEventListener('pointerenter', () => { handsOn = true; clearInterval(timer); show(i); });
    });
    new IntersectionObserver(([entry]) => {
      clearInterval(timer);
      if (!entry.isIntersecting || handsOn) return;
      show((active + 1) % pins.length);
      if (!reduceMotion) timer = setInterval(() => show((active + 1) % pins.length), 3200);
    }, { threshold: 0.35 }).observe(tour);
  });

  /* ---------- Tabs (house rules) ---------- */
  $$('[data-tabs]').forEach((group) => {
    const tabs = $$('[role="tab"]', group);
    const panels = $$('[role="tabpanel"]', group);
    const select = (i, focus) => {
      tabs.forEach((tab, k) => {
        tab.classList.toggle('is-active', k === i);
        tab.setAttribute('aria-selected', String(k === i));
        tab.tabIndex = k === i ? 0 : -1;
      });
      panels.forEach((panel, k) => { panel.hidden = k !== i; });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') select((i + 1) % tabs.length, true);
        if (e.key === 'ArrowLeft') select((i - 1 + tabs.length) % tabs.length, true);
      });
    });
    select(0);
  });

  /* ---------- Cursor companion (mouse only) ---------- */
  if (finePointer && !reduceMotion) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<span class="cursor__ring"></span><span class="cursor__label"></span>';
    body.appendChild(cursor);
    const label = $('.cursor__label', cursor);
    let x = 0;
    let y = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    const follow = () => {
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(follow) : 0;
    };
    document.addEventListener('pointermove', (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!cursor.classList.contains('is-on')) {
        cx = x;
        cy = y;
        cursor.classList.add('is-on');
      }
      if (!raf) raf = requestAnimationFrame(follow);
      const hit = e.target.closest ? e.target.closest('[data-cursor], a, button') : null;
      const text = hit && hit.dataset.cursor ? hit.dataset.cursor : '';
      cursor.classList.toggle('has-label', Boolean(text));
      cursor.classList.toggle('is-link', Boolean(hit) && !text);
      if (text) label.textContent = text;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
  }

  /* ---------- Enquiry form: opens WhatsApp with the details filled in ---------- */
  $$('[data-whatsapp-form]').forEach((form) => {
    const status = $('.form-status', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const blank = $$('[required]', form).find((field) => !field.value.trim());
      if (blank) {
        blank.value = '';
        form.reportValidity();
        return;
      }
      const data = new FormData(form);
      const value = (name) => String(data.get(name)).trim();
      const text = [
        'Hello Green Velvet Resort, I would like to make an enquiry.',
        '',
        `*Name:* ${value('name')}`,
        `*Phone:* ${value('phone')}`,
        `*Email:* ${value('email')}`,
        `*Message:* ${value('message')}`,
      ].join('\n');
      const url = `${form.getAttribute('action')}?text=${encodeURIComponent(text)}`;
      status.innerHTML = 'WhatsApp is opening with your enquiry. Press send to reach us. <a target="_blank" rel="noopener">Not opened? Tap here.</a>';
      $('a', status).href = url;
      if (!window.open(url, '_blank', 'noopener')) window.location.href = url;
    });
  });

  /* ---------- Pointer effects (desktop only) ---------- */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(800px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateY(-6px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });

    $$('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${(x * 0.2).toFixed(1)}px, ${(y * 0.3).toFixed(1)}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  onScroll();
})();
