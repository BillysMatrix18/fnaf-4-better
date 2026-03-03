const NIGHT_LENGTH_MS = 6 * 60 * 1000; // 6 real minutes
const LOGIC_TICK_MS = 300;

// Drop-in mapping for external sprite assets (e.g. Spriters Resource exports)
const assetMap = {
  shatterbear: { idle: 'assets/sprites/shatterbear/idle.png', jumpscare: 'assets/sprites/shatterbear/jumpscare.png' },
  marionetteFox: { idle: 'assets/sprites/marionette_fox/idle.png', jumpscare: 'assets/sprites/marionette_fox/jumpscare.png' },
  blinkRabbit: { idle: 'assets/sprites/blink_rabbit/idle.png', jumpscare: 'assets/sprites/blink_rabbit/jumpscare.png' },
  whisperer: { idle: 'assets/sprites/whisperer/idle.png', jumpscare: 'assets/sprites/whisperer/jumpscare.png' }
};

const state = {
  running: false,
  startAt: 0,
  focus: 'center',
  hour: 12,
  fear: 0.12,
  flashlightCharge: 100,
  holdingDoor: false,
  stillness: false,
  gameOver: false,
  viewNeglect: { left: 0, right: 0, closet: 0, bed: 0 },
  flashlightClicks: [],
  entities: {
    shatterbear: { location: 'left', phase: 'idle', timer: 0 },
    marionetteFox: { location: 'closet', phase: 'idle', timer: 0 },
    blinkRabbit: { location: 'right', phase: 'idle', timer: 0 },
    whisperer: { location: 'bed', phase: 'idle', timer: 0 }
  }
};

const el = {
  app: document.getElementById('app'),
  clock: document.getElementById('clock'),
  status: document.getElementById('status'),
  roomLabel: document.getElementById('roomLabel'),
  fearOverlay: document.getElementById('fearOverlay'),
  flashOverlay: document.getElementById('flashOverlay'),
  entityShadow: document.getElementById('entityShadow'),
  doorBtn: document.getElementById('doorBtn'),
  stillBtn: document.getElementById('stillBtn'),
  flashBtn: document.getElementById('flashBtn'),
  startBtn: document.getElementById('startBtn'),
  log: document.getElementById('log'),
  gameOver: document.getElementById('gameOver'),
  gameOverTitle: document.getElementById('gameOverTitle'),
  gameOverText: document.getElementById('gameOverText'),
  restartBtn: document.getElementById('restartBtn')
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const master = audioCtx.createGain();
master.gain.value = 0.2;
master.connect(audioCtx.destination);

function tone(freq, duration = 0.25, pan = 0, type = 'sine', gain = 0.08) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const p = audioCtx.createStereoPanner();
  osc.type = type;
  osc.frequency.value = freq;
  p.pan.value = pan;
  g.gain.value = gain;
  osc.connect(g).connect(p).connect(master);
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.stop(audioCtx.currentTime + duration);
}

function log(msg, danger = false) {
  const line = document.createElement('div');
  line.className = danger ? 'danger' : '';
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.log.prepend(line);
}

function setFocus(focus) {
  state.focus = focus;
  el.app.className = `view-${focus}`;
  el.roomLabel.textContent = ({left:'Left Hallway', right:'Right Hallway', closet:'Closet', bed:'Bedside', center:'Bedroom'})[focus];
}

function useFlashlight() {
  if (!state.running || state.flashlightCharge <= 0) return;
  state.flashlightCharge = Math.max(0, state.flashlightCharge - 4.5);
  state.flashlightClicks.push(Date.now());
  state.flashlightClicks = state.flashlightClicks.filter(t => Date.now() - t < 60000);
  el.flashOverlay.style.opacity = '1';
  setTimeout(() => (el.flashOverlay.style.opacity = '0'), 130);
  tone(880, 0.12, 0, 'square', 0.04);

  Object.values(state.entities).forEach(ent => {
    if (ent.location === state.focus && ent.phase !== 'idle') {
      ent.phase = 'cooldown';
      ent.timer = 1200;
      state.fear = Math.max(0.08, state.fear - 0.06);
      log(`Flash repelled presence at ${state.focus}.`);
    }
  });
}

function updateClock() {
  const elapsed = Date.now() - state.startAt;
  const progress = Math.min(1, elapsed / NIGHT_LENGTH_MS);
  const hourIndex = Math.floor(progress * 6);
  state.hour = ((12 + hourIndex - 1) % 12) + 1;
  const suffix = hourIndex < 5 ? 'AM' : 'AM';
  el.clock.textContent = `${state.hour}:00 ${suffix}`;
  if (progress >= 1) return winGame();
}

function aiTick() {
  if (!state.running || state.gameOver) return;

  ['left', 'right', 'closet', 'bed'].forEach(k => {
    if (state.focus !== k) state.viewNeglect[k] += LOGIC_TICK_MS;
    else state.viewNeglect[k] = Math.max(0, state.viewNeglect[k] - LOGIC_TICK_MS * 2);
  });

  const progress = Math.min(1, (Date.now() - state.startAt) / NIGHT_LENGTH_MS);
  const aggression = 0.4 + (progress * progress * 1.8);

  Object.entries(state.entities).forEach(([name, ent]) => {
    ent.timer -= LOGIC_TICK_MS;
    if (ent.timer > 0) return;

    if (ent.phase === 'idle') {
      const spamClicks = state.flashlightClicks.length > 3;
      const shouldWake = Math.random() < 0.15 * aggression || (name === 'marionetteFox' && spamClicks);
      if (shouldWake) {
        ent.phase = 'approach';
        ent.timer = 1200 + Math.random() * 1600;
        cueApproach(ent.location);
      }
      return;
    }

    if (ent.phase === 'approach') {
      ent.phase = 'threaten';
      ent.timer = 1400 - Math.min(800, aggression * 300);
      cueThreat(name, ent.location);
      return;
    }

    if (ent.phase === 'threaten') {
      if (resolveDefense(ent.location)) {
        ent.phase = 'cooldown';
        ent.timer = 1500;
        state.fear = Math.max(0.05, state.fear - 0.05);
      } else {
        ent.phase = 'attack';
        loseGame(`Caught by ${name} at ${ent.location}.`);
      }
      return;
    }

    if (ent.phase === 'cooldown') {
      ent.phase = 'idle';
      ent.timer = 1200 + Math.random() * 2400;
    }
  });

  const neglectBed = state.viewNeglect.bed > 9000;
  if (neglectBed) {
    state.fear += 0.02;
    log('Giggles behind you...', true);
    tone(240, 0.22, 0, 'triangle', 0.05);
  }

  if (state.stillness) {
    state.fear += 0.006;
    if (Math.random() < 0.09) log('Hallucination intensifies.', true);
  }

  state.fear = Math.min(1, state.fear + 0.004);
  renderFear();
}

function resolveDefense(location) {
  if (location === 'closet') return state.focus === 'closet';
  if (location === 'bed') return state.focus === 'bed' || state.stillness;
  return state.focus === location && state.holdingDoor;
}

function cueApproach(location) {
  const pan = location === 'left' ? -0.8 : location === 'right' ? 0.8 : 0;
  tone(120 + Math.random() * 30, 0.35, pan, 'sawtooth', 0.045);
  el.status.textContent = `Sound near ${location}...`;
  log(`Approach detected: ${location}.`, true);
}

function cueThreat(name, location) {
  const pan = location === 'left' ? -1 : location === 'right' ? 1 : 0;
  tone(70, 0.45, pan, 'square', 0.09);
  tone(420, 0.2, pan, 'triangle', 0.04);
  el.entityShadow.hidden = false;
  setTimeout(() => (el.entityShadow.hidden = true), 420);
  el.status.textContent = `${name} is close.`;
  log(`${name} is threatening at ${location}.`, true);
}

function renderFear() {
  const vignette = 0.45 + state.fear * 0.5;
  el.fearOverlay.style.background = `radial-gradient(circle, transparent ${55 - state.fear * 20}%, rgba(0,0,0,${vignette}))`;
  document.body.style.filter = `saturate(${1 - state.fear * 0.4}) contrast(${1 + state.fear * 0.5})`;
}

function loseGame(reason) {
  state.running = false;
  state.gameOver = true;
  tone(40, 0.75, 0, 'sawtooth', 0.12);
  el.gameOver.hidden = false;
  el.gameOverTitle.textContent = 'Jumpscare';
  el.gameOverText.textContent = reason;
  log(reason, true);
}

function winGame() {
  state.running = false;
  state.gameOver = true;
  el.gameOver.hidden = false;
  el.gameOverTitle.textContent = '6:00 AM';
  el.gameOverText.textContent = 'You survived the night.';
  log('Night completed.');
}

function startGame() {
  state.running = true;
  state.gameOver = false;
  state.startAt = Date.now();
  state.fear = 0.12;
  state.flashlightCharge = 100;
  state.viewNeglect = { left: 0, right: 0, closet: 0, bed: 0 };
  state.flashlightClicks = [];
  Object.values(state.entities).forEach(ent => { ent.phase = 'idle'; ent.timer = 300 + Math.random() * 900; });
  el.gameOver.hidden = true;
  el.status.textContent = 'Night started. Listen carefully.';
  log('Night started.');
  if (audioCtx.state !== 'running') audioCtx.resume();
}

setInterval(() => {
  if (!state.running) return;
  updateClock();
  aiTick();
}, LOGIC_TICK_MS);

el.startBtn.addEventListener('click', startGame);
el.restartBtn.addEventListener('click', startGame);
el.flashBtn.addEventListener('click', useFlashlight);
el.doorBtn.addEventListener('mousedown', () => state.holdingDoor = true);
el.doorBtn.addEventListener('mouseup', () => state.holdingDoor = false);
el.doorBtn.addEventListener('mouseleave', () => state.holdingDoor = false);
el.stillBtn.addEventListener('mousedown', () => state.stillness = true);
el.stillBtn.addEventListener('mouseup', () => state.stillness = false);
el.stillBtn.addEventListener('mouseleave', () => state.stillness = false);

document.querySelectorAll('[data-focus]').forEach(btn => {
  btn.addEventListener('click', () => setFocus(btn.dataset.focus));
});

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'a') setFocus('left');
  if (e.key.toLowerCase() === 's') setFocus('center');
  if (e.key.toLowerCase() === 'd') setFocus('right');
  if (e.key.toLowerCase() === 'c') setFocus('closet');
  if (e.key.toLowerCase() === 'b') setFocus('bed');
  if (e.key.toLowerCase() === 'f') useFlashlight();
  if (e.key === ' ') state.holdingDoor = true;
  if (e.key === 'Shift') state.stillness = true;
});

document.addEventListener('keyup', (e) => {
  if (e.key === ' ') state.holdingDoor = false;
  if (e.key === 'Shift') state.stillness = false;
});

setFocus('center');
renderFear();
