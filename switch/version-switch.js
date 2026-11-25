// Выдвижная закладка «Версии»: первая версия лежит в корне сайта, вторая в папке v2/.
// Адреса считаются от текущего пути, поэтому закладка работает и на GitHub Pages (/cmo24/), и на локальном сервере.
(function () {
  const path = window.location.pathname;
  const inSecond = /\/v2\//.test(path);
  const root = inSecond ? path.replace(/v2\/.*$/, '') : path.replace(/[^/]*$/, '');
  const versions = [
    { label: 'Версия 1', base: root, active: !inSecond },
    { label: 'Версия 2', base: root + 'v2/', active: inSecond },
  ];

  const box = document.createElement('div');
  box.className = 'vswitch';

  const panel = document.createElement('nav');
  panel.className = 'vswitch__panel';
  panel.id = 'vswitch-panel';
  panel.setAttribute('aria-label', 'Версия сайта');

  const title = document.createElement('span');
  title.className = 'vswitch__title';
  title.textContent = 'Версия сайта';
  panel.append(title);

  versions.forEach((version) => {
    const link = document.createElement('a');
    link.className = 'vswitch__link' + (version.active ? ' vswitch__link--active' : '');
    link.href = version.base;
    link.textContent = version.label;
    if (version.active) link.setAttribute('aria-current', 'page');
    panel.append(link);
  });

  const tab = document.createElement('button');
  tab.className = 'vswitch__tab';
  tab.type = 'button';
  tab.setAttribute('aria-expanded', 'false');
  tab.setAttribute('aria-controls', panel.id);
  const tabText = document.createElement('span');
  tabText.className = 'vswitch__tab-text';
  tabText.textContent = 'Версии';
  tab.append(tabText);

  box.append(panel, tab);
  document.body.append(box);

  // Разделы у версий называются одинаково: ссылка ведёт в тот раздел, где человек сейчас, якорь берётся в момент открытия.
  function setOpen(open) {
    if (open) {
      panel.querySelectorAll('.vswitch__link').forEach((link, index) => {
        link.href = versions[index].base + window.location.hash;
      });
    }
    box.classList.toggle('vswitch--open', open);
    tab.setAttribute('aria-expanded', String(open));
  }

  tab.addEventListener('click', () => setOpen(!box.classList.contains('vswitch--open')));
  document.addEventListener('click', (event) => {
    if (!box.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
})();
