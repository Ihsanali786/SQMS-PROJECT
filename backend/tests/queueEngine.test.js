/**
 * Lightweight queue engine checks (no test runner required).
 * Run: node tests/queueEngine.test.js
 */
const assert = require('assert');
const {
  computeEstimatedWait,
  ETA_PAUSED,
  DEFAULT_SERVICE_MIN
} = require('../services/queueEngine');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

console.log('queueEngine tests');

test('zero counters returns paused ETA', () => {
  assert.strictEqual(computeEstimatedWait(5, 0), ETA_PAUSED);
  assert.strictEqual(computeEstimatedWait(0, 0), ETA_PAUSED);
});

test('single counter linear wait', () => {
  assert.strictEqual(computeEstimatedWait(0, 1), 0);
  assert.strictEqual(computeEstimatedWait(1, 1), DEFAULT_SERVICE_MIN);
  assert.strictEqual(computeEstimatedWait(2, 1), 2 * DEFAULT_SERVICE_MIN);
});

test('two counters reduce wait', () => {
  assert.strictEqual(computeEstimatedWait(1, 2), DEFAULT_SERVICE_MIN);
  assert.strictEqual(computeEstimatedWait(2, 2), DEFAULT_SERVICE_MIN);
  assert.strictEqual(computeEstimatedWait(3, 2), 2 * DEFAULT_SERVICE_MIN);
});

test('never negative', () => {
  for (let ahead = 0; ahead <= 10; ahead += 1) {
    for (const counters of [0, 1, 2, 5]) {
      const eta = computeEstimatedWait(ahead, counters);
      assert.ok(eta === ETA_PAUSED || eta >= 0);
    }
  }
});

console.log('All queueEngine tests passed.');
