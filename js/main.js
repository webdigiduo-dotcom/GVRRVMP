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
  const startReveals = () => {
    const targets = $$('[data-reveal], [data-split]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-visible');
        io.unobserve(el);
        // Once revealed, drop the reveal hooks so the element's own hover transitions take over
        if (el.hasAttribute('data-reveal')) {
          const delay = parseFloat(getComputedStyle(el).transitionDelay) || 0;
          setTimeout(() => {
            el.removeAttribute('data-reveal');
            el.classList.remove('is-visible');
          }, 1400 + delay * 1000);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
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
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const max = root.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(y / max, 1) : 0;

    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      if (Math.abs(y - lastY) > 6) {
        const goingDown = y > lastY;
        header.classList.toggle('is-hidden', goingDown && y > 420 && !body.classList.contains('nav-open'));
        lastY = y;
      }
    }
    if (progressBar) progressBar.style.transform = `scaleX(${ratio})`;
    if (toTop) {
      toTop.classList.toggle('is-visible', y > 600);
      toTop.style.setProperty('--progress', ratio.toFixed(4));
    }

    parallaxEls.forEach((el) => {
      const box = el.parentElement.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      const speed = parseFloat(el.dataset.parallax) || 0.25;
      el.style.transform = `translate3d(0, ${(-box.top * speed).toFixed(1)}px, 0)`;
    });

    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

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

    buildDots() {
      const wrap = $('.slider__dots', this.el);
      if (!wrap) return;
      this.dots = this.slides.map((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'slider__dot';
        dot.setAttribute('aria-label', `Show slide ${i + 1} of ${this.count}`);
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

  /* ---------- Video reels slider ----------
     Each .reel card names its clip with data-src / data-start / data-end (seconds).
     One shared <video> moves into whichever card is active, so only one clip decodes at a time. */
  class Reels {
    constructor(root) {
      this.root = root;
      this.track = $('.reels__track', root);
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
      this.countEl = $('.reels__count', root);
      this.playBtn = $('[data-reels-play]', root);
      this.muteBtn = $('[data-reels-mute]', root);
      this.glows = $$('.reels__glow span', root);
      this.glowIdx = 0;

      this.video = document.createElement('video');
      this.video.className = 'reel__video';
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('aria-hidden', 'true');
      this.video.preload = 'auto';
      this.video.addEventListener('ended', () => this.next());
      // rAF drives the smooth progress bar; timeupdate keeps clips advancing even when rAF is throttled
      this.video.addEventListener('timeupdate', () => { if (!this.video.paused) this.check(); });

      this.buildDots();
      this.buildModal();
      this.bindControls();
      this.bindDrag();

      this.cards.forEach((card, i) => card.addEventListener('click', () => {
        if (this.dragged) return;
        if (i === this.index) this.openModal(); else this.go(i);
      }));
      this.track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); this.go(this.index + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.go(this.index - 1); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openModal(); }
      });

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
          this.inView = entry.isIntersecting;
          this.sync();
        }, { threshold: 0.25 }).observe(root);
      } else {
        this.inView = true;
      }
      document.addEventListener('visibilitychange', () => this.sync());

      this.updatePlayBtn();
      this.activate(0);
    }

    clip(i = this.index) {
      const card = this.cards[i];
      return {
        src: card.dataset.src,
        start: parseFloat(card.dataset.start) || 0,
        end: parseFloat(card.dataset.end) || 0,
        title: $('.reel__title', card).textContent,
        tag: $('.reel__tag', card).textContent,
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
      });
      this.dots.forEach((dot, i) => {
        dot.setAttribute('aria-current', String(i === this.index));
        dot.style.setProperty('--p', 0);
      });
      if (this.countEl) {
        const pad = (n) => String(n).padStart(2, '0');
        this.countEl.textContent = `${pad(this.index + 1)} / ${pad(this.count)}`;
      }
    }

    activate(i) {
      this.cards[this.index].classList.remove('is-playing');
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
        if (!this.check()) this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }

    setProgress(p) {
      const value = Math.min(Math.max(p, 0), 1).toFixed(4);
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

    buildDots() {
      const wrap = $('.reels__dots', this.root);
      this.dots = this.cards.map((card, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'reels__dot';
        dot.setAttribute('aria-label', `Play video ${i + 1}: ${$('.reel__title', card).textContent}`);
        dot.addEventListener('click', () => this.go(i));
        if (wrap) wrap.appendChild(dot);
        return dot;
      });
    }

    updatePlayBtn() {
      if (!this.playBtn) return;
      this.playBtn.innerHTML = `<i class="fa-solid ${this.autoplay ? 'fa-pause' : 'fa-play'}" aria-hidden="true"></i>`;
      this.playBtn.setAttribute('aria-label', this.autoplay ? 'Pause videos' : 'Play videos');
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
      if (this.muteBtn) {
        this.muteBtn.addEventListener('click', () => {
          this.muted = !this.muted;
          this.video.muted = this.muted;
          this.muteBtn.setAttribute('aria-pressed', String(!this.muted));
          this.muteBtn.setAttribute('aria-label', this.muted ? 'Turn sound on' : 'Turn sound off');
          this.muteBtn.innerHTML = `<i class="fa-solid ${this.muted ? 'fa-volume-xmark' : 'fa-volume-high'}" aria-hidden="true"></i>`;
          if (!this.muted && !this.autoplay) {
            this.autoplay = true;
            this.updatePlayBtn();
          }
          this.sync();
        });
      }
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
        }
        if (this.dragged) this.track.style.setProperty('--drag', `${dx}px`);
      });
      const end = () => {
        if (!down) return;
        down = false;
        this.track.classList.remove('is-dragging');
        this.track.style.setProperty('--drag', '0px');
        if (!this.dragged) return;
        const w = this.cards[0].offsetWidth;
        const spread = window.innerWidth <= 640
          ? w * 0.74
          : Math.min(w * 0.82, (window.innerWidth / 2 - 92 - w * 0.45) / 2); // mirrors --spread in CSS
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

  /* ---------- Live chat buttons (Tawk.to) ----------
     The chat bubble itself stays hidden (see the Tawk snippet); these buttons open it.
     Without Tawk loaded they fall back to their WhatsApp link. */
  $$('[data-chat]').forEach((btn) => btn.addEventListener('click', (e) => {
    const api = window.Tawk_API;
    if (!api || typeof api.maximize !== 'function') return;
    e.preventDefault();
    if (typeof api.showWidget === 'function') api.showWidget();
    api.maximize();
  }));

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
})();
