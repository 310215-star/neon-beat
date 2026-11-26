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

  const selectors = [
    '#stage', '#overlay', '#start', '#score', '#best', '#combo', '#hits', '#misses',
    '#accuracy', '#progress', '#feedback', '#sound', '#restart',
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
    setTimeout: () => 1,
    clearTimeout() {},
  };

  vm.runInNewContext(script, context, { filename: 'index.html:inline-script' });
  return {
    elements,
    lanes,
    get audioTones() { return audioTones; },
    start() { elements['#start'].emit('click'); },
    frame(timestamp) {
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
game.frame(beatMs);
assert.equal(game.audioTones, 2, 'the metronome should advance with the BPM');
game.frame(countInMs);
game.lanes[0].emit('pointerdown');
assert.equal(game.elements['#score'].textContent, '000300');
assert.equal(game.elements['#hits'].textContent, 1);
assert.equal(game.elements['#best'].textContent, '000300');

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

console.log('NEON BEAT smoke checks passed: metronome, pointer hit, keyboard hit, miss, best score, visibility pause, and finish.');
