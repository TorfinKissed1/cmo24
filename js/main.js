// Шапка, меню на телефоне, вкладки, вопросы, значки в углу, цели Метрики и появление блоков при прокрутке.
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- шапка: прозрачная над первым экраном, тёмная после него ---------- */
  const header = document.querySelector('[data-header]');
  if (header) {
    const updateHeader = () => header.classList.toggle('header--solid', window.scrollY > 8);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  /* ---------- меню ---------- */
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');

  function openMenu() {
    menu.hidden = false;
    toggle.classList.add('burger--open');
    toggle.setAttribute('aria-expanded', 'true');
    header.classList.add('header--solid');
    document.body.style.overflow = 'hidden';
  }

  // На iPhone переход на скрытие не сработает: ждём конца ключевой анимации и только потом прячем.
  function closeMenu() {
    if (menu.hidden) return;
    toggle.classList.remove('burger--open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    header.classList.toggle('header--solid', window.scrollY > 8);
    if (reduceMotion.matches) {
      menu.hidden = true;
      return;
    }
    menu.classList.add('menu--closing');
    menu.addEventListener('animationend', () => {
      menu.classList.remove('menu--closing');
      menu.hidden = true;
    }, { once: true });
  }

  if (toggle && menu) {
    toggle.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
    window.matchMedia('(min-width: 1101px)').addEventListener('change', (event) => {
      if (event.matches) closeMenu();
    });
  }

  /* ---------- вкладки: клик и стрелки влево-вправо, как у системных вкладок ---------- */
  document.querySelectorAll('[data-tabs]').forEach((tabs) => {
    const buttons = [...tabs.querySelectorAll('[role="tab"]')];
    const activeClass = tabs.dataset.activeClass;
    function select(button) {
      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle(activeClass, active);
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
        document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
      });
    }
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => select(button));
      button.addEventListener('keydown', (event) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        const next = buttons[(index + step + buttons.length) % buttons.length];
        select(next);
        next.focus();
      });
    });
  });

  /* ---------- вопросы ---------- */
  // Высоту <details> CSS в Safari не анимирует, поэтому она считается здесь,
  // а open снимается только после анимации закрытия. Класс открытого вопроса меняет значок сразу.
  document.querySelectorAll('[data-faq] details').forEach((item) => {
    const summary = item.querySelector('summary');
    let animation = null;
    let closing = false;

    summary.addEventListener('click', (event) => {
      event.preventDefault();
      const opening = !item.open || closing;
      item.classList.toggle('faq__item--open', opening);
      if (reduceMotion.matches) {
        item.open = opening;
        return;
      }
      const from = item.offsetHeight;
      if (animation) animation.cancel();
      item.open = true;
      const to = opening ? item.offsetHeight : summary.offsetHeight;
      closing = !opening;
      item.style.overflow = 'hidden';
      animation = item.animate({ height: [from + 'px', to + 'px'] }, { duration: 320, easing: 'ease' });
      animation.onfinish = () => {
        animation = null;
        item.style.overflow = '';
        if (!closing) return;
        closing = false;
        item.open = false;
      };
    });
  });

  /* ---------- значки мессенджеров в углу ---------- */
  // На компьютере видны, когда первый экран ушёл из вида и пока не видны контакты или подвал: там те же ссылки.
  // До 1100 px вместо них нижняя панель, она в CSS.
  const floating = document.querySelector('[data-float-contacts]');
  if (floating && 'IntersectionObserver' in window) {
    const watched = ['[data-hero]', '#kontakty', '.footer'].map((s) => document.querySelector(s)).filter(Boolean);
    const inView = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? inView.add(entry.target) : inView.delete(entry.target)));
      floating.classList.toggle('float-contacts--visible', inView.size === 0);
    }, { rootMargin: `-${header.offsetHeight + 24}px 0px 0px 0px` });
    watched.forEach((el) => observer.observe(el));
  } else if (floating) {
    floating.classList.add('float-contacts--visible');
  }

  /* ---------- цели Метрики на ссылках ---------- */
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-goal]');
    if (link && typeof window.ym === 'function' && window.YM_COUNTER) {
      window.ym(window.YM_COUNTER, 'reachGoal', link.dataset.goal);
    }
  });

  /* ---------- объекты: открытое фото шире, остальные сжаты ---------- */
  document.querySelectorAll('[data-objects]').forEach((list) => {
    const items = [...list.querySelectorAll('.object')];
    items.forEach((item) => {
      item.querySelector('.object__toggle').addEventListener('click', () => {
        items.forEach((other) => {
          const open = other === item;
          other.classList.toggle('object--open', open);
          other.querySelector('.object__toggle').setAttribute('aria-expanded', String(open));
        });
      });
    });
  });

  const animate = 'IntersectionObserver' in window && !reduceMotion.matches;

  /* ---------- нарезка текста для появления по буквам и по словам ---------- */
  // Видимый текст режется на span'ы и прячется от экранного чтеца, рядом остаётся скрытая копия целиком.
  function split(el, mode) {
    const plain = document.createElement('span');
    plain.className = 'visually-hidden';
    plain.textContent = el.textContent.replace(/\s+/g, ' ').trim();
    let index = 0;

    const piece = (className, text) => {
      const span = document.createElement('span');
      span.className = className;
      span.style.setProperty('--i', index++);
      span.textContent = text;
      return span;
    };

    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.tagName !== 'BR') walk(child);
          return;
        }
        if (child.nodeType !== Node.TEXT_NODE) return;
        const fragment = document.createDocumentFragment();
        // Делим только по обычным пробелам: неразрывный держит предлог со словом.
        child.textContent.split(/( )/).forEach((part) => {
          if (!part) return;
          if (part === ' ') {
            fragment.append(' ');
            return;
          }
          if (mode === 'words') {
            fragment.append(piece('split__piece', part));
            return;
          }
          const word = document.createElement('span');
          word.className = 'split__word';
          [...part].forEach((char) => word.append(piece('split__char', char)));
          fragment.append(word);
        });
        child.replaceWith(fragment);
      });
    };

    const visible = document.createElement('span');
    visible.setAttribute('aria-hidden', 'true');
    visible.append(...el.childNodes);
    walk(visible);
    el.append(plain, visible);
    el.classList.add('split');
  }

  if (animate) {
    document.querySelectorAll('.section__title, .perk__word, .calc__title, .warranty__years').forEach((el) => split(el, 'chars'));
    document.querySelectorAll('.section__lead, .contacts__lead').forEach((el) => split(el, 'words'));
  }

  /* ---------- появление блоков при прокрутке ---------- */
  // Блоки прячутся только здесь, через класс на <html>: без скрипта страница видна целиком.
  const revealed = document.querySelectorAll('.reveal');
  if (revealed.length && animate) {
    document.documentElement.classList.add('js-reveal');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal--visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealed.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- стык бетонных секций: машина проезжает один раз, когда стык на экране ---------- */
  const seams = document.querySelectorAll('[data-seam]');
  if (seams.length && animate) {
    const seamObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('seam--go');
        seamObserver.unobserve(entry.target);
      });
    }, { threshold: 1, rootMargin: '0px 0px -12% 0px' });
    seams.forEach((el) => seamObserver.observe(el));
  }

  /* ---------- машина внизу вопросов едет вместе с прокруткой ---------- */
  const lane = document.querySelector('[data-lane]');
  if (lane && !reduceMotion.matches) {
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = lane.getBoundingClientRect();
      const viewport = window.innerHeight;
      // 0, когда полоса появляется снизу окна, 1, когда она поднялась на пятую часть окна от верха.
      const progress = Math.min(1, Math.max(0, (viewport - rect.bottom) / (viewport * 0.8)));
      lane.style.setProperty('--p', progress.toFixed(4));
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
  }
})();
