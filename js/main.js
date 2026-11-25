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

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-goal]');
    if (link && typeof window.ym === 'function' && window.YM_COUNTER) {
      window.ym(window.YM_COUNTER, 'reachGoal', link.dataset.goal);
    }
  });
})();
