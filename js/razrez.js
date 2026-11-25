// 3D-разрез пола и стены с ценой. Цена и легенда работают сразу, three.js (около 140 КБ по сети)
// подгружается, только когда до секции осталось немного прокрутки.

// Цены «от» с карточек услуг. На WordPress их задаёт администратор.
const PRICE = {
  screed: 490,
  screedHeat: 550,
  gyps: 450,
  cem: 500,
};

// Цвета для легенды совпадают с основным тоном текстур в сцене.
const COLOR = {
  screed: '#a6a39b',
  pipe: '#d8342b',
  insul: '#4db066',
  film: '#9fc6da',
  tape: '#f07b1e',
  slab: '#9c9f9d',
  gyps: '#ede3d3',
  cem: '#aba89f',
  rail: '#c9cdd1',
  mesh: '#ecd65c',
  gazoblok: '#e2e2db',
  kirpich: '#b4532f',
  monolit: '#a5a8a5',
};

const WALL_NAME = { gazoblok: 'газоблок', kirpich: 'кирпич', monolit: 'монолит' };
const MIX_NAME = { gyps: 'гипсовая', cem: 'цементная' };

const rub = (n) => n.toLocaleString('ru-RU') + ' ₽';

function initRazrez(root) {
  const form = root.querySelector('[data-razrez-form]');
  const sumEl = root.querySelector('[data-razrez-sum]');
  const perEl = root.querySelector('[data-razrez-per]');
  const legendEl = root.querySelector('[data-razrez-legend]');
  const badgeEl = root.querySelector('[data-razrez-badge]');
  const screedSlider = form.elements.screed;
  let scene = null;

  // Площадь: только цифры, пусто или ноль значит «не указана».
  function readArea(input) {
    const digits = input.value.replace(/\D/g, '');
    if (input.value !== digits) input.value = digits;
    return Number(digits) || 0;
  }

  function readState() {
    const el = form.elements;
    return {
      work: el.rz_work.value,
      screed: Number(el.screed.value),
      heat: el.heat.checked,
      insul: el.insul.checked,
      floorArea: readArea(el.floor_area),
      wall: el.wall.value,
      mix: el.mix.value,
      plaster: Number(el.plaster.value),
      mesh: el.mesh.checked,
      wallArea: readArea(el.wall_area),
    };
  }

  function renderPrice(state) {
    const floor = state.work === 'styazhka';
    const per = floor ? (state.heat ? PRICE.screedHeat : PRICE.screed) : PRICE[state.mix];
    const area = floor ? state.floorArea : state.wallArea;
    if (!area) {
      sumEl.textContent = '-';
      perEl.textContent = 'Укажите площадь';
      badgeEl.hidden = true;
      return;
    }
    sumEl.textContent = 'от ' + rub(per * area);
    perEl.textContent = 'от ' + rub(per) + '/м² × ' + area.toLocaleString('ru-RU') + ' м²';
    badgeEl.textContent = sumEl.textContent;
    badgeEl.hidden = false;
  }

  function legendItems(state) {
    if (state.work === 'styazhka') {
      const items = [{ name: 'Стяжка', mm: state.screed + ' мм', color: COLOR.screed }];
      if (state.heat) items.push({ name: 'Трубы тёплого пола', color: COLOR.pipe });
      if (state.insul) items.push({ name: 'Утеплитель', color: COLOR.insul });
      items.push(
        { name: 'Плёнка', color: COLOR.film },
        { name: 'Демпферная лента', color: COLOR.tape },
        { name: 'Перекрытие', color: COLOR.slab },
      );
      return items;
    }
    const items = [
      { name: 'Штукатурка ' + MIX_NAME[state.mix], mm: state.plaster + ' мм', color: COLOR[state.mix] },
      { name: 'Маяки', color: COLOR.rail },
    ];
    if (state.mesh) items.push({ name: 'Сетка', color: COLOR.mesh });
    items.push({ name: 'Стена: ' + WALL_NAME[state.wall], color: COLOR[state.wall] });
    return items;
  }

  function renderLegend(state) {
    legendEl.replaceChildren(...legendItems(state).map((item) => {
      const li = document.createElement('li');
      li.className = 'razrez__legend-item';
      const swatch = document.createElement('span');
      swatch.className = 'razrez__swatch';
      swatch.style.background = item.color;
      li.append(swatch, item.name);
      if (item.mm) {
        const mm = document.createElement('span');
        mm.className = 'razrez__mm';
        mm.textContent = item.mm;
        li.append(mm);
      }
      return li;
    }));
  }

  // Над трубами тёплого пола нужен слой раствора, поэтому с ним стяжка тоньше 50 мм не выбирается.
  function syncScreedMin() {
    const min = form.elements.heat.checked ? 50 : 30;
    screedSlider.min = String(min);
    if (Number(screedSlider.value) < min) screedSlider.value = String(min);
    root.querySelector('[data-razrez-min="screed"]').textContent = min + ' мм';
  }

  function update(workChanged = false) {
    syncScreedMin();
    const state = readState();
    root.querySelectorAll('[data-razrez-group]').forEach((group) => {
      group.hidden = group.dataset.razrezGroup !== state.work;
    });
    root.querySelector('[data-razrez-out="screed"]').textContent = state.screed + ' мм';
    root.querySelector('[data-razrez-out="plaster"]').textContent = state.plaster + ' мм';
    renderPrice(state);
    renderLegend(state);
    if (scene) scene.update(state, workChanged);
  }

  form.addEventListener('input', (event) => update(event.target.name === 'rz_work'));
  form.addEventListener('change', (event) => update(event.target.name === 'rz_work'));

  // Кнопка переносит вид работ и площадь в форму расчёта ниже, остальное человек заполнит сам.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const state = readState();
    const lead = document.querySelector('#raschet [data-lead-form]');
    if (!lead) return;
    const radio = lead.querySelector(`input[name="work"][value="${state.work}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const area = state.work === 'styazhka' ? state.floorArea : state.wallArea;
    const areaInput = lead.querySelector('input[name="area"]');
    if (areaInput && area) {
      areaInput.value = String(area);
      areaInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    lead.scrollIntoView({ behavior: 'smooth', block: 'center' });
    lead.querySelector('input[name="name"]').focus({ preventScroll: true });
  });

  // «Рассчитать стяжку / штукатурку» в секциях выше ведут сюда: разрез сразу показывает нужный вид работ.
  document.querySelectorAll('a[data-pick]').forEach((link) => {
    link.addEventListener('click', () => {
      const radio = form.querySelector(`input[name="rz_work"][value="${link.dataset.pick}"]`);
      if (!radio || radio.checked) return;
      radio.checked = true;
      update(true);
    });
  });

  update();

  const host = root.querySelector('[data-razrez-scene]');
  const showFallback = () => {
    root.querySelector('[data-razrez-hint]').hidden = true;
    root.querySelector('[data-razrez-fallback]').hidden = false;
  };
  const load = () => {
    import('./vendor/three-0.187.0.min.js')
      .then((THREE) => {
        scene = createScene(THREE, host, root.querySelector('[data-razrez-hint]'));
        if (!scene) return showFallback();
        scene.update(readState(), true);
      })
      .catch(showFallback);
  };

  if (!('IntersectionObserver' in window)) {
    load();
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    load();
  }, { rootMargin: '600px 0px' });
  observer.observe(host);
}

// ---------- 3D ----------

// Толщину слоёв рисуем в 2,5 раза крупнее: 5 см стяжки на метровом куске пола иначе не разглядеть.
const V = 2.5;
const SLAB = 0.22;

// Камера для каждого вида работ и пределы вращения: открытый срез всегда остаётся к зрителю.
const VIEWS = {
  styazhka: { pos: [2.5, 1.9, 2.6], target: [0.1, 0.1, 0] },
  shtukaturka: { pos: [2.45, 1.8, 3.25], target: [-0.15, 0.6, -0.35] },
};

function createScene(THREE, host, hint) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    return null;
  }

  const textures = makeTextures(THREE);
  const clones = [];
  let mode = null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'razrez__canvas';
  canvas.setAttribute('aria-label', 'Разрез, его можно поворачивать');
  host.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 4 / 3, 0.05, 50);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  // Колесо и щипок отключены: иначе прокрутка страницы над сценой приближала бы разрез.
  controls.enableZoom = false;
  controls.minPolarAngle = Math.PI * 0.18;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minAzimuthAngle = -0.15;
  controls.maxAzimuthAngle = Math.PI * 0.5;
  // Вертикальный свайп по сцене листает страницу, горизонтальный поворачивает разрез.
  canvas.style.touchAction = 'pan-y';

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8b9191, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(3, 5, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 15 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.14 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = -SLAB - 0.001;
  catcher.receiveShadow = true;
  scene.add(catcher);

  const group = new THREE.Group();
  scene.add(group);

  // Кадр рисуется только при изменении: пока разрез не трогают, видеокарта стоит.
  let frame = 0;
  function requestRender() {
    if (!frame) frame = requestAnimationFrame(renderFrame);
  }
  function renderFrame() {
    frame = 0;
    controls.update();
    renderer.render(scene, camera);
  }
  controls.addEventListener('change', requestRender);
  controls.addEventListener('start', () => hint.classList.add('razrez__hint--gone'), { once: true });
  if (window.matchMedia('(hover: none)').matches) hint.textContent = 'Поверните пальцем вбок';

  // На узкой сцене камера отходит дальше, чтобы разрез влез по ширине; направление взгляда не меняется.
  function fitCamera(reset) {
    const view = VIEWS[mode];
    const target = new THREE.Vector3(...view.target);
    const base = new THREE.Vector3(...view.pos).sub(target);
    const direction = reset ? base.clone().normalize() : camera.position.clone().sub(controls.target).normalize();
    const distance = base.length() * Math.max(1, 1.15 / camera.aspect);
    controls.target.copy(target);
    camera.position.copy(target).addScaledVector(direction, distance);
    controls.update();
    requestRender();
  }

  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (mode) fitCamera(false);
  }
  new ResizeObserver(resize).observe(host);
  resize();

  function tex(base, repeatX, repeatY) {
    const texture = base.clone();
    texture.needsUpdate = true;
    texture.repeat.set(repeatX, repeatY);
    clones.push(texture);
    return texture;
  }

  // Брус с текстурой в метрах: tile = [ширина, высота] одного повтора.
  function box(w, h, d, side, tile, top = side) {
    const [sx, sy] = tile;
    const material = (t, a, b) => new THREE.MeshStandardMaterial({ map: tex(t, a, b), roughness: 0.92, metalness: 0 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [
      material(side, d / sx, h / sy), material(side, d / sx, h / sy),
      material(top, w / sx, d / sx), material(side, w / sx, d / sx),
      material(side, w / sx, h / sy), material(side, w / sx, h / sy),
    ]);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }

  function plain(w, h, d, color, opts = {}) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color,
        roughness: opts.rough ?? 0.7,
        metalness: opts.metal ?? 0,
        transparent: Boolean(opts.opacity),
        opacity: opts.opacity ?? 1,
      }),
    );
    mesh.castShadow = !opts.opacity;
    mesh.receiveShadow = true;
    return mesh;
  }

  function clearGroup() {
    group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material && material.dispose());
    });
    group.clear();
    clones.splice(0).forEach((texture) => texture.dispose());
  }

  function buildFloor(state) {
    const W = 2.4, D = 1.8, WALL_H = 1.0, WALL_T = 0.2, TAPE = 0.012;
    const x0 = -W / 2 + WALL_T + TAPE, z0 = -D / 2 + WALL_T + TAPE;
    const innerW = W / 2 - x0, innerD = D / 2 - z0;
    const cx = (x0 + W / 2) / 2, cz = (z0 + D / 2) / 2;

    const slab = box(W, SLAB, D, textures.concrete, [0.6, 0.6]);
    slab.position.y = -SLAB / 2;
    const back = box(W, WALL_H, WALL_T, textures.block, [0.8, 0.8]);
    back.position.set(0, WALL_H / 2, -D / 2 + WALL_T / 2);
    const left = box(WALL_T, WALL_H, D - WALL_T, textures.block, [0.8, 0.8]);
    left.position.set(-W / 2 + WALL_T / 2, WALL_H / 2, WALL_T / 2);
    group.add(slab, back, left);

    const film = plain(innerW, 0.004, innerD, COLOR.film, { opacity: 0.6 });
    film.position.set(cx, 0.002, cz);
    group.add(film);
    let y = 0.004;

    if (state.insul) {
      const insH = 0.04 * V;
      const insulation = box(innerW, insH, innerD, textures.epsSide, [0.2, 0.2], textures.eps);
      insulation.position.set(cx, y + insH / 2, cz);
      group.add(insulation);
      y += insH;
    }

    if (state.heat) {
      const r = 0.008 * V, gap = 0.16, margin = 0.12;
      const xa = x0 + margin, xb = W / 2 - margin;
      const points = [];
      for (let z = z0 + margin, row = 0; z <= D / 2 - margin; z += gap, row++) {
        const [a, b] = row % 2 ? [xb, xa] : [xa, xb];
        points.push(new THREE.Vector3(a, y + r, z), new THREE.Vector3(b, y + r, z));
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.08);
      const pipe = new THREE.Mesh(
        new THREE.TubeGeometry(curve, points.length * 40, r, 10, false),
        new THREE.MeshStandardMaterial({ color: COLOR.pipe, roughness: 0.45 }),
      );
      pipe.castShadow = pipe.receiveShadow = true;
      group.add(pipe);
    }

    // Стяжка обрезана перед краем: под ней видны трубы и утеплитель.
    const sh = (state.screed / 1000) * V;
    const cut = (state.heat || state.insul) ? D / 2 - 0.62 : D / 2;
    const screed = box(innerW, sh, cut - z0, textures.screedSide, [0.4, 0.4], textures.screedTop);
    screed.position.set(cx, y + sh / 2, (z0 + cut) / 2);
    group.add(screed);

    const tapeH = y + sh + 0.03;
    const tapeBack = plain(W - WALL_T, tapeH, TAPE, COLOR.tape, { rough: 0.6 });
    tapeBack.position.set(WALL_T / 2, tapeH / 2, -D / 2 + WALL_T + TAPE / 2);
    const tapeLeft = plain(TAPE, tapeH, D - WALL_T, COLOR.tape, { rough: 0.6 });
    tapeLeft.position.set(-W / 2 + WALL_T + TAPE / 2, tapeH / 2, WALL_T / 2);
    group.add(tapeBack, tapeLeft);
  }

  function buildWall(state) {
    const W = 2.4, D = 1.6, H = 1.5, WT = 0.25;
    const [wallTex, wallTile] = {
      gazoblok: [textures.gas, [1.2, 1.0]],
      kirpich: [textures.brick, [0.52, 0.3]],
      monolit: [textures.mono, [1.2, 1.2]],
    }[state.wall];

    const floor = box(W, SLAB, D, textures.concrete, [0.6, 0.6], textures.screedTop);
    floor.position.y = -SLAB / 2;
    const back = box(W, H, WT, wallTex, wallTile);
    back.position.set(0, H / 2, -D / 2 + WT / 2);
    const left = box(WT, H, D - WT, wallTex, wallTile);
    left.position.set(-W / 2 + WT / 2, H / 2, WT / 2);
    group.add(floor, back, left);

    // Штукатурка от угла до среза, правее голая стена: срез смотрит на камеру, толщина слоя видна.
    const face = -D / 2 + WT;
    const pt = (state.plaster / 1000) * V;
    const start = -W / 2 + WT, cut = 0.2;
    const plaster = box(cut - start, H, pt, textures[state.mix], [0.5, 0.5]);
    plaster.position.set((start + cut) / 2, H / 2, face + pt / 2);
    group.add(plaster);

    // Маяки: один на краю штукатурки, второй уже стоит на голой стене впереди работы.
    for (const x of [cut + 0.012, cut + 0.75]) {
      const rail = plain(0.025, H * 0.96, pt * 0.95, COLOR.rail, { rough: 0.4, metal: 0.3 });
      rail.position.set(x, H * 0.49, face + pt * 0.475);
      group.add(rail);
    }

    if (state.mesh) {
      const mw = 0.5, mh = H * 0.92;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(mw, mh),
        new THREE.MeshStandardMaterial({
          map: tex(textures.mesh, mw / 0.05, mh / 0.05),
          transparent: true,
          roughness: 0.6,
          side: THREE.DoubleSide,
        }),
      );
      mesh.position.set(cut + mw / 2 + 0.03, H / 2, face + 0.004);
      group.add(mesh);
    }
  }

  return {
    update(state, workChanged) {
      clearGroup();
      if (state.work === 'styazhka') buildFloor(state); else buildWall(state);
      if (workChanged || mode !== state.work) {
        mode = state.work;
        fitCamera(true);
      }
      requestRender();
    },
  };
}

// Текстуры рисуются на canvas: внешние картинки не нужны.
function makeTextures(THREE) {
  function canvasTex(w, h, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }
  function speckle(g, w, h, count, colors, size) {
    for (let i = 0; i < count; i++) {
      g.fillStyle = colors[i % colors.length];
      const s = Math.random() * size + 0.6;
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  }
  // Кладка со смещением рядов на полблока.
  function bond(g, w, h, bw, bh, joint, jointColor, fill) {
    g.fillStyle = jointColor;
    g.fillRect(0, 0, w, h);
    const rows = Math.round(h / bh);
    for (let r = 0; r < rows; r++) {
      const shift = r % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) fill(x + shift + joint / 2, r * bh + joint / 2, bw - joint, bh - joint);
    }
  }

  return {
    concrete: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#9c9f9d'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 2600, ['#8a8d8b', '#aeb1af', '#7e8180'], 2);
    }),
    screedSide: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#8f8b83'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 4200, ['#7d7970', '#a39f96', '#6f6b63', '#b3aea4'], 2.2);
    }),
    screedTop: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#a6a39b'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 900, ['#9a978f', '#b2afa7'], 1.4);
      g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 5;
      for (let i = 0; i < 14; i++) { // следы затирочной машины
        g.beginPath();
        g.arc(Math.random() * w, Math.random() * h, 40 + Math.random() * 60, 0, Math.PI * 2);
        g.stroke();
      }
    }),
    eps: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#3e9f57'; g.fillRect(0, 0, w, h);
      const step = w / 4;
      for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) {
        const cx = x * step + step / 2, cy = y * step + step / 2;
        g.fillStyle = '#2f8546'; g.beginPath(); g.arc(cx + 3, cy + 3, step * 0.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#5dc077'; g.beginPath(); g.arc(cx, cy, step * 0.3, 0, Math.PI * 2); g.fill();
      }
    }),
    epsSide: canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#4db066'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 300, ['#5cc073', '#43a05b'], 2);
    }),
    block: canvasTex(512, 512, (g, w, h) => {
      bond(g, w, h, 256, 128, 6, '#8e908d', (x, y, bw, bh) => { g.fillStyle = '#b9bbb8'; g.fillRect(x, y, bw, bh); });
      speckle(g, w, h, 9000, ['#9fa19e', '#cdcfcb', '#8c8e8b', '#d8d9d6'], 2.4);
    }),
    gas: canvasTex(600, 500, (g, w, h) => {
      bond(g, w, h, 300, 125, 3, '#c8c8c0', (x, y, bw, bh) => { g.fillStyle = '#e2e2db'; g.fillRect(x, y, bw, bh); });
      speckle(g, w, h, 2200, ['#cfcfc7', '#bdbdb4'], 1.6);
    }),
    brick: canvasTex(520, 300, (g, w, h) => {
      const tones = ['#a9482b', '#b4532f', '#9a3e26', '#b85f3a', '#a54d30'];
      let k = 0;
      bond(g, w, h, 260, 75, 10, '#cec8bd', (x, y, bw, bh) => { g.fillStyle = tones[k++ % tones.length]; g.fillRect(x, y, bw, bh); });
      speckle(g, w, h, 1500, ['rgba(0,0,0,.12)', 'rgba(255,255,255,.1)'], 2);
    }),
    mono: canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#a5a8a5'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 3500, ['#989b98', '#b3b6b3'], 1.8);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; // стыки щитов опалубки
      g.strokeRect(1, 1, w - 2, h - 2);
      g.fillStyle = '#6f726f';
      for (const [x, y] of [[128, 128], [384, 128], [128, 384], [384, 384]]) {
        g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); // следы от стяжек опалубки
      }
    }),
    gyps: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#ede3d3'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 500, ['#e3d8c6', '#f5ede1'], 1.4);
    }),
    cem: canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#aba89f'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 3000, ['#9c998f', '#bab7ae', '#8f8c83'], 1.8);
    }),
    mesh: canvasTex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(236,214,92,.95)'; g.lineWidth = 4;
      g.strokeRect(0, 0, w, h);
    }),
  };
}

const razrezRoot = document.querySelector('[data-razrez]');
if (razrezRoot) initRazrez(razrezRoot);
