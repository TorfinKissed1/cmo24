// Окна с формами заявки. Кнопка с data-popup="<id окна>" открывает <dialog> вместо перехода к форме на странице;
// data-pick отмечает вид работ, data-source уходит в заявку скрытым полем, чтобы было видно, откуда она пришла.
// Без поддержки <dialog> скрипт ничего не делает, и ссылки ведут к форме на странице по своему href.
(function () {
  if (typeof HTMLDialogElement !== 'function') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function fill(popup, { work, area, source }) {
    const form = popup.querySelector('[data-lead-form]');
    const radio = work && form.querySelector(`input[name="work"][value="${work}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (area && form.elements.area) {
      form.elements.area.value = String(area);
      form.elements.area.dispatchEvent(new Event('input', { bubbles: true }));
    }
    form.elements.source.value = source || '';
  }

  function open(id, prefill = {}) {
    const popup = document.getElementById(id);
    if (!popup || popup.open) return;
    fill(popup, prefill);
    popup.classList.remove('popup--closing');
    popup.showModal();
    document.body.classList.add('page--locked');
  }

  // close() вызываем только после анимации закрытия, иначе окно пропадёт рывком.
  function close(popup) {
    if (!popup.open || popup.classList.contains('popup--closing')) return;
    if (reduceMotion.matches) {
      popup.close();
      return;
    }
    const win = popup.querySelector('.popup__window');
    popup.classList.add('popup--closing');
    win.addEventListener('animationend', function done(event) {
      if (event.target !== win) return;
      win.removeEventListener('animationend', done);
      popup.close();
    });
  }

  document.querySelectorAll('[data-popup-window]').forEach((popup) => {
    popup.addEventListener('click', (event) => {
      if (event.target.closest('[data-popup-close]')) close(popup);
    });
    // Escape: браузер закрыл бы окно сразу, без анимации.
    popup.addEventListener('cancel', (event) => {
      event.preventDefault();
      close(popup);
    });
    // Срабатывает при любом закрытии, в том числе когда браузер всё же закрыл окно сам по второму Escape.
    popup.addEventListener('close', () => {
      popup.classList.remove('popup--closing');
      document.body.classList.remove('page--locked');
    });
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-popup]');
    if (!trigger) return;
    event.preventDefault();
    open(trigger.dataset.popup, {
      work: trigger.dataset.pick,
      source: trigger.dataset.source || trigger.textContent.replace(/\s+/g, ' ').trim(),
    });
  });

  window.popups = { open };
})();
