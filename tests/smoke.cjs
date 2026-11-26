const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'index.html should contain the game script');
const htmlEnd = html.toLowerCase().lastIndexOf('</html>');
assert.notEqual(htmlEnd, -1, 'index.html should have a closing html tag');
assert.equal(html.slice(htmlEnd + 7).trim(), '', 'index.html should not contain stray content after the page');

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
    this.dataset = {};
    this.listeners = new Map();
    this.children = [];
    this.classList = {
      values: new Set(),
      add: (value) => this.classList.values.add(value),
      remove: (value) => this.classList.values.delete(value),
      contains: (value) => this.classList.values.has(value),
    };
    this.clientHeight = id === 'stage' ? 500 : 0;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, event = {}) {
    const payload = { preventDefault() {}, currentTarget: this, ...event };
    for (const listener of this.listeners.get(type) ?? []) listener(payload);
  }

  appendChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
  }
}

function createGame() {
  let now = 0;
  let nextFrame = null;
  let audioTones = 0;
  let nextTimer = 0;
  const timers = new Map();

  const selectors = [
    '#stage', '#overlay', '#start', '#score', '#best', '#combo', '#hits', '#misses',
    '#accuracy', '#progress', '#feedback', '#combo-text', '#countdown', '#sound', '#pause', '#resume', '#restart',
  ];
  const elements = Object.fromEntries(selectors.map((selector) => [selector, new FakeElement(selector.slice(1))]));
  const lanes = Array.from({ length: 4 }, (_, lane) => {
    const button = new FakeElement(`lane-${lane}`);
    button.dataset.lane = String(lane);
    return button;
  });
  const document = {
    hidden: false,
    addEventListener(type, listener) {
      const listeners = documentListeners.get(type) ?? [];
      listeners.push(listener);
      documentListeners.set(type, listeners);
    },
    emit(type, event = {}) {
      for (const listener of documentListeners.get(type) ?? []) listener(event);
    },
    querySelector: (selector) => elements[selector] ?? (selector === '#again' ? new FakeElement('again') : null),
    querySelectorAll: (selector) => selector === '.lane-key' ? lanes : [],
    createElement: () => new FakeElement(),
  };
  const documentListeners = new Map();
  const windowListeners = new Map();
  const window = {
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    emit(type, event) { windowListeners.get(type)?.(event); },
    AudioContext: class {
      constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
      createOscillator() {
        return { frequency: {}, connect() { return this; }, start() { audioTones += 1; }, stop() {} };
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() { return this; },
        };
      }
    },
  };
  const storage = new Map();
  const context = {
    document,
    window,
    performance: { now: () => now },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    requestAnimationFrame(callback) { nextFrame = callback; return 1; },
    cancelAnimationFrame() { nextFrame = null; },
    setTimeout(callback, delay = 0) {
      const id = ++nextTimer;
      timers.set(id, { callback, due: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
  };

  vm.runInNewContext(script, context, { filename: 'index.html:inline-script' });
  return {
    elements,
    lanes,
    get audioTones() { return audioTones; },
    start() { elements['#start'].emit('click'); },
    frame(timestamp) {
      const dueTimers = [...timers.entries()].filter(([, timer]) => timer.due <= timestamp).sort((a, b) => a[1].due - b[1].due);
      for (const [id, timer] of dueTimers) {
        timers.delete(id);
        now = timer.due;
        timer.callback();
      }
      now = timestamp;
      const callback = nextFrame;
      nextFrame = null;
      callback?.(timestamp);
    },
    visibility(hidden, timestamp) {
      now = timestamp;
      document.hidden = hidden;
      document.emit('visibilitychange');
    },
    key(key) { window.emit('keydown', { key, repeat: false, preventDefault() {} }); },
  };
}

const game = createGame();
const beatMs = 60_000 / 112;
const countInMs = beatMs * 4;

// Starting the track emits a tempo cue, and a lane press on the first note earns PERFECT.
game.start();
assert.equal(game.audioTones, 1, 'the first metronome cue should play at track start');
assert.equal(game.elements['#countdown'].textContent, '4', 'the visual count-in should start at four');
assert.equal(game.elements['#stage'].classList.contains('beat-flash'), true, 'the hit line should pulse with the first beat');
game.frame(140);
assert.equal(game.elements['#stage'].classList.contains('beat-flash'), false, 'the beat pulse should fade before the next beat');
game.frame(beatMs);
assert.equal(game.audioTones, 2, 'the metronome should advance with the BPM');
assert.equal(game.elements['#countdown'].textContent, '3', 'the visual count-in should follow the BPM');
assert.equal(game.elements['#stage'].classList.contains('beat-flash'), true, 'the hit line should pulse on later beats');
game.frame(countInMs);
assert.equal(game.elements['#countdown'].textContent, '');
assert.equal(game.elements['#countdown'].classList.contains('hidden'), true);
game.lanes[0].emit('pointerdown');
assert.equal(game.elements['#score'].textContent, '000300');
assert.equal(game.elements['#hits'].textContent, 1);
assert.equal(game.elements['#best'].textContent, '000300');

// The visual beat cue continues when sound is muted.
const mutedPulseGame = createGame();
mutedPulseGame.elements['#sound'].emit('click');
mutedPulseGame.start();
assert.equal(mutedPulseGame.audioTones, 0);
assert.equal(mutedPulseGame.elements['#stage'].classList.contains('beat-flash'), true);
mutedPulseGame.frame(140);
assert.equal(mutedPulseGame.elements['#stage'].classList.contains('beat-flash'), false);
mutedPulseGame.frame(beatMs);
assert.equal(mutedPulseGame.audioTones, 0);
assert.equal(mutedPulseGame.elements['#stage'].classList.contains('beat-flash'), true);

// Restart, miss the first note, then press the second chart lane with its keyboard key.
const restartAt = countInMs;
game.start();
game.frame(restartAt + countInMs + 200);
assert.equal(game.elements['#misses'].textContent, 1);
game.frame(restartAt + countInMs + beatMs);
game.key('j');
assert.equal(game.elements['#score'].textContent, '000300');
assert.equal(game.elements['#hits'].textContent, 1);
game.frame(restartAt + 45_001);assert.match(game.elements['#overlay'].innerHTML, /TRACK COMPLETE/);

// Time spent in a hidden tab is excluded, so returning does not cause a burst of misses.
const visibilityGame = createGame();
visibilityGame.start();
visibilityGame.frame(800);
visibilityGame.visibility(true, 800);
visibilityGame.frame(20_000);
assert.equal(visibilityGame.elements['#misses'].textContent, 0);
visibilityGame.visibility(false, 20_000);
visibilityGame.frame(20_000 + countInMs - 800);
visibilityGame.lanes[0].emit('pointerdown');
assert.equal(visibilityGame.elements['#hits'].textContent, 1);
assert.equal(visibilityGame.elements['#misses'].textContent, 0);

// Manual pause and Escape resume preserve the chart position as well.
const manualPauseGame = createGame();
manualPauseGame.start();
manualPauseGame.frame(900);
manualPauseGame.elements['#pause'].emit('click');
assert.equal(manualPauseGame.elements['#combo-text'].textContent, 'PAUSED');
manualPauseGame.lanes[0].emit('pointerdown');
assert.equal(manualPauseGame.elements['#hits'].textContent, 0);
manualPauseGame.frame(20_000);
assert.equal(manualPauseGame.elements['#misses'].textContent, 0);
manualPauseGame.elements['#resume'].emit('click');
manualPauseGame.frame(20_000 + countInMs - 900);
manualPauseGame.lanes[0].emit('pointerdown');
assert.equal(manualPauseGame.elements['#hits'].textContent, 1);
assert.equal(manualPauseGame.elements['#misses'].textContent, 0);
manualPauseGame.key('Escape');
assert.equal(manualPauseGame.elements['#combo-text'].textContent, 'PAUSED');
manualPauseGame.key('Escape');
assert.equal(manualPauseGame.elements['#combo-text'].textContent, 'KEEP IT UP');

console.log('NEON BEAT smoke checks passed: visual/audio count-in and beat pulse, pointer hit, keyboard hit, miss, best score, visibility/manual pause, and finish.');
