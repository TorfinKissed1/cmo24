// Меню на телефоне и цели Метрики на ссылках с data-goal.
(function () {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function openMenu() {
    menu.hidden = false;
    toggle.classList.add('burger--open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  // На iPhone переход на скрытие не сработает: ждём конца ключевой анимации и только потом прячем.
  function closeMenu() {
    if (menu.hidden) return;
    toggle.classList.remove('burger--open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
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

  // Кнопки «Рассчитать стяжку/штукатурку» ведут к форме расчёта и сразу отмечают вид работ.
  document.querySelectorAll('a[data-pick]').forEach((link) => {
    link.addEventListener('click', () => {
      const target = document.querySelector(link.getAttribute('href'));
      const radio = target && target.querySelector(`input[name="work"][value="${link.dataset.pick}"]`);
      if (radio) radio.checked = true;
    });
  });

  // Вкладки по типу объекта: клик и стрелки влево-вправо, как у системных вкладок.
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

  // Вопросы закрываются плавно: снимаем open только после анимации ответа.
  document.querySelectorAll('[data-faq] details').forEach((item) => {
    item.querySelector('summary').addEventListener('click', (event) => {
      if (!item.open || reduceMotion.matches) return;
      event.preventDefault();
      item.classList.add('faq__item--closing');
      item.querySelector('.faq__answer').addEventListener('animationend', () => {
        item.classList.remove('faq__item--closing');
        item.open = false;
      }, { once: true });
    });
  });

  // Значки мессенджеров в углу (на компьютере) видны, когда первый экран ушёл из вида и пока не видны
  // контакты или подвал: там те же ссылки. На телефоне вместо них нижняя панель, она в CSS.
  const floating = document.querySelector('[data-float-contacts]');
  if (floating && 'IntersectionObserver' in window) {
    const watched = ['[data-hero]', '#kontakty', '.footer'].map((s) => document.querySelector(s)).filter(Boolean);
    const inView = new Set();
    // Шапка закреплена и закрывает верх окна, плюс отступ якоря: край первого экрана под ними не считается видимым.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? inView.add(entry.target) : inView.delete(entry.target)));
      floating.classList.toggle('float-contacts--visible', inView.size === 0);
    }, { rootMargin: `-${document.querySelector('.header').offsetHeight + 24}px 0px 0px 0px` });
    watched.forEach((el) => observer.observe(el));
  } else if (floating) {
    floating.classList.add('float-contacts--visible');
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-goal]');
    if (link && typeof window.ym === 'function' && window.YM_COUNTER) {
      window.ym(window.YM_COUNTER, 'reachGoal', link.dataset.goal);
    }
  });
})();
