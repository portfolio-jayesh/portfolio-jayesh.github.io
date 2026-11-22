'use strict';

const canvas = document.getElementById('landscape');
const ink = canvas.getContext('2d');
const stage = canvas.parentElement;
const overlay = document.querySelector('.world-interface');
const intro = document.querySelector('.world-intro');
const modeDialog = document.getElementById('world-mode-dialog');
const mapDialog = document.getElementById('journey-map');
const storyDialog = document.getElementById('story-dialog');
const story = document.getElementById('journey-story');
const launch = document.getElementById('world-launch');
const journeyButton = document.getElementById('journey-button');
const readButton = document.getElementById('read-story');
const autoButton = document.getElementById('ride-toggle');
const qualityButton = document.getElementById('quality-button');
const chapterButton = document.getElementById('chapter-button');
const nextButton = document.getElementById('next-stop');
const previousButton = document.getElementById('previous-stop');
const continueButton = document.getElementById('continue-chapter');
const touchControls = document.querySelector('.world-touch');
const dialogue = document.querySelector('.world-dialogue');
const locationBadge = document.querySelector('.world-location');
const chapterProgress = document.getElementById('world-progress');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const arrows = new Map([
  ['ArrowUp', 'up'], ['w', 'up'],
  ['ArrowDown', 'down'], ['s', 'down'],
  ['ArrowLeft', 'left'], ['a', 'left'],
  ['ArrowRight', 'right'], ['d', 'right']
]);

const chapters = Array.from(story.querySelectorAll('article'), article => ({
  scene: article.dataset.scene,
  place: article.dataset.place,
  detail: article.dataset.detail,
  heading: article.querySelector('h3').textContent,
  body: article.querySelector('h3 + p').textContent
}));

const state = {
  entered: false,
  mode: 'manual',
  riding: false,
  narrating: false,
  current: 0,
  distance: 0,
  destination: null,
  steer: 0,
  quality: 'light',
  angle: 0,
  width: 0,
  height: 0,
  pixelRatio: 1
};

const held = new Set();
const limit = (value, min, max) => Math.min(max, Math.max(min, value));
const pad = value => String(value).padStart(2, '0');
chapterProgress.querySelector('small').textContent = `/ ${pad(chapters.length)}`;

storyDialog.append(story);
const mapButtons = chapters.map(({ place, detail }, index) => {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  const label = document.createElement('span');
  label.textContent = place;
  const meta = document.createElement('small');
  meta.textContent = detail;
  label.append(meta);
  const number = document.createElement('span');
  number.textContent = pad(index + 1);
  number.setAttribute('aria-hidden', 'true');
  button.append(label, number);
  button.addEventListener('click', () => {
    mapDialog.close();
    if (!state.entered) begin('manual', index);
    else arrive(index);
  });
  item.append(button);
  document.getElementById('world-map-list').append(item);
  return button;
});

function updateControls() {
  overlay.dataset.entered = String(state.entered);
  overlay.dataset.narrating = String(state.narrating);
  intro.hidden = state.entered;
  locationBadge.hidden = !state.entered;
  document.querySelector('.world-dashboard').hidden = !state.entered;
  document.querySelector('.world-ride-controls').hidden = !state.entered;
  touchControls.hidden = !state.entered || state.mode !== 'manual';
  dialogue.hidden = !state.narrating;
  chapterButton.hidden = !state.entered || state.narrating;
  const traveling = state.destination !== null;
  autoButton.textContent = traveling ? 'Pause' : 'Autopilot';
  autoButton.setAttribute('aria-pressed', String(traveling));
  document.getElementById('world-help').textContent = state.entered && state.mode === 'manual' ? 'WASD or arrow keys to explore' : '';
  previousButton.disabled = state.current === 0;
  nextButton.disabled = state.current === chapters.length - 1;
  continueButton.textContent = state.current === chapters.length - 1 ? 'Read the full story' : 'Next chapter';
}

function arrive(index, moveFocus = false) {
  held.clear();
  state.destination = null;
  state.riding = false;
  state.current = index;
  state.distance = index;
  state.narrating = true;
  const chapter = chapters[index];
  document.getElementById('world-place').textContent = chapter.place;
  document.getElementById('world-place-detail').textContent = chapter.detail;
  chapterProgress.firstChild.textContent = `${pad(index + 1)} `;
  document.getElementById('world-chapter-label').textContent = `Chapter ${pad(index + 1)} / ${pad(chapters.length)}`;
  document.getElementById('world-chapter-title').textContent = chapter.heading;
  document.getElementById('world-chapter-text').textContent = chapter.body;
  mapButtons.forEach((button, offset) => {
    if (offset === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  updateControls();
  paint();
  if (moveFocus) continueButton.focus();
}

function begin(mode, index = 0) {
  if (modeDialog.open) modeDialog.close();
  state.entered = true;
  state.mode = mode;
  arrive(index, true);
  resize();
  if (!reducedMotion.matches) stage.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 420 });
}

function travel(index, automatic) {
  if (index < 0 || index >= chapters.length) return;
  if (reducedMotion.matches) {
    arrive(index, true);
    return;
  }
  state.narrating = false;
  state.destination = index;
  state.riding = automatic;
  updateControls();
  autoButton.focus();
  schedule();
}

function showStory() {
  storyDialog.showModal();
  storyDialog.scrollTop = 0;
}

launch.addEventListener('click', () => modeDialog.showModal());
modeDialog.querySelectorAll('[data-mode]').forEach(button => {
  button.addEventListener('click', () => begin(button.dataset.mode));
});
journeyButton.addEventListener('click', () => {
  mapDialog.showModal();
  journeyButton.setAttribute('aria-expanded', 'true');
});
mapDialog.addEventListener('close', () => journeyButton.setAttribute('aria-expanded', 'false'));
readButton.addEventListener('click', event => {
  event.preventDefault();
  showStory();
});
document.getElementById('hide-chapter').addEventListener('click', () => {
  state.narrating = false;
  updateControls();
  paint();
  chapterButton.focus();
});
chapterButton.addEventListener('click', () => arrive(state.current, true));
previousButton.addEventListener('click', () => travel(state.current - 1, state.mode === 'auto'));
nextButton.addEventListener('click', () => travel(state.current + 1, state.mode === 'auto'));
continueButton.addEventListener('click', () => {
  if (state.current === chapters.length - 1) showStory();
  else travel(state.current + 1, state.mode === 'auto');
});
autoButton.addEventListener('click', () => {
  if (state.destination !== null) {
    state.destination = null;
    state.riding = false;
    updateControls();
    return;
  }
  state.mode = 'auto';
  travel(state.current === chapters.length - 1 ? 0 : state.current + 1, true);
});
qualityButton.addEventListener('click', () => {
  state.quality = state.quality === 'light' ? 'high' : 'light';
  qualityButton.textContent = `Quality: ${state.quality}`;
  qualityButton.setAttribute('aria-pressed', String(state.quality === 'high'));
  resize();
});

function useDirection(direction) {
  if (!state.entered) return;
  state.mode = 'manual';
  state.riding = false;
  state.destination = null;
  if (direction === 'up' || direction === 'down') {
    const index = state.current + (direction === 'up' ? 1 : -1);
    if (reducedMotion.matches && index >= 0 && index < chapters.length) {
      arrive(index, true);
      return;
    }
    state.narrating = false;
  } else if (reducedMotion.matches) {
    state.steer = limit(state.steer + (direction === 'left' ? -.3 : .3), -1, 1);
    paint();
    return;
  }
  held.add(direction);
  updateControls();
  schedule();
}

document.addEventListener('keydown', event => {
  const modal = document.querySelector('.jayesh-world dialog[open]');
  if (modal) {
    if (modal === modeDialog && event.code === 'Space' && !event.target.closest('[data-mode]')) {
      event.preventDefault();
      begin('manual');
    }
    return;
  }
  if (!state.entered && event.code === 'Space' && !event.target.closest('button, a')) {
    event.preventDefault();
    begin('manual');
    return;
  }
  const direction = arrows.get(event.key) || arrows.get(event.key.toLowerCase());
  if (!state.entered || !direction || event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  if (!event.repeat) useDirection(direction);
});
document.addEventListener('keyup', event => {
  held.delete(arrows.get(event.key) || arrows.get(event.key.toLowerCase()));
});
window.addEventListener('blur', () => held.clear());
touchControls.querySelectorAll('[data-direction]').forEach(button => {
  const direction = button.dataset.direction;
  button.addEventListener('pointerdown', event => {
    button.setPointerCapture(event.pointerId);
    useDirection(direction);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
    button.addEventListener(type, () => held.delete(direction));
  });
  button.addEventListener('click', event => {
    if (event.detail !== 0) return;
    if (direction === 'up') travel(state.current + 1, false);
    else if (direction === 'down') travel(state.current - 1, false);
    else {
      state.steer = limit(state.steer + (direction === 'left' ? -.3 : .3), -1, 1);
      paint();
    }
  });
});

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  state.width = width;
  state.height = height;
  state.pixelRatio = Math.min(window.devicePixelRatio || 1, state.quality === 'high' ? 2 : 1.4);
  canvas.width = Math.round(width * state.pixelRatio);
  canvas.height = Math.round(height * state.pixelRatio);
  paint();
}

function ellipse(x, y, radiusX, radiusY, color) {
  ink.beginPath();
  ink.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ink.fillStyle = color;
  ink.fill();
}

function polygon(points, fill) {
  ink.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ink.moveTo(x, y);
    else ink.lineTo(x, y);
  });
  ink.closePath();
  ink.fillStyle = fill;
  ink.fill();
}

const speckles = Array.from({ length: 380 }, (_, index) => ({
  longitude: index * 2.39996,
  latitude: Math.asin(1 - 2 * (index + .5) / 380),
  radius: 1 + index % 5 * .4
}));

function globe() {
  const width = state.width;
  const height = state.height;
  const radius = Math.min(168, height * .40, width * .34);
  const centerX = width * .5;
  const centerY = height * .48;
  ink.save();
  ink.translate(centerX, centerY);
  ink.scale(radius, radius);
  ellipse(.06, 1.04, .72, .075, '#51686215');

  const base = ink.createRadialGradient(-.32, -.55, .02, 0, 0, 1.05);
  base.addColorStop(0, '#d0c69d');
  base.addColorStop(.51, '#7b9370');
  base.addColorStop(.82, '#50716e');
  base.addColorStop(1, '#26484b');
  ellipse(0, 0, 1, 1, base);

  ink.save();
  ink.beginPath();
  ink.arc(0, 0, 1, 0, Math.PI * 2);
  ink.clip();
  const drift = Math.sin(state.angle) * .21;
  const sea = ink.createRadialGradient(-.47, .29, .05, .05, .52, 1);
  sea.addColorStop(0, '#7fbab0');
  sea.addColorStop(.53, '#347b78');
  sea.addColorStop(1, '#193c4c');
  ink.beginPath();
  ink.moveTo(-1.1, .30);
  ink.bezierCurveTo(-.72, -.09 + drift, -.39, .43 - drift, -.03, .18);
  ink.bezierCurveTo(.29, -.01, .64, .49 + drift, 1.11, .13 + drift);
  ink.lineTo(1.1, 1.06);
  ink.lineTo(-1.1, 1.06);
  ink.closePath();
  ink.fillStyle = sea;
  ink.fill();
  ink.strokeStyle = '#d7c89e';
  ink.lineWidth = .045;
  ink.stroke();

  speckles.forEach((speckle, index) => {
    const angle = speckle.longitude + state.angle;
    const depth = Math.cos(angle) * Math.cos(speckle.latitude);
    if (depth <= 0) return;
    const x = Math.sin(angle) * Math.cos(speckle.latitude);
    const y = -Math.sin(speckle.latitude);
    const size = speckle.radius * (.003 + depth * .006);
    const colors = y < .19 ? ['#385941a8', '#e3deb3b8', '#687e4eb5'] : ['#becdc859', '#b3d2c33d', '#25536560'];
    ellipse(x, y, size, size * .52, colors[index % 3]);
  });

  const mountainColors = ['#4d6e57', '#728562', '#8d996b', '#365e58'];
  for (let index = 0; index < 7; index++) {
    const left = -.9 + index * .28 + drift * .9;
    const bottom = -.43 + .06 * Math.sin(index + state.angle);
    const peak = bottom - .25 - index % 3 * .045;
    polygon([[left - .21, bottom], [left, peak], [left + .25, bottom]], mountainColors[index % 4]);
    polygon([[left, peak], [left + .04, peak + .14], [left + .25, bottom]], '#2749436e');
  }

  ink.beginPath();
  ink.moveTo(-1, -.16 + drift);
  ink.bezierCurveTo(-.54, -.32, -.37, .05, -.02, -.13 + drift);
  ink.bezierCurveTo(.37, -.25, .71, -.31 - drift, 1, -.18);
  ink.strokeStyle = '#dacca6';
  ink.lineWidth = .067;
  ink.stroke();
  ink.strokeStyle = '#605f50';
  ink.lineWidth = .036;
  ink.stroke();

  for (let index = 0; index < 6; index++) {
    const x = -.77 + index * .30 + drift;
    const y = -.17 + Math.sin(index * 1.4 + state.angle) * .09;
    ellipse(x, y, .026, .026, '#f3eed8');
    ellipse(x, y, .016, .016, index === 5 ? '#cf9e4f' : '#842f25');
  }
  ink.restore();
  ink.restore();
}

const landscapes = {
  village: ['#d5e2d7', '#91a880', '#b9bf8e', '#526a4d'],
  karad: ['#e2e5d5', '#8fa07d', '#c5bf8e', '#637954'],
  kashmir: ['#c8e0e7', '#84a3ad', '#b2c0a0', '#4a7068'],
  shielding: ['#e5e4d7', '#9da77a', '#b6ac7d', '#5c735e'],
  gap: ['#e7ddce', '#bba68a', '#c1b893', '#67785c'],
  photography: ['#e4e5d3', '#9ba77d', '#bdc296', '#627a59'],
  pressure: ['#dce4e6', '#9daeb0', '#bbc2a8', '#536f6a'],
  masters: ['#e0e7dc', '#99afa6', '#b8c09e', '#53776c'],
  jrf: ['#d8e8e4', '#8dab9c', '#b7c7ad', '#4b786e']
};

function drawLine(points, color, width) {
  ink.beginPath();
  ink.moveTo(...points[0]);
  for (const point of points.slice(1)) ink.lineTo(...point);
  ink.strokeStyle = color;
  ink.lineWidth = width;
  ink.lineCap = 'round';
  ink.lineJoin = 'round';
  ink.stroke();
}

function block(x, y, width, height, fill) {
  ink.fillStyle = fill;
  ink.fillRect(x, y, width, height);
}

function drawMountainPeaks(width, height, horizon, offset) {
  const peaks = [
    [-.29, -.08, .01, .26], [-.05, .12, .27, .31], [.18, .39, .56, .28],
    [.31, .52, .75, .36], [.57, .77, .92, .29], [.78, .94, 1.13, .33]
  ];
  ink.save();
  ink.translate(offset, horizon - height * .045);
  ink.scale(width, height);
  for (const [index, [left, summit, right, elevation]] of peaks.entries()) {
    const peak = -elevation;
    const colors = ['#718e9c', '#7596a3', '#8aa7ae'];
    polygon([[left, 0], [summit, peak], [right, 0]], colors[index % colors.length]);
    polygon([[summit, peak], [summit + .025, peak * .37], [right, 0]], '#4d727f');
    polygon([
      [left + (summit - left) * .60, peak * .60], [summit, peak],
      [summit + (right - summit) * .46, peak * .54], [summit + .043, peak * .64],
      [summit + .025, peak * .52], [summit - .017, peak * .71], [summit - .039, peak * .61]
    ], '#f3f1e9');
    polygon([[summit, peak], [summit + (right - summit) * .46, peak * .54], [summit + .025, peak * .52]], '#d5e3e3');
  }
  ink.restore();
}

const trailDetails = {
  village() {
    block(-.54, -.48, .94, .49, '#d6bd8e');
    block(.12, -.48, .28, .49, '#b79c78');
    polygon([[-.67, -.46], [-.23, -.88], [.12, -.85], [.55, -.46]], '#8b5946');
    polygon([[-.67, -.46], [-.23, -.88], [.23, -.46]], '#ad7356');
    block(-.19, -.31, .22, .33, '#6c5e43');
    block(-.44, -.31, .14, .14, '#69766b');
    drawLine([[-.57, .04], [.42, .04]], '#e4d5ad', .02);
  },
  karad() {
    block(-.62, -.55, 1.24, .54, '#dcccaa');
    polygon([[-.72, -.53], [0, -.93], [.72, -.53]], '#977259');
    polygon([[-.23, -.54], [0, -.77], [.23, -.54]], '#bea07c');
    block(-.13, -.5, .26, .5, '#6a7465');
    for (const x of [-.49, .27]) {
      block(x, -.39, .20, .16, '#748e87');
      drawLine([[x + .10, -.39], [x + .10, -.23]], '#e6dbbb', .017);
    }
    ellipse(0, -.65, .056, .056, '#e8dfc7');
    drawLine([[0, -.68], [0, -.65], [.026, -.65]], '#78634e', .013);
  },
  notebook() {
    polygon([[-.52, -.13], [-.35, -.76], [.03, -.63], [.47, -.67], [.59, -.14], [.06, 0]], '#608075');
    polygon([[-.48, -.20], [-.33, -.72], [.03, -.59], [.06, -.06]], '#f2ecd9');
    polygon([[.03, -.59], [.43, -.63], [.54, -.20], [.06, -.06]], '#e8dfc7');
    for (const y of [-.42, -.32, -.22]) {
      drawLine([[-.32, y - .055], [-.07, y]], '#94a79e', .017);
      drawLine([[.15, y], [.38, y - .051]], '#94a79e', .017);
    }
    drawLine([[.21, -.16], [.56, -.55]], '#b98b49', .049);
    polygon([[.19, -.14], [.21, -.20], [.25, -.17]], '#4f4e40');
  },
  kashmir() {
    polygon([[-.65, 0], [-.11, -.64], [.34, -.56], [.66, 0]], '#83654c');
    polygon([[-.69, 0], [-.10, -.64], [.32, 0]], '#c48a4c');
    polygon([[-.35, 0], [-.09, -.43], [.15, 0]], '#48584c');
    polygon([[-.35, 0], [-.09, -.43], [-.08, 0]], '#e2bb71');
    drawLine([[-.10, -.63], [.65, .08]], '#e4d6a3', .014);
  },
  shielding() {
    block(-.54, -.11, 1.08, .1, '#716e57');
    block(-.51, -.42, .18, .29, '#59736a');
    ellipse(-.42, -.42, .14, .075, '#778b76');
    polygon([[-.12, -.16], [-.12, -.85], [.13, -.73], [.13, -.08]], '#595f59');
    polygon([[-.12, -.85], [.02, -.88], [.26, -.76], [.13, -.73]], '#b7aa8b');
    polygon([[.13, -.73], [.26, -.76], [.26, -.12], [.13, -.08]], '#54675e');
    for (const [index, radius] of [.17, .29, .42].entries()) {
      ink.beginPath();
      ink.arc(-.51, -.52, radius, -.65, .23);
      ink.strokeStyle = ['#c98251', '#b78d57', '#a29564'][index];
      ink.lineWidth = .024;
      ink.stroke();
    }
    drawLine([[.34, -.54], [.40, -.48], [.35, -.41], [.49, -.39]], '#939e7d', .019);
  },
  gap() {
    drawLine([[.02, -.02], [.02, -.82]], '#6b5f4b', .055);
    polygon([[-.5, -.63], [-.36, -.75], [.29, -.75], [.29, -.55], [-.36, -.55]], '#9a8060');
    polygon([[-.28, -.48], [.37, -.48], [.52, -.37], [.37, -.27], [-.28, -.27]], '#bfa47d');
    drawLine([[-.30, -.68], [.18, -.68]], '#cab18c', .015);
  },
  photography() {
    drawLine([[-.43, 0], [0, -.69], [.4, 0]], '#4c605a', .048);
    drawLine([[.07, -.06], [0, -.69]], '#61766a', .04);
    block(-.38, -.97, .74, .29, '#4d6159');
    block(-.19, -1.05, .36, .086, '#4d6159');
    block(-.31, -.93, .12, .048, '#dbbb87');
    ellipse(.02, -.82, .15, .15, '#d2c4a5');
    ellipse(.02, -.82, .111, .111, '#3a5959');
    ellipse(-.004, -.844, .038, .033, '#99b2a4');
  },
  pressure(size) {
    const centerX = -.23;
    const centerY = -.54;
    const orbitWidth = .53;
    const orbitHeight = .255;
    const beamPort = -.94;
    const beamX = centerX + orbitWidth * Math.cos(beamPort);
    const beamY = centerY + orbitHeight * Math.sin(beamPort);

    // The roof is cut away to show the storage ring and its magnets.
    polygon([[-.87, -.35], [-.58, -.12], [.59, -.12], [.85, -.23], [.84, -.16], [.59, -.045], [-.58, -.045], [-.87, -.27]], '#788c80');
    polygon([[-.87, -.35], [-.53, -.71], [.58, -.75], [.87, -.53], [.85, -.23], [.59, -.12], [-.58, -.12]], '#9ba99a');
    ellipse(centerX, centerY + .072, .64, .325, '#5d776f');
    ellipse(centerX, centerY, .64, .325, '#d0d4bd');
    ellipse(centerX, centerY, .408, .181, '#91a79b');
    ellipse(centerX, centerY - .024, .398, .158, '#a8b9a7');
    ink.beginPath();
    ink.ellipse(centerX, centerY, orbitWidth, orbitHeight, 0, 0, Math.PI * 2);
    ink.strokeStyle = '#526d65';
    ink.lineWidth = .056;
    ink.stroke();
    ink.strokeStyle = '#dbbb76';
    ink.lineWidth = .022;
    ink.stroke();

    for (let index = 0; index < 9; index++) {
      const angle = index * Math.PI * 2 / 9 + .18;
      const tangent = Math.atan2(orbitHeight * Math.cos(angle), -orbitWidth * Math.sin(angle));
      ink.save();
      ink.translate(centerX + orbitWidth * Math.cos(angle), centerY + orbitHeight * Math.sin(angle));
      ink.rotate(tangent);
      block(-.063, -.045, .126, .09, '#47716d');
      block(-.051, -.030, .102, .022, '#75a095');
      ink.restore();
    }

    ink.save();
    ink.translate(centerX, centerY - .018);
    ink.scale(1 / size, 1 / size);
    ink.fillStyle = '#2e504b';
    ink.font = `700 ${size * .125}px sans-serif`;
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    ink.fillText('INDUS-2', 0, 0);
    ink.restore();

    // X-rays leave tangentially and continue into the beamline hutch.
    drawLine([[beamX, beamY], [.648, -.544]], '#526b60', .097);
    drawLine([[beamX, beamY], [.660, -.540]], '#f0cf84', .037);
    ellipse(beamX, beamY, .033, .033, '#f0cf84');
    polygon([[.49, -.70], [.72, -.75], [.85, -.63], [.60, -.58]], '#b7c5ae');
    polygon([[.49, -.70], [.60, -.58], [.60, -.30], [.49, -.42]], '#738b7d');
    polygon([[.60, -.58], [.85, -.63], [.85, -.35], [.60, -.30]], '#48685f');
    polygon([[.622, -.534], [.825, -.575], [.825, -.435], [.622, -.397]], '#304e48');
    drawLine([[.624, -.474], [.815, -.512]], '#f0cf84', .018);
    polygon([[.677, -.533], [.764, -.550], [.730, -.494]], '#d2e5df');
    polygon([[.730, -.479], [.765, -.450], [.679, -.432]], '#bdd5d0');
    ellipse(.730, -.486, .015, .013, '#d89765');
  },
  masters() {
    for (const [index, color] of ['#95ada6', '#c5b18b', '#8bbcb4'].entries()) {
      const y = -.14 - index * .17;
      polygon([[-.57, y - .095], [.14, y - .23], [.56, y - .055], [-.18, y + .08]], color);
      polygon([[-.18, y + .08], [.56, y - .055], [.56, y + .017], [-.18, y + .14]], '#5f8075');
    }
    drawLine([[-.37, -.92], [.07, -.46], [.25, -.11]], '#f0d184', .032);
    drawLine([[.07, -.46], [.39, -.76]], '#dfbc72', .026);
  },
  jrf() {
    polygon([[-.62, -.36], [-.19, -.87], [.63, -.54], [.28, -.04]], '#507874');
    polygon([[-.62, -.36], [.28, -.04], [.29, .035], [-.62, -.30]], '#375b57');
    polygon([[.28, -.04], [.63, -.54], [.63, -.46], [.29, .035]], '#41615b');
    polygon([[-.23, -.44], [-.005, -.68], [.31, -.55], [.12, -.31]], '#778995');
    polygon([[-.23, -.44], [.12, -.31], [.12, -.245], [-.23, -.382]], '#4c5f6d');
    for (const [index, y] of [-.36, -.48, -.58].entries()) {
      drawLine([[-.47 + index * .08, y], [-.30 + index * .06, y + .06], [-.18 + index * .06, y - .08]], '#dfbd71', .016);
      drawLine([[.17 + index * .07, y + .17], [.31 + index * .062, y + .09], [.35 + index * .06, y + .025]], '#dfbd71', .016);
      ellipse(.018 + index * .065, -.45 + index * .025, .029, .024, '#d0b16a');
    }
  }
};

function drawRoadsideDetail(detail, x, y, size) {
  ink.save();
  ink.translate(x, y);
  ink.scale(size, size);
  ellipse(0, 0, .63, .092, '#31483130');
  detail(size);
  ink.restore();
}

function trail() {
  const { width, height, distance, steer } = state;
  const scene = chapters[state.current].scene || 'village';
  const [sky, hills, meadow, trees] = landscapes[scene] || landscapes.village;
  const panelTop = state.narrating ? dialogue.offsetTop : height;
  const compact = panelTop < height * .53;
  const horizon = compact ? limit(panelTop - height * .14, height * .20, height * .42) : height * .42;
  const relief = Math.min(height, horizon / .42);
  const floor = height - horizon;
  const visibleGround = Math.max(horizon + 7, panelTop - height * .025);
  const trailDepth = y => Math.pow(Math.max(0, y - horizon) / floor, 1 / 1.54);
  const curve = Math.sin(distance * 2.2) * width * .075;
  const center = (unit) => width * .50 + Math.sin(unit * Math.PI * 1.6) * curve - steer * width * unit * .13;
  const yAt = unit => horizon + Math.pow(unit, 1.54) * floor;
  const trailWidth = unit => 2 + width * .29 * Math.pow(unit, 1.25);

  const morning = ink.createLinearGradient(0, 0, 0, horizon);
  morning.addColorStop(0, sky);
  morning.addColorStop(1, '#f6f1dc');
  ink.fillStyle = morning;
  ink.fillRect(0, 0, width, height);
  ellipse(width * .73, height * .23, height * .049, height * .049, '#fff4cb');

  const mountainRange = (level, fill, phase) => {
    const peaks = Array.from({ length: 15 }, (_, index) => {
      const x = (index - 1) * width / 12;
      const y = horizon - level * (.35 + .6 * Math.abs(Math.sin(index * 1.17 + phase)));
      return [x, y];
    });
    polygon([...peaks, [width, horizon + 8], [0, horizon + 8]], fill);
  };
  if (scene === 'kashmir') drawMountainPeaks(width, relief, horizon, -steer * width * .037);
  else mountainRange(relief * .24, hills, 2.3 + distance * .06);
  mountainRange(relief * .12, trees, distance * .10);
  ink.fillStyle = meadow;
  ink.fillRect(0, horizon, width, floor);

  const segments = 38;
  for (let index = 0; index < segments; index++) {
    const near = (index + 1) / segments;
    const far = index / segments;
    const color = Math.floor(index / 2 + distance * 17) % 2;
    const y0 = yAt(far);
    const y1 = yAt(near) + .7;
    const x0 = center(far);
    const x1 = center(near);
    const r0 = trailWidth(far) * .54;
    const r1 = trailWidth(near) * .54;
    if (color) {
      ink.fillStyle = '#71875919';
      ink.fillRect(0, y0, width, y1 - y0);
    }
    polygon([[x0 - r0, y0], [x0 + r0, y0], [x1 + r1, y1], [x1 - r1, y1]], color ? '#bca583' : '#c5af8d');
  }

  if (scene === 'gap') {
    // A shallow fork joins the regular trail without interrupting steering.
    const junction = .43;
    const fork = Array.from({ length: 8 }, (_, index) => {
      const advance = index / 7;
      const unit = junction + advance * .57;
      return {
        x: center(unit) + width * .41 * Math.pow(advance, 1.45),
        y: yAt(unit),
        edge: width * (.027 + advance * .042)
      };
    });
    polygon([
      ...fork.map(({ x, y, edge }) => [x - edge, y]),
      ...fork.reverse().map(({ x, y, edge }) => [x + edge, y])
    ], '#cab18d');
  }

  const terrainDetails = scene === 'gap' ? 12 : state.quality === 'high' ? 32 : 22;
  for (let side = -1; side <= 1; side += 2) {
    const plants = Array.from({ length: terrainDetails }, (_, index) => ({
      index,
      depth: (index * .151 + distance * .28 + (side + 1) * .24) % 1
    })).sort((left, right) => left.depth - right.depth);
    plants.forEach(({ index, depth }) => {
      const unit = depth * .96;
      const variation = .09 + Math.abs(Math.sin(index * 5.19 + side)) * .30;
      const x = center(unit) + side * (trailWidth(unit) * .55 + width * variation * unit);
      const y = yAt(unit);
      const scale = Math.pow(unit, 1.25) * Math.min(70, height * .069);
      if (scale < 2) return;
      ellipse(x, y, scale * .48, scale * .12, '#31483133');
      ink.fillStyle = '#615848';
      ink.fillRect(x - scale * .048, y - scale * .65, scale * .096, scale * .65);
      const color = index % 3 === 0 ? '#617648' : trees;
      polygon([[x, y - scale * 1.18], [x + scale * .41, y - scale * .29], [x - scale * .4, y - scale * .29]], color);
      polygon([[x, y - scale * .9], [x + scale * .48, y - scale * .18], [x - scale * .48, y - scale * .18]], color);
    });
  }

  const detail = trailDetails[scene];
  if (detail) {
    const side = scene === 'village' || scene === 'kashmir' || scene === 'gap' ? -1 : 1;
    const offset = limit((distance - state.current) * .12, -.1, .1);
    const maxDepth = trailDepth(visibleGround);
    const depth = Math.min(.46 + offset, maxDepth);
    const artworkRoom = compact ? visibleGround - locationBadge.offsetTop - locationBadge.offsetHeight - 8 : 134;
    const wideProp = scene === 'pressure';
    const maxSize = wideProp ? 156 : 134;
    const room = compact ? artworkRoom : maxSize;
    const size = Math.min(width * (wideProp ? .29 : .25), height * .177, limit(room, 36, maxSize)) * (1 + offset);
    const rightEdge = wideProp ? Math.min(width * .80, width - size * .90 - 8) : width * .82;
    const x = limit(center(depth) + side * width * .29, width * .18, rightEdge);
    drawRoadsideDetail(detail, x, yAt(depth), size);
    if (scene === 'karad') {
      drawRoadsideDetail(trailDetails.notebook, width * .22, yAt(Math.min(.51 + offset, maxDepth)), size * .64);
    }
  }

  // The walker stays visible above the chapter panel and follows steering.
  const scale = limit(height * (compact ? .063 : .074), 24, 58);
  const foot = Math.min(height * .64, visibleGround - scale * .17);
  const x = center(trailDepth(foot)) + steer * width * .13;
  const stride = !state.narrating && !reducedMotion.matches ? Math.sin(distance * 29) * .12 : 0;
  const bob = Math.abs(stride) * .19;
  ink.save();
  ink.translate(x, foot);
  ink.scale(scale, scale);
  ellipse(0, .12, .35, .12, '#46382832');
  polygon([[-.18, -.44], [-.04, -.44], [-.12 + stride, .08], [-.23 + stride, .08]], '#313a38');
  polygon([[.18, -.44], [.04, -.44], [.12 - stride, .08], [.23 - stride, .08]], '#313a38');
  ink.translate(0, -bob);
  ellipse(0, -.88, .16, .16, '#51463a');
  ellipse(0, -.50, .23, .34, '#334848');
  ellipse(0, -.46, .19, .26, '#b16a42');
  block(-.14, -.47, .28, .067, '#e1ba72');
  if (scene === 'kashmir') {
    // An ochre backpack with its bedroll, zipped pocket, and trekking pole.
    drawLine([[-.22, -.74], [-.27, -.28]], '#e2c781', .054);
    drawLine([[.22, -.73], [.26, -.31]], '#e2c781', .054);
    ellipse(0, -.47, .245, .30, '#99633e');
    ellipse(0, -.49, .19, .244, '#c58a4b');
    ellipse(0, -.735, .24, .078, '#d5b47b');
    ellipse(-.216, -.736, .049, .076, '#b18b53');
    ellipse(-.214, -.735, .020, .038, '#d7bd85');
    drawLine([[-.11, -.74], [-.11, -.61]], '#66584a', .04);
    drawLine([[.11, -.74], [.11, -.61]], '#66584a', .04);
    block(-.12, -.46, .24, .15, '#a97442');
    drawLine([[-.105, -.435], [.105, -.435]], '#ebce94', .026);
    drawLine([[.24, -.47], [.33, -.40], [.41, .09 + stride]], '#575547', .029);
    ellipse(.32, -.40, .041, .043, '#c1a87c');
  }
  ink.restore();
}

function paint() {
  if (!ink || !state.width || !state.height) return;
  ink.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);
  ink.clearRect(0, 0, state.width, state.height);
  if (state.entered) trail();
  else globe();
}

let frameId = 0;
let lastFrame = 0;

function schedule() {
  if (!frameId && !document.hidden && !reducedMotion.matches) frameId = requestAnimationFrame(frame);
}

function frame(time) {
  frameId = 0;
  const step = lastFrame ? Math.min((time - lastFrame) / 1000, .05) : 0;
  lastFrame = time;
  if (document.querySelector('.jayesh-world dialog[open]')) {
    lastFrame = 0;
    return;
  }
  if (!state.entered) {
    state.angle += step * .29;
    paint();
    schedule();
    return;
  }

  let direction = 0;
  if (state.destination !== null) direction = Math.sign(state.destination - state.distance);
  else if (held.has('up') || held.has('down')) direction = Number(held.has('up')) - Number(held.has('down'));
  state.distance = limit(state.distance + direction * step * (state.riding ? .37 : .55), 0, chapters.length - 1);
  state.steer = limit(state.steer + (Number(held.has('right')) - Number(held.has('left'))) * step * 1.2, -1, 1);

  const moveFocus = state.destination !== null && document.activeElement === autoButton;
  if (direction > 0 && state.distance >= state.current + 1) arrive(state.current + 1, moveFocus);
  else if (direction < 0 && state.distance <= state.current - 1) arrive(state.current - 1, moveFocus);
  else if (state.destination === state.distance) arrive(state.destination, moveFocus);
  paint();
  if (state.destination !== null || held.size) schedule();
  else lastFrame = 0;
}

[modeDialog, mapDialog, storyDialog].forEach(dialog => dialog.addEventListener('close', schedule));
new ResizeObserver(resize).observe(stage);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) held.clear();
  else schedule();
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = 0;
    if (state.destination !== null) arrive(state.destination);
  } else schedule();
});
resize();
schedule();
if (location.hash === '#journey-story') showStory();
