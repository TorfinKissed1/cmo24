// Формы заявки: маска телефона, поле под вид работ, проверка и отправка.
// Пока у формы нет data-endpoint (статическая версия), после проверки она ведёт сразу на свою страницу «спасибо».
(function () {
  const forms = document.querySelectorAll('[data-lead-form]');
  if (!forms.length) return;

  const MESSAGES = {
    work: 'Выберите вид работ',
    name: 'Укажите имя',
    phone: 'Укажите корректный номер телефона',
    area: 'Укажите площадь',
    thickness: 'Укажите толщину в миллиметрах',
    consent: 'Нужно согласие на обработку данных',
    send: 'Не удалось отправить заявку. Позвоните нам: +7 (977) 994-89-17',
  };

  /* ---------- телефон ---------- */

  function formatPhone(raw) {
    let digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits[0] === '8') digits = '7' + digits.slice(1);
    if (digits[0] !== '7') digits = '7' + digits;
    digits = digits.slice(0, 11);

    let formatted = '+7';
    if (digits.length > 1) formatted += ' (' + digits.slice(1, 4);
    if (digits.length >= 4) formatted += ') ';
    if (digits.length > 4) formatted += digits.slice(4, 7);
    if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
    if (digits.length > 9) formatted += '-' + digits.slice(9, 11);
    return formatted;
  }

  function phoneDigits(value) {
    let digits = value.replace(/\D/g, '');
    if (digits.length === 10 && digits[0] === '9') digits = '7' + digits;
    if (digits.length === 11 && digits[0] === '8') digits = '7' + digits.slice(1);
    return digits;
  }

  function isPhoneValid(value) {
    const digits = phoneDigits(value);
    return digits.length === 11 && digits[0] === '7';
  }

  // Backspace по скобке или тире не меняет цифр: тогда стираем последнюю цифру сами,
  // сравнивая с прошлым значением поля, а не по позиции курсора.
  function handlePhoneInput(event) {
    const input = event.target;
    const previous = input.dataset.last || '';
    let raw = input.value;
    const isDeleting = Boolean(event.inputType) && event.inputType.indexOf('delete') === 0;
    const digits = raw.replace(/\D/g, '');

    // Осталось одно «+7»: чистим поле целиком, иначе «+7 (» не стереть.
    if (isDeleting && digits.length <= 1) {
      input.value = '';
      input.dataset.last = '';
      return;
    }
    if (isDeleting && digits === previous.replace(/\D/g, '')) raw = digits.slice(0, -1);

    input.value = formatPhone(raw);
    input.dataset.last = input.value;
  }

  /* ---------- числа ---------- */

  // Площадь бывает дробной («56,4»), толщина целая: оставляем цифры и одну запятую.
  function handleNumberInput(event) {
    const input = event.target;
    const allowFraction = input.inputMode === 'decimal';
    let value = input.value.replace('.', ',').replace(allowFraction ? /[^\d,]/g : /\D/g, '');
    const comma = value.indexOf(',');
    if (comma !== -1) value = value.slice(0, comma + 1) + value.slice(comma + 1).replace(/,/g, '');
    input.value = value;
  }

  function toNumber(value) {
    return parseFloat(value.replace(',', '.'));
  }

  /* ---------- ошибки ---------- */

  function setError(form, name, message) {
    const holder = form.querySelector(`[data-field="${name}"]`);
    if (!holder) return;
    const errorClass = holder.classList.contains('check') ? 'check--error' : 'field--error';
    holder.classList.toggle(errorClass, Boolean(message));
    const text = holder.querySelector('[data-error]');
    if (text) text.textContent = message || '';
  }

  function clearOnEdit(form) {
    form.addEventListener('input', (event) => {
      const holder = event.target.closest('[data-field]');
      if (holder) setError(form, holder.dataset.field, '');
      form.querySelector('[data-status]').textContent = '';
    });
  }

  /* ---------- поле под вид работ (длинная форма) ---------- */

  function syncWorkFields(form) {
    const checked = form.querySelector('[data-work-switch]:checked');
    form.querySelectorAll('[data-work-field]').forEach((block) => {
      block.hidden = !checked || block.dataset.workField !== checked.value;
    });
  }

  /* ---------- проверка ---------- */

  function validate(form) {
    const data = new FormData(form);
    const errors = {};
    const work = data.get('work');

    if (!work) errors.work = MESSAGES.work;
    if (String(data.get('name') || '').trim().length < 2) errors.name = MESSAGES.name;
    if (!isPhoneValid(String(data.get('phone') || ''))) errors.phone = MESSAGES.phone;

    if (form.elements.area) {
      const area = toNumber(String(data.get('area') || ''));
      if (!(area > 0 && area <= 100000)) errors.area = MESSAGES.area;
    }

    // Толщина и материал стен не обязательны: многие узнают их только на замере.
    const thickness = String(data.get('thickness') || '');
    if (work === 'styazhka' && thickness && !(toNumber(thickness) > 0)) errors.thickness = MESSAGES.thickness;

    if (!form.elements.consent.checked) errors.consent = MESSAGES.consent;
    return errors;
  }

  /* ---------- отправка ---------- */

  function reachGoal(name) {
    if (typeof window.ym === 'function' && window.YM_COUNTER) window.ym(window.YM_COUNTER, 'reachGoal', name);
  }

  async function submit(form) {
    const button = form.querySelector('[type="submit"]');
    const status = form.querySelector('[data-status]');
    const endpoint = form.dataset.endpoint;

    // Приманку заполняют боты, но иногда и менеджер паролей: обнуляем её перед отправкой.
    form.elements.company_website.value = '';

    // Скрытое поле под другой вид работ не отправляем.
    form.querySelectorAll('[data-work-field][hidden] input').forEach((input) => { input.disabled = true; });
    const data = new FormData(form);
    form.querySelectorAll('[data-work-field] input').forEach((input) => { input.disabled = false; });
    data.set('phone', '+' + phoneDigits(String(data.get('phone'))));

    if (!endpoint) {
      reachGoal(form.dataset.goal);
      window.location.href = form.dataset.thanks;
      return;
    }

    button.disabled = true;
    try {
      const response = await fetch(endpoint, { method: 'POST', body: data, credentials: 'same-origin' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      reachGoal(form.dataset.goal);
      window.location.href = form.dataset.thanks;
    } catch (error) {
      status.textContent = MESSAGES.send;
      button.disabled = false;
    }
  }

  forms.forEach((form) => {
    form.querySelectorAll('[data-phone]').forEach((input) => input.addEventListener('input', handlePhoneInput));
    form.querySelectorAll('[data-number]').forEach((input) => input.addEventListener('input', handleNumberInput));
    form.querySelectorAll('[data-work-switch]').forEach((input) => input.addEventListener('change', () => syncWorkFields(form)));
    clearOnEdit(form);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const errors = validate(form);
      ['work', 'name', 'phone', 'area', 'thickness', 'consent'].forEach((name) => setError(form, name, errors[name]));

      const firstError = Object.keys(errors)[0];
      if (firstError) {
        const target = form.querySelector(`[data-field="${firstError}"] input`);
        if (target) target.focus({ preventScroll: true });
        form.querySelector(`[data-field="${firstError}"]`).scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      submit(form);
    });
  });
})();
